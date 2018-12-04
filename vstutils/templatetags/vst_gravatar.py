from django import template
from django.contrib.auth.models import User
from ..api.serializers import UserSerializer

register = template.Library()

@register.simple_tag
def get_user_gravatar(user_id):
    """

    Gets link to user's gravatar from serializer.

    """
    user = User.objects.get(pk=user_id)
    gravatar = UserSerializer(user).data['gravatar']
    return gravatar
