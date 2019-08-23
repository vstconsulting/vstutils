import json
from django.templatetags.static import template, StaticNode

register = template.Library()


class StaticTag(StaticNode):
    def render(self, context):
        original_static = super().render(context)
        host = context.get('host_url', '')
        return (
            '{host}{static}'.format(host=host, static=original_static)
            if original_static else original_static
        )


@register.tag('static_path')
def do_static(parser, token):
    """
    Joins the given path with the STATIC_URL setting + host full path.

    Usage::

        {% static path [as varname] %}

    Examples::

        {% static "myapp/css/base.css" %}
        {% static variable_with_path %}
        {% static "myapp/css/base.css" as admin_base_css %}
        {% static variable_with_path as varname %}
    """
    return StaticTag.handle_token(parser, token)


@register.tag('static')
def do_static_origin(parser, token):
    """
    Joins the given path with the STATIC_URL setting + host full path.

    Usage::

        {% static path [as varname] %}

    Examples::

        {% static "myapp/css/base.css" %}
        {% static variable_with_path %}
        {% static "myapp/css/base.css" as admin_base_css %}
        {% static variable_with_path as varname %}
    """
    return StaticNode.handle_token(parser, token)


@register.filter(is_safe=True)
def jsonify(object):
    return json.dumps(object)  # nocv
