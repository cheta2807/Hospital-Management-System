from rest_framework import viewsets

from core.audit import AuditMixin
from core.permissions import ADMIN, DOCTOR, PATIENT, RECEPTIONIST, RoleMapMixin

from .models import Patient
from .serializers import PatientSerializer


class PatientViewSet(AuditMixin, RoleMapMixin, viewsets.ModelViewSet):
    serializer_class = PatientSerializer
    search_fields = ["full_name", "phone", "email"]
    ordering_fields = ["full_name", "created_at"]
    role_map = {
        "list": [ADMIN, RECEPTIONIST, DOCTOR, PATIENT],
        "retrieve": [ADMIN, RECEPTIONIST, DOCTOR, PATIENT],
        "create": [ADMIN, RECEPTIONIST],
        "update": [ADMIN, RECEPTIONIST],
        "partial_update": [ADMIN, RECEPTIONIST],
        "destroy": [ADMIN],
    }

    def get_queryset(self):
        user = self.request.user
        qs = Patient.objects.all()
        if user.role == PATIENT:
            return qs.filter(user=user)
        if user.role == DOCTOR:
            # Doctors only see patients they have (non-cancelled) appointments with.
            ids = (
                Patient.objects.filter(appointments__doctor__user=user)
                .exclude(appointments__status="CANCELLED")
                .values("pk")
            )
            return qs.filter(pk__in=ids)
        return qs
