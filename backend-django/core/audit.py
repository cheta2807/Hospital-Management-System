from rest_framework.response import Response

from .models import AuditLog


class AuditMixin:
    """Writes an AuditLog row for every view / create / update / delete."""

    def _audit(self, action, obj):
        user = self.request.user if self.request.user.is_authenticated else None
        AuditLog.objects.create(
            user=user,
            action=action,
            model=obj.__class__.__name__,
            object_id=str(obj.pk),
            path=self.request.path[:255],
        )

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        self._audit("VIEW", instance)
        return Response(self.get_serializer(instance).data)

    def perform_create(self, serializer):
        self._audit("CREATE", serializer.save())

    def perform_update(self, serializer):
        self._audit("UPDATE", serializer.save())

    def perform_destroy(self, instance):
        self._audit("DELETE", instance)
        instance.delete()
