from django.contrib.auth.models import AbstractUser
from rest_framework import permissions
from ..utils import raise_context


class SuperUserPermission(permissions.IsAuthenticated):
    __slots__ = ()

    def has_permission(self, request, view):
        if request.user.is_staff or request.method in permissions.SAFE_METHODS:
            return super().has_permission(request, view)
        obj = None
        with raise_context():
            obj = view.get_object() or obj
        is_openapi = request.path.startswith('/api/openapi/')
        if (isinstance(obj, AbstractUser) and obj == request.user) or is_openapi:
            return True
        return is_openapi

    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser:
            return True
        elif isinstance(obj, AbstractUser) and obj == request.user:
            return True
        return False


class StaffPermission(permissions.IsAdminUser):
    __slots__ = ()
