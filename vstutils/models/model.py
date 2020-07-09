from django.db.models.base import Model
from .base import ModelBaseClass


class BaseModel(Model, metaclass=ModelBaseClass):

    class Meta:
        abstract = True
