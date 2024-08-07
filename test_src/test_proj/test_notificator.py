from cent import AsyncClient as CentrifugoClient, CentRequest
from vstutils.models.cent_notify import Notificator


messages_log: list[CentRequest] = []


class Client(CentrifugoClient):
    async def _send(self, request: CentRequest, *args, **kwargs):
        messages_log.append(request)


class DummyNotificator(Notificator):
    client_class = Client

    def is_usable(self):
        return True
