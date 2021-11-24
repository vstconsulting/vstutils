from django.db import models
from rest_framework.fields import CharField, IntegerField
from vstutils.api import fields
from vstutils.api.serializers import BaseSerializer
from vstutils.models import BModel


class SomeSerializer(BaseSerializer):
    field1 = CharField()
    field2 = IntegerField()


class DynamicFields(BModel):
    field_type = models.CharField(max_length=100)
    dynamic_with_types = models.CharField(max_length=500)

    class Meta:
        _list_fields = _detail_fields = ['id', 'field_type', 'dynamic_with_types']
        _override_list_fields = _override_detail_fields = {
            'dynamic_with_types': fields.DynamicJsonTypeField(field='field_type', types={
                'serializer': SomeSerializer(),
                'many_serializers': SomeSerializer(many=True),
                'integer': IntegerField(max_value=1337),
                'boolean': 'boolean',
            }),
        }
