from django.db.models.base import Model
from django.db.models.manager import Manager
from .queryset import BQuerySet
from .base import ModelBaseClass


class BaseModel(Model, metaclass=ModelBaseClass):
    objects = Manager.from_queryset(BQuerySet)()

    class Meta:
        abstract = True
