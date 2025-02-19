from django.contrib.auth.models import AbstractUser
from django.conf import settings
from rest_framework import permissions

from ..utils import raise_context


def is_openapi_request(request):
    return (
        request.path.startswith(f'/{settings.API_URL}/openapi/') or
        request.path.startswith(f'/{settings.API_URL}/endpoint/') or
        request.path == f'/{settings.API_URL}/{request.version}/_openapi/'
    )


class IsOpenApiRequest(permissions.BasePermission):
    def has_permission(self, request, view):
        return is_openapi_request(request)


class IsAuthenticatedOpenApiRequest(permissions.IsAuthenticated):
    def has_permission(self, request, view):
        return is_openapi_request(request) or super().has_permission(request, view)


class SuperUserPermission(IsAuthenticatedOpenApiRequest):

    def has_permission(self, request, view):
        if request.user.is_staff or request.user.is_superuser or request.method in permissions.SAFE_METHODS:
            # pylint: disable=bad-super-call
            return super(IsAuthenticatedOpenApiRequest, self).has_permission(request, view)
        with raise_context():
            return (
                issubclass(view.get_queryset().model, AbstractUser) and
                str(view.kwargs['pk']) in (str(request.user.pk), 'profile')
            )
        return is_openapi_request(request)

    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser:
            return True
        elif isinstance(obj, AbstractUser) and obj == request.user:
            return True
        return False


class StaffPermission(permissions.IsAdminUser):
    pass
