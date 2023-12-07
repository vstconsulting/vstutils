import hashlib

from django.conf import settings
from drf_yasg.views import get_schema_view
from rest_framework import permissions, versioning

from ..base import check_request_etag, CachableHeadMixin


class OpenApiView(get_schema_view()):  # type: ignore
    permission_classes = (permissions.AllowAny,)
    versioning_class = versioning.NamespaceVersioning

    def get_etag_dependencies(self, request):
        dependencies = [settings.FULL_VERSION]
        if request.user.is_authenticated:
            dependencies.append(request.user.id)
        if version := getattr(request, 'version', None):
            dependencies.append(version)
        return dependencies

    def get_etag_value(self, request):
        value = hashlib.blake2s(
            "_".join(map(str, self.get_etag_dependencies(request))).encode("utf-8"),
            digest_size=8
        ).hexdigest()
        return f'"{value}"'

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)

        self.etag_value, matched = check_request_etag(request, self.get_etag_value(request))
        if matched:
            raise CachableHeadMixin.NotModifiedException()

    def finalize_response(self, request, response, *args, **kwargs):
        response = super().finalize_response(request, response, *args, **kwargs)
        if etag_value := getattr(self, 'etag_value', None):
            response['Etag'] = etag_value
        return response
