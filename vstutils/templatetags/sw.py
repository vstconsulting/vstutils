from django import template
from django.apps import apps
from django.utils.safestring import mark_safe

register = template.Library()


@register.simple_tag
def service_worker_contributions():
    contributions = []
    for app in apps.get_app_configs():
        if hasattr(app, "contribute_service_worker"):
            contributions.append(app.contribute_service_worker() or '')
    return mark_safe("\n".join(contributions))  # nosec
