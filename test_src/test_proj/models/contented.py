import uuid
from django.db import models
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey, GenericRelation
from vstutils.models import BModel


class Variable(BModel):
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id')
    value = models.CharField(max_length=512)

    class Meta:
        _list_fields = (
            'id',
            'value'
        )
        _view_class = 'vstutils.api.base.ModelViewSet'


class VarBasedModel(BModel):
    name = models.CharField(max_length=512, default=uuid.uuid1)
    variables = GenericRelation(Variable, related_query_name="variables",
                                object_id_field="object_id")

    class Meta:
        _list_fields = [
            'id',
            'name',
        ]
