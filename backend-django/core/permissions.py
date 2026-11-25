from rest_framework.permissions import BasePermission, IsAuthenticated

ADMIN = "ADMIN"
DOCTOR = "DOCTOR"
RECEPTIONIST = "RECEPTIONIST"
PATIENT = "PATIENT"


def role_required(*roles):
    class RolePermission(BasePermission):
        message = "Your role is not allowed to perform this action."

        def has_permission(self, request, view):
            user = request.user
            return bool(user and user.is_authenticated and user.role in roles)

    return RolePermission


class RoleMapMixin:
    """Role-based access control per viewset action.

    role_map = {"list": [ADMIN], "create": [ADMIN, RECEPTIONIST], "*": [ADMIN]}
    Actions missing from the map fall back to "*"; with no "*" any logged-in user passes.
    """

    role_map = {}

    def get_permissions(self):
        roles = self.role_map.get(self.action) or self.role_map.get("*")
        if roles is None:
            return [IsAuthenticated()]
        return [IsAuthenticated(), role_required(*roles)()]
