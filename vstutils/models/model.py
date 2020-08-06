from django.db.models.base import Model
from .manager import BaseManager
from .queryset import BQuerySet
from .base import ModelBaseClass


class BaseModel(Model, metaclass=ModelBaseClass):
    objects = BaseManager.from_queryset(BQuerySet)()

    class Meta:
        abstract = True
