import unicodedata

from django.conf import settings
from django.contrib.auth import get_user_model, password_validation
from django.contrib.auth.hashers import make_password
from django.core.cache import cache
from rest_framework import fields
from rest_framework.exceptions import ValidationError
from vstutils.api.fields import PasswordField
from vstutils.api.serializers import VSTSerializer
from vstutils.utils import lazy_translate as __
from vstutils.utils import send_template_email

from .utils import hash_data, secure_pickle

User = get_user_model()


def unique_username_validator(value):
    if value and User.objects.filter(username__iexact=value).exists():
        raise ValidationError(__("User with this username already exists."))
    return value


class UsernameField(fields.CharField):
    default_validators = [unique_username_validator]

    def to_internal_value(self, data):
        value = super().to_internal_value(data)

        # From django.contrib.auth.forms.UsernameField
        if self.max_length is not None and len(value) > self.max_length:
            # Normalization can increase the string length (e.g.
            # "ﬀ" -> "ff", "½" -> "1⁄2") but cannot reduce it, so there is no
            # point in normalizing invalid data. Moreover, Unicode
            # normalization is very slow on Windows and can be a DoS attack
            # vector.
            return value  # nocv
        return unicodedata.normalize("NFKC", value)


class UserRegistrationWithEmailConfirmationMixin(VSTSerializer):
    email_confirmation_required = fields.BooleanField(default=False, read_only=True)

    def __init__(self, *args, skip_email_confirmation=False, **kwargs):
        super().__init__(*args, **kwargs)
        self.skip_email_confirmation = skip_email_confirmation

    def is_email_confirmation_required(self, validated_data: dict):
        return settings.SEND_CONFIRMATION_EMAIL and not self.skip_email_confirmation

    def build_confirmation_url(self, code: str):
        return self.context["request"].build_absolute_uri(
            settings.DEFAULT_REGISTRATION_VIEW_CONFIRMATION_LINK.format(code=code)
        )

    def get_confirmation_email_context(self, code: str):
        return {
            "action_url": self.build_confirmation_url(code),
            "application_name": settings.PROJECT_GUI_NAME,
            "title": __("Confirm your account"),
            "text": settings.EMAIL_CONFIRMATION_MESSAGE.format(
                application_name=settings.PROJECT_GUI_NAME
            ),
        }

    def send_confirmation_email(self, data: dict):
        code = hash_data(data["email"])
        cache.set(code, secure_pickle.dumps(data))
        send_template_email(
            subject=__("Registration Confirmation."),
            template_name="registration/confirm_email.html",
            email=data["email"],
            context_data=self.get_confirmation_email_context(code),
        )

    def create(self, validated_data):
        if self.is_email_confirmation_required(validated_data):
            self.send_confirmation_email(self.initial_data)
            validated_data["email_confirmation_required"] = True
            return validated_data
        return super().create(validated_data)


class UserRegistrationSerializer(UserRegistrationWithEmailConfirmationMixin):
    username = UsernameField()
    password = PasswordField(
        validators=[password_validation.validate_password],
        write_only=True,
    )

    class Meta:
        model = User
        fields = [
            "email_confirmation_required",
            "first_name",
            "last_name",
            "email",
            "username",
            "password",
        ]

    def validate_password(self, value: str):
        return make_password(value)
