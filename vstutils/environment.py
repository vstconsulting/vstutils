# pylint: disable=django-not-available,import-outside-toplevel
import os
import sys
import functools

import orjson


_default_settings = {
    # vstutils settings for generate settings
    "VST_PROJECT": "vstutils",
    'VST_DEV_SETTINGS': 'dev_settings.ini',
    # django settings module
    "DJANGO_SETTINGS_MODULE": 'vstutils.settings',
    # Default urlconf
    "VST_ROOT_URLCONF": "vstutils.urls",
}


def prepare_environment(default_settings=None, **kwargs):
    # pylint: disable=unused-argument
    """
    Prepare ENV for web-application
    :param default_settings: minimal needed settings for run app
    :type default_settings: dict
    :param kwargs: other overrided settings
    :rtype: None
    """
    default_settings = _default_settings if default_settings is None else default_settings
    for key, value in default_settings.items():
        os.environ.setdefault(key, value)
    os.environ.update(kwargs)


def cmd_execution(*args, **kwargs):
    # pylint: disable=unused-variable
    """
    Main function to execute from cmd. Emulates django-admin.py execution.
    :param kwargs: overrided env-settings
    :rtype: None
    """
    from django.core.management import execute_from_command_line
    prepare_environment(**kwargs)
    argv = list(args or sys.argv)
    argv[0] = os.getenv("VST_CTL_SCRIPT", sys.argv[0])
    execute_from_command_line(argv or sys.argv)


def get_celery_app(name=None, **kwargs):  # nocv
    # pylint: disable=import-error,unused-import
    """
    Function to return celery-app. Works only if celery installed.
    :param name: Application name
    :param kwargs: overrided env-settings
    :return: Celery-app object
    """
    from celery import Celery
    from kombu.serialization import register as serialize_registrator
    from .api.renderers import ORJSONRenderer
    from . import drivers  # noqa: F401

    prepare_environment(**kwargs)
    name = name or os.getenv("VST_PROJECT")

    # Override json encoder/decoder for tasks
    json_encoder = functools.partial(ORJSONRenderer().render, media_type=ORJSONRenderer.media_type)
    serialize_registrator(
        'json',
        encoder=lambda x: json_encoder(x).decode('utf-8'),
        decoder=orjson.loads,
        content_type=ORJSONRenderer.media_type
    )

    celery_app = Celery(name, task_cls='vstutils.tasks:TaskClass')
    celery_app.config_from_object('django.conf:settings', namespace='CELERY')
    celery_app.autodiscover_tasks()
    return celery_app
