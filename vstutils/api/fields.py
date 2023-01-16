"""
Additional serializer fields for generating OpenAPI and GUI.
"""
# pylint: disable=too-many-lines
import logging
import typing as _t
import copy
import functools
import base64
from urllib.parse import quote

import orjson
from rest_framework.serializers import CharField, IntegerField, FloatField, ModelSerializer, Serializer
from rest_framework.fields import empty, SkipField, get_error_detail, Field
from rest_framework.exceptions import ValidationError
from django.apps import apps
from django.db import models
from django.utils.html import escape, strip_tags
from django.utils.functional import SimpleLazyObject, lazy, cached_property
from django.core.exceptions import ValidationError as DjangoValidationError
from django.core.files.uploadedfile import SimpleUploadedFile
from django.db.models.fields.files import FieldFile

from .renderers import ORJSONRenderer
from ..models import fields as vst_model_fields
from ..utils import raise_context, get_if_lazy, raise_context_decorator_with_default, translate, lazy_translate

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
    Field extends :class:`.VSTCharField` and saves file's content as string.

    Value must be text (not binary) and saves in model as is.

    :param media_types: List of MIME types to select on the user's side.
                        Supported syntax using ``*``. Default: ``['*/*']``
    :type media_types: tuple,list

    .. note::
        Take effect only in GUI. In API it would behave as :class:`.VSTCharField`.
    """

    def __init__(self, **kwargs):
        self.media_types = kwargs.pop('media_types', ('*/*',))
        super().__init__(**kwargs)


class SecretFileInString(FileInStringField):
    """
    Field extends :class:`.FileInStringField`, but hides it's value in admin interface.

    Value must be text (not binary) and saves in model as is.

    :param media_types: List of MIME types to select on the user's side.
                        Supported syntax using ``*``. Default: ``['*/*']``
    :type media_types: tuple,list

    .. note::
        Take effect only in GUI. In API it would behave as :class:`.VSTCharField`.
    """

    def __init__(self, **kwargs):
        kwargs['style'] = {'input_type': 'password'}
        super().__init__(**kwargs)


class BinFileInStringField(FileInStringField):
    """
    Field extends :class:`.FileInStringField`, but work with binary(base64) files.

    :param media_types: List of MIME types to select on the user's side.
                        Supported syntax using ``*``. Default: `['*/*']`
    :type media_types: tuple,list

    .. note::
        Effective only in GUI. Works similar to :class:`.VSTCharField` in API.
    """


class CSVFileField(FileInStringField):
    """
    Field extends :class:`.FileInStringField`, using for works with csv files.
    This field provides the display of the loaded data in the form of a table.

    :param items: The config of the table. This is a drf or vst serializer which includes char fields
                  which are the keys in the dictionaries into which the data from csv is serialized
                  and the  names for columns in a table.
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
    Field that provides autocompletion on frontend, using specified list of objects.

    :param autocomplete: Autocompletion reference. You can set list/tuple with
                         values or set OpenApi schema definition name.
                         For definition name GUI will find optimal link and
                         will show values based on ``autocomplete_property`` and
                         ``autocomplete_represent`` arguments.
    :type autocomplete: list,tuple,str
    :param autocomplete_property: this argument indicates which attribute will be
                                  get from OpenApi schema definition model as value.
    :type autocomplete_property: str
    :param autocomplete_represent: this argument indicates which attribute will be
                                   get from OpenApi schema definition model as represent value.
    :param use_prefetch: prefetch values on frontend at list-view. Default is ``True``.
    :type use_prefetch: bool

    .. note::
        Effective only in GUI. Works similar to :class:`.VSTCharField` in API.
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
    Field containing a list of values with specified separator(default: ",").
    Gets list of values from another model or custom list. Provides autocompletion as :class:`.AutoCompletionField`,
    but with comma-lists.
    Suited for property-fields in model where main logic is already implemented or
    with :class:`CharField`.

    :param select: OpenApi schema definition name or list with values.
    :type select: str,tuple,list
    :param select_separator: separator of values. Default is comma.
    :type select_separator: str
    :param select_property,select_represent: work as ``autocomplete_property`` and ``autocomplete_represent``.
                                             Default is ``name``.
    :param use_prefetch: prefetch values on frontend at list-view. Default is ``False``.
    :param make_link: Show value as link to model. Default is ``True``.
    :param dependence: Dictionary, where keys are name of field from the same model, and values are name of query filter
                       .If at least one of the fields that we depend on is non nullable, required and set to null,
                       autocompletion list will be empty and field will be disabled.
    :type dependence: dict


    .. note::
        Effective only in GUI. Works similar to :class:`.VSTCharField` in API.
    """

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
    Field which type is based on another field. It converts value to internal string
    and represent field as json object.

    :param field: field in model which value change will change type of current value.
    :type field: str
    :param types: key-value mapping where key is value of subscribed field and
                  value is type (in OpenApi format) of current field.
    :type type: dict
    :param choices: variants of choices for different subscribed field values.
                    Uses mapping where key is value of subscribed field and
                    value is list with values to choice.
    :type choices: dict
    :param source_view: Allows to to use parent views data as source for field creation.
                        Exact view path (`/user/{id}/`) or relative parent specifier
                        (`<<parent>>.<<parent>>.<<parent>>`) can be provided. For example if current page is
                        `/user/1/role/2/` and `source_view` is `<<parent>>.<<parent>>` then data
                        from `/user/1/` will be used. Only detail views if supported.
    :type source_view: str


    .. note::
        Effective only in GUI. In API works similar to :class:`.VSTCharField` without value modifications.
    """

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
                  value is type (in OpenApi format) of current field.
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
    Field extends :class:`DynamicJsonTypeField`. Validates field data by :attr:`.field_attribute`
    chosen in related model. By default, any value of :attr:`.field_attribute` validates as :class:`.VSTCharField`.
    To override this behavior set dict attribute ``{field_attribute value}_fields_mapping`` in related model where:

    - **key** - string representation of value type which is received from related instance :attr:`.field_attribute`.
    - **value** - :class:`rest_framework.Field` instance for validation.

    :param field: field in model which value change changes type of current value.
                  Field must be :class:`.FkModelField`.
    :type field: str
    :param field_attribute: attribute of model related model instance with name of type.
    :type field_attribute: str

    .. warning::
        ``field_attribute`` in related model must be :class:`rest_framework.ChoicesField` or
        GUI will show field as simple text.

    """

    default_related_field = VSTCharField(allow_null=True, allow_blank=True, default='')

    def __init__(self, **kwargs):
        self.field = kwargs.pop('field')
        self.field_attribute = kwargs.pop('field_attribute')
        super(DynamicJsonTypeField, self).__init__(**kwargs)  # pylint: disable=bad-super-call

    def get_value(self, dictionary: _t.Any) -> _t.Any:
        value = super().get_value(dictionary)
        if value == empty:
            return value  # nocv

        parent_field = self.parent.fields[self.field]  # type: ignore
        related_object: models.Model = parent_field.get_value(dictionary)  # type: ignore
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
            errors[related_field.field_name] = exc.detail  # type: ignore
        except DjangoValidationError as exc:  # nocv
            errors[related_field.field_name] = get_error_detail(exc)  # type: ignore
        except SkipField:  # nocv
            pass

        if errors:
            raise ValidationError(errors)

        return value

    def get_real_field(self, data) -> _t.Optional[Field]:
        return None


class TextareaField(VSTCharField):
    """
    Field containing multiline string.

    .. note::
        Effective only in GUI. Works similar to :class:`.VSTCharField` in API.
    """


class HtmlField(VSTCharField):
    """
    Field contains html text and marked as format:html. The field does not validate whether its content is HTML.

    .. warning::
        To avoid vulnerability, do not allow users to modify this data because users ate able to execute their scripts.

    .. note::
        Effective only in GUI. Works similar to :class:`.VSTCharField` in API.
    """


class FkField(IntegerField):
    """
    Implementation of ForeignKeyField.You can specify which field of a related model will be
    stored in field(default: "id"), and which will represent field on frontend.

    :param select: OpenApi schema definition name.
    :type select: str
    :param autocomplete_property: this argument indicates which attribute will be
                                  get from OpenApi schema definition model as value.
                                  Default is ``id``.
    :type autocomplete_property: str
    :param autocomplete_represent: this argument indicates which attribute will be
                                   get from OpenApi schema definition model as represent value.
                                   Default is ``name``.
    :param use_prefetch: prefetch values on frontend at list-view. Default is ``True``.
    :type use_prefetch: bool
    :param make_link: show value as link to model. Default is ``True``.
    :type make_link: bool
    :param dependence: dictionary, where keys are names of a field from the same model,
                       and keys are name of query filter.
                       If at least one of the fields that we depend on is non nullable, required and set to null,
                       autocompletion list will be empty and field will be disabled.

                       There are some special keys for dependence dictionary to get data that is stored
                       on frontend without additional database query:

                       ``'<<pk>>'``, - get primary key of current instance

                       ``'<<view_name>>'`` get view name from Vue component,

                       ``'<<parent_view_name>>'`` get view name from Vue component,

                       ``'<<view_level>>'`` get view level,

                       ``'<<operation_id>>'`` get operation_id,

                       ``'<<parent_operation_id'>>`` get parent_operation_id
    :type dependence: dict

    Examples:
        .. sourcecode:: python

            field = FkField(select=Category, dependence={'<<pk>>': 'my_filter'})

    This filter  will get pk of current object and make query on frontend '/category?my_filter=3'
    where '3' is primary key of current instance.


    :param filters: dictionary, where keys are names of a field from a related (by this FkField) model,
                    and values are values of that field.
    :type filters: dict

    .. note::
        Intersection of `dependence.values()` and `filters.keys()` will throw error to prevent ambiguous filtering.
    .. note::
        Effective only in GUI. Works similar to :class:`rest_framework.IntegerField` in API.
    """

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
        super().__init__(**kwargs)
        if self.filters and self.dependence and set(self.dependence.values()) & set(self.filters.keys()):
            self.fail('ambiguous_filter')
        # Remove min/max validators from integer field.
        self.validators = self.validators[:-((self.max_value is not None) + (self.min_value is not None)) or None]


class FkModelField(FkField):
    """
    Extends :class:`.FkField`, but stores referred model class.
    This field is useful for :class:`django.db.models.ForeignKey` fields in model to set.

    :param select: model class (based on :class:`vstutils.models.BModel`) or serializer class
                   which used in API and has path in OpenApi schema.
    :type select: vstutils.models.BModel,vstutils.api.serializers.VSTSerializer
    :param autocomplete_property: this argument indicates which attribute will be
                                  get from OpenApi schema definition model as value.
                                  Default is ``id``.
    :type autocomplete_property: str
    :param autocomplete_represent: this argument indicates which attribute will be
                                   get from OpenApi schema definition model as represent value.
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
            assert len(select) == 2, "'select' must match 'app_name.model_name' pattern."
            self.model_class = SimpleLazyObject(lambda: apps.get_model(require_ready=True, *select))
            kwargs['select'] = self._get_lazy_select_name_from_model()
        elif issubclass(select, ModelSerializer):
            self.model_class = select.Meta.model
            kwargs['select'] = getattr(select.Meta, 'ref_name', '') or select.__name__.replace('Serializer', '')
        else:  # nocv
            raise Exception(
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
        return self.model_class.objects.get(**{self.autocomplete_property: value})

    def get_value(self, dictionary: _t.Any) -> _t.Any:
        value = super().get_value(dictionary)
        if value is not empty and value is not None:
            value = self._get_data_from_model(value)
        return value

    def to_internal_value(self, data: _t.Union[models.Model, int]) -> _t.Union[models.Model]:  # type: ignore[override]
        if isinstance(data, self.model_class):
            return data
        elif isinstance(data, (int, str)):  # nocv
            # deprecated
            return self._get_data_from_model(data)
        self.fail('Unknown datatype')  # nocv

    def to_representation(self, value: _t.Union[int, models.Model]) -> _t.Any:
        self.model_class = get_if_lazy(self.model_class)
        if self.model_class is not None and isinstance(value, self.model_class._meta.pk.model):  # type: ignore
            return getattr(value, self.autocomplete_property)
        else:  # nocv
            # Uses only if value got from `.values()`
            return value  # type: ignore


class DeepFkField(FkModelField):
    """
    Extends :class:`.FkModelField`, but displays as tree on frontend.

    .. warning::
        This field does not support ``dependence``.
        Use ``filters`` at your own risk, as it would rather break the tree structure.

    :param only_last_child: if True then only allows a value to be selected if it has no children. Default is `False`
    :type only_last_child: bool
    :param parent_field_name: name of parent field in model. Default is `parent`
    :type parent_field_name: str
    """
    def __init__(self, only_last_child: bool = False, parent_field_name='parent', **kwargs):
        super().__init__(**kwargs)
        self.only_last_child = only_last_child
        self.parent_field_name = parent_field_name


class UptimeField(IntegerField):
    """
    Field for some uptime(time duration), in seconds, for example.

    .. note::
        Effective only in GUI. Works similar to :class:`rest_framework.IntegerField` in API.

    """


class RedirectFieldMixin:
    """
    Field mixin indicates that this field is used to send redirect address to frontend after some action.

    :param operation_name: prefix for operation_id, for example if operation_id is `history_get`
           then operation_name is `history`
    :type operation_name: str
    :param depend_field: name of the field that we depend on, its' value will be used for operation_id
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
        Effective only in GUI. Works similar to :class:`rest_framework.IntegerField` in API.

    """


class RedirectCharField(RedirectFieldMixin, CharField):
    """
    Field for redirect by string. Often used in actions for redirect after execution.

    .. note::
        Effective only in GUI. Works similar to :class:`rest_framework.IntegerField` in API.

    """


class NamedBinaryFileInJsonField(VSTCharField):
    """
    Field that takes JSON with properties:
    * name - string - name of file;
    * mediaType - string - MIME type of file
    * content - base64 string - content of file.

    This field is useful for saving binary files with their names in :class:`django.db.models.CharField`
    or :class:`django.db.models.TextField` model fields. All manipulations with decoding and encoding
    binary content data executes on client. This imposes reasonable limits on file size.

    Additionally, this field can construct :class:`django.core.files.uploadedfile.SimpleUploadedFile`
    from incoming JSON and store it as file in :class:`django.db.models.FileField` if `file` argument is set to `True`

    Attrs:
    :attr:`NamedBinaryInJsonField.file`: if True, accept only subclasses of File as input. If False, accept only string
    input. Default: False.

    .. note::
        Effective only in GUI. Works similar to :class:`.VSTCharField` in API.

    """

    __valid_keys = ('name', 'content', 'mediaType')
    default_error_messages = {
        'not a JSON': lazy_translate('value is not a valid JSON'),  # type: ignore
        'missing key': lazy_translate('key {missing_key} is missing'),  # type: ignore
        'invalid key': lazy_translate('invalid key {invalid_key}'),  # type: ignore
    }
    file_field = FieldFile

    def __init__(self, **kwargs):
        self.file = kwargs.pop('file', False)
        self.post_handlers = kwargs.pop('post_handlers', ())
        self.pre_handlers = kwargs.pop('pre_handlers', ())
        super(NamedBinaryFileInJsonField, self).__init__(**kwargs)

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
    def to_representation(self, value) -> _t.Dict[_t.Text, _t.Optional[_t.Any]]:
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
    Extends :class:`.NamedBinaryFileInJsonField` to represent image on frontend
    (if binary image is valid).Validate this field with
    :class:`vstutils.api.validators.ImageValidator`.
    """


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
    def to_representation(self, value) -> _t.List[_t.Dict[_t.Text, _t.Any]]:  # type: ignore
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
    """


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
    Extends class :class:`.VSTCharField`. With this field you can output reverse ForeignKey relation
    as a list of related instances.

    To use it, you specify 'related_name' kwarg (related_manager for reverse ForeignKey)
    and 'fields' kwarg (list or tuple of fields from related model, which needs to be included).

    By default :class:`.VSTCharField` used to serialize all field values and represent it on
    frontend. You can specify `serializer_class` and override fields as you need. For example title, description
    and other field properties can be set to customize frontend behaviour.

    :param related_name: name of a related manager for reverse foreign key
    :type related_name: str
    :param fields: list of related model fields.
    :type fields: list[str], tuple[str]
    :param view_type: determines how field are represented on frontend. Must be either 'list' or 'table'.
    :type view_type: str
    :param fields_custom_handlers_mapping: includes custom handlers, where key: field_name, value: callable_obj that
                                           takes params: instance[dict], fields_mapping[dict], model, field_name[str]
    :type fields_custom_handlers_mapping: dict
    :param serializer_class: Serializer to customize types of fields, if no serializer provided :class:`.VSTCharField`
                             will be used for every field in `fields` list
    :type serializer_class: type
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
        assert isinstance(fields, (tuple, list)), "fields must be list or tuple"
        assert fields, "fields must have one or more values"
        assert view_type in ('list', 'table')
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
        data = getattr(value, self.related_name).values(*self.fields)
        if self.has_serializer:
            return self.get_serializer(data, many=True).data
        queryset = getattr(value, self.related_name).all()

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
    Grading limits can be specified with 'min_value=' and 'max_value=', defaults are 0 to 5.Minimal step between
    grades are specified in 'step=', default - 1.Frontend visual representation can be chosen
    with 'front_style=', available variants are listed in 'self.valid_front_styles'.

    for 'slider' front style, you can specify slider color, by passing valid color to 'color='.
    for 'fa_icon' front style, you can specify FontAwesome icon that would be used for displaying rating, by passing a
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
        assert front_style in self.valid_front_styles, f"front_style should be one of {self.valid_front_styles}"
        self.front_style = front_style
        self.color = kwargs.pop('color', None)
        assert isinstance(self.color, str) or self.color is None, "color should be str"
        self.fa_class = kwargs.pop('fa_class', None)
        assert isinstance(self.fa_class, str) or self.fa_class is None, "fa_class should be str"
        self.step = step
        assert not (step != 1 and front_style != 'slider'), 'custom step can be used only with front_style "slider"'
        super(RatingField, self).__init__(min_value=min_value, max_value=max_value, **kwargs)


def is_all_digits_validator(value):
    if not value.isdigit():
        raise ValidationError(
            translate('This field must contain only digits but input: ') + f'{value}.'
        )


class PhoneField(CharField):
    """
    Extends class 'rest_framework.serializers.CharField'.
    Field for for phone in international format
    """

    def __init__(self, **kwargs):
        kwargs['min_length'] = 8
        kwargs['max_length'] = 16
        super().__init__(**kwargs)

        self.validators.append(is_all_digits_validator)


class MaskedField(CharField):
    """
    Extends class 'rest_framework.serializers.CharField'.
    Field that applies mask to value

    :param mask: `IMask <https://imask.js.org/guide.html>`_
    :type mask: dict, str

    .. note::
        Effective only on frontend.
    """
    def __init__(self, mask, **kwargs):
        super().__init__(**kwargs)
        self.mask = mask


class WYSIWYGField(TextareaField):
    """
    On frontend renders https://ui.toast.com/tui-editor.
    Saves data as markdown and escapes all html tags.
    """

    def to_internal_value(self, data):
        return escape(strip_tags(super().to_internal_value(data)))


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
        'invalid_time_range': lazy_translate('Invalid {period} range. Valid choices in {valid} range.'),  # type: ignore
        'invalid_delimiter': lazy_translate('Invalid delimiter value in {interval}. Must be integer.'),  # type: ignore
        'to_many_columns': lazy_translate('There are to many columns with crontab values.'),  # type: ignore
        'invalid': lazy_translate('Invalid crontab syntax.'),  # type: ignore
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
