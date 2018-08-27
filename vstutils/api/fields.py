from rest_framework.serializers import CharField


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
    def __init__(self, **kwargs):
        self.autocomplete = kwargs.pop('autocomplete')
        super(AutoCompletionField, self).__init__(**kwargs)


class TextareaField(CharField):
    '''
    Field contained multiline string
    '''


class HtmlField(CharField):
    '''
    Field contained html-text and marked as format:html
    '''
