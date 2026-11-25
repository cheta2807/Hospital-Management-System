from rest_framework import viewsets

from core.audit import AuditMixin
from core.permissions import ADMIN, DOCTOR, PATIENT, RoleMapMixin

from .models import MedicalRecord
from .serializers import MedicalRecordSerializer


class MedicalRecordViewSet(AuditMixin, RoleMapMixin, viewsets.ModelViewSet):
    serializer_class = MedicalRecordSerializer
    search_fields = ["patient__full_name", "diagnosis"]
    role_map = {
        "list": [ADMIN, DOCTOR, PATIENT],
        "retrieve": [ADMIN, DOCTOR, PATIENT],
        "create": [DOCTOR],
        "update": [DOCTOR],
        "partial_update": [DOCTOR],
        "destroy": [ADMIN],
    }

    def get_queryset(self):
        user = self.request.user
        qs = MedicalRecord.objects.select_related("patient", "doctor__user").prefetch_related("prescriptions")
        if user.role == PATIENT:
            qs = qs.filter(patient__user=user)
        elif user.role == DOCTOR:
            qs = qs.filter(doctor__user=user)
        patient = self.request.query_params.get("patient", "")
        if patient.isdigit():
            qs = qs.filter(patient_id=int(patient))
        return qs
