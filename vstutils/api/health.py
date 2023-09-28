from typing import Dict, Tuple, ClassVar, Callable
from functools import wraps

from django.db import connections, DatabaseError
from rest_framework import status as st, request as req

from ..utils import BaseVstObject, import_class


def health_wrapper(method):
    @wraps(method)
    def wrapper(self):
        try:
            return method(self) or 'ok', st.HTTP_200_OK
        except BaseException as exception:
            code = getattr(exception, 'status', st.HTTP_500_INTERNAL_SERVER_ERROR)
            return str(exception), code

    return wrapper


class HealthBackendMeta(type):
    def __new__(mcs, name, bases, attrs):
        backend = super().__new__(mcs, name, bases, attrs)
        checks = {}
        for attr_name, attr in attrs.items():
            if attr_name.startswith('check_health_') and callable(attr):
                checks[attr_name.replace('check_health_', '', 1)] = health_wrapper(attr)
        if checks:
            original_checks = getattr(backend, 'health_checks', {})
            backend.health_checks = {**original_checks, **checks}
        return backend


class BaseBackend(BaseVstObject, metaclass=HealthBackendMeta):
    __slots__ = ('request',)
    health_checks: ClassVar[Dict[str, Callable]]

    def __init__(self, request: req.Request):
        self.request = request

    def get(self) -> Tuple[Dict, int]:
        result, status = {}, st.HTTP_200_OK
        for key, method in self.health_checks.items():
            result[key], method_status = method(self)
            if method_status > status:
                status = method_status
        return result, status


class DefaultBackend(BaseBackend):
    db_check_sql = 'SELECT 1;'

    def check_health_db(self):
        """
        Checking if some database server is unavailable.
        """
        for db_name in self.get_django_settings('DATABASES', {}).keys():
            connections[db_name].ensure_connection()
            if not connections[db_name].is_usable():
                raise DatabaseError(f'Database {db_name} is not usable.')  # nocv
            with connections[db_name].cursor() as cursor:
                cursor.execute(self.db_check_sql)
                cursor.fetchall()

    def check_health_cache(self):
        """
        Checking ig some cache server is unavailable.
        """
        for cache_name in self.get_django_settings('CACHES', {}).keys():
            self.get_django_cache(cache_name).get('test', 0)

    def celery_check(self, celery_app):
        # Also can be ``celery_app.control.ping()``
        return celery_app.pool.connection.connected and "ok"

    def check_health_rpc(self):
        """
        At now only checking that RPC enabled or not.
        """
        if not self.get_django_settings('RPC_ENABLED'):
            return 'disabled'
        try:
            celery_app = import_class(
                self.get_django_settings('WORKER_OPTIONS')['app'].replace(':', '.')
            )
        except ImportError:  # nocv
            return "disabled"
        else:
            return self.celery_check(celery_app)

    def check_health_session_engine(self):
        # pylint: disable=pointless-statement
        tuple(self.request.session.values())
        self.request.user.is_active
