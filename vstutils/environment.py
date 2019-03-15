# pylint: disable=django-not-available
import os
import sys
import warnings
import six

_default_settings = {
    # vstutils settings for generate settings
    "VST_PROJECT": "vstutils",
    'VST_DEV_SETTINGS': 'settings.ini',
    # django settings module
    "DJANGO_SETTINGS_MODULE": 'vstutils.settings',
    # Default urlconf
    "VST_ROOT_URLCONF": "vstutils.urls",
}


def prepare_environment(default_settings=_default_settings, **kwargs):
    # pylint: disable=unused-argument
    '''
    Prepare ENV for web-application
    :param default_settings: minimal needed settings for run app
    :type default_settings: dict
    :param kwargs: other overrided settings
    :rtype: None
    '''
    for key, value in default_settings.items():
        os.environ.setdefault(key, value)
    os.environ.update(kwargs)
    if six.PY2:  # nocv
        warnings.warn(
            'Python 2.7 is deprecated and will dropped in 2.0, use Python >3.5',
            DeprecationWarning
        )


def cmd_execution(*args, **kwargs):
    # pylint: disable=unused-variable
    '''
    Main function to executes from cmd. Emulates django-admin.py execution.
    :param kwargs: overrided env-settings
    :rtype: None
    '''
    from django.core.management import execute_from_command_line
    prepare_environment(**kwargs)
    args = list(sys.argv)
    args[0] = os.getenv("VST_CTL_SCRIPT", sys.argv[0])
    execute_from_command_line(args or sys.argv)


def get_celery_app(name=None, **kwargs):  # nocv
    # pylint: disable=import-error
    '''
    Function to return celery-app. Works only if celery installed.
    :param name: Application name
    :param kwargs: overrided env-settings
    :return: Celery-app object
    '''
    from celery import Celery
    prepare_environment(**kwargs)
    name = name or os.getenv("VST_PROJECT")
    celery_app = Celery(name)
    celery_app.config_from_object('django.conf:settings', namespace='CELERY')
    celery_app.autodiscover_tasks()
    return celery_app
