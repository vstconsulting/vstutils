from django.conf import settings
from django.utils.module_loading import import_string
from rest_framework.mixins import CreateModelMixin
from rest_framework.permissions import IsAuthenticated
from rest_framework.throttling import AnonRateThrottle
from vstutils.api.base import GenericViewSet

from .serializers import ConfirmEmailSerializer


class RegistrationThrottle(AnonRateThrottle):
    scope = "registration"


class UserRegistrationViewSet(GenericViewSet, CreateModelMixin):
    throttle_classes = [RegistrationThrottle]
    permission_classes = [~IsAuthenticated]
    serializer_class = import_string(
        settings.DEFAULT_REGISTRATION_VIEW_SERIALIZER_CLASS
    )


class ConfirmEmailViewSet(GenericViewSet, CreateModelMixin):
    throttle_classes = [RegistrationThrottle]
    permission_classes = [~IsAuthenticated]
    serializer_class = ConfirmEmailSerializer
