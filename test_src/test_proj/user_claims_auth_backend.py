from django.contrib.auth.backends import BaseBackend
from django.contrib.auth.models import AnonymousUser


class CustomUser(AnonymousUser):
    def get_profile_claims(self):
        return {
            'locale': 'fr-CA',
        }

    def get_access_token_claims(self):
        return {
            'some_claim': True,
        }


class CustomUserAuthBackend(BaseBackend):
    def authenticate(self, request, username, password):
        if username == 'custom_user':
            return CustomUser()
