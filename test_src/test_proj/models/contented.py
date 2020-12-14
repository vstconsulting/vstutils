import uuid
from django.db import models
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey, GenericRelation
from rest_framework import fields as drf_fields
from vstutils.models import BModel
from vstutils.api.fields import FkModelField, DependFromFkField, VSTCharField


class VariableType(BModel):
    val_type_fields_mapping = {
        'integer': drf_fields.IntegerField(min_value=1, max_value=10),
        'text': drf_fields.CharField(max_length=10),
    }

    name = models.CharField(max_length=128)
    val_type = models.CharField(max_length=128)

    class Meta:
        default_related_name = 'vartypes'
        _list_fields = (
            'name',
            'val_type',
        )


class Variable(BModel):
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id')
    key = models.ForeignKey(VariableType, on_delete=models.CASCADE, blank=True, default=None)
    value = models.CharField(max_length=512)

    class Meta:
        _list_fields = (
            'key',
            'value',
        )
        _override_list_fields = _override_detail_fields = {
            'key': FkModelField(select='test_proj.VariableType'),
            'value': DependFromFkField(field='key', field_attribute='val_type'),
        }
        _view_class = 'vstutils.api.base.ModelViewSet'


class VarBasedModel(BModel):
    name = models.CharField(max_length=512, default=uuid.uuid1)
    variables = GenericRelation(Variable, related_query_name="variables",
                                object_id_field="object_id")

    class Meta:
        _list_fields = [
            'name',
        ]
        _nested = {
            'vars': {
                'manager_name': 'variables',
                'allow_append': False,
                'model': 'test_proj.models.contented.Variable'
            }
        }
