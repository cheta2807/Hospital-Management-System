from django.utils.dateparse import parse_date
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from appointments.services import available_slots
from core.permissions import ADMIN, RoleMapMixin

from .models import Department, Doctor
from .serializers import DepartmentSerializer, DoctorSerializer


class DepartmentViewSet(RoleMapMixin, viewsets.ModelViewSet):
    queryset = Department.objects.all()
    serializer_class = DepartmentSerializer
    pagination_class = None
    role_map = {"create": [ADMIN], "update": [ADMIN], "partial_update": [ADMIN], "destroy": [ADMIN]}


class DoctorViewSet(RoleMapMixin, viewsets.ModelViewSet):
    serializer_class = DoctorSerializer
    search_fields = ["user__first_name", "user__last_name", "specialization", "department__name"]
    role_map = {"create": [ADMIN], "update": [ADMIN], "partial_update": [ADMIN], "destroy": [ADMIN]}

    def get_queryset(self):
        qs = Doctor.objects.select_related("user", "department")
        dept = self.request.query_params.get("department")
        if dept and dept.isdigit():
            qs = qs.filter(department_id=int(dept))
        return qs

    @action(detail=True, methods=["get"])
    def slots(self, request, pk=None):
        """GET /api/doctors/<id>/slots/?date=YYYY-MM-DD -> free appointment slots."""
        doctor = self.get_object()
        day = parse_date(request.query_params.get("date", ""))
        if day is None:
            return Response({"detail": "Provide ?date=YYYY-MM-DD."}, status=400)
        return Response({"date": day.isoformat(), "slots": available_slots(doctor, day)})
