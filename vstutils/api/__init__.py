from django.conf import settings
from django.core.checks import Error, register
from django.utils.module_loading import autodiscover_modules

default_app_config: str = 'vstutils.api.apps.VSTUtilsAppConfig'


def autodiscover():
    autodiscover_modules()


@register()
def check_oauth2_configuration(app_configs, **kwargs):
    errors = []
    if not settings.OAUTH_SERVER_URL and not settings.OAUTH_SERVER_ENABLE:
        errors.append(
            Error('OAUTH_SERVER_URL or OAUTH_SERVER_ENABLE must be set')
        )
    return errors
