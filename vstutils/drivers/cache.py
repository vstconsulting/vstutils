import time

import tarantool
from django.core.cache.backends.base import BaseCache, DEFAULT_TIMEOUT
from django.core.cache.backends.redis import RedisSerializer as Serializer  # type: ignore[import-untyped]
from django.utils.functional import cached_property


class TarantoolCache(BaseCache):
    def __init__(self, servers, params):
        super().__init__(params)
        self._serializer = Serializer()
        self._servers = servers
        self._options = params.get("OPTIONS", {})
        self._space_name = self._options.get('space', 'DJANGO_CACHE').upper()
        if self._options.get('connect_on_start', True):
            self.start_hook()

    def close(self, **kwargs):
        if not self.client.is_closed():
            self.client.close()

    def start_hook(self):
        self.client.eval(
            "box.schema.space.create("
                f"'{self._space_name}', "  # noqa: E131
                "{"
                    "if_not_exists = true, "  # noqa: E131
                    "temporary = true, "
                    "format = {"
                        "{name = 'id', type = 'string'}, "  # noqa: E131
                        "{name = 'value', type = 'any'}, "
                        "{name = 'exp', type = 'number'}, "
                    "} "
                "}"
            ")"
        )
        self.client.eval(
            f"box.space.{self._space_name}:create_index('primary', {{ parts = {{ 'id' }}, if_not_exists = true }})"
        )
        lower_name = self._space_name.lower()
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

            expirationd.start("{lower_name}_clean_cache", '{self._space_name}', {lower_name}_is_expired, {{
                process_expired_tuple = {lower_name}_delete_tuple,
                args = nil,
                tuples_per_iteration = 50,
                full_scan_time = 3600
            }})
            """
        )

    @cached_property
    def client(self):
        host, _, port = self._servers.rpartition(':')
        user = self._options.get('user', 'guest')
        password = self._options.get('password')
        client = tarantool.connect(host, int(port), user, password)
        return client

    @cached_property
    def space(self):
        return self.client.space(self._space_name)

    def space_eval(self, evaluation_string: str):
        return self.client.eval(f'return box.space.{self._space_name}:{evaluation_string}')

    def get_backend_timeout(self, timeout=DEFAULT_TIMEOUT):
        if timeout == DEFAULT_TIMEOUT:
            timeout = self.default_timeout
        # The key will be made persistent if None used as a timeout.
        # Non-positive values will cause the key to be deleted.
        return -1 if timeout is None else max(0, int(timeout))

    def _build_tuple(self, key: str, value, timeout=DEFAULT_TIMEOUT, version=None):
        key = self.make_and_validate_key(key, version=version)
        value = self._serializer.dumps(value)
        timeout = self.get_backend_timeout(timeout=timeout)
        if timeout != -1:
            timeout = int(time.time() + timeout + 0.5)

        return key, value, timeout

    def add(self, key, value, timeout=DEFAULT_TIMEOUT, version=None):
        key, value, timeout = self._build_tuple(key, value, timeout, version)

        try:
            key, value, _ = self.space.insert((key, value, timeout)).data[0]
        except tarantool.error.DatabaseError:
            return False
        if timeout == 0:
            self.space.delete(key)

        return True

    def get(self, key, default=None, version=None):
        key = self.make_and_validate_key(key, version=version)
        data = self.space.select(key).data
        if not data:
            return default
        if data[0][2] < time.time():
            self.space.delete(key)
            return default
        return self._serializer.loads(data[0][1])

    def set(self, key, value, timeout=DEFAULT_TIMEOUT, version=None):
        self.space.replace(self._build_tuple(key, value, timeout, version))

    def touch(self, key, timeout=DEFAULT_TIMEOUT, version=None):
        key = self.make_and_validate_key(key, version=version)
        timeout = self.get_backend_timeout(timeout=timeout)
        if timeout != -1:
            timeout = int(time.time() + timeout + 0.5)

        try:
            self.space.update(key, [('=', 'exp', timeout)])
            return True
        except tarantool.error.DatabaseError:
            return False

    def delete(self, key, version=None):
        key = self.make_and_validate_key(key, version=version)
        data = self.space.delete(key).data
        if not data:
            return
        return self._serializer.loads(data[0][1])

    def has_key(self, key, version=None):
        key = self.make_and_validate_key(key, version=version)
        return bool(self.space.select(key).data)

    def incr(self, key, delta=1, version=None):
        key = self.make_and_validate_key(key, version=version)
        if delta > 0:
            operation = '+'
        else:
            operation = '-'
            delta = -delta
        value = self._serializer.dumps(delta)
        data = self.space.update(key, [(operation, 'value', value)]).data
        if not data:
            raise ValueError(f"Key '{key}' not found.")
        return data[0][1]

    def get_many(self, keys, version=None):
        key_map = {
            self.make_and_validate_key(key, version=version): key for key in keys
        }
        keys_list = [f"'{k}'" for k in key_map.keys()]
        data = self.client.execute(
            f'SELECT "id", "value" '  # nosec B608
            f'FROM "{self._space_name}" '  # nosec B608
            f'WHERE "id" IN ({", ".join(keys_list)}) AND "exp" >= {int(time.time())}'  # nosec B608
        ).data
        return {
            key_map[k]: self._serializer.loads(v)
            for k, v in data
        }

    def set_many(self, data, timeout=DEFAULT_TIMEOUT, version=None):
        # pylint: disable=unidiomatic-typecheck

        if not data:
            return []

        safe_data = {}
        for key, value in data.items():
            key = f"'{self.make_and_validate_key(key, version=version)}'"
            quote = "'" if not type(value) is int else ""
            safe_data[key] = f"{quote}{self._serializer.dumps(value)}{quote}"

        timeout = self.get_backend_timeout(timeout=timeout)
        if timeout != -1:
            timeout = int(time.time() + timeout + 0.5)

        self.client.eval("\n".join([
            f'box.space.{self._space_name}:put{{ {k}, {v}, {timeout} }}'
            for k, v in safe_data.items()
        ]))

        return []

    def delete_many(self, keys, version=None):
        if not keys:
            return
        safe_keys = [f"'{self.make_and_validate_key(key, version=version)}'" for key in keys]
        self.client.execute(
            f'DELETE FROM "{self._space_name}" WHERE "id" IN ({", ".join(safe_keys)})'  # nosec B608
        )

    def clear(self):
        return self.space_eval('truncate()')
