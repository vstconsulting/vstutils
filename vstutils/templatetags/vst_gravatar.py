import hashlib

from django import template
from django.contrib.auth import get_user_model
from django.templatetags.static import static

User = get_user_model()
register = template.Library()

@register.simple_tag
def get_user_gravatar(user_id):
    """

    Gets link to user's gravatar from serializer.

    Usage::

        {% get_user_gravatar user_id %}

    Examples::

        {% get_user_gravatar 1 %}
        {% get_user_gravatar user.id %}

    """
    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return static('img/anonymous.png')
    if not user.email:
        return static('img/anonymous.png')
    url_base = 'https://www.gravatar.com/avatar/{}?d=mp'
    user_hash = hashlib.md5(user.email.lower().encode('utf-8')).hexdigest()
    return url_base.format(user_hash)
