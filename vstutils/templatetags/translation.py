from django import template

from ..utils import translate

CONTEXT_VAR_NAME = '__lang__'
register = template.Library()


class TranslateTag(template.Node):
    def __init__(self, text, filters):
        self.text = text
        self.filters = filters

    def get_translate_callback(self, context):
        if CONTEXT_VAR_NAME in context:
            return context[CONTEXT_VAR_NAME].translate
        elif hasattr(context, 'request') \
            and hasattr(context.request, 'language') \
                and hasattr(context.request.language, 'translate'):
            return context.request.language.translate
        return translate

    def render(self, context):

        if str(self.text.var).startswith("$"):
            self.text.var = context[self.text.var[1:]]

        result = self.get_translate_callback(context)(self.text.var)
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
                f"'{bits[0]}' takes at least one argument (phrase to translate)")  # nocv

        return cls(parser.compile_filter(bits[1]), bits[2:])


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
