from django.contrib.auth.backends import BaseBackend
from django.contrib.auth.models import AnonymousUser


class AnonymousUserAuthBackend(BaseBackend):
    def authenticate(self, request, username, password):
        if (
            username == '' and password == ''  # nosec
        ):
            return AnonymousUser()
