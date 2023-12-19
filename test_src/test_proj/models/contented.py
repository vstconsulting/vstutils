import uuid
from django.db import models
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey, GenericRelation
from rest_framework import fields as drf_fields
from vstutils.models import BModel
from vstutils.api.filter_backends import VSTFilterBackend
from vstutils.api.serializers import BaseSerializer, DisplayMode
from vstutils.api.fields import FkModelField, DependFromFkField
from vstutils.api.base import ModelViewSet


class TestFilterSerializer(BaseSerializer):
    test = drf_fields.IntegerField(required=False, default=None, allow_null=True)


class TestFilterBackendWithSerializer(VSTFilterBackend):
    serializer_class = TestFilterSerializer

    def filter_queryset(self, request, queryset, view):
        return queryset.annotate(**{
            k: models.Value(v, output_field=models.IntegerField(null=True))
            for k,v in self.get_serialized_query_params(request, view).items()
        },)


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


class TestFkFilterSerializer(BaseSerializer):
    key_query = FkModelField(select=VariableType, required=False)


class TestFkFilterBackend(VSTFilterBackend):
    serializer_class = TestFkFilterSerializer

    def filter_queryset(self, request, queryset, view):
        key = self.get_serialized_query_params(request, view).get('key_query')
        return queryset if not key else queryset.filter(key=key)


class Variable(BModel):
    _cache_responses = True
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
        _filter_backends = [TestFilterBackendWithSerializer, TestFkFilterBackend]
        _search_fields = _list_fields


class SubVariablesSerializer(BaseSerializer):
    _hide_not_required = True
    _display_mode = DisplayMode.STEP

    key = drf_fields.CharField(read_only=True)
    value = drf_fields.CharField(read_only=True)


class VarBasedModel(BModel):
    """
    Variables based model.

    create:
        Create new model based on variables.

    retrieve:
        Return an variable-based instance.
    """
    _cache_responses = True
    name = models.CharField(max_length=512, default=uuid.uuid1)
    variables = GenericRelation(Variable, related_query_name="variables",
                                object_id_field="object_id")

    class Meta:
        _view_class = ModelViewSet
        _list_fields = [
            'name',
        ]
        _detail_fields = _list_fields + [
            'variables_list',
            'variables_ser',
        ]
        _override_detail_fields = {
            'variables_list': drf_fields.ListField(read_only=True, child=drf_fields.DictField(read_only=True)),
            'variables_ser': SubVariablesSerializer(many=True, read_only=True)
        }
        _nested = {
            'vars': {
                'manager_name': 'variables',
                'allow_append': False,
                'model': 'test_proj.models.contented.Variable',
            }
        }

    @property
    def variables_list(self):
        return list(self.variables.values('key', 'value'))
