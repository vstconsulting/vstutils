from typing import Optional, Union, TYPE_CHECKING
from uuid import uuid4

from django.contrib.auth.models import AbstractBaseUser, AnonymousUser

if TYPE_CHECKING:  # nocv
    from .requests import DjangoOAuth2Request


class UserWrapper:
    request: 'Optional[DjangoOAuth2Request]' = None

    def __init__(self, user: Union[AbstractBaseUser, AnonymousUser]):
        self.django_user = user
        self.pk: str = (
            f'anon_{uuid4().hex}'
            if user.is_anonymous
            else user._meta.pk.value_to_string(user)
        )

    def is_anon(self) -> bool:
        return self.django_user.is_anonymous

    def get_user_id(self) -> str:
        return self.pk

    def second_factor_required(self):
        twofa = getattr(self.django_user, 'twofa', None)
        return twofa and twofa.enabled

    def validate_second_factor(self, code):
        return self.django_user.twofa.verify(code)
