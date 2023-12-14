from kombu.transport import TRANSPORT_ALIASES
from celery.app.backends import BACKEND_ALIASES

from . import kombu

TRANSPORT_ALIASES['tarantool'] = 'vstutils.drivers.kombu:TarantoolTransport'
BACKEND_ALIASES['tarantool'] = 'vstutils.drivers.kombu:TarantoolBackend'
