from cent import Client as CentrifugoClient, CentRequest
from vstutils.models.cent_notify import Notificator


messages_log: list[CentRequest] = []


class Client(CentrifugoClient):
    def _send(self, request: CentRequest, *args, **kwargs):
        messages_log.append(request)


class DummyNotificator(Notificator):
    client_class = Client

    def is_usable(self):
        return True
