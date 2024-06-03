from functools import partial
import unicodedata

from django.conf import settings
from django.contrib.auth import get_user_model, password_validation
from django.contrib.auth.hashers import check_password, make_password
from django.core.cache import cache
from django.db import transaction
from django.test import override_settings
from rest_framework import fields
from rest_framework.exceptions import ValidationError
from vstutils.api.fields import PasswordField
from vstutils.api.serializers import VSTSerializer
from vstutils.utils import SecurePickling, send_template_email, lazy_translate as __, translate as _

User = get_user_model()
secure_pickle = SecurePickling()

override_setting_decorator = override_settings(PASSWORD_HASHERS=settings.REGISTRATION_HASHERS)
hash_data = override_setting_decorator(make_password)
check_data = override_setting_decorator(check_password)


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

    def is_email_confirmation_required(self, validated_data: dict):
        return settings.SEND_CONFIRMATION_EMAIL

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

    def send_confirmation_email(self, validated_data):
        code = hash_data(validated_data["email"])
        cache.set(code, secure_pickle.dumps(validated_data))
        send_template_email(
            subject=__("Registration Confirmation."),
            template_name="registration/confirm_email.html",
            email=validated_data["email"],
            context_data=self.get_confirmation_email_context(code),
        )

    def create(self, validated_data):
        if self.is_email_confirmation_required(validated_data):
            self.send_confirmation_email(validated_data)
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


class ConfirmEmailSerializer(VSTSerializer):
    code = fields.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            "code",
        ]

    def get_saved_user_data(self, code: str):
        data = cache.get(code)
        if not data:
            raise ValidationError({'code': [_("Confirmation code is invalid or expired.")]})
        data = secure_pickle.loads(data)
        if not check_data(data["email"], code):
            raise ValidationError({'code': [_("Invalid registration email send.")]})
        return data

    def remove_saved_user_data(self, code: str):
        cache.delete(code)

    def create(self, validated_data):
        code = validated_data["code"]
        user = super().create(
            self.get_saved_user_data(code)
        )
        transaction.on_commit(
            partial(self.remove_saved_user_data, code),
        )
        return user
