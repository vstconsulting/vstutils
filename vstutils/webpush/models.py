from uuid import uuid4

import orjson
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.sessions.models import Session
from django.db import models
from django.db.models.signals import post_delete
from django.dispatch import receiver
from pywebpush import webpush
from vstutils.models import BaseModel

User = get_user_model()


@receiver(post_delete, sender=User)
def remove_push_subscriptions(instance, **kwargs):
    WebPushNotificationSubscription.objects.filter(user_id=instance.id).delete()


class WebPushDeviceSubscription(BaseModel):
    id = models.UUIDField(primary_key=True, default=uuid4)
    user_id = models.IntegerField(db_index=True)
    session = models.ForeignKey(Session, on_delete=models.CASCADE)
    endpoint = models.TextField(unique=True, db_index=True)
    language_code = models.CharField(max_length=24, default=settings.LANGUAGE_CODE)
    _data = models.BinaryField()

    class Meta:
        default_related_name = 'webpush_device_subscriptions'

    @property
    def data(self):
        return orjson.loads(self._data)

    def push(self, json_push_data: str):
        if settings.WEBPUSH_ENABLED:
            webpush(
                subscription_info={'endpoint': self.endpoint, **self.data},
                data=json_push_data,
                vapid_private_key=settings.WEBPUSH_PRIVATE_KEY,
                vapid_claims={'sub': f'mailto:{settings.WEBPUSH_SUB_EMAIL}'},
                ttl=60*15,
            )


class WebPushNotificationSubscription(BaseModel):
    id = models.UUIDField(primary_key=True, default=uuid4)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    type = models.CharField(max_length=200)
    enabled = models.BooleanField(default=False)

    class Meta:
        default_related_name = 'webpush_notification_subscriptions'
        constraints = (
            models.UniqueConstraint(
                fields=('user', 'type'),
                include=('enabled',),
                name='uniq_user_push_type',
            ),
        )
