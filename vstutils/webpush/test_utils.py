import uuid
from contextlib import contextmanager
from typing import Optional, Type
from unittest.mock import patch

import orjson
from django.contrib.auth import get_user_model
from django.test import Client

from .base import BaseWebPush
from .models import WebPushDeviceSubscription
from .utils import (
    SubscriptionData,
    subscribe_device,
    update_user_subscriptions,
)

User = get_user_model()


_patcher = patch('vstutils.webpush.models.webpush')
_mock = _patcher.start()


class Pushes:
    def __init__(self, sub: WebPushDeviceSubscription):
        self._sub = sub
        self.offset = 0
        self.limit = None

    def _get_calls(self):
        return _mock.mock_calls[self.offset:self.limit]

    def __enter__(self):
        self.offset = len(_mock.mock_calls)
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        self.limit = len(_mock.mock_calls)

    @property
    def pushes_data(self):
        return [
            orjson.loads(call.kwargs['data'])
            for call in self._get_calls()
            if self._sub.endpoint == call.kwargs['subscription_info']['endpoint']
        ]

    def assert_no_pushes(self):
        if self.pushes_data:
            raise AssertionError(f'Unexpected pushes: {self.pushes_data}')

    def assert_push(self, expected_data: dict):
        for data in self.pushes_data:
            if data == expected_data:
                return
        raise AssertionError(f'No push with data {expected_data} found')

    def assert_notification(self, expected_data: dict):
        self.assert_push({'type': 'notification', 'data': expected_data})

    def assert_count(self, count: int):
        if len(self.pushes_data) != count:
            raise AssertionError(f'Expected {count} pushes, got {len(self.pushes_data)}')


class Device:
    def __init__(self, sub: WebPushDeviceSubscription):
        self._sub = sub

    def _update_subscription(self, push: Type[BaseWebPush], enabled: bool):
        user = User.objects.get(id=self._sub.user_id)
        if not push.is_available(user):
            raise ValueError(f'Push {push} is not available for user {user}')
        update_user_subscriptions(self._sub.user_id, {
            push.get_key(): enabled
        })

    def set_language(self, language_code: str):
        self._sub.language_code = language_code
        self._sub.save()

    def subscribe(self, push: Type[BaseWebPush]):
        self._update_subscription(push, True)

    def unsubscribe(self, push: Type[BaseWebPush]):
        self._update_subscription(push, False)

    @contextmanager
    def receive(self):
        with Pushes(self._sub) as pushes:
            yield pushes


def _get_push_subscription_data(user_pk: int) -> SubscriptionData:
    return {
        "endpoint": f"http://push.service/api/{user_pk}_{uuid.uuid1()}",
        "expirationTime": None,
        "keys": {"auth": "auth", "p256dh": "p256dh"},
    }


def subscribe_user_device_to_pushes(user, language: Optional[str] = None):
    """
    Subscribes user device to pushes.
    """
    client = Client()
    client.force_login(user)
    data = _get_push_subscription_data(user.pk)
    endpoint = data["endpoint"]
    subscribe_device(
        session_key=client.session.session_key,
        user_id=user.id,
        data=data,
        language_code=language,
    )
    return Device(WebPushDeviceSubscription.objects.get(endpoint=endpoint))
