from django.conf import settings
from django.apps import AppConfig
from django.utils.module_loading import import_string


class VSTUtilsAppConfig(AppConfig):
    name = 'vstutils.api'
    label = 'vstutils_api'
    verbose_name = "vstutils"

    def import_models(self):
        super().import_models()
        self.module.notificator_class = import_string(
            settings.NOTIFICATOR_CLIENT_CLASS
        )

    def ready(self):
        super().ready()
        self.module.autodiscover()
