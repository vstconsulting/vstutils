from django import template

register = template.Library()


class TranslateTag(template.Node):
    def __init__(self, text, filters):
        self.text = text
        self.filters = filters

    def render(self, context):
        result = context.request.language.translate(self.text.var)
        if self.filters:
            tmpl = '{{ "' + result + '" |'
            tmpl += '|'.join(self.filters)
            tmpl += '}}'
            result = context.template.engine.from_string(tmpl).render(context=context)
        return result

    @classmethod
    def handle_token(cls, parser, token):
        """
        Class method to parse prefix node and return a Node.
        """
        bits = token.split_contents()

        if len(bits) < 2:
            raise template.TemplateSyntaxError(
                "'%s' takes at least one argument (phrase to translate)" % bits[0])  # nocv

        return cls(parser.compile_filter(bits[1]), bits[2:])


class TranslateErrorsTag(template.Node):
    def __init__(self, errors_list):
        self.errors_list = errors_list

    def render(self, context):
        trans = context.request.language.translate
        result = ''
        errors = self.errors_list.resolve(context)
        for error in errors.as_data():
            translated = trans(str(error.message))
            if error.params:
                translated = translated % {k: trans(v) for k, v in error.params.items()}
            result += f'<li>{translated}</li>'

        return f'<ul class="form-errors">{result}</ul>'


@register.tag('translate_text')
def translate_text(parser, token):
    """
    Translates text to language from request

    Usage::

        {% translate_text path [filters...] %}

    Examples::

        {% translate_text "username" capfirst cut:" "  %}
    """
    return TranslateTag.handle_token(parser, token)


@register.tag('translate_errors')
def translate_errors(parser, token):
    """
    Translates every error and its parameters from given ErrorList and renders it in ul list

    Usage:
        {% translate_errors form.non_field_errors %}
    """
    bits = token.split_contents()
    if len(bits) < 2:
        raise template.TemplateSyntaxError('translate_errors takes at least one argument')  # nocv
    return TranslateErrorsTag(template.Variable(bits[1]))
