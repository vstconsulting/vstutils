from collections import OrderedDict
from django import template

register = template.Library()


class IniTag(template.Node):
    def __init__(self, config_name):
        self._config_name = config_name

    def _generate_values(self, values):
        return '\n'.join(['{} = {}'.format(k, v) for k, v in values.items()])

    def _iter(self, config):
        return '\n'.join([
            "[{}]\n{}".format(section, self._generate_values(values))
            for section, values in config.items()
        ]) if isinstance(config, (dict, OrderedDict)) else config

    def render(self, context):
        try:
            return self._iter(context.get(self._config_name.token))
        except Exception as err:
            return '# Invalid config.\n# {}'.format(str(err))

    @classmethod
    def handle_token(cls, parser, token):
        bits = token.split_contents()

        if len(bits) < 2:  # nocv
            raise template.TemplateSyntaxError(
                "'%s' takes at least one argument (dict with empty sections)" % bits[0])

        return cls(parser.compile_filter(bits[1]))


register.tag(name='ini', compile_function=IniTag.handle_token)
