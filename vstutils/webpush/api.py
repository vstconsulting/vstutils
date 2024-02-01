from django.db import transaction
from rest_framework import fields
from rest_framework.exceptions import NotFound
from rest_framework.permissions import IsAuthenticated
from vstutils.api.actions import SimpleAction
from vstutils.api.serializers import BaseSerializer, SerializerMetaClass

from .autodiscovery import get_web_pushes_classes
from .models import WebPushDeviceSubscription, WebPushNotificationSubscription
from .utils import subscribe_device, unsubscribe_device, update_user_subscriptions


def get_user_subscriptions(user_id: int):
    subscriptions = WebPushNotificationSubscription.objects.filter(
        user_id=user_id
    ).values_list("type", "enabled")
    return dict(subscriptions)


class PushSubscriptionKeysSerializer(BaseSerializer):
    auth = fields.CharField()
    p256dh = fields.CharField()


class PushSubscriptionSerializer(BaseSerializer):
    endpoint = fields.CharField()
    expirationTime = fields.FloatField(allow_null=True, default=None)
    keys = PushSubscriptionKeysSerializer()


class PushSubscriptionSerializerMetaclass(SerializerMetaClass):
    def __new__(mcs, name, bases, attrs):
        for notification_class in get_web_pushes_classes():
            attrs[notification_class.get_key()] = fields.BooleanField(
                default=False, label=notification_class.title
            )
        return super().__new__(mcs, name, bases, attrs)


class PushAvailabilitySerializerMetaclass(SerializerMetaClass):
    def __new__(mcs, name, bases, attrs):
        for notification_class in get_web_pushes_classes():
            attrs[notification_class.get_key()] = fields.BooleanField(default=False)
        attrs['notifications_enabled'] = fields.BooleanField(default=False)
        return super().__new__(mcs, name, bases, attrs)


class PushAvailabilitySerializer(BaseSerializer, metaclass=PushAvailabilitySerializerMetaclass):
    def get_attribute(self, instance):
        user = self.context['request'].user
        data = {
            push_class.get_key(): push_class.is_available(user)
            for push_class in get_web_pushes_classes()
        }
        data['notifications_enabled'] = True
        return data


class PushNotificationsSerializer(
    BaseSerializer, metaclass=PushSubscriptionSerializerMetaclass
):
    _availability = PushAvailabilitySerializer(read_only=True)
    notifications_enabled = fields.BooleanField(default=False, read_only=True)
    subscription_data = PushSubscriptionSerializer(allow_null=True, write_only=True)
    language_code = fields.CharField(allow_null=True, write_only=True)

    _schema_properties_groups = {
        "": ["subscription_data", "language_code"],
        "Notification settings": [
            notification_class.get_key()
            for notification_class in get_web_pushes_classes()
        ],
        "Current device": ["notifications_enabled"]
    }

    def to_internal_value(self, data):
        value: dict = super().to_internal_value(data)
        user = self.context['request'].user
        for push_class in get_web_pushes_classes():
            if not push_class.is_available(user):
                value.pop(push_class.get_key(), None)
        return value


def create_webpush_settings_action(view_subpath: str):
    @SimpleAction(
        name=view_subpath,
        methods=["get", "patch", "put", "delete"],
        serializer_class=PushNotificationsSerializer,
        permission_classes=(IsAuthenticated,),
    )
    def notifications_settings(self, request, *args, **kwargs):
        view_user_id = self.kwargs[self.lookup_url_kwarg or self.lookup_field]
        if view_user_id != 'profile' and str(view_user_id) != str(request.user.id):
            raise NotFound()

        return get_user_subscriptions(request.user.id)

    @notifications_settings.setter
    @transaction.atomic()
    def setter(self, instance, request, serializer, *args, **kwargs):
        user = request.user
        data = serializer.validated_data
        subscription_data = data.pop("subscription_data", None)
        language_code = data.pop("language_code", None)

        if subscription_data is None:
            # When calling this action client already know if the user
            # wants to unsubscribe from all. In this case he sends null in
            # subscription_data so we should delete subscription too.
            unsubscribe_device(request.session.session_key)
        else:
            # Otherwise client got or created subscription for us and we
            # should update or create it.
            subscribe_device(
                user_id=user.id,
                session_key=request.session.session_key,
                language_code=language_code,
                data=subscription_data,
            )

        update_user_subscriptions(user_id=user.id, subscriptions=data)

    @notifications_settings.deleter
    @transaction.atomic()
    def deleter(self, instance, request, *args, **kwargs):
        user_id = request.user.id
        WebPushNotificationSubscription.objects \
            .filter(user_id=user_id) \
            .update(enabled=False)
        WebPushDeviceSubscription.objects \
            .filter(user_id=user_id) \
            .delete()

    notifications_settings.__name__ = view_subpath
    return notifications_settings
