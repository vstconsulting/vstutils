import uuid
import json

from django.conf import settings
from django.http.cookie import SimpleCookie
from channels.generic.websocket import AsyncJsonWebsocketConsumer, StopConsumer
from channels.db import database_sync_to_async

from ..api.endpoint import BulkClient
from ..utils import raise_context
from ..gui.context import HttpRequest, project_args


class EndpointConsumer(AsyncJsonWebsocketConsumer):
    public = False
    bulk_headers = [
        'host',
        'cache-control',
        'user-agent',
        'origin',
        'cookie'
    ]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.secure = False
        self.bulk_client = None
        self.env = None
        self.headers = None

    async def api_execute(self, data=None, handler_type='put', request_id=None):
        """
        Get data via `/api/endpoint/`.
        """

        # Get or generate request_id
        request_id = request_id or str(uuid.uuid4())

        # Get client function as handler_type/HTTP method.
        handler = getattr(self.bulk_client, handler_type)

        # Get endpoint response object.
        response = await database_sync_to_async(handler)(
            f'/{settings.API_URL}/endpoint/',
            data=json.dumps(data) if handler_type.lower() != 'get' else {'format': 'openapi'},
            secure=self.secure,
            content_type='application/json'
        )

        # Load response as JSON
        results = []
        with raise_context():
            results = response.content.decode('utf-8')
            results = json.loads(results)

        if handler_type == 'get':
            # Return OpenApi schema
            return dict(
                type='schema',
                schema=results,
                request_id=request_id
            )

        # Return bulk results
        return dict(
            type='bulk',
            results=results,
            status=response.status_code,
            request_id=request_id
        )

    async def prepare_client(self):
        """
        Prepare BulkClient for endpoint requests.
        """

        # Get all http-headers
        self.headers = {
            k.decode('utf-8'): v.decode('utf-8')
            for k, v in dict(self.scope['headers']).items()
        }

        # Setup header as environment variables for BulkClient
        env = {
            f'HTTP_{k.upper().replace("-", "_")}': self.headers[k]
            for k in self.bulk_headers
        }

        # Setup global var which indicates that request is running over HTTPS
        self.secure = env['HTTP_ORIGIN'].split(':')[0] == 'https'
        env['SERVER_NAME'] = env['HTTP_HOST']
        self.env = env

        # Init client class.
        client = BulkClient(**env)
        client.cookies = SimpleCookie(env['HTTP_COOKIE'])

        return client

    def get_project_info(self):
        request = HttpRequest()
        request.META.update(self.env)
        request.user = self.scope['user']
        data = {}
        project_info = project_args(request)
        data['debug_mode'] = settings.DEBUG
        data['version'] = project_info['gui_user_version']
        data['endpoint_path'] = f"{project_info['host_url']}{project_info['endpoint_path']}"
        data['static'] = [
            {
                "priority": f.get('priority', 999999),
                "type": f['type'],
                "name": f"{project_info['host_url']}/{f['name']}"
            }
            for f in settings.SPA_STATIC
        ]
        return {
            'type': 'bootstrap',
            'data': data
        }

    async def websocket_connect(self, message):
        bulk_client = self.prepare_client()
        if not self.scope['user'].is_authenticated and not self.public:
            await self.close(1008)
            bulk_client.close()  # pylint: disable=no-member
            raise StopConsumer('Permission denied.')
        self.bulk_client = await bulk_client
        await self.accept()
        await self.send_json(self.get_project_info())

    async def websocket_disconnect(self, message):
        await self.close()

    async def receive_json(self, content, **kwargs):
        await self.send_json(await self.api_execute(**content))
