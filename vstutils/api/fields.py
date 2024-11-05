"""
Additional serializer fields for generating OpenAPI and GUI.
"""
import inspect
# pylint: disable=too-many-lines
import logging
import typing as _t
import copy
import functools
import base64
import uuid
from urllib.parse import quote

import orjson
from rest_framework.serializers import CharField, IntegerField, FloatField, ModelSerializer, Serializer, DictField
from rest_framework.fields import empty, SkipField, get_error_detail, Field, BooleanField, get_attribute
from rest_framework.exceptions import ValidationError
from django.apps import apps
from django.db import models
from django.utils.html import escape, strip_tags
from django.utils.functional import SimpleLazyObject, lazy, cached_property
from django.core.exceptions import ValidationError as DjangoValidationError, ImproperlyConfigured
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db.models.fields.files import FieldFile
from vstutils.api.validators import ascii_string_validator

from .renderers import ORJSONRenderer
from ..models import fields as vst_model_fields
from ..utils import (
    raise_context,
    get_if_lazy,
    raise_context_decorator_with_default,
    translate,
    lazy_translate,
    raise_misconfiguration,
)

DependenceType = _t.Optional[_t.Dict[_t.Text, _t.Text]]
DEFAULT_NAMED_FILE_DATA = {"name": None, "content": None, 'mediaType': None}
renderer: _t.Callable[..., bytes] = functools.partial(ORJSONRenderer().render, media_type=ORJSONRenderer.media_type)


class VSTCharField(CharField):
    """
    CharField (extends :class:`rest_framework.fields.CharField`).
    This field translate any json type to string for model.
    """

    def to_internal_value(self, data) -> _t.Text:
        with raise_context():
            if not isinstance(data, str):
                data = renderer(data).decode('utf-8')
        data = str(data)
        return super().to_internal_value(data)


class FileInStringField(VSTCharField):
    """
    This field extends :class:`.VSTCharField` and stores the content of a file as a string.

    The value must be text (not binary) and is saved in the model as is.

    :param media_types: A list of MIME types to filter on the user's side.
                        Supports the use of ``*`` as a wildcard. Default: ``['*/*']``
    :type media_types: tuple, list

    .. note::
        This setting only takes effect in the GUI. In the API, it behaves like :class:`.VSTCharField`.
    """

    def __init__(self, **kwargs):
        self.media_types = kwargs.pop('media_types', ('*/*',))
        super().__init__(**kwargs)


class SecretFileInString(FileInStringField):
    """
    This field extends :class:`.FileInStringField` but hides its value in the admin interface.

    The value must be text (not binary) and is saved in the model as is.

    :param media_types: A list of MIME types to filter on the user's side.
                        Supports the use of ``*`` as a wildcard. Default: ``['*/*']``
    :type media_types: tuple, list

    .. note::
        This setting only takes effect in the GUI. In the API, it behaves like :class:`.VSTCharField`.
    """

    def __init__(self, **kwargs):
        kwargs['style'] = {'input_type': 'password'}
        super().__init__(**kwargs)


class BinFileInStringField(FileInStringField):
    """
    This field extends :class:`.FileInStringField` and is specifically designed to handle binary files.
    In the GUI, it functions as a file input field, accepting binary files from the user, which are then
    converted to base64-encoded strings and stored in this field.

    :param media_types: A list of MIME types to filter on the user's side.
                        Supports the use of ``*`` as a wildcard. Default: `['*/*']`
    :type media_types: tuple, list

    .. note::
        This functionality is effective only in the GUI. In the API, it behaves similarly to :class:`.VSTCharField`.
    """


class CSVFileField(FileInStringField):
    """
    Field extends :class:`.FileInStringField`, using for works with csv files.
    This field provides the display of the loaded data in the form of a table.

    :param items: The config of the table. This is a drf or vst serializer which includes char fields
                  which are the keys in the dictionaries into which the data from csv is serialized
                  and the names for columns in a table.
                  The fields must be in the order you want them to appear in the table.
                  Following options may be included:

                  - ``label``: human readable column name
                  - ``required``: Defines whether the field should be required. False by default.

    :type items: Serializer

    :param min_column_width: Minimum cell width. Default is 200 px.
    :type min_column_width: int

    :param delimiter: The delimiting character.
    :type delimiter: str

    :param lineterminator: The newline sequence.
                           Leave blank to auto-detect. Must be one of ``\\r``, ``\\n``, or ``\\r\\n``.
    :type lineterminator: str

    :param quotechar: The character used to quote fields.
    :type quotechar: str

    :param escapechar: The character used to escape the quote character within a field.
    :type escapechar: str

    :param media_types: List of MIME types to select on the user's side.
                        Supported syntax using ``*``. Default: ``['text/csv']``
    :type media_types: tuple,list
    """

    items: Serializer
    min_column_width: int
    parser_config: _t.Mapping

    # Map python csv params names to papaparse js
    parser_options = {
        'delimiter': 'delimiter',
        'lineterminator': 'newline',
        'quotechar': 'quoteChar',
        'escapechar': 'escapeChar',
    }

    def __init__(self, items=None, min_column_width=200, **kwargs):
        self.items = items
        self.min_column_width = min_column_width
        self.parser_config = {
            k: kwargs.pop(k)
            for k in self.parser_options
            if k in kwargs
        }
        if 'media_types' not in kwargs:
            kwargs['media_types'] = ('text/csv',)
        super().__init__(**kwargs)


class AutoCompletionField(VSTCharField):
    """
    Serializer field that provides autocompletion on the frontend, using a specified list of objects.

    :param autocomplete: Autocompletion reference. You can set a list or tuple with
                         values or specify the name of an OpenAPI schema definition.
                         For a definition name, the GUI will find the optimal link and
                         display values based on the ``autocomplete_property`` and
                         ``autocomplete_represent`` arguments.
    :type autocomplete: list, tuple, str
    :param autocomplete_property: Specifies which attribute to retrieve from the
                                  OpenAPI schema definition model as the value.
                                  Default is 'id'.
    :type autocomplete_property: str
    :param autocomplete_represent: Specifies which attribute to retrieve from the
                                   OpenAPI schema definition model as the representational value.
                                   Default is 'name'.
    :param use_prefetch: Prefetch values on the frontend in list view. Default is ``True``.
    :type use_prefetch: bool

    .. note::
        This functionality is effective only in the GUI. In the API, it behaves similarly to :class:`.VSTCharField`.

    Usage:
        This field is designed to be used in serializers where a user needs to input a value, and autocompletion
        based on a predefined list or an OpenAPI schema definition is desired. If an OpenAPI schema is specified,
        two additional parameters, ``autocomplete_property`` and ``autocomplete_represent``, can be configured to
        customize the appearance of the dropdown list.

        Example:

            .. sourcecode:: python

                from vstutils.api import serializers
                from vstutils.api.fields import AutoCompletionField


                class MyModelSerializer(serializers.BaseSerializer):
                    name = AutoCompletionField(autocomplete=['Option 1', 'Option 2', 'Option 3'])

                # or

                class MyModelSerializer(serializers.BaseSerializer):
                    name = AutoCompletionField(
                        autocomplete='MyModelSchema',
                        autocomplete_property='custom_property',
                        autocomplete_represent='display_name'
                    )

    """

    autocomplete: _t.Text
    autocomplete_property: _t.Text
    autocomplete_represent: _t.Text
    use_prefetch: bool

    def __init__(self, **kwargs):
        self.autocomplete = kwargs.pop('autocomplete')
        self.autocomplete_property = None  # type: ignore
        if not isinstance(self.autocomplete, (list, tuple)):
            self.autocomplete_property = kwargs.pop('autocomplete_property', 'id')
            self.autocomplete_represent = kwargs.pop('autocomplete_represent', 'name')
            self.use_prefetch = kwargs.pop('use_prefetch', True)
        super().__init__(**kwargs)


class CommaMultiSelect(VSTCharField):
    """
    Field that allows users to input multiple values, separated by a specified delimiter (default: ",").
    It retrieves a list of values from another model or a custom list and provides autocompletion similar to :class:`.AutoCompletionField`.
    This field is suitable for property fields in a model where the main logic is already implemented or for use with :class:`model.CharField`.

    :param select: OpenAPI schema definition name or a list with values.
    :type select: str, tuple, list
    :param select_separator: The separator for values. The default is a comma.
    :type select_separator: str
    :param select_property, select_represent: These parameters function similarly to ``autocomplete_property`` and ``autocomplete_represent``.
                                             The default is ``name``.
    :param use_prefetch: Prefetch values on the frontend in list view. The default is ``False``.
    :type use_prefetch: bool
    :param make_link: Show values as links to the model. The default is ``True``.
    :type make_link: bool
    :param dependence: A dictionary where keys are the names of fields from the same model, and values are the names of query
                       filters. If at least one of the fields we depend on is non-nullable, required, and set to
                       null, the autocompletion list will be empty, and the field will be disabled.
    :type dependence: dict

    Example:

        .. sourcecode:: python

            from vstutils.api import serializers
            from vstutils.api.fields import CommaMultiSelect

            class MyModelSerializer(serializers.BaseSerializer):
                tags = CommaMultiSelect(
                    select="TagsReferenceSchema",
                    select_property='slug',
                    select_represent='slug',
                    use_prefetch=True,
                    make_link=False,
                    dependence={'some_field': 'value'},
                )

            # or

            class MyModelSerializer(serializers.BaseSerializer):
                tags = CommaMultiSelect(select=['tag1', 'tag2', 'tag3'])

    .. note::
        This functionality is effective only in the GUI and works similarly to :class:`.VSTCharField` in the API.
    """  # noqa: E501

    select_model: _t.Text
    select_separator: _t.Text
    select_property: _t.Text
    select_represent: _t.Text
    use_prefetch: bool
    make_link: bool
    dependence: DependenceType

    def __init__(self, **kwargs):
        self.select_model = kwargs.pop('select')
        self.select_separator = kwargs.pop('select_separator', ',')
        self.select_property = None  # type: ignore
        if not isinstance(self.select_model, (list, tuple)):
            self.select_property = kwargs.pop('select_property', 'name')
            self.select_represent = kwargs.pop('select_represent', 'name')
        self.use_prefetch = kwargs.pop('use_prefetch', False)
        self.make_link = kwargs.pop('make_link', True)
        self.dependence = kwargs.pop('dependence', None)
        super().__init__(**kwargs)

    def to_internal_value(self, data: _t.Union[_t.Text, _t.Sequence]) -> _t.Text:
        return self.to_representation(data)  # nocv

    def to_representation(self, value: _t.Union[_t.Text, _t.Sequence, _t.Iterator]) -> _t.Text:
        if isinstance(value, str):
            value = map(str, filter(bool, value.split(self.select_separator)))
        return self.select_separator.join(value)


class DynamicJsonTypeField(VSTCharField):
    """
    A versatile serializer field that dynamically adapts its type based on the value of another field in the model.
    It facilitates complex scenarios where the type of data to be serialized depends on the value of a related field.

    :param field: The field in the model whose value change will dynamically determine the type of the current field.
    :type field: str
    :param types: A key-value mapping where the key is the value of the subscribed field, and
                  the value is the type (in OpenAPI format) of the current field.
    :type types: dict
    :param choices: Variants of choices for different subscribed field values.
                    Uses a mapping where the key is the value of the subscribed field, and
                    the value is a list with values to choose from.
    :type choices: dict
    :param source_view: Allows using parent views data as a source for field creation.
                        The exact view path (`/user/{id}/`) or relative parent specifier
                        (`<<parent>>.<<parent>>.<<parent>>`) can be provided.
                        For example, if the current page is `/user/1/role/2/`
                        and `source_view` is `<<parent>>.<<parent>>`,
                        then data from `/user/1/` will be used. Only detail views are supported.
    :type source_view: str

    Example:
        Suppose you have a serializer `MySerializer` with a `field_type` (e.g., a `ChoiceField`)
        and a corresponding `object_data`.
        The `object_data` field can have different types based on the value of `field_type`.
        Here's an example configuration:

        .. code-block:: python

            class MySerializer(VSTSerializer):
                field_type = serializers.ChoiceField(choices=['serializer', 'integer', 'boolean'])
                object_data = DynamicJsonTypeField(
                    field='field_type',
                    types={
                        'serializer': SomeSerializer(),
                        'integer': IntegerField(max_value=1337),
                        'boolean': 'boolean',
                    },
                )

        In this example, the `object_data` field dynamically adapts its type based on the selected value of `field_type`.
        The `types` argument defines different types for each possible value of `field_type`, allowing for flexible and dynamic serialization.
    """  # noqa: E501

    field: _t.Text
    choices: _t.Dict
    types: _t.Dict
    source_view: _t.Text

    def is_json(self, real_field):
        return isinstance(real_field, Serializer)

    def __init__(self, **kwargs):
        self.field = kwargs.pop('field')
        self.choices = kwargs.pop('choices', {})
        self.types = kwargs.pop('types', {})
        self.source_view = kwargs.pop('source_view', None)
        super().__init__(**kwargs)
        for field in self.types.values():
            if isinstance(field, Field):
                field.source = None
                field.bind(field_name='', parent=self)

    def get_attribute(self, instance):
        return instance

    @raise_context_decorator_with_default(default=None)
    def get_real_field(self, data) -> _t.Optional[Field]:
        if isinstance(data, dict):
            depend_value = data.get(self.field, None)
        else:
            depend_value = getattr(data, self.field, None)
        field = self.types.get(depend_value)
        if isinstance(field, Field):
            return field
        return None

    def to_internal_value(self, data):
        real_field = self.get_real_field({
            self.field: getattr(self.parent.instance, self.field, None),
            **self.parent.initial_data,
        })
        if real_field:
            data = real_field.to_internal_value(data)
        if self.is_json(real_field):
            return super().to_internal_value(data)
        return data

    def to_representation(self, value):
        real_field = self.get_real_field(value)
        value = super().get_attribute(value)
        if self.is_json(real_field):
            with raise_context():
                value = orjson.loads(value)
        if real_field:
            return real_field.to_representation(value)
        return value


class DependEnumField(DynamicJsonTypeField):
    """
    Field extends :class:`DynamicJsonTypeField` but its value is not transformed to json and would be given as is.
    Useful for :class:`property` in models or for actions.

    :param field: field in model which value change will change type of current value.
    :type field: str
    :param types: key-value mapping where key is value of subscribed field and
                  value is type (in OpenAPI format) of current field.
    :type type: dict
    :param choices: variants of choices for different subscribed field values.
                    Uses mapping where key is value of subscribed field and
                    value is list with values to choice.
    :type choices: dict


    .. note::
        Effective only in GUI. In API works similar to :class:`.VSTCharField` without value modification.
    """

    def is_json(self, real_field):
        return False


class DependFromFkField(DynamicJsonTypeField):
    """
    A specialized field that extends :class:`DynamicJsonTypeField` and
    validates field data based on a :attr:`.field_attribute`
    chosen in a related model. The field data is validated against
    the type defined by the chosen value of :attr:`.field_attribute`.

    .. note::
        By default, any value of :attr:`.field_attribute` validates as :class:`.VSTCharField`.
        To override this behavior, set the class attribute ``{field_attribute}_fields_mapping`` in the related model.
        The attribute should be a dictionary where keys are string representations
        of the values of :attr:`.field_attribute`,
        and values are instances of :class:`rest_framework.Field` for validation.
        If a value is not found in the dictionary, the default type will be :class:`.VSTCharField`.

    :param field: The field in the model whose value change determines the type of the current value.
                  The field must be of type :class:`.FkModelField`.
    :type field: str
    :param field_attribute: The attribute of the related model instance containing the name of the type.
    :type field_attribute: str
    :param types: A key-value mapping where the key is the value of the subscribed field, and
                  the value is the type (in OpenAPI format) of the current field.
    :type types: dict

    .. warning::
        The ``field_attribute`` in the related model must be of type :class:`rest_framework.fields.ChoicesField`
        to ensure proper functioning in the GUI; otherwise, the field will be displayed as simple text.


    Example:
        Suppose you have a model with a ForeignKey field `related_model` and a field `type_attribute` in `RelatedModel`
        that determines the type of data. You can use `DependFromFkField` to dynamically adapt the serialization
        based on the value of `type_attribute`:

        .. code-block:: python

            class RelatedModel(BModel):
                # ... other fields ...
                type_attribute = models.CharField(max_length=20, choices=[('type1', 'Type 1'), ('type2', 'Type 2')])

                type_attribute_fields_mapping = {
                    'type1': SomeSerializer(),
                    'type2': IntegerField(max_value=1337),
                }

            class MyModel(BModel):
                related_model = models.ForeignKey(RelatedModel, on_delete=models.CASCADE)

            class MySerializer(VSTSerializer):
                dynamic_field = DependFromFkField(
                    field='related_model',
                    field_attribute='type_attribute'
                )

                class Meta:
                    model = MyModel
                    fields = '__all__'
    """

    default_related_field = VSTCharField(allow_null=True, allow_blank=True, default='')

    def __init__(self, **kwargs):
        self.field_attribute = kwargs.pop('field_attribute')
        super().__init__(**kwargs)  # pylint: disable=bad-super-call

    def get_value(self, dictionary: _t.Any) -> _t.Any:
        value = super().get_value(dictionary)
        if value == empty:
            return value  # nocv

        parent_field = self.parent.fields[self.field]  # type: ignore
        related_object: models.Model = parent_field.get_value(dictionary)
        if not isinstance(related_object, models.Model) and isinstance(parent_field, FkModelField):  # nocv
            # TODO: write test to it
            model_class = get_if_lazy(parent_field.model_class)
            related_object = model_class(**{parent_field.autocomplete_property: related_object})
        related_type = getattr(related_object, self.field_attribute)
        related_field: Field = getattr(
            related_object,
            f'{self.field_attribute}_fields_mapping',
            {related_type: self.default_related_field}
        ).get(related_type, self.default_related_field)
        related_field: Field = copy.deepcopy(related_field)
        related_field.bind(field_name=self.field_name, parent=self)  # type: ignore

        errors: _t.Dict = {}
        primitive_value = related_field.get_value(dictionary)
        try:
            value = related_field.run_validation(primitive_value)
        except ValidationError as exc:
            errors[related_field.field_name] = exc.detail
        except DjangoValidationError as exc:  # nocv
            errors[related_field.field_name] = get_error_detail(exc)
        except SkipField:  # nocv
            pass

        if errors:
            raise ValidationError(errors)

        return value

    def get_real_field(self, data) -> _t.Optional[Field]:
        return None


class TextareaField(VSTCharField):
    """
    A specialized field that allows the input and display of multiline text.

    .. note::
        This field is designed for use in the graphical user interface (GUI) and functions similarly to
        :class:`.VSTCharField` in the API.

    Example:
        Suppose you have a model with a `description` field that can contain multiline text.
        You can use `TextareaField` in your serializer to enable users to input and view multiline text in the GUI:

        .. code-block:: python

            class MyModel(BModel):
                description = models.TextField()

            class MySerializer(VSTSerializer):
                multiline_description = TextareaField(source='description')

                class Meta:
                    model = MyModel
                    fields = '__all__'
    """


class HtmlField(VSTCharField):
    """
    A specialized field for handling HTML text content, marked with the format:html.

    .. warning:
        Exercise caution when using this field, as it does not validate whether the content is valid HTML.
      Be aware of the potential security risks associated with allowing users to modify HTML content, as
      they may execute scripts.

    .. note::
        This field is designed for use in the graphical user interface (GUI) and functions similarly to
        :class:`.VSTCharField` in the API.

    Example:
        If you have a model with an `html_content` field that stores HTML-formatted text, you can use `HtmlField`
        in your serializer to handle this content in the GUI:

        .. code-block:: python

            class MyModel(BModel):
                html_content = models.TextField()

            class MySerializer(VSTSerializer):
                formatted_html_content = HtmlField(source='html_content')

                class Meta:
                    model = MyModel
                    fields = '__all__'
    """


class _BaseBarcodeField(Field):
    child: Field = CharField(allow_blank=True, allow_null=True)

    def __init__(self, **kwargs):
        self.child = kwargs.pop('child', copy.deepcopy(self.child))
        raise_misconfiguration(not inspect.isclass(self.child), '`child` has not been instantiated.')
        raise_misconfiguration(self.child.source is None, (
            "The `source` argument is not meaningful when applied to a `child=` field. "
            "Remove `source=` from the field declaration."
        ))

        super().__init__(**kwargs)
        self.child.bind(field_name='', parent=self)

    def to_representation(self, value):
        return self.child.to_representation(value) if value is not None else None

    def to_internal_value(self, data):
        return self.child.to_internal_value(data)  # nocv


class QrCodeField(_BaseBarcodeField):
    """
    A versatile field for encoding various types of data into QR codes.

    This field can encode a wide range of data into a QR code representation, making it useful for displaying
    QR codes in the user interface. It works by serializing or deserializing data using the specified child field.

    :param child: The original data field for serialization or deserialization.
                  Default: :class:`rest_framework.fields.CharField`
    :type child: rest_framework.fields.Field

    Example:
        Suppose you have a model with a `data` field, and you want to display its QR code representation in the GUI.
        You can use `QrCodeField` in your serializer:

        .. code-block:: python

            class MyModel(BModel):
                data = models.CharField(max_length=255)

            class MySerializer(VSTSerializer):
                qr_code_data = QrCodeField(child=serializers.CharField(source='data'))

                class Meta:
                    model = MyModel
                    fields = '__all__'

        In this example, the qr_code_data field will represent the QR code generated from the data field in the GUI.
        Users can interact with this QR code, and if their device supports it,
        they can scan the code for further actions.
    """


class Barcode128Field(_BaseBarcodeField):
    """
    A field for representing data as a Barcode (Code 128) in the user interface.

    This field accepts and validates data in the form of a valid ASCII string. It is designed to display the data
    as a Code 128 barcode in the graphical user interface. The underlying data is serialized or deserialized
    using the specified child field.

    :param child: The original data field for serialization or deserialization.
                  Default: :class:`rest_framework.fields.CharField`
    :type child: rest_framework.fields.Field

    Example:
        Suppose you have a model with a `product_code` field, and you want to display its Code 128 barcode
        representation in the GUI. You can use `Barcode128Field` in your serializer:

        .. code-block:: python

            class Product(BModel):
                product_code = models.CharField(max_length=20)

            class ProductSerializer(VSTSerializer):
                barcode = Barcode128Field(child=serializers.CharField(source='product_code'))

                class Meta:
                    model = Product
                    fields = '__all__'
    """

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.validators.append(ascii_string_validator)


class FkField(IntegerField):
    """
    An implementation of ForeignKeyField, designed for use in serializers. This field allows you to specify
    which field of a related model will be stored in the field (default: "id"), and which field will represent
    the value on the frontend.

    :param select: OpenAPI schema definition name.
    :type select: str
    :param autocomplete_property: Specifies which attribute will be retrieved from the OpenAPI schema definition model as the value.
                                  Default is ``id``.
    :type autocomplete_property: str
    :param autocomplete_represent: Specifies which attribute will be retrieved from the OpenAPI schema definition model as the representational value.
                                   Default is ``name``.
    :param field_type: Defines the type of the autocomplete_property for further definition in the schema
                       and casting to the type from the API. Default is passthrough but requires `int` or `str` objects.
    :type field_type: type
    :param use_prefetch: Prefetch values on the frontend at list-view. Default is ``True``.
    :type use_prefetch: bool
    :param make_link: Show the value as a link to the related model. Default is ``True``.
    :type make_link: bool
    :param dependence: A dictionary where keys are names of fields from the same model,
                       and values are names of query filters. If at least one of the fields that we depend on is non-nullable,
                       required, and set to null, the autocompletion list will be empty, and the field will be disabled.

                       There are some special keys for the dependence dictionary to get data that is stored
                       on the frontend without additional database query:

                       - ``'<<pk>>'`` gets the primary key of the current instance,
                       - ``'<<view_name>>'`` gets the view name from the Vue component,
                       - ``'<<parent_view_name>>'`` gets the parent view name from the Vue component,
                       - ``'<<view_level>>'`` gets the view level,
                       - ``'<<operation_id>>'`` gets the operation_id,
                       - ``'<<parent_operation_id'>>`` gets the parent_operation_id.
    :type dependence: dict

    Examples:
        .. sourcecode:: python

            field = FkField(select=Category, dependence={'<<pk>>': 'my_filter'})

    This filter will get the primary key of the current object and
    make a query on the frontend ``/category?my_filter=3``
    where ``3`` is the primary key of the current instance.

    :param filters: A dictionary where keys are names of fields from a related model (specified by this FkField),
                    and values are values of that field.
    :type filters: dict

    .. note::
        The intersection of `dependence.values()` and `filters.keys()` will throw an error to prevent ambiguous filtering.
    .. note::
        Effective only in the GUI. Works similarly to :class:`rest_framework.fields.IntegerField` in the API.
    """  # noqa: E501

    select_model: _t.Text
    autocomplete_property: _t.Text
    autocomplete_represent: _t.Text
    use_prefetch: bool
    make_link: bool
    dependence: DependenceType
    default_error_messages = {
        'ambiguous_filter': 'Ambiguous filtering, use different filters for dependencies and filters',
    }

    def __init__(self, **kwargs):
        self.select_model = kwargs.pop('select')
        self.autocomplete_property = kwargs.pop('autocomplete_property', 'id')
        self.autocomplete_represent = kwargs.pop('autocomplete_represent', 'name')
        self.use_prefetch = kwargs.pop('use_prefetch', True)
        self.make_link = kwargs.pop('make_link', True)
        self.dependence = kwargs.pop('dependence', None)
        self.filters = kwargs.pop('filters', None)
        self.field_type = kwargs.pop('field_type', lambda x: x)
        super().__init__(**kwargs)
        if self.filters and self.dependence and set(self.dependence.values()) & set(self.filters.keys()):
            self.fail('ambiguous_filter')
        # Remove min/max validators from integer field.
        self.validators = self.validators[:-((self.max_value is not None) + (self.min_value is not None)) or None]

    def to_internal_value(self, data):
        return self.field_type(data)

    def to_representation(self, value):
        return self.field_type(value)


class FkModelField(FkField):
    """
    Extends :class:`.FkField`, but stores referred model class.
    This field is useful for :class:`django.db.models.ForeignKey` fields in model to set.

    :param select: model class (based on :class:`vstutils.models.BModel`) or serializer class
                   which used in API and has path in OpenAPI schema.
    :type select: vstutils.models.BModel,vstutils.api.serializers.VSTSerializer
    :param autocomplete_property: this argument indicates which attribute will be
                                  get from OpenAPI schema definition model as value.
                                  Default is ``id``.
    :type autocomplete_property: str
    :param autocomplete_represent: this argument indicates which attribute will be
                                   get from OpenAPI schema definition model as represent value.
                                   Default is ``name``.
    :param use_prefetch: prefetch values on frontend at list-view. Default is ``True``.
    :param make_link: Show value as link to model. Default is ``True``.


    .. warning::
        Model class get object from database during `.to_internal_value` execution. Be careful on mass save executions.

    .. warning::
        Permissions to model which is referred by this field, are not to be checked.
        You should check it manually in signals or validators.

    """

    model_class: _t.Type[models.Model]

    def __init__(self, **kwargs):
        select = kwargs.pop('select')
        if '__extra_metadata__' in dir(select):
            self.model_class = select
            kwargs['select'] = self._get_lazy_select_name_from_model()
        elif isinstance(select, str):
            select = select.split('.')
            raise_misconfiguration(len(select) == 2, "'select' must match 'app_name.model_name' pattern.")
            self.model_class = SimpleLazyObject(lambda: apps.get_model(require_ready=True, *select))
            kwargs['select'] = self._get_lazy_select_name_from_model()
        elif issubclass(select, ModelSerializer):
            self.model_class = select.Meta.model
            kwargs['select'] = getattr(select.Meta, 'ref_name', '') or select.__name__.replace('Serializer', '')
        else:  # nocv
            raise ImproperlyConfigured(
                'Argument "select" must be '
                'rest_framework.serializers.ModelSerializer or '
                'vstutils.models.BModel subclass or '
                'string matched "app_name.model_name" pattern.'
            )
        super().__init__(**kwargs)

    def _get_lazy_select_name_from_model(self):
        # pylint: disable=invalid-name
        return SimpleLazyObject(
            lambda: self.model_class.get_list_serializer_name().split('Serializer')[0]
        )

    @functools.lru_cache()
    def _get_data_from_model(self, value):
        self.model_class = get_if_lazy(self.model_class)
        if isinstance(value, self.model_class):
            return value  # nocv
        return self.model_class.objects.get(**{self.autocomplete_property: self.field_type(value)})

    def get_value(self, dictionary: _t.Any) -> _t.Any:
        value = super().get_value(dictionary)
        if value is not empty and value is not None:
            value = self._get_data_from_model(value)
        return value

    def to_internal_value(self, data: _t.Union[models.Model, int]) -> _t.Union[models.Model]:  # type: ignore[override]
        if isinstance(data, self.model_class):
            return data
        elif isinstance(data, (int, str, uuid.UUID)):  # nocv
            # deprecated
            return self._get_data_from_model(data)
        self.fail('Unknown datatype')  # nocv

    def to_representation(self, value: _t.Union[int, models.Model]) -> _t.Any:
        self.model_class = get_if_lazy(self.model_class)
        if self.model_class is not None and isinstance(value, self.model_class._meta.pk.model):
            return self.field_type(getattr(value, self.autocomplete_property))
        else:  # nocv
            # Uses only if value got from `.values()`
            return value


class DeepFkField(FkModelField):
    """
    Extends :class:`.FkModelField`, specifically designed for hierarchical relationships in the frontend.

    This field is intended for handling ForeignKey relationships within a hierarchical or tree-like structure.
    It displays as a tree in the frontend, offering a clear visual representation of parent-child relationships.

    .. warning::
        This field intentionally does not support the ``dependence`` parameter, as it operates in a tree structure.
        Usage of ``filters`` should be approached with caution, as inappropriate filters may disrupt the tree hierarchy.

    :param only_last_child: If True, the field restricts the selection to nodes without children. Default is `False`.
                            Useful when you want to enforce selection of leaf nodes.
    :type only_last_child: bool
    :param parent_field_name: The name of the parent field in the related model. Default is `parent`.
                             Should be set to the ForeignKey field in the related model,
                             representing the parent-child relationship.
                             For example, if your related model has a ForeignKey like
                             `parent = models.ForeignKey('self', ...)`,
                             then `parent_field_name` should be set to `'parent'`.
    :type parent_field_name: str

    Examples:
        Consider a related model with a ForeignKey field representing parent-child relationships:

        .. code-block:: python

            class Category(BModel):
                name = models.CharField(max_length=255)
                parent = models.ForeignKey('self', null=True, default=None, on_delete=models.CASCADE)

        To use the DeepFkField with this related model in a serializer, you would set the parent_field_name to 'parent':

        .. code-block:: python

            class MySerializer(VSTSerializer):
                category = DeepFkField(select=Category, parent_field_name='parent')

    This example assumes a Category related model with a ForeignKey 'parent' field.
    The DeepFkField will then display the categories as a tree structure in the frontend,
    providing an intuitive selection mechanism for hierarchical relationships.

    .. note::
        Effective only in GUI. Works similarly to :class:`rest_framework.fields.IntegerField` in API.
    """

    def __init__(self, only_last_child: bool = False, parent_field_name='parent', **kwargs):
        super().__init__(**kwargs)
        self.only_last_child = only_last_child
        self.parent_field_name = parent_field_name


class UptimeField(IntegerField):
    """
    Time duration field, in seconds, specifically designed for computing and displaying system uptime.

    This field is effective only in the GUI and behaves similarly
    to :class:`rest_framework.fields.IntegerField` in the API.

    The `UptimeField` class transforms time in seconds into a user-friendly representation on the frontend.
    It intelligently selects the most appropriate pattern from the following templates:

    - ``HH:mm:ss`` (e.g., 23:59:59)
    - ``dd HH:mm:ss`` (e.g., 01d 00:00:00)
    - ``mm dd HH:mm:ss`` (e.g., 01m 30d 00:00:00)
    - ``yy mm dd HH:mm:ss`` (e.g., 99y 11m 30d 22:23:24)

    Example:

        .. code-block:: python

            class MySerializer(serializers.ModelSerializer):
                uptime = UptimeField()

        This example assumes a serializer where the `uptime` field represents a time duration in seconds.
        The `UptimeField` will then display the duration in a human-readable format on the frontend,
        making it convenient for users to interpret and input values.

    .. note::
        Effective only in GUI. Works similarly to :class:`rest_framework.fields.IntegerField` in API.
    """


class RedirectFieldMixin:
    """
    Field mixin indicates that this field is used to send redirect address to frontend after some action.

    :param operation_name: prefix for operation_id, for example if operation_id is `history_get`
           then operation_name is `history`
    :type operation_name: str
    :param depend_field: name of the field that we depend on, its value will be used for operation_id
    :type depend_field: str
    :param concat_field_name: if True then name of the field will be added at the end of operation_id
    :type concat_field_name: bool
    """
    redirect: bool = True

    def __init__(self, **kwargs):
        self.operation_name = kwargs.pop('operation_name', None)
        self.depend_field = kwargs.pop('depend_field', None)
        self.concat_field_name = kwargs.pop('concat_field_name', False)
        super().__init__(**kwargs)


class RedirectIntegerField(RedirectFieldMixin, IntegerField):
    """
    Field for redirect by id. Often used in actions for redirect after execution.

    .. note::
        Effective only in GUI. Works similar to :class:`rest_framework.fields.IntegerField` in API.

    """


class RedirectCharField(RedirectFieldMixin, CharField):
    """
    Field for redirect by string. Often used in actions for redirect after execution.

    .. note::
        Effective only in GUI. Works similar to :class:`rest_framework.fields.IntegerField` in API.

    """


class NamedBinaryFileInJsonField(VSTCharField):
    """
    Field that represents a binary file in JSON format.

    :param file: If True, accept only subclasses of File as input.
                 If False, accept only string input. Default: False.
    :type file: bool
    :param post_handlers: Functions to process the file after validation.
                          Each function takes two arguments: ``binary_data`` (file bytes)
                          and ``original_data`` (reference to the original JSON object).
                          The function should return the processed ``binary_data``.
    :type post_handlers: tuple,list
    :param pre_handlers: Functions to process the file before validation.
                         Each function takes two arguments: ``binary_data`` (file bytes)
                         and ``original_data`` (reference to the original JSON object).
                         The function should return the processed ``binary_data``.
    :type pre_handlers: tuple,list
    :param int max_content_size: Maximum allowed size of the file content in bytes.
    :param int min_content_size: Minimum allowed size of the file content in bytes.
    :param int min_length: Minimum length of the file name. Only applicable when ``file=True``.
    :param int max_length: Maximum length of the file name. Only applicable when ``file=True``.


    This field is designed for storing binary files alongside their names in
    :class:`django.db.models.CharField` or :class:`django.db.models.TextField`
    model fields. All manipulations involving decoding and encoding binary content data
    occur on the client, imposing reasonable limits on file size.

    Additionally, this field can construct a
    :class:`django.core.files.uploadedfile.SimpleUploadedFile` from incoming JSON
    and store it as a file in :class:`django.db.models.FileField` if the
    `file` attribute is set to `True`.

    Example:

        In a serializer, include this field to handle binary files:

        .. code-block:: python

            class MySerializer(serializers.ModelSerializer):
                binary_data = NamedBinaryFileInJsonField(file=True)

        This example assumes a serializer where the ``binary_data`` field represents
        binary file information in JSON format. The ``NamedBinaryFileInJsonField``
        will then handle the storage and retrieval of binary files in a
        user-friendly manner.

    The binary file is represented in JSON with the following properties:

    - **name** (str): Name of the file.
    - **mediaType** (str): MIME type of the file.
    - **content** (str or File): Content of the file. If `file` is True, it will be a
      reference to the file; otherwise, it will be base64-encoded content.

    .. warning::
        The client application will display the content as a download link.
        Users will interact with the binary file through the application,
        with the exchange between the Rest API and the client occurring through
        the presented JSON object.
    """

    __valid_keys = ('name', 'content', 'mediaType')
    default_error_messages = {
        'not a JSON': lazy_translate('value is not a valid JSON'),
        'missing key': lazy_translate('key {missing_key} is missing'),
        'invalid key': lazy_translate('invalid key {invalid_key}'),
    }
    file_field = FieldFile

    def __init__(self, **kwargs):
        self.file = kwargs.pop('file', False)
        self.post_handlers = kwargs.pop('post_handlers', ())
        self.pre_handlers = kwargs.pop('pre_handlers', ())
        self.max_content_size = int(kwargs.pop('max_content_size', 0))
        self.min_content_size = int(kwargs.pop('min_content_size', 0))
        if self.file:
            max_length = kwargs.pop('max_length', None)
            min_length = kwargs.pop('min_length', None)
        super(NamedBinaryFileInJsonField, self).__init__(**kwargs)
        if self.file:
            self.max_length = max_length
            self.min_length = min_length

    def validate_value(self, data: _t.Dict):
        if not isinstance(data, dict):
            self.fail('not a JSON')
        invalid_keys = [
            k
            for k in data.keys()
            if k not in self.__valid_keys
        ]

        if invalid_keys:
            self.fail('invalid key', invalid_key=invalid_keys[0])

        for key in self.__valid_keys:
            if key not in data:
                self.fail('missing key', missing_key=key)

    @raise_context_decorator_with_default(default=DEFAULT_NAMED_FILE_DATA)
    def to_representation(self, value) -> _t.Dict[_t.Text, _t.Optional[_t.Any]]:  # type: ignore[override]
        if self.file:
            return {'content': value.url, 'name': value.name, 'mediaType': ''}
        else:
            if not value:
                return DEFAULT_NAMED_FILE_DATA
            result = orjson.loads(value)
            if not result.get('mediaType'):
                result['mediaType'] = None
            return result

    def run_validation(self, data=empty):
        (is_empty_value, data) = self.validate_empty_values(data)
        if is_empty_value:
            return data  # nocv
        self.validate_value(data)
        if not self.should_not_handle(data):
            with raise_context(verbose=True):
                data['content'] = base64.b64encode(functools.reduce(
                    lambda binary, func: func(binary, original_data=data),
                    self.pre_handlers,
                    base64.b64decode(data['content'])
                )).decode('utf-8')
        self.run_validators(data)
        return self.to_internal_value(data)

    def run_validators(self, value: _t.Dict) -> None:
        if not raise_context_decorator_with_default(default=False)(self.should_not_handle)(value):
            super().run_validators(value)
            if self.file:
                if self.max_length and len(value['name']) > self.max_length:
                    raise ValidationError(f'Name of file so long. Allowed only {self.max_length} symbols.')
            if 0 < self.max_content_size < len(value['content']):
                raise ValidationError('The file is too large.')
            if 0 < self.min_content_size > len(value['content']):
                raise ValidationError('The file is too small.')

    def should_not_handle(self, file):
        return (
            not file['mediaType'] and
            (file['content'].startswith('/') or file['content'].startswith('http')) and
            file['content'].endswith(quote(file['name']))
        )

    def _handle_file(self, file):
        if self.should_not_handle(file) and self.root.instance:
            return self.file_field(
                self.root.instance,
                self.root.instance._meta.get_field(self.field_name),
                file['name']
            )
        content = functools.reduce(
            lambda binary, func: func(binary, original_data=file),
            self.post_handlers,
            base64.b64decode(file['content'])
        )
        return SimpleUploadedFile(
            name=file['name'],
            content=content,
            content_type=file['mediaType']
        )

    def to_internal_value(self, data) -> _t.Any:
        if self.file and data.get('content', None):
            return self._handle_file(data)
        return super().to_internal_value(data)


class NamedBinaryImageInJsonField(NamedBinaryFileInJsonField):
    """
    Field that represents an image in JSON format, extending :class:`.NamedBinaryFileInJsonField`.

    :param background_fill_color: Color to fill the area not covered by the image after cropping.
        Transparent by default but will be black if the image format does not support transparency.
        Can be any valid CSS color.
    :type background_fill_color: str

    This field is designed for handling image files alongside their names in
    :class:`django.db.models.CharField` or :class:`django.db.models.TextField` model fields.
    It extends the capabilities of :class:`.NamedBinaryFileInJsonField` to specifically handle images.

    Additionally, this field validates the image using the following validators:
    - :class:`vstutils.api.validators.ImageValidator`
    - :class:`vstutils.api.validators.ImageResolutionValidator`
    - :class:`vstutils.api.validators.ImageHeightValidator`

    When saving and with the added validators, the field will display a corresponding window for adjusting
    the image to the specified parameters, providing a user-friendly interface for managing images.

    The image file is represented in JSON with the following properties:

    - **name** (str): Name of the image file.
    - **mediaType** (str): MIME type of the image file.
    - **content** (str or File): Content of the image file. If `file` is True, it will be a
      reference to the image file; otherwise, it will be base64-encoded content.

    .. warning::
        The client application will display the content as an image.
        Users will interact with the image through the application,
        with the exchange between the Rest API and the client occurring through
        the presented JSON object.
    """

    def __init__(self, *args, **kwargs):
        self.background_fill_color = kwargs.pop('background_fill_color', None)
        super().__init__(*args, **kwargs)


class MultipleNamedBinaryFileInJsonField(NamedBinaryFileInJsonField):
    """
    Extends :class:`.NamedBinaryFileInJsonField` but uses list of JSONs.
    Allows to operate with multiple files as list of :class:`NamedBinaryFileInJsonField`.

    Attrs:
    :attr:`NamedBinaryInJsonField.file`: if True, accept only subclasses of File as input. If False, accept only string
    input. Default: False.
    """

    default_error_messages = {
        'not a list': lazy_translate('value is not a valid list'),
    }
    file_field = vst_model_fields.MultipleFieldFile

    def run_validators(self, value: _t.Any) -> None:
        if isinstance(value, (list, tuple)):
            for one_value in value:
                super().run_validators(one_value)
        else:  # nocv
            super().run_validators(value)

    def to_internal_value(self, data: _t.List) -> _t.Union[_t.Text, list]:  # type: ignore
        if data is not None:
            if not isinstance(data, list):
                self.fail('not a list')
            for file in data:
                self.validate_value(file)
            if self.file:
                return [
                    self._handle_file(file)
                    for file in data
                ]
        return VSTCharField.to_internal_value(self, data)

    def run_validation(self, data=empty):
        (is_empty_value, data) = self.validate_empty_values(data)
        if is_empty_value:
            return data  # nocv
        self.run_validators(data)
        return self.to_internal_value(data)

    @raise_context_decorator_with_default(default=[])
    def to_representation(self, value) -> _t.List[_t.Dict[_t.Text, _t.Any]]:  # type: ignore[override]
        if self.file:
            return [
                {'content': file.url, 'name': file.name, 'mediaType': ''}
                for file in value
            ]
        if not value:
            return []
        return orjson.loads(value)


class MultipleNamedBinaryImageInJsonField(MultipleNamedBinaryFileInJsonField):
    """
    Extends :class:`.MultipleNamedBinaryFileInJsonField` but uses list of JSONs.
    Used for operating with multiple images and works as list of :class:`NamedBinaryImageInJsonField`.

    :param background_fill_color: Color to fill area that is not covered by image after cropping.
        Transparent by default but will be black if image format is not supporting transparency.
        Can be any valid CSS color.
    :type background_fill_color: str
    """

    def __init__(self, *args, **kwargs):
        self.background_fill_color = kwargs.pop('background_fill_color', None)
        super().__init__(*args, **kwargs)


class PasswordField(CharField):
    """
    Extends `CharField <https://www.django-rest-framework.org/api-guide/fields/#charfield>`_
    but in schema set format to `password`.
    Show all characters as asterisks instead of real value in GUI.
    """

    def __init__(self, *args, **kwargs):
        kwargs['write_only'] = True
        kwargs['style'] = kwargs.get('style', {})
        kwargs['style']['input_type'] = 'password'
        super(PasswordField, self).__init__(*args, **kwargs)


def _handle_related_value_decorator(func):
    def wrapper(self, value, default, *args, **kwargs):
        if not value:
            return default
        try:
            return func(self, value, default, *args, **kwargs)
        except Exception as err:
            logging.error(err)
            return default
    return wrapper


class RelatedListField(VSTCharField):
    """
    Extends :class:`.VSTCharField` to represent a reverse ForeignKey relation as a list of related instances.

    This field allows you to output the reverse ForeignKey relation as a list of related instances.
    To use it, specify the ``related_name`` kwarg (related manager for reverse ForeignKey) and the ``fields``
    kwarg (list or tuple of fields from the related model to be included).

    By default, :class:`.VSTCharField` is used to serialize all field values and represent them on the frontend.
    You can specify the `serializer_class` and override fields as needed. For example, title, description,
    and other field properties can be set to customize frontend behavior.

    :param related_name: Name of a related manager for reverse ForeignKey.
    :type related_name: str
    :param fields: List of related model fields.
    :type fields: list[str], tuple[str]
    :param view_type: Determines how fields are represented on the frontend. Must be either ``list`` or ``table``.
    :type view_type: str
    :param fields_custom_handlers_mapping: Custom handlers mapping, where key: field_name, value: callable_obj
                                           that takes params:
                                           instance[dict], fields_mapping[dict], model, field_name[str].
    :type fields_custom_handlers_mapping: dict
    :param serializer_class: Serializer to customize types of fields. If no serializer is provided,
                             :class:`.VSTCharField` will be used for every field in the `fields` list.
    :type serializer_class: type

    .. warning::
        This field is deprecated.
        Use serializers with the ``many=True`` attribute.
        To change the display on the page, use :const:`vstutils.api.serializers.DisplayModeList`.

    """

    def __init__(
            self,
            related_name: _t.Text,
            fields: _t.Union[_t.Tuple, _t.List],
            view_type: str = 'list',
            serializer_class: _t.Optional[_t.Type] = None,
            **kwargs):
        kwargs['read_only'] = True
        kwargs['source'] = "*"
        self.fields_custom_handlers_mapping = kwargs.pop('fields_custom_handlers', {})
        super().__init__(**kwargs)
        # fields for 'values' in qs
        raise_misconfiguration(isinstance(fields, (tuple, list)), "fields must be list or tuple")
        raise_misconfiguration(fields, "fields must have one or more values")
        raise_misconfiguration(view_type in ('list', 'table'))
        self._serializer_class = serializer_class
        self.fields = fields
        self.related_name = related_name
        self.view_type = view_type

    @cached_property
    def has_serializer(self):
        return self._serializer_class is not None

    @cached_property
    def serializer_class(self):
        # pylint: disable=import-outside-toplevel
        from .serializers import BaseSerializer

        dependencies = []
        if self.has_serializer:
            dependencies.append(self._serializer_class)
        dependencies.append(type(BaseSerializer)(
            'DefaultRelatedListSerializer',
            (BaseSerializer,),
            {
                f: VSTCharField(allow_null=True, allow_blank=True, default='')
                for f in self.fields
            }
        ))
        return type(dependencies[0])(
            'RelatedListSerializer',
            tuple(dependencies),
            {}
        )

    def get_serializer(self, *args, **kwargs):
        kwargs = {**kwargs}
        kwargs.setdefault('context', self.context)
        return self.serializer_class(*args, **kwargs)

    @_handle_related_value_decorator
    def _handle_named_bin_text(self, value, default):
        return orjson.loads(value)

    @_handle_related_value_decorator
    def _handle_file_or_image_field(self, value, default, field):
        return {
            "content": field.storage.url(value),
            "name": value,
            'mediaType': '',
        }

    @_handle_related_value_decorator
    def _handle_files_or_images_field(self, list_values, default, field):
        return [
            self._handle_file_or_image_field(value, DEFAULT_NAMED_FILE_DATA, field)
            for value in list_values
        ]

    def handle_values_item_iteration(self, instance, fields_mapping, field_name, value, full_field_name=None):
        full_field_name = full_field_name or field_name
        field = fields_mapping.get(field_name, None)

        if '__' in field_name:
            parent_field_name, child_field_name = field_name.split('__', maxsplit=1)
            field = fields_mapping.get(parent_field_name, None)

            if isinstance(field, models.ForeignKey):
                self.handle_values_item_iteration(
                    instance,
                    self.get_model_fields_mapping(field.related_model),
                    child_field_name,
                    value,
                    full_field_name
                )
        elif isinstance(field, vst_model_fields.NamedBinaryFileInJSONField):
            instance[full_field_name] = self._handle_named_bin_text(value, DEFAULT_NAMED_FILE_DATA)

        elif isinstance(field, vst_model_fields.MultipleNamedBinaryFileInJSONField):
            instance[full_field_name] = self._handle_named_bin_text(value, [])

        elif isinstance(field, vst_model_fields.MultipleFileMixin):
            instance[full_field_name] = self._handle_files_or_images_field(value, [], fields_mapping[field_name])

        elif isinstance(field, vst_model_fields.FileField):
            instance[full_field_name] = self._handle_file_or_image_field(
                value,
                DEFAULT_NAMED_FILE_DATA,
                fields_mapping[field_name],
            )

    def handle_values_item(self, instance, fields_mapping, model):
        for field_name, value in instance.items():
            if field_name in self.fields_custom_handlers_mapping:
                self.fields_custom_handlers_mapping[field_name](self, instance, fields_mapping, model, field_name)
            else:
                self.handle_values_item_iteration(instance, fields_mapping, field_name, value)

        return instance

    def get_model_fields_mapping(self, model):
        return {f.name: f for f in model._meta.fields}

    def _prep_data(self, value):
        # pylint: disable=protected-access
        queryset: models.QuerySet = getattr(value, self.related_name).all()
        if not (queryset.query.deferred_loading[0] or queryset._result_cache is not None):
            fields_mapping = self.get_model_fields_mapping(queryset.model).keys()
            queryset = queryset.only(*filter(fields_mapping.__contains__, self.fields))
        if self.has_serializer:
            return self.get_serializer(queryset, many=True).data

        data = queryset.values(*self.fields)
        handler = functools.partial(
            self.handle_values_item,
            fields_mapping=self.get_model_fields_mapping(queryset.model),
            model=value,
        )
        return tuple(map(handler, data))

    def to_representation(self, value: _t.Type[models.Model]) -> _t.Tuple[_t.Dict]:  # type: ignore[override]
        # get related mapping with id and name of instances
        return lazy(lambda: self._prep_data(value), tuple)()


class RatingField(FloatField):
    """
    Extends class 'rest_framework.serializers.FloatField'. This field represents a rating form input on frontend.
    Grading limits can be specified with 'min_value=' and 'max_value=', defaults are 0 to 5. Minimal step between
    grades are specified in 'step=', default - 1. Frontend visual representation can be chosen
    with 'front_style=', available variants are listed in 'self.valid_front_styles'.

    For 'slider' front style, you can specify slider color, by passing valid color to 'color='.
    For 'fa_icon' front style, you can specify FontAwesome icon that would be used for displaying rating, by passing a
    valid FontAwesome icon code to 'fa_class='.

    :param min_value: minimal level
    :type min_value: float, int
    :param max_value: maximal level
    :type max_value: float, int
    :param step: minimal step between levels
    :type step: float, int
    :param front_style: visualization on frontend field. Allowed: ['stars', 'slider', 'fa_icon'].
    :type front_style: str
    :param color: color of rating element (star, icon or slider) in css format
    :type color: str
    :param fa_class: FontAwesome icon code
    :type fa_class: str
    """
    valid_front_styles = (
        'stars',
        'slider',
        'fa_icon',
    )

    def __init__(
            self,
            min_value: float = 0,
            max_value: float = 5,
            step: float = 1,
            front_style: _t.Text = 'stars',
            **kwargs,
    ):
        raise_misconfiguration(
            front_style in self.valid_front_styles,
            f"front_style should be one of {self.valid_front_styles}"
        )
        self.front_style = front_style
        self.color = kwargs.pop('color', None)
        raise_misconfiguration(
            isinstance(self.color, str) or self.color is None,
            "color should be str"
        )
        self.fa_class = kwargs.pop('fa_class', None)
        raise_misconfiguration(
            isinstance(self.fa_class, str) or self.fa_class is None,
            "fa_class should be str"
        )
        self.step = step
        raise_misconfiguration(
            not (step != 1 and front_style != 'slider'),
            'custom step can be used only with front_style "slider"'
        )
        super(RatingField, self).__init__(min_value=min_value, max_value=max_value, **kwargs)


def is_all_digits_validator(value):
    if not value.isdigit():
        raise ValidationError(
            translate('This field must contain only digits but input: ') + f'{value}.'
        )


class PhoneField(CharField):
    """
    Extends the 'rest_framework.serializers.CharField' class.
    Field for representing a phone number in international format.

    This field is designed for capturing and validating phone numbers in international format.
    It extends the 'rest_framework.serializers.CharField' and adds custom validation to ensure
    that the phone number contains only digits.

    Example:
        In a serializer, include this field to handle phone numbers:

        .. code-block:: python

            class MySerializer(VSTSerializer):
                phone_number = PhoneField()

        This example assumes a serializer where the ``phone_number`` field represents
        a phone number in international format. The ``PhoneField`` will then handle the
        validation and representation of phone numbers, making it convenient for users to
        input standardized phone numbers.

    The field will be displayed in the client application as an input field for entering
    a phone number, including the country code.
    """

    def __init__(self, **kwargs):
        kwargs['min_length'] = 8
        kwargs['max_length'] = 16
        super().__init__(**kwargs)

        self.validators.append(is_all_digits_validator)


class MaskedField(CharField):
    """
    Extends the 'rest_framework.serializers.CharField' class.
    Field that applies a mask to the input value.

    This field is designed for applying a mask to the input value on the frontend.
    It extends the 'rest_framework.serializers.CharField' and allows the use of the
    `IMask <https://imask.js.org/guide.html>`_ library for defining masks.

    :param mask: The mask to be applied to the value. It can be either a dictionary or a string
                 following the `IMask` library format.
    :type mask: dict, str

    Example:
        In a serializer, include this field to apply a mask to a value:

        .. code-block:: python

            class MySerializer(serializers.Serializer):
                masked_value = MaskedField(mask='000-000')

        This example assumes a serializer where the ``masked_value`` field represents
        a value with a predefined mask. The ``MaskedField`` will apply the specified mask
        on the frontend, providing a masked input for users.

    .. note::
        The effectiveness of this field is limited to the frontend, and the mask is applied during user input.
    """

    def __init__(self, mask, **kwargs):
        super().__init__(**kwargs)
        self.mask = mask


class WYSIWYGField(TextareaField):
    """
    Extends the :class:`.TextareaField` class to render the https://ui.toast.com/tui-editor on the frontend.

    This field is specifically designed for rendering a WYSIWYG editor on the frontend,
    using the https://ui.toast.com/tui-editor. It saves data as markdown and escapes all HTML tags.

    :param escape: HTML-escape input. Enabled by default to prevent HTML injection vulnerabilities.
    :type escape: bool

    Example:
        In a serializer, include this field to render a WYSIWYG editor on the frontend:

        .. code-block:: python

            class MySerializer(serializers.Serializer):
                wysiwyg_content = WYSIWYGField()

        This example assumes a serializer where the ``wysiwyg_content`` field represents
        data to be rendered in a WYSIWYG editor on the frontend. The ``WYSIWYGField`` ensures
        that the content is saved as markdown and HTML tags are escaped to enhance security.

    .. warning::
        Enabling the ``escape`` option is recommended to prevent potential HTML injection vulnerabilities.

    .. note::
        The rendering on the frontend is achieved using the https://ui.toast.com/tui-editor.
    """

    def __init__(self, *args, **kwargs):
        self.escape_html = kwargs.pop('escape', True)
        super().__init__(*args, **kwargs)

    def to_internal_value(self, data):
        val = super().to_internal_value(data)
        return escape(strip_tags(val)) if self.escape_html else val


class CrontabField(CharField):
    """
    Simple crontab-like field which contains the schedule of cron entries to specify time.
    A crontab field has five fields for specifying day, date and time.
    ``*`` in the value field above means all legal values as in braces for that column.

    The value column can have a ``*`` or a list of elements separated by commas.
    An element is either a number in the ranges shown above or two numbers in the range
    separated by a hyphen (meaning an inclusive range).

    The time and date fields are:

    ============   =====================================
    field           allowed value
    ============   =====================================
    minute          0-59
    hour            0-23
    day of month    1-31
    month           1-12
    day of week     0-7 (0 or 7 is Sunday)
    ============   =====================================

    Default value of each field if not specified is ``*``.

    .. sourcecode::

        .---------------- minute (0 - 59)
        | .-------------- hour (0 - 23)
        | | .------------ day of month (1 - 31)
        | | | .---------- month (1 - 12)
        | | | | .-------- day of week (0 - 6) (Sunday=0 or 7)
        | | | | |
        * * * * *
    """

    default_error_messages = {
        'invalid_time_range': lazy_translate('Invalid {period} range. Valid choices in {valid} range.'),
        'invalid_delimiter': lazy_translate('Invalid delimiter value in {interval}. Must be integer.'),
        'to_many_columns': lazy_translate('There are to many columns with crontab values.'),
        'invalid': lazy_translate('Invalid crontab syntax.'),
    }
    intervals = {
        'minute': tuple(map(str, range(60))),
        'hour': tuple(map(str, range(24))),
        'day': tuple(map(str, range(1, 32))),
        'month': tuple(map(str, range(1, 13))),
        'weekday': tuple(map(str, range(7))),
    }

    def make_validation(self, interval, value):
        if value == '*':
            return
        elif value in {'', '-', '/', ','}:
            self.fail('invalid')
        elif ',' in value:
            values_list = value.split(',')
            for val in values_list:
                self.make_validation(interval, val)
            return
        elif '/' in value:
            value, delimeter = value.split('/')
            if not delimeter.isdigit():
                self.fail('invalid_delimiter', interval=interval)
            return self.make_validation(interval, value)
        elif '-' in value:
            minimal, maximal = value.split('-')
            return self.make_validation(interval, minimal) or self.make_validation(interval, maximal)

        valid_choices = self.intervals[interval]
        if value not in valid_choices:
            self.fail(
                'invalid_time_range',
                period=interval,
                valid='-'.join((valid_choices[0], valid_choices[-1]))
            )

    def to_internal_value(self, data: _t.Text) -> _t.Text:
        if data.count(' ') > 4:
            self.fail('to_many_columns')
        intervals = dict(zip(
            ('minute', 'hour', 'day', 'month', 'weekday'),
            (data.split(' ') + ['*' for _ in range(4)])[:5]
        ))
        for interval, value in intervals.items():
            try:
                self.make_validation(interval, value)
            except Exception as err:
                if not isinstance(err, ValidationError):
                    self.fail('invalid')
                raise

        return ' '.join(
            intervals[interval]
            for interval in self.intervals
        )


class CheckboxBooleanField(BooleanField):
    """
    Boolean field that renders checkbox.
    """


class PlusMinusIntegerField(IntegerField):
    """
    Integer field that renders +/- buttons.
    """


class RouterLinkField(DictField):
    """
    A read-only serializer field that displays a link to another page or a simple text label in the interface.

    **Expected Input:**

    This field expects a dictionary with the following keys:

    - **link** *(optional)*: The URL or route to another page. If provided, the
      label will be displayed as a clickable link.
      If not provided, only the text label is shown. The value should be compatible
      with the `Vue Router's push method parameter
      <https://router.vuejs.org/api/interfaces/Router.html#push>`_. Ensure that the link points
      to an existing resource in the interface to avoid 404 errors.

    - **label**: The text to display. This is required whether or not a link is provided.

    .. Note::
       For simpler use cases, you might consider using :class:`.FkField`.

    **Examples:**

    *Using a model class method:*

    .. code-block:: python

        from django.db.models import CharField
        from vstutils.api.fields import RouterLinkField
        from vstutils.models import BaseModel

        class Author(BaseModel):
            name = CharField()

            def get_link(self):
                return {
                    'link': f'/author/{self.id}/',
                    'label': f'Author: {self.name}',
                }

        AuthorViewSet = Author.get_view_class(
            detail_fields=['name', 'link'],
            override_detail_fields={
                'link': RouterLinkField(source='get_link'),
            },
        )

    In this example, the ``get_link`` method in the ``Author`` model returns
    a dictionary containing the ``link`` and ``label``.
    The ``RouterLinkField`` uses this method to display the author's name as
    a clickable link to their detail page.

    *Using a custom field class:*

    .. code-block:: python

        from django.db.models import CharField
        from vstutils.api.fields import RouterLinkField
        from vstutils.models import BaseModel

        class Author(BaseModel):
            name = CharField()

        class AuthorLinkField(RouterLinkField):
            def to_representation(self, instance: Author):
                return super().to_representation({
                    'link': f'/author/{instance.id}/',
                    'label': f'Author: {instance.name}',
                })

        AuthorViewSet = Author.get_view_class(
            detail_fields=['name', 'link'],
            override_detail_fields={
                'link': AuthorLinkField(source='*'),
            },
        )

    In this example, we create a custom field ``AuthorLinkField`` by subclassing ``RouterLinkField``.
    We override the ``to_representation`` method to return a dictionary with
    the ``link`` and ``label`` for each ``Author`` instance.
    This custom field is then used in the viewset to display each author's name as a clickable link.

    .. TIP::
       - The field is read-only and is intended to display dynamic links based on the instance data.
       - If the ``link`` key is omitted or ``None``, the field will display the ``label``
         as plain text instead of a link.

    .. WARNING::
       Always ensure that the ``link`` provided points to a valid route within your application
       to prevent users from encountering 404 errors.
    """
    child = CharField(allow_blank=True)

    def __init__(self, **kwargs):
        kwargs['read_only'] = True
        super().__init__(**kwargs)

    def to_representation(self, value):
        return {
            'link': get_attribute(value, ['link']),
            'label': get_attribute(value, ['label']),
        }
