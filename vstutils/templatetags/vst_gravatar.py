from django import template
from django.contrib.auth.models import User
from ..api.serializers import UserSerializer

register = template.Library()

@register.simple_tag
def get_user_gravatar(user_id):
    """

    Gets link to user's gravatar from serializer.

    """
    try:
        user = User.objects.get(pk=user_id)
    except User.DoesNotExist:
        return 'https://www.gravatar.com/avatar/default?d=mp'
    gravatar = UserSerializer(user).data['gravatar']
    return gravatar
