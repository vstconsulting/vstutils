from django.conf import settings
from drf_yasg import openapi


api_info = openapi.Info(
    title="API",
    default_version=settings.VST_API_VERSION,
    description=settings.SWAGGER_API_DESCRIPTION,
    terms_of_service=settings.TERMS_URL,
    contact=openapi.Contact(**settings.CONTACT)
)
