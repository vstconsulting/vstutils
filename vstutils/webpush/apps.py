import orjson
from django.apps import AppConfig
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.template.loader import render_to_string
from django.utils.safestring import mark_safe


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

    def contribute_service_worker(self):
        if settings.WEBPUSH_ENABLED:
            default_options = {}
            if settings.WEBPUSH_DEFAULT_NOTIFICATIONS_ICON:
                default_options["icon"] = settings.WEBPUSH_DEFAULT_NOTIFICATIONS_ICON

            user_notifications_settings_url = '/'.join([
                settings.VST_API_URL,
                settings.VST_API_VERSION,
                'user',
                'profile',
                settings.WEBPUSH_USER_SETTINGS_VIEW_SUBPATH,
            ])

            return render_to_string('webpush/notification-handler.js', {
                'default_notification_options': mark_safe(orjson.dumps(default_options).decode()),  # nosec
                'user_notifications_settings_url': '/' + user_notifications_settings_url + '/',
            })
