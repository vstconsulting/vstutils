from typing import Dict, Optional, TypedDict

import orjson
from django.conf import settings
from django.db import connections

from .models import WebPushDeviceSubscription, WebPushNotificationSubscription


class SubscriptionData(TypedDict):
    """
    See https://developer.mozilla.org/en-US/docs/Web/API/PushSubscription/toJSON
    """
    endpoint: str
    keys: dict
    expirationTime: Optional[float]


def subscribe_device(
    session_key: str,
    user_id: int,
    data: SubscriptionData,
    language_code: Optional[str] = None,
):
    WebPushDeviceSubscription.objects.update_or_create(
        endpoint=data.pop('endpoint'),
        defaults={
            "session_id": session_key,
            "user_id": user_id,
            "_data": orjson.dumps(data),
            "language_code": language_code or settings.LANGUAGE_CODE,
        },
    )


def unsubscribe_device(session_key):
    WebPushDeviceSubscription.objects.filter(session_id=session_key).delete()


def update_user_subscriptions(user_id: int, subscriptions: Dict[str, bool]):
    items = (
        WebPushNotificationSubscription(
            user_id=user_id,
            type=key,
            enabled=enabled,
        )
        for key, enabled in subscriptions.items()
    )

    if connections[WebPushNotificationSubscription.objects.db].vendor == 'sqlite':
        # workaround which is needed because sqlite doesn't work with
        # multiple fields unique constraint
        WebPushNotificationSubscription.objects \
            .filter(user_id=user_id, type__in=subscriptions.keys()) \
            .delete()
        WebPushNotificationSubscription.objects.bulk_create(items)
    else:  # nocv
        WebPushNotificationSubscription.objects.bulk_create(
            items,
            update_conflicts=True,
            update_fields=("enabled",),
            unique_fields=("user", "type"),
        )
