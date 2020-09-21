# pylint: disable=no-member,unused-argument
"""
Default serializer classes for web-api.
Read more in Django REST Framework documentation for
`Serializers <https://www.django-rest-framework.org/api-guide/serializers/#modelserializer>`_.
"""

from __future__ import unicode_literals

import json
from django.db import models
from rest_framework import serializers
from . import fields
from .. import utils


class BaseSerializer(serializers.Serializer):
    # pylint: disable=abstract-method
    pass


class VSTSerializer(serializers.ModelSerializer):
    """
    Default model serializer based on rest_framework.serializers.ModelSerializer.
    """
    # pylint: disable=abstract-method

    serializer_field_mapping = serializers.ModelSerializer.serializer_field_mapping
    serializer_field_mapping.update({
        models.CharField: fields.VSTCharField,
        models.TextField: fields.VSTCharField,
    })


class EmptySerializer(serializers.Serializer):
    """ Default serializer for empty responses. """

    def create(self, validated_data):  # nocv
        return validated_data

    def update(self, instance, validated_data):  # nocv
        return instance


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
