from vstutils.api.models import Language
from vstutils.webpush.base import BaseWebPush, BaseWebPushNotification
from vstutils.webpush.models import WebPushDeviceSubscription, WebPushNotificationSubscription


class TestWebPush(BaseWebPush):
    """
    Webpush that is sent to all subscribed users
    """

    def get_subscriptions(self):
        return WebPushDeviceSubscription.objects.filter(
            user_id__in=WebPushNotificationSubscription.objects.filter(
                type=self.get_key(),
                enabled=True,
            ).values('user_id'),
        )

    def get_payload(self, lang: Language):
        return {"some": "data", "lang": lang.code}


class TestNotification(BaseWebPushNotification):
    """
    Webpush notification that is sent only to selected users
    """

    def __init__(self, name: str, user_id: int):
        self.name = name
        self.user_id = user_id
        self.message = f"Hello {self.name}"

    def get_users_ids(self):
        return (self.user_id,)

    def get_notification(self, lang: Language):
        return {
            "title": self.message,
            "options": {
                "body": "Test notification body",
                "data": {"url": "/"},
            },
        }


class StaffOnlyNotification(BaseWebPushNotification):
    """
    Webpush notification that only staff user can subscribe to.
    """

    @staticmethod
    def is_available(user):
        return user.is_staff


class NotificationFromOtherApp(BaseWebPushNotification):
    """
    Webpush notification from other project that should not be available in ui
    """
    project = 'other_project'
