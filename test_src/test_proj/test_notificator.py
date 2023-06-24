from cent import Client as CentrifugoClient
from vstutils.models.cent_notify import Notificator


messages_log = []


class Client(CentrifugoClient):
    def send(self, method=None, params=None):
        messages_log.append(self._messages)


class DummyNotificator(Notificator):
    client_class = Client

    def is_usable(self):
        return True
