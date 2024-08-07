import unicodedata
from base64 import urlsafe_b64decode, urlsafe_b64encode

from django.conf import settings
from django.contrib.auth import get_user_model, password_validation
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.template import loader
from django.utils.encoding import force_bytes
from rest_framework import fields
from rest_framework.exceptions import ValidationError
from rest_framework.mixins import CreateModelMixin
from rest_framework.permissions import IsAuthenticated
from rest_framework.throttling import AnonRateThrottle
from vstutils.api.base import GenericViewSet
from vstutils.api.fields import PasswordField
from vstutils.api.serializers import BaseSerializer
from vstutils.utils import (
    send_template_email,
    lazy_translate as __,
    translate as _,
)


User = get_user_model()


class PasswordResetThrottle(AnonRateThrottle):
    scope = "password_reset"


def _unicode_ci_compare(s1, s2):
    """
    Perform case-insensitive comparison of two identifiers, using the
    recommended algorithm from Unicode Technical Report 36, section
    2.11.2(B)(2).
    """
    return (
        unicodedata.normalize("NFKC", s1).casefold() ==
        unicodedata.normalize("NFKC", s2).casefold()
    )


class PasswordResetSerializer(BaseSerializer):
    email = fields.EmailField(write_only=True)

    subject_template_name = "registration/password_reset_subject.txt"
    email_template_name = "registration/api_password_reset_email.html"

    def create(self, validated_data):
        """
        Generate a one-use only link for resetting password and send it to the
        user.
        """
        email = validated_data["email"]

        email_field_name = User.get_email_field_name()
        for user in self.get_users(email):
            user_email = getattr(user, email_field_name)
            context = {
                "email": user_email,
                "site_name": settings.PROJECT_GUI_NAME,
                "user": user,
                "reset_link": self.get_reset_link(
                    uid=urlsafe_b64encode(force_bytes(user.pk)).decode(),
                    token=default_token_generator.make_token(user),
                ),
                "__lang__": self.context["request"].language,
            }
            subject = loader.render_to_string(self.subject_template_name, context)
            # Email subject *must not* contain newlines
            subject = "".join(subject.splitlines())
            send_template_email(
                subject=__(subject),
                template_name=self.email_template_name,
                email=user_email,
                context_data=context,
            )

        return {}

    def get_users(self, email):
        """Given an email, return matching user(s) who should receive a reset.

        This allows subclasses to more easily customize the default policies
        that prevent inactive users and users with unusable passwords from
        resetting their password.
        """
        email_field_name = User.get_email_field_name()
        active_users = User.objects.filter(
            **{
                f"{email_field_name}__iexact": email,
                "is_active": True,
            }
        )
        return (
            u
            for u in active_users
            if u.has_usable_password() and
            _unicode_ci_compare(email, getattr(u, email_field_name))
        )

    def get_reset_link(self, uid: str, token: str):
        return self.context["request"].build_absolute_uri(
            settings.DEFAULT_PASSWORD_RESET_VIEW_CONFIRMATION_LINK.format(
                uid=uid, token=token
            )
        )


class PasswordResetConfirmSerializer(BaseSerializer):
    uid = fields.CharField(write_only=True)
    token = fields.CharField(write_only=True)
    password = PasswordField(write_only=True)

    def validate_uid(self, value):
        try:
            uid = urlsafe_b64decode(force_bytes(value))
            return User.objects.get(pk=uid)
        except (TypeError, ValueError, OverflowError, User.DoesNotExist) as e:
            raise ValidationError(_("Invalid value")) from e

    def validate(self, attrs):
        if not default_token_generator.check_token(attrs["uid"], attrs["token"]):
            raise ValidationError({"token": "Invalid value"})

        try:
            password_validation.validate_password(attrs["password"], attrs["uid"])
        except DjangoValidationError as e:
            raise ValidationError({"password": e.messages}) from e

        return attrs

    def create(self, validated_data):
        user = validated_data["uid"]
        user.set_password(validated_data["password"])
        user.save()
        return {}


class BasePasswordResetViewSet(GenericViewSet, CreateModelMixin):
    permission_classes = [~IsAuthenticated]

    def get_success_headers(self, data):
        return {}


class PasswordResetViewSet(BasePasswordResetViewSet):
    throttle_classes = [PasswordResetThrottle]
    serializer_class = PasswordResetSerializer


class PasswordResetConfirmViewSet(BasePasswordResetViewSet):
    throttle_classes = [PasswordResetThrottle]
    serializer_class = PasswordResetConfirmSerializer
