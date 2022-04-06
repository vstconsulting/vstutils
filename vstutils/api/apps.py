from django.conf import settings
from django.apps import AppConfig

from ..utils import import_class


class VSTUtilsAppConfig(AppConfig):
    name = 'vstutils.api'
    label = 'vstutils_api'
    verbose_name = "vstutils"

    def ready(self):
        super().ready()
        self.module.autodiscover()
        self.module.notificator_class = import_class(
            settings.NOTIFICATOR_CLIENT_CLASS
        )
