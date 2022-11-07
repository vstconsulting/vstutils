# cython: binding=True
import typing as _t
import logging

import orjson
from django.db.models import signals
from django.conf import settings
from django.contrib.auth import get_user_model
from cent import Client as CentrifugoClient  # type: ignore

from .base import get_proxy_labels
from ..utils import raise_context_decorator_with_default, raise_context
from .model import BaseModel
from ..api.renderers import ORJSONRenderer

logger = logging.getLogger('vstutils')


class Notificator:
    client_class = CentrifugoClient

    queue: _t.List[_t.Tuple[_t.Sequence[_t.Text], _t.Any]]
    cent_client: CentrifugoClient
    label: _t.Text

    _json_renderer = ORJSONRenderer()

    def __init__(self, queue=None, client=None, label=None):
        self.queue = queue or []
        self.cent_client = client or self.get_client()
        self.label = label
        self._signals: _t.List[signals.ModelSignal] = []
        if self.cent_client is not None:
            self.connect_signal(signals.post_save)
            self.connect_signal(signals.post_delete)

    def connect_signal(self, signal: signals.ModelSignal):
        if signal not in self._signals:
            signal.connect(self.signal_handler)
            self._signals.append(signal)

    def disconnect_signal(self, signal: signals.ModelSignal):
        if signal in self._signals:
            signal.disconnect(self.signal_handler)

    def signal_handler(self, instance, *args, **kwargs):
        if isinstance(instance, (BaseModel, get_user_model())) and getattr(instance, '_notify_update', True):
            self.create_notification_from_instance(instance)

    @raise_context_decorator_with_default(verbose=False)
    def get_client(self):
        centrifugo_client_kwargs = {**settings.CENTRIFUGO_CLIENT_KWARGS}
        centrifugo_client_kwargs.pop('token_hmac_secret_key', None)
        logger.debug(f"Getting Centrifugo client with kwargs: {centrifugo_client_kwargs}")
        return self.client_class(**centrifugo_client_kwargs)

    def create_notification_from_instance(self, instance):  # pylint: disable=invalid-name
        model = instance.__class__
        self.queue.append(
            ((model._meta.label, *get_proxy_labels(model)), {'pk': instance.pk})
        )

    def create_notification(self, labels, data):
        if isinstance(labels, str):
            labels = (labels,)
        data = orjson.loads(self._json_renderer.render(data) or '{}')
        self.queue.append(
            (labels, data)
        )

    @raise_context_decorator_with_default()
    def send(self):
        self.queue, objects = [], tuple(self.queue)

        sent_channels = set()
        provided_label = self.label
        for obj_labels, data in objects:
            with raise_context():
                for obj_label in obj_labels:
                    channel = self.get_subscription_channel(provided_label or obj_label)
                    self.cent_client.add("publish", self.cent_client.get_publish_params(
                        channel=channel,
                        data=data,
                    ))
                    sent_channels.add(channel)
        if objects:
            logger.debug(f'Send notifications about {len(objects)} updates to channel(s) {sent_channels}.')
            return self.cent_client.send()

    def disconnect_all(self):
        for signal in self._signals:
            self.disconnect_signal(signal)

    def get_subscription_channel(self, label: str):
        return f'{settings.SUBSCRIPTIONS_PREFIX}.{label}'

    def __del__(self):
        self.disconnect_all()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.send()
        self.disconnect_all()
