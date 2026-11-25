from django.conf import settings
from django.db import models


class AuditLog(models.Model):
    """Who viewed or changed which record, and when."""

    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)
    action = models.CharField(max_length=10)  # VIEW / CREATE / UPDATE / DELETE
    model = models.CharField(max_length=50)
    object_id = models.CharField(max_length=20)
    path = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.action} {self.model}#{self.object_id}"
