from django.apps import AppConfig


class VSTUtilsAppConfig(AppConfig):
    name = 'vstutils.api'
    label = 'vstutils_api'
    verbose_name = "vstutils"

    def ready(self):
        super().ready()
        self.module.autodiscover()
