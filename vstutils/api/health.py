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
        filter_method = self.__health_types_filter
        for method_name in filter(filter_method, dir(self)):
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
    def check_health_db(self):
        """
        Checking if some database server is unavailable.
        """
        for db_name in self.get_django_settings('DATABASES', {}).keys():
            connections[db_name].ensure_connection()

    def check_health_cache(self):
        """
        Checking ig some cache server is unavailable.
        """
        for cache_name in self.get_django_settings('CACHES', {}).keys():
            self.get_django_cache(cache_name).get('test', 0)

    def check_health_rpc(self):
        """
        At now only checking that RPC enabled or not.
        """
        if not self.get_django_settings('RPC_ENABLED'):
            return 'disabled'
        celery_app = import_class(
            self.get_django_settings('WORKER_OPTIONS')['app'].replace(':', '.')
        )
        celery_app.pool.connection.connect()
