# cython: binding=True
import typing as _t
import logging
import contextlib

import orjson
from asgiref.sync import async_to_sync
from django.db.models import signals
from django.conf import settings
from django.contrib.auth import get_user_model
from cent import AsyncClient as CentrifugoClient, BatchRequest, PublishRequest

from .base import get_proxy_labels
from ..utils import raise_context_decorator_with_default
from .model import BaseModel
from ..api.renderers import ORJSONRenderer

logger = logging.getLogger('vstutils')


class Notificator:
    __slots__ = ('queue', 'cent_client', 'label', '_signals', '__weakref__')
    client_class = CentrifugoClient
    _json_renderer = ORJSONRenderer()

    def __init__(self, queue=None, client=None, label=None, autoconnect=True):
        self.queue = queue or []
        self.cent_client = client
        self.label = label
        self._signals: _t.List[signals.ModelSignal] = []
        if autoconnect and self.is_usable():
            self.connect_signal(signals.post_save)
            self.connect_signal(signals.post_delete)

    def is_usable(self):
        return bool(settings.CENTRIFUGO_CLIENT_KWARGS) or self.cent_client  # nocv

    def connect_signal(self, signal):
        if signal not in self._signals:
            signal.connect(self.signal_handler)
            self._signals.append(signal)

    def disconnect_signal(self, signal):
        if signal in self._signals:
            signal.disconnect(self.signal_handler)
            self._signals.remove(signal)

    def signal_handler(self, instance, *args, **kwargs):
        if isinstance(instance, (BaseModel, get_user_model())) and getattr(instance, '_notify_update', True):
            self.create_notification_from_instance(instance)

    def get_openapi_secret(self):
        return settings.CENTRIFUGO_CLIENT_KWARGS.get('token_hmac_secret_key', '')

    @raise_context_decorator_with_default(verbose=False)
    def get_client(self):
        centrifugo_client_kwargs = {
            'api_url': settings.CENTRIFUGO_CLIENT_KWARGS['address'],
            'api_key': settings.CENTRIFUGO_CLIENT_KWARGS['api_key'],
            'timeout': settings.CENTRIFUGO_CLIENT_KWARGS.get('timeout'),
        }
        logger.debug(f"Getting Centrifugo client with kwargs: {centrifugo_client_kwargs}")
        return self.client_class(**centrifugo_client_kwargs)

    def create_notification_from_instance(self, instance):  # pylint: disable=invalid-name
        if not self.is_usable():
            return  # nocv
        model = instance.__class__
        self.queue.append(
            ((model._meta.label, *get_proxy_labels(model)), {'pk': instance.pk})
        )

    def create_notification(self, labels, data):
        if not self.is_usable():
            return  # nocv
        if isinstance(labels, str):
            labels = (labels,)
        data = orjson.loads(self._json_renderer.render(data) or '{}')
        self.queue.append(
            (labels, data)
        )

    def clear_messages(self):
        self.queue.clear()

    def send(self):
        with contextlib.suppress(Exception):
            return async_to_sync(self.asend)()

    async def asend(self):
        try:
            self.queue, objects = [], tuple(self.queue)

            sent_channels = set()
            provided_label = self.label

            if objects and self.cent_client is None:
                self.cent_client = self.get_client()
                if not self.cent_client:
                    return

            publish_requests: list[PublishRequest] = []

            for obj_labels, data in objects:
                with contextlib.suppress(Exception):
                    for obj_label in obj_labels:
                        channel = self.get_subscription_channel(provided_label or obj_label)
                        publish_requests.append(PublishRequest(
                            channel=channel,
                            data=data,
                        ))
                        sent_channels.add(channel)
            if publish_requests:
                logger.debug(f'Send notifications about {len(objects)} updates to channel(s) {sent_channels}.')
                return await self.cent_client.batch(
                    BatchRequest(requests=publish_requests),
                )
        except Exception:  # nocv
            # Hack for problems with async middleware
            pass

    def disconnect_all(self):
        for signal in self._signals:
            self.disconnect_signal(signal)

    def get_subscription_channel(self, label):
        return f'{settings.SUBSCRIPTIONS_PREFIX}.{label}'

    def __del__(self):
        logger.log(logging.NOTSET, 'Disconnect all notification signals.')
        self.disconnect_all()
        logger.log(logging.NOTSET, 'Disconnected all notification signals.')

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.is_usable():
            self.send()
