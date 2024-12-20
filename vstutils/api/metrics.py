from typing import Callable, ClassVar, Iterable, Tuple, Optional
import types
import sys

from django.conf import settings

from ..utils import BaseVstObject


METRICS_MAP_TYPE = Iterable[Tuple[Optional[str], Callable]]  # pylint: disable=invalid-name


def get_python_info():
    return {
        'version': f'{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}'
    }, 1


class BackendMetaClass(type):
    def __new__(mcs, name, bases, attrs, metrics_prefix=None):
        metrics_list = attrs.pop('metrics_list', ())
        if metrics_prefix is not None:
            attrs['prefix'] = metrics_prefix
        result = super().__new__(mcs, name, bases, attrs)
        if metrics_list:
            assert isinstance(metrics_list, Iterable), '"metrics_map" should be iterable instance'
            result._metrics_set = getattr(result, '_metrics_set', ()) + tuple(metrics_list)
        return result


class BaseBackend(
    BaseVstObject,
    metaclass=BackendMetaClass,
    metrics_prefix=settings.VST_PROJECT_LIB
):
    __slots__ = ()
    metrics_list: ClassVar[METRICS_MAP_TYPE] = (
        ('python_info', get_python_info),
        ('{prefix}_database_connections', lambda: (b'', len(settings.DATABASES))),
        ('{prefix}_cache_connections', lambda: (b'', len(settings.CACHES))),
    )
    _metrics_set: ClassVar[METRICS_MAP_TYPE] = ()
    prefix: ClassVar[str] = ''

    def _handle_metrics_data(self, metrics_data: dict):
        for key, value in metrics_data.items():
            if isinstance(value, str):
                yield key, f'"{value}"'
            else:
                yield key, value

    def _handle_metrics_value(self, metrics_name, value):
        if metrics_name is None and isinstance(value, types.GeneratorType):
            for val in value:
                yield from self._handle_metrics_value(*val)
        else:
            if isinstance(value, tuple):
                metrics_data, metrics_value = value
            else:
                metrics_data, metrics_value = b'', value

            yield metrics_name.format(prefix=self.prefix).encode('utf-8')
            if metrics_data:
                if isinstance(metrics_data, dict):
                    yield b'{'
                    yield b','.join(f'{k}={v}'.encode('utf-8') for k, v in self._handle_metrics_data(metrics_data))
                    yield b'}'
                else:
                    yield metrics_data  # nocv
            yield b' '
            if isinstance(metrics_value, (tuple, list)):
                yield ' '.join(map(str, metrics_value)).encode('utf-8')
            else:
                yield str(metrics_value).encode('utf-8')
            yield b'\n'

    def get(self):
        for metrics_name, metrics_method in self._metrics_set:
            yield from self._handle_metrics_value(metrics_name, metrics_method())


class DefaultBackend(BaseBackend):
    __slots__ = ()
