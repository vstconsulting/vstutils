from django.apps import AppConfig


class VSTUtilsAppConfig(AppConfig):
    name = 'vstutils.api'
    label = 'vstutils.api'
    verbose_name = "vstutils api app"

    def ready(self):
        super().ready()
        self.module.autodiscover()
