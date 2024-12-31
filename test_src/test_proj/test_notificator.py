from cent import AsyncClient as AsyncCentrifugoClient, Client as SyncCentrifugoClient, CentRequest
from vstutils.models.cent_notify import Notificator


messages_log: list[CentRequest] = []


class Client(AsyncCentrifugoClient):
    async def _send(self, request: CentRequest, *args, **kwargs):
        messages_log.append(request)


class SyncClient(SyncCentrifugoClient):
    def _send(self, request: CentRequest, *args, **kwargs):
        messages_log.append(request)


class DummyNotificator(Notificator):
    client_class = Client
    sync_client_class = SyncClient

    def is_usable(self):
        return True
