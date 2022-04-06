from cent import Client as CentrifugoClient
from vstutils.models.cent_notify import Notificator


class Client(CentrifugoClient):
    def add(self, method, params):
        pass

    def send(self, method=None, params=None):
        pass  # nocv


class DummyNotificator(Notificator):
    client_class = Client
