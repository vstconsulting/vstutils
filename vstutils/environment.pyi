import typing as _t

try:
    from celery import Celery
except ImportError:
    pass


CeleryType = _t.Optional[Celery]


def prepare_environment(default_settings: _t.Dict[_t.Text, _t.Text] = None, **kwargs) -> None:
    ...


def cmd_execution(*args, **kwargs) -> None:
    ...


def get_celery_app(name: _t.Text = None, **kwargs) -> CeleryType:
    ...
