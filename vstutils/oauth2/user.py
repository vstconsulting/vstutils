from typing import Optional, Union, TYPE_CHECKING, Any
from uuid import uuid4

if TYPE_CHECKING:  # nocv
    from django.contrib.auth.models import AbstractBaseUser, AnonymousUser
    from .requests import DjangoOAuth2Request


class UserWrapper:
    __slots__ = ("django_user", "pk")
    request: 'Optional[DjangoOAuth2Request]' = None

    def __init__(self, user: 'Union[AbstractBaseUser, AnonymousUser]'):
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

    def get_profile_claims(self) -> dict:
        claims: dict[str, Any] = {}

        if self.django_user.is_anonymous:
            claims['anon'] = True
        else:
            claims.update({
                "name": self.django_user.get_full_name(),
                "given_name": self.django_user.first_name,
                "family_name": self.django_user.last_name,
                "preferred_username": self.django_user.get_username(),
                "email": self.django_user.email,
            })

        if hasattr(self.django_user, 'get_profile_claims'):
            claims.update(self.django_user.get_profile_claims())

        return claims

    def get_access_token_claims(self) -> Optional[dict]:
        if hasattr(self.django_user, 'get_access_token_claims'):
            return self.django_user.get_access_token_claims()
        return None
