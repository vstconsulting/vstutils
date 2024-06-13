import logging
from functools import lru_cache
from typing import Any, Iterable, List, Literal, Optional, TypedDict

from django.conf import settings
from pywebpush import WebPushException
from vstutils.api.models import Language
from vstutils.api.renderers import ORJSONRenderer

from .models import WebPushDeviceSubscription, WebPushNotificationSubscription

logger = logging.getLogger("vstutils.webpush")


class NotificationAction(TypedDict):
    action: str
    type: str
    title: str
    icon: Optional[str]


class NotificationOptions(TypedDict):
    body: Optional[str]
    icon: Optional[str]
    badge: Optional[str]
    image: Optional[str]
    timestamp: Optional[int]
    actions: Optional[List[NotificationAction]]
    data: Optional[Any]
    requireInteraction: Optional[bool]
    silent: Optional[bool]
    vibrate: Optional[List[int]]
    dir: Optional[Literal["auto", "ltr", "rtl"]]


class NotificationData(TypedDict):
    title: str
    options: NotificationOptions


@lru_cache(maxsize=len(settings.LANGUAGES))
def _cached_lang(code: str) -> Language:
    return Language.objects.get(code=code)


class BaseWebPush:
    """
    Base class for web push notifications. By default notification will not be shown on
    frontend, but you can add custom service worker code to handle it.
    """
    json_renderer = ORJSONRenderer()
    project: Optional[str] = None
    title: Optional[str] = None
    key: Optional[str] = None

    @classmethod
    def get_key(cls) -> str:
        return cls.key or (cls.__module__ + '_' + cls.__name__).replace('.', '_')

    def send(self):
        subscriptions = tuple(self.get_subscriptions())
        if not subscriptions:
            return

        self.prepare()
        inactive_subscription_ids = set()

        try:
            for subscription in subscriptions:
                try:
                    subscription.push(
                        self.json_renderer.render(
                            self.get_payload(_cached_lang(subscription.language_code))
                        ).decode()
                    )
                except WebPushException as exc:
                    if exc.response is not None and exc.response.status_code in {404, 410}:
                        inactive_subscription_ids.add(subscription.id)
                    else:
                        logger.error(
                            'Web push failed for subscription %s, response headers: %s',
                            subscription.id,
                            exc.response.headers if exc.response is not None else None,
                            exc_info=exc
                        )
        finally:
            if inactive_subscription_ids:
                logger.debug('Deleting inactive subscriptions: %s', inactive_subscription_ids)
                WebPushDeviceSubscription.objects.filter(
                    id__in=inactive_subscription_ids
                ).delete()

    @classmethod
    def send_in_task(cls, *args, **kwargs):
        from .tasks import send_webpushes  # pylint: disable=import-outside-toplevel
        return send_webpushes.apply_async((
            cls.__module__ + '.' + cls.__name__,
            args,
            kwargs,
        ))

    def prepare(self):
        """
        Called before sending notification.
        """

    @staticmethod
    def is_available(user) -> bool:
        return True

    def get_users_ids(self) -> Iterable[int]:
        raise NotImplementedError

    def get_subscriptions(self) -> Iterable[WebPushDeviceSubscription]:
        return WebPushDeviceSubscription.objects.filter(
            user_id__in=WebPushNotificationSubscription.objects.filter(
                type=self.get_key(),
                enabled=True,
                user_id__in=self.get_users_ids(),
            ).values('user_id'),
        )

    def get_payload(self, lang: Language) -> Any:
        raise NotImplementedError


class BaseWebPushNotification(BaseWebPush):
    """
    Base class for web push notifications that will be shown on to user on frontend.
    """
    def get_payload(self, lang: Language) -> Any:
        return {
            "type": "notification",
            "data": self.get_notification(lang),
        }

    def get_notification(self, lang: Language) -> NotificationData:
        raise NotImplementedError
