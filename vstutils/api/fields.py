"""
Additionals serializers fields for generating OpenAPI and GUI.
"""
import typing as _t
import json
from rest_framework.serializers import CharField, IntegerField, ModelSerializer
from django.db import models
from ..utils import raise_context


class VSTCharField(CharField):

    __slots__ = ()

    def to_internal_value(self, data):
        with raise_context():
            if not isinstance(data, str):
                data = json.dumps(data)
        data = str(data)
        return super().to_internal_value(data)


class FileInStringField(CharField):
    """
    Field, that saves file's content as string.
    Take effect only in GUI.
    """

    __slots__ = ()


class SecretFileInString(FileInStringField):
    """
    Field, that saves file's content as string and should be hidden.
    Take effect only in GUI.
    """

    __slots__ = ()

    def __init__(self, **kwargs):
        kwargs['style'] = {'input_type': 'password'}
        super().__init__(**kwargs)


class BinFileInStringField(FileInStringField):
    """
    Field, that saves file's content as base64 string.
    Take effect only in GUI.
    """

    __slots__ = ()


class AutoCompletionField(CharField):
    """
    Field with autocomplite from list of objects.
    Take effect only in GUI.
    """
    __slots__ = 'autocomplete', 'autocomplete_property'

    def __init__(self, **kwargs):
        self.autocomplete = kwargs.pop('autocomplete')
        self.autocomplete_property = None
        if not isinstance(self.autocomplete, (list, tuple)):
            self.autocomplete_property = kwargs.pop('autocomplete_property', 'id')
            self.autocomplete_represent = kwargs.pop('autocomplete_represent', 'name')
        super().__init__(**kwargs)


class CommaMultiSelect(CharField):
    """
    Comma (or specified) separated list of values field.
    Gets list of values from another model or custom list.
    Take effect only in GUI.
    """

    __slots__ = ('select_model', 'select_separator', 'select_property', 'select_represent')

    def __init__(self, **kwargs):
        self.select_model = kwargs.pop('select')
        self.select_separator = kwargs.pop('select_separator', ',')  # type: _t.Text
        self.select_property = None
        if not isinstance(self.select_model, (list, tuple)):
            self.select_property = kwargs.pop('select_property', 'name')
            self.select_represent = kwargs.pop('select_represent', 'name')
        super().__init__(**kwargs)

    def to_internal_value(self, data: _t.Union[_t.Text, _t.Sequence]) -> _t.Text:
        return self.to_representation(data)  # nocv

    def to_representation(self, data: _t.Union[_t.Text, _t.Sequence]) -> _t.Text:
        if isinstance(data, str):
            data = map(str, filter(bool, data.split(self.select_separator)))
        return self.select_separator.join(data)


class DependEnumField(CharField):
    """
    Field based on another field.
    Take effect only in GUI.
    """
    __slots__ = 'field', 'choices', 'types'

    def __init__(self, **kwargs):
        self.field = kwargs.pop('field')
        self.choices = kwargs.pop('choices', dict())
        self.types = kwargs.pop('types', dict())
        super().__init__(**kwargs)

    def to_internal_value(self, data):
        return data

    def to_representation(self, value):
        return value


class TextareaField(CharField):
    """
    Field contained multiline string.
    Take effect only in GUI.
    """

    __slots__ = ()


class HtmlField(CharField):
    """
    Field contained html-text and marked as format:html.
    Take effect only in GUI.
    """

    __slots__ = ()


class FkField(IntegerField):
    """
    Field what means where we got list.
    Take effect only in GUI.
    """
    __slots__ = 'select_model', 'autocomplete_property', 'autocomplete_represent'

    def __init__(self, **kwargs):
        self.select_model = kwargs.pop('select')
        self.autocomplete_property = kwargs.pop('autocomplete_property', 'id')
        self.autocomplete_represent = kwargs.pop('autocomplete_represent', 'name')
        super().__init__(**kwargs)


class FkModelField(FkField):
    """
    FK field which got integer from API and returns model object.
    `select_model` is a model class instead of string.
    """

    __slots__ = ('model_class',)

    def __init__(self, **kwargs):
        select = kwargs.pop('select')
        if not issubclass(select, ModelSerializer):  # nocv
            raise Exception('Argument "select" must be django.db.models.Model instance.')
        self.model_class = select.Meta.model
        kwargs['select'] = select.__name__.replace('Serializer', '')
        super().__init__(**kwargs)

    def to_internal_value(self, data: int):
        return self.model_class.objects.get(**{self.autocomplete_property: data})

    def to_representation(self, value: _t.Union[models.Model, int]) -> int:
        if isinstance(value, self.model_class):
            return getattr(value, self.autocomplete_property)
        return value  # nocv


class UptimeField(IntegerField):
    """
    Field for some uptime(time duration), in seconds, for example.
    Take effect only in GUI.
    """

    __slots__ = ()


class RedirectIntegerField(IntegerField):
    """
    Field for redirect by id.
    Take effect only in GUI.
    """

    __slots__ = ()
    redirect = True


class RedirectCharField(CharField):
    """
    Field for redirect by string.
    Take effect only in GUI.
    """

    __slots__ = ()
    redirect = True


class NamedBinaryFileInJsonField(VSTCharField):
    """
    Field that takes JSON with properties:
    * name - string - name of file;
    * content - base64 string - content of file.
    Take effect only in GUI.
    """

    __slots__ = ()
    __valid_keys = ['name', 'content']

    def validate_value(self, data: _t.Dict):
        if not isinstance(data, dict):
            self.fail('not a JSON')
        invalid_keys = list(k for k in data.keys() if k not in self.__valid_keys)
        if invalid_keys:
            self.fail(f'invalid key {invalid_keys[0]}')
        for key in self.__valid_keys:
            if key not in data:
                self.fail(f'"{key}" is not set')

    def to_internal_value(self, data: _t.Dict) -> _t.Text:
        if data is not None:
            self.validate_value(data)
        return super().to_internal_value(data)

    def to_representation(self, value) -> _t.Dict[_t.Text, _t.Any]:
        with raise_context():
            return json.loads(value)
        return dict(name=None, content=None)


class NamedBinaryImageInJsonField(NamedBinaryFileInJsonField):
    """
    Field that takes JSON with properties:
    * name - string - name of image;
    * content - base64 string - content of image.
    Take effect only in GUI.
    """

    __slots__ = ()


class MultipleNamedBinaryFileInJsonField(NamedBinaryFileInJsonField):
    """
    Field that takes JSON with array, that consists of objects with properties:
    * name - string - name of file;
    * content - base64 string - content of file.
    Take effect only in GUI.
    """

    __slots__ = ()

    def to_internal_value(self, data: _t.List) -> _t.Text:
        if data is not None:
            if not isinstance(data, list):
                self.fail('not a list')
            for file in data:
                self.validate_value(file)
        return VSTCharField.to_internal_value(self, data)

    def to_representation(self, value) -> _t.List[_t.Dict[_t.Text, _t.Any]]:
        with raise_context():
            return json.loads(value)
        return list()


class MultipleNamedBinaryImageInJsonField(MultipleNamedBinaryFileInJsonField):
    """
    Field that takes JSON with array, that consists of objects with properties:
    * name - string - name of image;
    * content - base64 string - content of image.
    Take effect only in GUI.
    """

    __slots__ = ()
