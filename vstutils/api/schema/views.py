from drf_yasg.views import get_schema_view
from rest_framework import permissions, versioning


class OpenApiView(get_schema_view()):  # type: ignore
    permission_classes = (permissions.AllowAny,)
    versioning_class = versioning.NamespaceVersioning
