from rest_framework import permissions


class SuperUserPermission(permissions.IsAuthenticated):
    def has_object_permission(self, request, view, obj):
        if request.user.is_superuser:
            return True
        elif request.user == obj:
            return True
        return False


class StaffPermission(permissions.IsAdminUser):
    pass
