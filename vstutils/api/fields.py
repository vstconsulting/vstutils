import json
import six
from rest_framework.serializers import CharField, IntegerField
from ..utils import raise_context


class VSTCharField(CharField):
    def to_internal_value(self, data):
        allowed_types = six.string_types, six.text_type
        with raise_context():
            if not isinstance(data, allowed_types):
                data = json.dumps(data)
        data = str(data)
        return super(VSTCharField, self).to_internal_value(data)


class FileInStringField(CharField):
    '''
    File type which saves as string.
    '''


class SecretFileInString(FileInStringField):
    '''
    File type which saves as string and should be hidden.
    '''
    def __init__(self, **kwargs):
        kwargs['style'] = {'input_type': 'password'}
        super(SecretFileInString, self).__init__(**kwargs)


class AutoCompletionField(CharField):
    '''
    Field with autocomplite from list of objects.
    '''
    __slots__ = 'autocomplete', 'autocomplete_property'

    def __init__(self, **kwargs):
        self.autocomplete = kwargs.pop('autocomplete')
        self.autocomplete_property = None
        if not isinstance(self.autocomplete, (list, tuple)):
            self.autocomplete_property = kwargs.pop('autocomplete_property', 'id')
            self.autocomplete_represent = kwargs.pop('autocomplete_represent', 'name')
        super(AutoCompletionField, self).__init__(**kwargs)


class DependEnumField(CharField):
    '''
    Field based on another field.
    '''
    __slots__ = 'field', 'choices', 'types'

    def __init__(self, **kwargs):
        self.field = kwargs.pop('field')
        self.choices = kwargs.pop('choices', dict())
        self.types = kwargs.pop('types', dict())
        super(DependEnumField, self).__init__(**kwargs)

    def to_internal_value(self, data):
        return data

    def to_representation(self, value):
        return value


class TextareaField(CharField):
    '''
    Field contained multiline string
    '''


class HtmlField(CharField):
    '''
    Field contained html-text and marked as format:html
    '''


class FkField(IntegerField):
    '''
    Field what means where we got list.
    '''
    __slots__ = 'select_model', 'autocomplete_property', 'autocomplete_represent'

    def __init__(self, **kwargs):  # nocv
        self.select_model = kwargs.pop('select')
        self.autocomplete_property = kwargs.pop('autocomplete_property', 'id')
        self.autocomplete_represent = kwargs.pop('autocomplete_represent', 'name')
        super(FkField, self).__init__(**kwargs)


class UptimeField(IntegerField):
    '''
    Field for some uptime(time duration), in seconds, for example.
    '''


class RedirectIntegerField(IntegerField):
    '''
    Field for redirect by id
    '''

    redirect = True


class RedirectCharField(CharField):
    '''
    Field for redirect by string
    '''

    redirect = True
