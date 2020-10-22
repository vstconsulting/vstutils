from django.utils.module_loading import autodiscover_modules


default_app_config: str = 'vstutils.api.apps.VSTUtilsAppConfig'


def autodiscover():
    autodiscover_modules()
