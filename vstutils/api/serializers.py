# pylint: disable=no-member,unused-argument
"""
Default serializer classes for web-api.
Read more in Django REST Framework documentation for
`Serializers <https://www.django-rest-framework.org/api-guide/serializers/#modelserializer>`_.
"""


import json

from django.db import models
from rest_framework import serializers
from rest_framework.utils.field_mapping import get_relation_kwargs

from . import fields
from .. import utils
from ..models.fields import (
    NamedBinaryFileInJSONField,
    NamedBinaryImageInJSONField,
    MultipleNamedBinaryFileInJSONField,
    MultipleNamedBinaryImageInJSONField,
    FkModelField
)

VALID_FK_KWARGS = (
    'read_only',
    'label',
    'help_text',
    'allow_null',
    'required'
)


class BaseSerializer(serializers.Serializer):
    """
    Default and simple serializer with default logic to work with objects.
    Read more in `DRF documentation <https://www.django-rest-framework.org/api-guide/serializers/#serializers>`_
    how to create Serializers and work with them.
    """

    # pylint: disable=abstract-method

    def create(self, validated_data):  # nocv
        return validated_data

    def update(self, instance, validated_data):  # nocv
        if isinstance(instance, dict):
            instance.update(validated_data)
        else:
            for key, value in validated_data.items():
                setattr(instance, key, value)
        return instance


class VSTSerializer(serializers.ModelSerializer):
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
    })

    def build_standard_field(self, field_name, model_field):
        field_class, field_kwargs = super().build_standard_field(field_name, model_field)
        if isinstance(model_field, models.FileField) and issubclass(field_class, fields.NamedBinaryFileInJsonField):
            field_kwargs['file'] = True
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

            return fields.FkModelField, field_kwargs
        # if DRF ForeignField in model or related_model is not BModel, perform default DRF logic
        return super().build_relational_field(field_name, relation_info)


class EmptySerializer(BaseSerializer):
    """
    Default serializer for empty responses.
    In generated GUI this means simple action button which will not show additional view before execution.
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
        return data if isinstance(data, self.allowed_data_types) else self.fail("Unknown type.")

    def to_representation(self, value):
        if not isinstance(value, (dict, list)):
            result = json.loads(value)
            if isinstance(result, dict):
                result = utils.Dict(result)
            return result
        return value


class JsonObjectSerializer(DataSerializer):
    pass


class ErrorSerializer(DataSerializer):
    detail = fields.VSTCharField(required=True)

    def to_internal_value(self, data):
        return data

    def to_representation(self, value):
        return value


class ValidationErrorSerializer(ErrorSerializer):
    detail = serializers.DictField(required=True)  # type: ignore


class OtherErrorsSerializer(ErrorSerializer):
    error_type = fields.VSTCharField(required=False, allow_null=True)
