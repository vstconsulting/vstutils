"""
Additional serializer fields for generating OpenAPI and GUI.
"""

import typing as _t
import copy
import json
import functools

from rest_framework.serializers import CharField, IntegerField, FloatField, ModelSerializer
from rest_framework.fields import empty, SkipField, get_error_detail, Field
from rest_framework.exceptions import ValidationError
from django.apps import apps
from django.db import models
from django.utils.functional import SimpleLazyObject
from django.core.exceptions import ValidationError as DjangoValidationError

from ..utils import raise_context, get_if_lazy, raise_context_decorator_with_default


DependenceType = _t.Optional[_t.Dict[_t.Text, _t.Text]]


class VSTCharField(CharField):
    """
    Simple CharField (extends :class:`rest_framework.fields.CharField`).
    This field translate any json type to string for model.
    """

    __slots__ = ()

    def to_internal_value(self, data) -> _t.Text:
        with raise_context():
            if not isinstance(data, str):
                data = json.dumps(data)
        data = str(data)
        return super().to_internal_value(data)


class FileInStringField(VSTCharField):
    """
    Field extends :class:`.VSTCharField` and saves file's content as string.

    Value must be text (not binary) and saves in model as is.

    .. note::
        Take effect only in GUI. In API it would be simple :class:`.VSTCharField`.
    """

    __slots__ = ()


class SecretFileInString(FileInStringField):
    """
    Field extends :class:`.FileInStringField` and saves file's content as string and should be hidden on frontend.

    Value must be text (not binary) and saves in model as is.

    .. note::
        Take effect only in GUI. In API it would be simple :class:`.VSTCharField`.
    """

    __slots__ = ()

    def __init__(self, **kwargs):
        kwargs['style'] = {'input_type': 'password'}
        super().__init__(**kwargs)


class BinFileInStringField(FileInStringField):
    """
    Field extends :class:`.FileInStringField` and  that saves file's content as base64 string.
    This often useful when you want save binary file in django model text field.

    .. note::
        Take effect only in GUI. In API it would be simple :class:`.VSTCharField`.
    """

    __slots__ = ()


class AutoCompletionField(VSTCharField):
    """
    Field with autocomplete from list of objects.

    :param autocomplete: Autocompletion reference. You can set simple list/tuple with
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

    .. note::
        Take effect only in GUI. In API it would be simple :class:`.VSTCharField`.
    """
    __slots__ = 'autocomplete', 'autocomplete_property', 'autocomplete_represent'

    autocomplete: _t.Text
    autocomplete_property: _t.Text
    autocomplete_represent: _t.Text

    def __init__(self, **kwargs):
        self.autocomplete = kwargs.pop('autocomplete')
        self.autocomplete_property = None  # type: ignore
        if not isinstance(self.autocomplete, (list, tuple)):
            self.autocomplete_property = kwargs.pop('autocomplete_property', 'id')
            self.autocomplete_represent = kwargs.pop('autocomplete_represent', 'name')
        super().__init__(**kwargs)


class CommaMultiSelect(VSTCharField):
    """
    Comma (or specified) separated list of values field.
    Gets list of values from another model or custom list. Works as :class:`.AutoCompletionField`
    but with comma-lists.
    Often uses with property-fields in model where main logic is already implemented or
    with simple CharFields.

    :param select: OpenApi schema definition name or list with values.
    :type select: str,tuple,list
    :param select_separator: separator of values. Default is comma.
    :type select_separator: str
    :param select_property,select_represent: work as ``autocomplete_property`` and ``autocomplete_represent``.
                                             Default is ``name``.
    :param use_prefetch: prefetch values on frontend at list-view. Default is ``False``.
    :param make_link: Show value as link to model. Default is ``True``.
    :param dependence: Dictionary, where keys are name of field from the same model, and keys are name of query filter.
                       If at least one of the fields that we depend on is non nullable, required and set to null,
                       autocompletion list will be empty and field will be disabled.
    :type dependence: dict


    .. note::
        Take effect only in GUI. In API it would be simple :class:`.VSTCharField`.
    """

    __slots__ = (
        'select_model',
        'select_separator',
        'select_property',
        'select_represent',
        'use_prefetch',
        'make_link',
        'dependence'
    )

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

    def to_representation(self, data: _t.Union[_t.Text, _t.Sequence, _t.Iterator]) -> _t.Text:
        if isinstance(data, str):
            data = map(str, filter(bool, data.split(self.select_separator)))
        return self.select_separator.join(data)


class DynamicJsonTypeField(VSTCharField):
    """
    Field which type is based on another field and converts value to internal string
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


    .. note::
        Take effect only in GUI. In API it would be simple :class:`.VSTCharField`
        but without value modifications.
    """
    __slots__ = 'field', 'choices', 'types'

    field: _t.Text
    choices: _t.Dict
    types: _t.Dict

    to_json = True

    def __init__(self, **kwargs):
        self.field = kwargs.pop('field')
        self.choices = kwargs.pop('choices', {})
        self.types = kwargs.pop('types', {})
        super().__init__(**kwargs)

    def to_internal_value(self, data):
        return super().to_internal_value(data) if self.to_json else data

    def to_representation(self, value):
        with raise_context():
            value = json.loads(value) if self.to_json else value
        return value


class DependEnumField(DynamicJsonTypeField):
    """
    Field extends :class:`DynamicJsonTypeField` but without data modification.
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
        Take effect only in GUI. In API it would be simple :class:`.VSTCharField`
        but without value modifications.
    """
    __slots__ = ()
    to_json = False


class DependFromFkField(DynamicJsonTypeField):
    """
    Field extends :class:`DynamicJsonTypeField`. Validates field data by :attr:`.field_attribute`
    chosen in related model. By default, any value of :attr:`.field_attribute` validates as :class:`.VSTCharField`.
    To override this behavior you should set dict-attribute in related model  named
    ``{field_attribute value}_fields_mapping`` where:

    - **key** - string representation of value type which is received from related instance :attr:`.field_attribute`.
    - **value** - :class:`rest_framework.Field` instance for validation.

    :param field: field in model which value change will change type of current value.
                  Field must be :class:`.FkModelField`.
    :type field: str
    :param field_attribute: attribute of model related model instance with name of type.
    :type field_attribute: str

    .. warning::
        ``field_attribute`` in related model must be :class:`rest_framework.ChoicesField` or
        GUI will show field as simple text.

    """
    __slots__ = ('field', 'field_attribute')

    default_related_field = VSTCharField(allow_null=True, allow_blank=True, default='')

    def __init__(self, **kwargs):
        self.field = kwargs.pop('field')
        self.field_attribute = kwargs.pop('field_attribute')
        super(DynamicJsonTypeField, self).__init__(**kwargs)  # pylint: disable=bad-super-call

    def get_value(self, dictionary: _t.Any) -> _t.Any:
        value = super().get_value(dictionary)

        related_object: models.Model = self.parent.fields[self.field].get_value(dictionary)  # type: ignore
        related_type = getattr(related_object, self.field_attribute)
        related_field: Field = getattr(
            related_object,
            f'{self.field_attribute}_fields_mapping',
            {related_type: self.default_related_field}
        ).get(related_type, self.default_related_field)
        related_field: Field = copy.deepcopy(related_field)
        related_field.field_name: _t.Text = self.field_name  # type: ignore

        errors = {}
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


class TextareaField(VSTCharField):
    """
    Field contained multiline string.

    .. note::
        Take effect only in GUI. In API it would be simple :class:`.VSTCharField`.
    """

    __slots__ = ()


class HtmlField(VSTCharField):
    """
    Field contained html-text and marked as format:html. This reach-text is represents as is.

    .. warning::
        Do not allow for users to modify this data because they can set some scripts to value and
        it would be vulnerability.

    .. note::
        Take effect only in GUI. In API it would be simple :class:`.VSTCharField`.
    """

    __slots__ = ()


class FkField(IntegerField):
    """
    Field indicates where we got list of primary key values (should be integer).

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
    :param make_link: Show value as link to model. Default is ``True``.
    :type make_link: bool
    :param dependence: Dictionary, where keys are name of field from the same model, and keys are name of query filter.
                       If at least one of the fields that we depend on is non nullable, required and set to null,
                       autocompletion list will be empty and field will be disabled.
    :type dependence: dict

    .. note::
        Take effect only in GUI. In API it would be simple :class:`rest_framework.IntegerField`.
    """
    __slots__ = (
        'select_model',
        'autocomplete_property',
        'autocomplete_represent',
        'use_prefetch',
        'make_link',
        'dependence'
    )

    select_model: _t.Text
    autocomplete_property: _t.Text
    autocomplete_represent: _t.Text
    use_prefetch: bool
    make_link: bool
    dependence: DependenceType

    def __init__(self, **kwargs):
        self.select_model = kwargs.pop('select')
        self.autocomplete_property = kwargs.pop('autocomplete_property', 'id')
        self.autocomplete_represent = kwargs.pop('autocomplete_represent', 'name')
        self.use_prefetch = kwargs.pop('use_prefetch', True)
        self.make_link = kwargs.pop('make_link', True)
        self.dependence = kwargs.pop('dependence', None)
        super().__init__(**kwargs)


class FkModelField(FkField):
    """
    FK field extends :class:`.FkField` which got integer from API and returns model object as value.
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
        Model class on call `.to_internal_value` get object from database. Be careful on mass save executions.

    .. warning::
        Model class does not check permissons to model instance where this field using.
        You should check it manually in signals or validators.

    """

    __slots__ = ('model_class',)

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
            kwargs['select'] = select.__name__.replace('Serializer', '')
        else:  # nocv
            raise Exception(
                'Argument "select" must be '
                'rest_framework.serializers.ModelSerializer or '
                'vstutils.models.BModel subclass or '
                'string matched "app_name.model_name" pattern.'
            )
        super().__init__(**kwargs)
        # Remove min/max validators from integer field.
        self.validators = self.validators[:-2]

    def _get_lazy_select_name_from_model(self):
        # pylint: disable=invalid-name
        return SimpleLazyObject(
            lambda: self.model_class.get_list_serializer_name().split('Serializer')[0]
        )

    @functools.lru_cache()
    def _get_data_from_model(self, value):
        self.model_class = get_if_lazy(self.model_class)
        return self.model_class.objects.get(**{self.autocomplete_property: value})

    def get_value(self, dictionary: _t.Any) -> _t.Any:
        value = super().get_value(dictionary)
        if value is not empty and value is not None:
            value = self._get_data_from_model(value)
        return value

    def to_internal_value(self, data: _t.Union[models.Model, int]) -> _t.Union[models.Model, _t.NoReturn]:
        if isinstance(data, self.model_class):
            return data
        elif isinstance(data, (int, str)):  # nocv
            # deprecated
            return self._get_data_from_model(data)
        self.fail('Unknown datatype')  # nocv

    def to_representation(self, value: _t.Union[int, models.Model]) -> _t.Any:
        self.model_class = get_if_lazy(self.model_class)
        if isinstance(value, self.model_class):
            return getattr(value, self.autocomplete_property)
        else:  # nocv
            return value  # type: ignore


class UptimeField(IntegerField):
    """
    Field for some uptime(time duration), in seconds, for example.

    .. note::
        Take effect only in GUI. In API it would be simple :class:`rest_framework.IntegerField`.

    """

    __slots__ = ()


class RedirectIntegerField(IntegerField):
    """
    Field for redirect by id. Often uses in actions for redirect after execution.

    .. note::
        Take effect only in GUI. In API it would be simple :class:`rest_framework.IntegerField`.

    """

    __slots__ = ()
    redirect: bool = True


class RedirectCharField(CharField):
    """
    Field for redirect by string. Often uses in actions for redirect after execution.

    .. note::
        Take effect only in GUI. In API it would be simple :class:`rest_framework.IntegerField`.

    """

    __slots__ = ()
    redirect: bool = True


class NamedBinaryFileInJsonField(VSTCharField):
    """
    Field that takes JSON with properties:
    * name - string - name of file;
    * content - base64 string - content of file.

    This field is useful for saving binary files with their names in simple :class:`django.db.models.CharField`
    or :class:`django.db.models.TextField` model fields. All manipulations with decoding and encoding
    binary content data executes on client. This imposes reasonable limits on file size.

    .. note::
        Take effect only in GUI. In API it would be simple :class:`.VSTCharField` with structure of data.

    """

    __slots__ = ()

    __valid_keys = ('name', 'content')
    default_error_messages = {
        'not a JSON': 'value is not a valid JSON',
        'missing key': 'key {missing_key} is missing',
        'invalid key': 'invalid key {invalid_key}',
    }

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

    def to_internal_value(self, data: _t.Dict) -> _t.Text:
        if data is not None:
            self.validate_value(data)
        return super().to_internal_value(data)

    @raise_context_decorator_with_default(default={"name": None, "content": None})
    def to_representation(self, value) -> _t.Dict[_t.Text, _t.Optional[_t.Any]]:
        return json.loads(value)


class NamedBinaryImageInJsonField(NamedBinaryFileInJsonField):
    """
    Extends :class:`.NamedBinaryFileInJsonField` but in GUI has a different view
    which shows content of image.
    """

    __slots__ = ()


class MultipleNamedBinaryFileInJsonField(NamedBinaryFileInJsonField):
    """
    Extends :class:`.NamedBinaryFileInJsonField` but uses list of structures.
    This provide operating with multiple files.
    """

    __slots__ = ()
    default_error_messages = {
        'not a list': 'value is not a valid list',
    }

    def to_internal_value(self, data: _t.List) -> _t.Text:  # type: ignore
        if data is not None:
            if not isinstance(data, list):
                self.fail('not a list')
            for file in data:
                self.validate_value(file)
        return VSTCharField.to_internal_value(self, data)

    @raise_context_decorator_with_default(default=[])
    def to_representation(self, value) -> _t.List[_t.Dict[_t.Text, _t.Any]]:  # type: ignore
        return json.loads(value)


class MultipleNamedBinaryImageInJsonField(MultipleNamedBinaryFileInJsonField):
    """
    Extends :class:`.MultipleNamedBinaryFileInJsonField` but uses list of structures.
    This provide operating with multiple images and works as list of :class:`NamedBinaryImageInJsonField`.
    """

    __slots__ = ()


class PasswordField(CharField):
    """
    Extends :class: `.CharField` but in schema overload format to `password`.
    This provide ability to make fields with asterisks instead of data on front-end.
    """

    def __init__(self, *args, **kwargs):
        kwargs['write_only'] = True
        kwargs['style'] = kwargs.get('style', {})
        kwargs['style']['input_type'] = 'password'
        super(PasswordField, self).__init__(*args, ** kwargs)


class RelatedListField(VSTCharField):
    """
    Extends class 'vstutils.api.fields.VSTCharField'. With this field you can output reverse ForeignKey relation
    as a list of related instances.
    To use it, you need to specify 'related_name' kwarg(related_manager for reverse ForeignKey)
    and 'fields' kwarg(list or tuple of fields from related model, which needs to be included)

    :param related_name: name of a related manager for reverse foreign key
    :type related_name: str
    :param fields: list of related model fields.
    :type fields: list[str], tuple[str]
    :param view_type: Determines how field should be shown on frontend. Must be either 'list' or 'table'.
    :type view_type: str
    """

    def __init__(self, related_name: _t.Text, fields: _t.Union[_t.Tuple, _t.List], view_type: str = 'list', **kwargs):
        kwargs['read_only'] = True
        kwargs['source'] = "*"
        super().__init__(**kwargs)
        # fields for 'values' in qs
        assert isinstance(fields, (tuple, list)), "fields must be list or tuple"
        assert fields, "fields must have one or more values"
        assert view_type in ('list', 'table')
        self.fields = fields
        self.related_name = related_name
        self.view_type = view_type

    def to_representation(self, value: _t.Type[models.Model]):
        # get related mapping with id and name of instances
        return getattr(value, self.related_name).values(*self.fields)


class RatingField(FloatField):
    """
    Extends class 'rest_framework.serializers.FloatField'. This field represents a rating form input on frontend.
    Grading limits can be specified with 'min_value=' and 'max_value=', defaults are 0 to 5.Minimal step between
    grades are specified in 'step=', default - 1.Frontend visual representation can be choosen
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
    :param color: color of slider (css color style)
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
        super(RatingField, self).__init__(min_value=min_value, max_value=max_value, **kwargs)
