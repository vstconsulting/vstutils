from functools import partial

from django.conf import settings
from django.core.cache import cache
from django.db import transaction
from django.utils.module_loading import import_string
from rest_framework import fields
from rest_framework.exceptions import ValidationError
from vstutils.api.serializers import BaseSerializer
from vstutils.utils import translate as _

from .utils import check_data, secure_pickle

REGISTRATION_SERIALIZER = import_string(
    settings.DEFAULT_REGISTRATION_VIEW_SERIALIZER_CLASS
)


class ConfirmEmailSerializer(BaseSerializer):
    code = fields.CharField(write_only=True)

    def get_saved_user_data(self, code: str):
        data = cache.get(code)
        if not data:
            raise ValidationError(
                {"code": [_("Confirmation code is invalid or expired.")]}
            )
        data = secure_pickle.loads(data)
        if not check_data(data["email"], code):
            raise ValidationError({"code": [_("Invalid registration email send.")]})
        return data

    def remove_saved_user_data(self, code: str):
        cache.delete(code)

    def create(self, validated_data):
        code = validated_data["code"]
        data = self.get_saved_user_data(code)

        serializer = REGISTRATION_SERIALIZER(
            data=data,
            context=self.context,
            skip_email_confirmation=True,
        )
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        transaction.on_commit(
            partial(self.remove_saved_user_data, code),
        )
        return user
