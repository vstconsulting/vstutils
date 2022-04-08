import typing as _t
import logging
import uuid

from django.db.models import signals
from django.conf import settings
from django.contrib.auth import get_user_model
from cent import Client as CentrifugoClient  # type: ignore

from .base import get_proxy_labels
from ..utils import raise_context_decorator_with_default, raise_context
from .model import BaseModel


logger = logging.getLogger('vstutils')


class Notificator:
    client_class = CentrifugoClient
    default_channel = "subscriptions_update"

    queue: _t.List[_t.Tuple[_t.Sequence[_t.Text], _t.Any]]
    cent_client: CentrifugoClient
    channel: _t.Text

    def __init__(self, queue=None, client=None, channel=None):
        self.queue = queue or []
        self.cent_client = client or self.get_client()
        self.channel = channel or self.default_channel
        self._signals: _t.List[signals.ModelSignal] = []
        if self.cent_client is not None:
            self.connect_signal(signals.post_save)
            self.connect_signal(signals.post_delete)
        logger.debug(f'Notificator for channel {self.channel} initialized.')

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
            ((model._meta.label, *get_proxy_labels(model)), instance.pk)
        )

    def create_notification(self, label, pk):
        if isinstance(label, str):
            label = (label,)
        self.queue.append(
            (label, pk)
        )

    @raise_context_decorator_with_default()
    def send(self):
        self.queue, objects = [], set(self.queue)
        logger.debug(f'Send notifications about {len(objects)} updates.')

        for labels, pk in objects:
            if isinstance(pk, uuid.UUID):
                pk = str(pk)
            with raise_context():
                self.cent_client.add("publish", self.cent_client.get_publish_params(
                    self.channel,
                    {
                        "subscribe-label": labels,
                        "pk": pk
                    }
                ))
        if objects:
            return self.cent_client.send()

    def disconnect_all(self):
        for signal in self._signals:
            self.disconnect_signal(signal)

    def __del__(self):
        self.disconnect_all()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.send()
        self.disconnect_all()
