# pylint: disable=no-member,unused-argument
"""
Default serializer classes for web-api.
Read more in Django REST Framework documentation for
`Serializers <https://www.django-rest-framework.org/api-guide/serializers/>`_.
"""

import typing as _t

import orjson
from django.db import models
from django.http.request import QueryDict
from rest_framework import serializers, fields as drf_fields
from rest_framework.utils.field_mapping import get_relation_kwargs

from . import fields
from .. import utils
from ..models.fields import (
    NamedBinaryFileInJSONField,
    NamedBinaryImageInJSONField,
    MultipleNamedBinaryFileInJSONField,
    MultipleNamedBinaryImageInJSONField,
    MultipleFileField,
    MultipleImageField,
    FkModelField,
    HTMLField,
    WYSIWYGField,
)

VALID_FK_KWARGS = (
    'read_only',
    'label',
    'help_text',
    'allow_null',
    'required'
)


def update_declared_fields(
        serializer_class: _t.Type[serializers.ModelSerializer]
) -> _t.Type[serializers.ModelSerializer]:
    with utils.raise_context(verbose=False):
        # pylint: disable=protected-access
        serializer_class._declared_fields = serializer_class().get_fields()
    return serializer_class


class DependFromFkSerializerMixin:
    def to_internal_value(self, data):
        if self.instance is not None and self.partial and isinstance(data, _t.Dict):
            missed_interfield_connections: _t.Iterable[fields.DependFromFkField] = {
                f
                for f in self._writable_fields
                if isinstance(f, fields.DependFromFkField) and f.field in data and f.field_name not in data
            }
            for depend_field in missed_interfield_connections:
                data[depend_field.field_name] = getattr(self.instance, depend_field.field_name, None)

        return super().to_internal_value(data)


class SerializerMetaClass(serializers.SerializerMetaclass):
    @classmethod
    def _get_declared_fields(
            mcs,
            bases: _t.Sequence[type],
            attrs: _t.Dict[str, _t.Any]
    ) -> _t.Dict[str, drf_fields.Field]:
        if (meta := attrs.get('Meta')) and (generated_fields := getattr(meta, 'generated_fields', None)):
            field_fabric = getattr(
                meta,
                'generated_field_factory',
                lambda f: drf_fields.CharField(required=False, allow_blank=True, allow_null=True)
            )
            for field in generated_fields:
                field_name = field.replace('.', '_')
                if field_name not in attrs:
                    attrs[field_name] = field_fabric(field)
        return super()._get_declared_fields(bases=bases, attrs=attrs)


class BaseSerializer(DependFromFkSerializerMixin, serializers.Serializer, metaclass=SerializerMetaClass):
    """
    Default serializer with logic to work with objects.
    Read more in `DRF serializer's documentation
    <https://www.django-rest-framework.org/api-guide/serializers/#serializers>`_
    how to create Serializers and work with them.

    .. note::
        You can also setup ``generated_fields`` in class attribute ``Meta`` to get serializer
        with default CharField fields. Setup attribute ``generated_field_factory`` to change default fabric method.
    """

    def create(self, validated_data):  # nocv
        return validated_data

    def update(self, instance, validated_data):  # nocv
        if isinstance(instance, dict):
            instance.update(validated_data)
        else:
            for key, value in validated_data.items():
                setattr(instance, key, value)
        return instance


class VSTSerializer(DependFromFkSerializerMixin, serializers.ModelSerializer, metaclass=SerializerMetaClass):
    """
    Default model serializer based on :class:`rest_framework.serializers.ModelSerializer`.
    Read more in `DRF documentation <https://www.django-rest-framework.org/api-guide/serializers/#modelserializer>`_
    how to create Model Serializers.
    This serializer matches model fields to extended set of serializer fields.
    List of available pairs specified in  `VSTSerializer.serializer_field_mapping`.
    For example, to set :class:`vstutils.api.fields.FkModelField` in serializer use
    :class:`vstutils.models.fields.FkModelField` in a model.
    """
    # pylint: disable=abstract-method

    serializer_field_mapping = serializers.ModelSerializer.serializer_field_mapping
    serializer_field_mapping.update({
        models.CharField: fields.VSTCharField,
        models.TextField: fields.VSTCharField,
        models.FileField: fields.NamedBinaryFileInJsonField,
        models.ImageField: fields.NamedBinaryImageInJsonField,
        NamedBinaryFileInJSONField: fields.NamedBinaryFileInJsonField,
        NamedBinaryImageInJSONField: fields.NamedBinaryImageInJsonField,
        MultipleNamedBinaryFileInJSONField: fields.MultipleNamedBinaryFileInJsonField,
        MultipleNamedBinaryImageInJSONField: fields.MultipleNamedBinaryImageInJsonField,
        MultipleFileField: fields.MultipleNamedBinaryFileInJsonField,
        MultipleImageField: fields.MultipleNamedBinaryImageInJsonField,
        HTMLField: fields.HtmlField,
        WYSIWYGField: fields.WYSIWYGField,
    })

    def build_standard_field(self, field_name, model_field):
        field_class, field_kwargs = super().build_standard_field(field_name, model_field)
        if isinstance(model_field, models.FileField) and issubclass(field_class, fields.NamedBinaryFileInJsonField):
            field_kwargs['file'] = True
            if model_field.max_length:
                field_kwargs['max_length'] = model_field.max_length
                if isinstance(model_field.upload_to, str):
                    field_kwargs['max_length'] -= len(model_field.upload_to)
        return field_class, field_kwargs

    def build_relational_field(self, field_name, relation_info):
        if isinstance(relation_info.model_field, FkModelField) and \
                hasattr(relation_info.related_model, '__extra_metadata__'):

            field_kwargs = {
                key: value
                for key, value in get_relation_kwargs(field_name, relation_info).items()
                if key in VALID_FK_KWARGS
            }
            field_kwargs['select'] = relation_info.related_model

            autocomplete_property = field_kwargs.get('autocomplete_property', 'id')
            autocomplete_field = next(
                (f for f in relation_info.related_model._meta.fields if f.attname == autocomplete_property),
                relation_info.related_model._meta.pk
            )

            if isinstance(autocomplete_field, models.IntegerField):
                field_kwargs['field_type'] = int
            else:
                field_kwargs['field_type'] = str

            return fields.FkModelField, field_kwargs
        # if DRF ForeignField in model or related_model is not BModel, perform default DRF logic
        return super().build_relational_field(field_name, relation_info)


class EmptySerializer(BaseSerializer):
    """
    Default serializer for empty responses.
    In generated GUI this means that action button won't show additional view before execution.
    """


class DataSerializer(EmptySerializer):
    allowed_data_types = (
        str,
        dict,
        list,
        tuple,
        type(None),
        int,
        float
    )

    def to_internal_value(self, data):
        if isinstance(data, QueryDict):
            return data.dict()  # nocv
        return data if isinstance(data, self.allowed_data_types) else self.fail("Unknown type.")

    def to_representation(self, instance):
        if not isinstance(instance, (dict, list)):
            result = orjson.loads(instance)
            if isinstance(result, dict):
                result = utils.Dict(result)
            return result
        return instance


class JsonObjectSerializer(DataSerializer):
    pass


class ErrorSerializer(DataSerializer):
    detail = fields.VSTCharField(required=True)

    def to_internal_value(self, data):
        return data

    def to_representation(self, instance):
        return instance


class ValidationErrorSerializer(ErrorSerializer):
    detail = serializers.DictField(required=True)  # type: ignore


class OtherErrorsSerializer(ErrorSerializer):
    error_type = fields.VSTCharField(required=False, allow_null=True)
