# pylint: disable=no-member,unused-argument
"""
Default serializer classes for web-api.
Read more in Django REST Framework documentation for
`Serializers <https://www.django-rest-framework.org/api-guide/serializers/#modelserializer>`_.
"""


import json

from django.db import models
from rest_framework import serializers

from . import fields
from .. import utils


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

    """
    # pylint: disable=abstract-method

    serializer_field_mapping = serializers.ModelSerializer.serializer_field_mapping
    serializer_field_mapping.update({
        models.CharField: fields.VSTCharField,
        models.TextField: fields.VSTCharField,
    })


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
