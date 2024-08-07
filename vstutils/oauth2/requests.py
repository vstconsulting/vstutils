from functools import cached_property
from typing import TYPE_CHECKING, Optional

from authlib.integrations.django_oauth2.requests import (
    DjangoOAuth2Request as BaseDjangoOAuth2Request,
)
from vstutils.utils import get_session_store

if TYPE_CHECKING:  # nocv
    from .client import SimpleClient


class DjangoOAuth2Request(BaseDjangoOAuth2Request):
    @property
    def client(self) -> 'Optional[SimpleClient]':
        return getattr(self, '_client', None)

    @client.setter
    def client(self, client: 'Optional[SimpleClient]'):
        if client:
            client.request = self
        self._client = client

    def ensure_session(self):
        if not getattr(self._request, 'session', None):
            self._request.session = get_session_store()()
        if not self._request.session.session_key:
            self._request.session.save()


class DjangoOAuthJsonRequest(DjangoOAuth2Request):
    @property
    def form(self):
        return self._request.data

    @cached_property
    def data(self):  # pylint: disable=invalid-overridden-method
        return {
            **self._request.GET.dict(),
            **self.form,
        }
