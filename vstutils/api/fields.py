"""
Additional serializer fields for generating OpenAPI and GUI.
"""

import typing as _t
import json

from rest_framework.serializers import CharField, IntegerField, ModelSerializer
from rest_framework.fields import empty
from django.apps import apps
from django.db import models
from django.utils.functional import SimpleLazyObject

from ..utils import raise_context, get_if_lazy, raise_context_decorator_with_default


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


    .. note::
        Take effect only in GUI. In API it would be simple :class:`.VSTCharField`.
    """

    __slots__ = ('select_model', 'select_separator', 'select_property', 'select_represent', 'use_prefetch', 'make_link')

    select_model: _t.Text
    select_separator: _t.Text
    select_property: _t.Text
    select_represent: _t.Text
    use_prefetch: bool
    make_link: bool

    def __init__(self, **kwargs):
        self.select_model = kwargs.pop('select')
        self.select_separator = kwargs.pop('select_separator', ',')
        self.select_property = None  # type: ignore
        if not isinstance(self.select_model, (list, tuple)):
            self.select_property = kwargs.pop('select_property', 'name')
            self.select_represent = kwargs.pop('select_represent', 'name')
        self.use_prefetch = kwargs.pop('use_prefetch', False)
        self.make_link = kwargs.pop('make_link', True)
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
    :param make_link: Show value as link to model. Default is ``True``.

    .. note::
        Take effect only in GUI. In API it would be simple :class:`rest_framework.IntegerField`.
    """
    __slots__ = 'select_model', 'autocomplete_property', 'autocomplete_represent', 'use_prefetch', 'make_link'

    select_model: _t.Text
    autocomplete_property: _t.Text
    autocomplete_represent: _t.Text
    use_prefetch: bool
    make_link: bool

    def __init__(self, **kwargs):
        self.select_model = kwargs.pop('select')
        self.autocomplete_property = kwargs.pop('autocomplete_property', 'id')
        self.autocomplete_represent = kwargs.pop('autocomplete_represent', 'name')
        self.use_prefetch = kwargs.pop('use_prefetch', True)
        self.make_link = kwargs.pop('make_link', True)
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

    def _get_data_from_model(self, value):
        return self.model_class.objects.get(**{self.autocomplete_property: value})

    def get_value(self, dictionary: _t.Any) -> _t.Any:
        value = super().get_value(dictionary)
        if value is not empty:
            return self._get_data_from_model(value)
        return empty

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
