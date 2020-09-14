from django.db import models


class BaseManager(models.Manager):
    @classmethod
    def from_queryset(cls, queryset_class, class_name=None) -> models.Manager:
        ...
