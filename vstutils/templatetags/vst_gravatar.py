try:
    from urllib.request import urlopen
except ImportError:  # nocv
    from urllib2 import urlopen

from django import template
from django.contrib.auth.models import User
from django.templatetags.static import static
from ..api.serializers import UserSerializer

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
    gravatar = UserSerializer(user).data['gravatar']
    try:
        get_url = urlopen(gravatar)
    except:  # nocv
        return static('img/anonymous.png')  # nocv
    if get_url.code == 200:
        return gravatar
    return static('img/anonymous.png')  # nocv
