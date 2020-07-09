from ..api.base import GenericViewSet
from django.db.models.base import ModelBase


class ModelBaseClass(ModelBase):
    generated_view: GenericViewSet
