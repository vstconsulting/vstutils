from django.db import models
from rest_framework.fields import CharField, IntegerField
from rest_framework.serializers import Serializer
from vstutils.api import fields
from vstutils.api.serializers import BaseSerializer
from vstutils.models import BModel


class SomeField(CharField):
    def to_representation(self, value):
        representation = super().to_representation(value)
        assert isinstance(self.parent, (SomeSerializer, fields.DynamicJsonTypeField))
        assert isinstance(self.root, Serializer)
        assert self.context != {}
        return representation


class SomeSerializer(BaseSerializer):
    field1 = SomeField()
    field2 = IntegerField()


class DynamicFields(BModel):
    field_type = models.CharField(max_length=100)
    dynamic_with_types = models.CharField(max_length=500)

    class Meta:
        _list_fields = _detail_fields = ['id', 'field_type', 'dynamic_with_types']
        _override_list_fields = {
            'dynamic_with_types': fields.DynamicJsonTypeField(field='field_type', types={
                'serializer': SomeSerializer(),
                'many_serializers': SomeSerializer(many=True),
                'integer': IntegerField(max_value=1337),
                'boolean': 'boolean',
                'image':  fields.NamedBinaryImageInJsonField(),
                'context_depend': SomeField()
            }),
        }
        _override_detail_fields = {
            'dynamic_with_types': fields.DynamicJsonTypeField(
                source_view='<<parent>>.<<parent>>',
                field='field_type',
                types={
                'serializer': SomeSerializer(),
                'many_serializers': SomeSerializer(many=True),
                'integer': IntegerField(max_value=1337),
                'boolean': 'boolean',
                'image':  fields.NamedBinaryImageInJsonField(),
                'context_depend': SomeField()
            }),
        }
