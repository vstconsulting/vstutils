"""
Additionals serializers fields for generating OpenAPI and GUI.
"""
import typing
import json
import six
from rest_framework.serializers import CharField, IntegerField, ModelSerializer
from django.db import models
from ..utils import raise_context


class VSTCharField(CharField):
    def to_internal_value(self, data):
        allowed_types = six.string_types, six.text_type
        with raise_context():
            if not isinstance(data, allowed_types):
                data = json.dumps(data)
        data = str(data)
        return super().to_internal_value(data)


class FileInStringField(CharField):
    '''
    File type which saves as string.
    Take effect only in GUI.
    '''


class SecretFileInString(FileInStringField):
    '''
    File type which saves as string and should be hidden.
    Take effect only in GUI.
    '''
    def __init__(self, **kwargs):
        kwargs['style'] = {'input_type': 'password'}
        super().__init__(**kwargs)


class AutoCompletionField(CharField):
    '''
    Field with autocomplite from list of objects.
    Take effect only in GUI.
    '''
    __slots__ = 'autocomplete', 'autocomplete_property'

    def __init__(self, **kwargs):
        self.autocomplete = kwargs.pop('autocomplete')
        self.autocomplete_property = None
        if not isinstance(self.autocomplete, (list, tuple)):
            self.autocomplete_property = kwargs.pop('autocomplete_property', 'id')
            self.autocomplete_represent = kwargs.pop('autocomplete_represent', 'name')
        super().__init__(**kwargs)


class CommaMultiSelect(CharField):
    '''
    Comma (or specified) separated list of values field.
    Gets list of values from another model or custom list.
    Take effect only in GUI.
    '''

    def __init__(self, **kwargs):
        self.select_model = kwargs.pop('select')
        self.select_separator = kwargs.pop('select_separator', ',')  # type: typing.Text
        self.select_property = None
        if not isinstance(self.select_model, (list, tuple)):
            self.select_property = kwargs.pop('select_property', 'name')
            self.select_represent = kwargs.pop('select_represent', 'name')
        super().__init__(**kwargs)

    def to_internal_value(self, data: typing.Union[typing.Text, typing.Sequence]) -> typing.Text:
        return self.to_representation(data)  # nocv

    def to_representation(self, data: typing.Union[typing.Text, typing.Sequence]) -> typing.Text:
        if isinstance(data, six.string_types):
            data = map(str, filter(bool, data.split(self.select_separator)))
        return self.select_separator.join(data)


class DependEnumField(CharField):
    '''
    Field based on another field.
    Take effect only in GUI.
    '''
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
    '''
    Field contained multiline string.
    Take effect only in GUI.
    '''


class HtmlField(CharField):
    '''
    Field contained html-text and marked as format:html.
    Take effect only in GUI.
    '''


class FkField(IntegerField):
    '''
    Field what means where we got list.
    Take effect only in GUI.
    '''
    __slots__ = 'select_model', 'autocomplete_property', 'autocomplete_represent'

    def __init__(self, **kwargs):
        self.select_model = kwargs.pop('select')
        self.autocomplete_property = kwargs.pop('autocomplete_property', 'id')
        self.autocomplete_represent = kwargs.pop('autocomplete_represent', 'name')
        super().__init__(**kwargs)


class FkModelField(FkField):
    '''
    FK field which got integer from API and returns model object.
    `select_model` is a model class instead of string.
    '''

    def __init__(self, **kwargs):
        select = kwargs.pop('select')
        if not issubclass(select, ModelSerializer):  # nocv
            raise Exception('Argument "select" must be django.db.models.Model instance.')
        self.model_class = select.Meta.model
        kwargs['select'] = select.__name__.replace('Serializer', '')
        super().__init__(**kwargs)

    def to_internal_value(self, data: int):
        return self.model_class.objects.get(**{ self.autocomplete_property: data })

    def to_representation(self, value: typing.Union[models.Model, int]) -> int:
        if isinstance(value, self.model_class):
            return getattr(value, self.autocomplete_property)
        return value  # nocv


class UptimeField(IntegerField):
    '''
    Field for some uptime(time duration), in seconds, for example.
    Take effect only in GUI.
    '''


class RedirectIntegerField(IntegerField):
    '''
    Field for redirect by id.
    Take effect only in GUI.
    '''

    redirect = True


class RedirectCharField(CharField):
    '''
    Field for redirect by string.
    Take effect only in GUI.
    '''

    redirect = True


class ImageField(CharField):
    '''
    Field that takes base64 string as input value .
    Take effect only in GUI.
    '''
