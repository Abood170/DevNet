from rest_framework.permissions import BasePermission, SAFE_METHODS

def _role(user):
    return getattr(user, "role", None)

class IsNotDisabled(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and not request.user.is_disabled)

class IsDeveloperOrAdmin(BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        return _role(request.user) in ("developer", "admin")

class ReadOnlyForEmployer(BasePermission):
    
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return False
class IsEmployerOrAdmin(BasePermission):
    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
        return _role(request.user) in ("employer", "admin")
