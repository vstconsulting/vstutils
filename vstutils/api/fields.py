from rest_framework.serializers import CharField, IntegerField


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


class Select2Field(IntegerField):
    '''
    Field what means where we got list.
    '''
    def __init__(self, **kwargs):  # nocv
        self.select_model = kwargs.pop('select')
        self.autocomplete_property = kwargs.pop('autocomplete_property', 'id')
        self.autocomplete_represent = kwargs.pop('autocomplete_represent', 'name')
        super(Select2Field, self).__init__(**kwargs)


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
