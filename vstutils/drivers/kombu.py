import time
import base64
import logging
from datetime import datetime
from queue import Empty

import tarantool
from ormsgpack import packb, unpackb
from kombu.transport import virtual, base
from kombu.utils.url import url_to_parts as parse_url
from celery.backends.base import KeyValueStoreBackend
from celery.utils.time import maybe_make_aware

logger = logging.getLogger('kombu.transport.tarantool')


class TarantoolMessage(virtual.Message):
    """
    Represents a message in the Tarantool transport.
    """

    def __init__(self, payload, channel=None, **kwargs):
        super().__init__(payload, channel, **kwargs)
        self.tarantool_queue_id = payload.pop('tarantool_queue_id')


class TarantoolQoS(virtual.QoS):
    """
    Provides Quality of Service (QoS) features for Tarantool.
    """

    def get_tarantool_queue_id(self, delivery_tag):
        """
        Gets the Tarantool queue name and message ID from the delivery tag.

        :param delivery_tag: The delivery tag.
        :return: Tuple with the Tarantool queue name and message ID.
        """
        msg = self.get(delivery_tag)
        return msg.delivery_info['routing_key'], msg.tarantool_queue_id

    def ack(self, delivery_tag):
        """
        Acknowledges a message.

        :param delivery_tag: The delivery tag.
        """
        queue, tarantool_id = self.get_tarantool_queue_id(delivery_tag)
        self.channel.client_eval(queue, f'ack({tarantool_id})')
        super().ack(delivery_tag)

    def reject(self, delivery_tag, requeue=False):
        """
        Rejects a message.

        :param delivery_tag: The delivery tag.
        :param requeue: Whether to requeue the message.
        """
        if requeue:
            operation = 'release'
        else:
            operation = 'delete'
        queue, tarantool_id = self.get_tarantool_queue_id(delivery_tag)
        self.channel.client_eval(queue, f'{operation}({tarantool_id})')
        self._quick_ack(delivery_tag)


class TarantoolChannel(virtual.Channel):
    # pylint: disable=abstract-method
    """
    Represents a channel for communication using the Tarantool transport.
    """

    QoS = TarantoolQoS
    Message = TarantoolMessage

    def __init__(self, connection, **kwargs):
        super().__init__(connection, **kwargs)
        conninfo = connection.client
        self.client = tarantool.connect(
            host=conninfo.hostname or 'localhost',
            port=conninfo.port or self.connection.default_port,
            user=conninfo.userid,
            password=conninfo.password,
        )
        self.client.eval("queue = require 'queue'")
        self.prefix = f'{conninfo.virtual_host}_celery_queue_'.replace('/', '_').replace('__', '_')

    def client_eval(self, queue: str, exec_code: str, should_return: bool = True):
        """
        Evaluates a Tarantool Lua method of queue.
        See `usage diagram <https://github.com/tarantool/queue/?tab=readme-ov-file#task-state-diagram>`_ for details.

        :param queue: The Tarantool queue name.
        :param exec_code: The method of queue to execute.
        :param should_return: Whether the method should return a value.
        :return: The result of the script execution.
        """
        command = f'{"return" if should_return else ""} queue.tube.{self.prefix}{queue}:{exec_code}'
        logger.debug(f'Call tarantool command: {command}')
        return self.client.eval(command)

    def _get(self, queue, timeout=None):
        """ Get next message from `queue`. """

        result =  self.client_eval(queue, f'take({timeout or 0})').data
        if not result:
            raise Empty()
        delivery_tag, _, payload = result[0]
        payload = unpackb(base64.b64decode(payload))
        payload['tarantool_queue_id'] = delivery_tag
        return payload

    def _put(self, queue, message, **kwargs):
        """ Put `message` onto `queue`. """

        headers = message.get('headers', {})
        properties = message.get('properties', {})
        options = {'pri': properties.get('priority', 0)}

        now = maybe_make_aware(datetime.now())
        if (eta := headers.get('eta')) and (eta_date := datetime.fromisoformat(eta)) > now:
            options['delay'] = max(round((eta_date - now).total_seconds() - 0.5), 0)
        ops = [
            f'{k} = {v}'
            for k, v in options.items()
            if v
        ]

        self.client_eval(
            queue,
            f"put('{base64.b64encode(packb(message)).decode('utf-8')}', {{ {','.join(ops)} }})"
        )

    def _purge(self, queue):
        """ Remove all messages from `queue`. """

        self.client_eval(queue, 'truncate()', should_return=False)

    def _size(self, queue):
        """ Return the number of messages in `queue` as an :class:`int`. """

        try:
            return self.client.eval(f"queue.statistics({self.prefix}{queue}).tasks.total").data[0]
        except tarantool.error.DatabaseError:
            return 0

    def _delete(self, queue, *args, **kwargs):
        """ Delete `queue` """
        self.client_eval(queue, 'drop()')

    def _new_queue(self, queue, **kwargs):
        """ Create new queue. """
        self.client.eval(
            "queue.create_tube('" + self.prefix + str(queue) + "', 'fifottl', {temporary = true, if_not_exists = true})"
        )

    def _has_queue(self, queue, **kwargs):
        """ Verify that queue exists. """
        try:
            self.client.eval(f"return queue.tube.{self.prefix}{queue}.name")
            return True
        except tarantool.error.DatabaseError:
            return False

    def close(self):
        """
        Close channel.

        Cancel all consumers, and requeue unacked messages.
        """

        super().close()
        self.client.close()


class TarantoolTransport(virtual.Transport):
    # pylint: disable=abstract-method
    """
    Implements the Tarantool transport for Celery.

    Require `queue module <https://github.com/tarantool/queue/>`_ to be installed on the tarantool server.
    """

    Channel = TarantoolChannel
    can_parse_url = False
    default_port = 3301
    driver_type = 'tarantool'
    driver_name = 'tarantool'
    connection_errors = (tarantool.error.Error,)
    implements = base.Transport.implements.extend(
        asynchronous=False,
        exchange_type=frozenset(['topic']),
        heartbeats=False,
    )

    def driver_version(self):
        """
        Gets the version of the Tarantool driver.

        :return: The version of the Tarantool driver.
        """
        return tarantool.__version__


class TarantoolBackend(KeyValueStoreBackend):
    # pylint: disable=abstract-method
    """
    Implements the backend for storing results in Tarantool.
    """

    supports_native_join = True
    persistent = False

    def __init__(self, url=None, expires=None, *args, **kwargs):
        super().__init__(*args, **kwargs)
        _, host, port, username, password, vhost, _ = parse_url(url)
        self.expires = self.prepare_expires(expires, type=int)
        self.client = tarantool.connect(host, port, user=username, password=password)
        self.space_name = f"{vhost + '_' if vhost else ''}celery_backend"
        self.client.eval(
            "box.schema.space.create("
                f"'{self.space_name}', "  # noqa: E131
                "{"
                    "if_not_exists = true, "  # noqa: E131
                    "temporary = true, "
                    "format = {"
                        "{name = 'id', type = 'string'}, "  # noqa: E131
                        "{name = 'value', type = 'string'}, "
                        "{name = 'exp', type = 'number'}, "
                    "} "
                "}"
            ")"
        )
        self.client.eval(
            f"box.space.{self.space_name}:create_index('primary', {{ parts = {{ 'id' }}, if_not_exists = true }})"
        )
        lower_name = self.space_name.lower()
        self.client.eval(
            f"""
            if {lower_name}_is_expired then return 0 end

            clock = require('clock')
            expirationd = require("expirationd")

            function {lower_name}_is_expired(args, tuple)
              return tuple[3] > -1 and tuple[3] < clock.realtime()
            end

            function {lower_name}_delete_tuple(space, args, tuple)
              box.space[space]:delete{{tuple[1]}}
            end

            expirationd.start("{lower_name}_clean_results", '{self.space_name}', {lower_name}_is_expired, {{
                process_expired_tuple = {lower_name}_delete_tuple,
                args = nil,
                tuples_per_iteration = 50,
                full_scan_time = 3600
            }})
            """
        )
        self.space = self.client.space(self.space_name)

    def get(self, key):
        """
        Gets the value associated with the given key.

        :param key: The key for the value.
        :return: The value associated with the key, or None if the key is not found.
        """

        data = self.space.select(key.decode('utf-8')).data
        if not data:
            return
        return data[0][1]

    def mget(self, keys):
        """
        Gets the values associated with the given key's array.
        """
        keys = (f"'{k.decode('utf-8')}'" for k in keys)

        data = self.client.execute(
            f'select "id", "value" from "{self.space_name}" where "id"  in ({", ".join(keys)})'  # nosec B608
        ).data
        if not data:
            return []
        return dict(data)

    def set(self, key, value):
        """
        Sets the value associated with the given key.

        :param key: The key for the value.
        :param value: The value to be stored.
        """

        exp = int(time.time() + self.expires + 0.5) if self.expires else -1
        self.space.replace((key.decode('utf-8'), value, exp))

    def delete(self, key):
        """
        Deletes the value associated with the given key.

        :param key: The key for the value to be deleted.
        """
        self.space.delete(key.decode('utf-8'))
