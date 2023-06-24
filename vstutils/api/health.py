from typing import Text, Iterable, Callable, Dict, Tuple

from django.db import connections
from rest_framework import status as st

from ..utils import BaseVstObject, import_class


class BaseBackend(BaseVstObject):
    __slots__ = ('__health_methods',)

    def __init__(self):
        self.__health_methods = {}  # typing: Dict

    def __health_method_wrapper(self, method: Callable):
        try:
            return method() or 'ok', st.HTTP_200_OK
        except BaseException as exception:
            code = getattr(exception, 'status', st.HTTP_500_INTERNAL_SERVER_ERROR)
            return str(exception), code

    def __health_types_filter(self, attr_name: Text) -> bool:
        return attr_name.startswith('check_health_')

    def __get_health_methods_iterator(self) -> Iterable[Tuple[Text, Callable]]:
        for method_name in filter(self.__health_types_filter, dir(self)):
            method = getattr(self, method_name)
            if callable(method):
                yield method_name.replace('check_health_', '', 1), method

    def get(self) -> Tuple[Dict, int]:
        if not self.__health_methods:
            self.__health_methods = dict(self.__get_health_methods_iterator())
        result, status = {}, st.HTTP_200_OK
        for key, method in self.__health_methods.items():
            method_result, method_status = self.__health_method_wrapper(method)
            result[key] = method_result
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
                raise Exception(f'Database {db_name} is not usable.')  # nocv
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
