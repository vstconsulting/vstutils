# pylint: disable=no-member,unused-argument
"""
Default serializer classes for web-api.
Read more in Django REST Framework documentation for
`Serializers <https://www.django-rest-framework.org/api-guide/serializers/>`_.
"""
import copy
from decimal import Decimal as D
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


class DisplayMode(utils.BaseEnum):
    """
    Enumeration for specifying how a serializer should be displayed on the frontend.

    This class is used to set the ``_display_mode`` property in a serializer to control its UI behavior.

    Example:

        To set the display mode to steps:

        .. code-block:: python

            class MySerializer(serializers.Serializer):
                _display_mode = DisplayMode.STEP
                # Define serializer fields here

        To use the default display mode:

        .. code-block:: python

            class MySerializer(serializers.Serializer):
                _display_mode = DisplayMode.DEFAULT
                # Define serializer fields here

    Using `DisplayMode` allows developers to customize the interface based on the workflow needs,
    making forms and data entry more user-friendly and intuitive.

    """

    DEFAULT = utils.BaseEnum.SAME
    """Will be used if no mode provided."""

    STEP = utils.BaseEnum.SAME
    """Each properties group displayed as separate tab. On creation displayed as multiple steps."""


class DisplayModeList(utils.BaseEnum):
    """
    Enumeration for specifying how a list serializer should be displayed on the frontend.

    This class is used to set the ``_display_mode_list`` property in a list serializer
    to control its UI behavior when dealing with multiple instances.

    Example:

        To set the list display mode to table view:

        .. code-block:: python

            class MyRowSerializer(serializers.Serializer):
                _display_mode_list = DisplayModeList.TABLE
                # Define serializer fields here


            class MySerializer(serializers.Serializer):
                items = MyRowSerializer(many=True)

        To use the default list display mode ensure that class doesn't have ``_display_mode_list`` class property or
        set value to ``DisplayModeList.DEFAULT``.

    `DisplayModeList` enables developers to tailor the appearance of list serializers,
    ensuring that users can interact with multiple data entries effectively in the interface.
    """

    DEFAULT = utils.BaseEnum.SAME
    """It will be displayed as a standard list of JSON objects."""

    TABLE = utils.BaseEnum.SAME
    """It will be displayed as a table view."""


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

    This serializer serves as a base class for creating serializers to work with non-model objects.
    It extends the 'rest_framework.serializers.Serializer' class and includes additional logic
    for handling object creation and updating.

    .. note::
        You can set the ``generated_fields`` attribute in the ``Meta`` class to automatically include
        default CharField fields. You can also customize the field creation using the ``generated_field_factory``
        attribute.

    Example:

        .. code-block:: python

            class MySerializer(BaseSerializer):
                class Meta:
                    generated_fields = ['additional_field']
                    generated_field_factory = lambda f: drf_fields.IntegerField()

        In this example, the ``MySerializer`` class extends ``BaseSerializer`` and includes an additional generated field.
    """  # noqa: E501

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

    Example:

        .. code-block:: python

            class MyModel(models.Model):
                name = models.CharField(max_length=255)

            class MySerializer(VSTSerializer):
                class Meta:
                    model = MyModel

        In this example, the ``MySerializer`` class extends ``VSTSerializer`` and
        is associated with the ``MyModel`` model.
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
        if isinstance(model_field, models.GeneratedField):
            model_field_copy = copy.copy(model_field.output_field)
            model_field_copy.model = model_field.model
            field_class, field_kwargs = super().build_standard_field(field_name, model_field_copy)
            field_kwargs['read_only'] = True
        else:
            field_class, field_kwargs = super().build_standard_field(field_name, model_field)

        if isinstance(model_field, models.FileField) and issubclass(field_class, fields.NamedBinaryFileInJsonField):
            field_kwargs['file'] = True
            if model_field.max_length:
                field_kwargs['max_length'] = model_field.max_length
                if isinstance(model_field.upload_to, str):
                    field_kwargs['max_length'] -= len(model_field.upload_to)

        if issubclass(field_class, fields.NamedBinaryFileInJsonField) and isinstance(model_field, models.TextField):
            if isinstance(model_field.default, str):
                field_kwargs['default'] = orjson.loads(model_field.default) if model_field.default else drf_fields.empty

        if issubclass(field_class, drf_fields.DecimalField):
            for key in filter(field_kwargs.__contains__, ('min_value', 'max_value')):
                field_kwargs[key] = D(str(field_kwargs[key]))

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
