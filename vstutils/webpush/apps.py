from django.apps import AppConfig
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured


_REQUIRED_SETTINGS = (
    "WEBPUSH_PRIVATE_KEY",
    "WEBPUSH_PUBLIC_KEY",
    "WEBPUSH_SUB_EMAIL",
)


class VSTUtilsWebpushAppConfig(AppConfig):
    name = "vstutils.webpush"
    label = "vstutils_webpush"
    verbose_name = "vstutils webpush"
    contribute_translations = True

    def ready(self):
        self._validate_settings()

    def _validate_settings(self):
        if settings.WEBPUSH_ENABLED:
            missing_settings = [
                setting
                for setting in _REQUIRED_SETTINGS
                if not getattr(settings, setting, None)
            ]

            if missing_settings:
                raise ImproperlyConfigured(
                    "WEBPUSH_ENABLED is True but following settings are not set: " +
                    ", ".join(missing_settings)
                )
