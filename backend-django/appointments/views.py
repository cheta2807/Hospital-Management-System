from django.utils.dateparse import parse_date
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from core.permissions import ADMIN, DOCTOR, PATIENT, RECEPTIONIST, RoleMapMixin

from .models import Appointment
from .serializers import AppointmentSerializer

ALL = [ADMIN, RECEPTIONIST, DOCTOR, PATIENT]
BOOKERS = [ADMIN, RECEPTIONIST, PATIENT]


class AppointmentViewSet(RoleMapMixin, viewsets.ModelViewSet):
    serializer_class = AppointmentSerializer
    search_fields = ["patient__full_name", "doctor__user__first_name", "doctor__user__last_name", "reason"]
    ordering_fields = ["date", "start_time", "created_at"]
    ordering = ["-date", "-start_time"]
    role_map = {
        "list": ALL, "retrieve": ALL,
        "create": BOOKERS, "update": BOOKERS, "partial_update": BOOKERS,
        "destroy": [ADMIN],
        "cancel": BOOKERS,
        "complete": [ADMIN, DOCTOR],
    }

    def get_queryset(self):
        user = self.request.user
        qs = Appointment.objects.select_related("patient", "doctor__user", "doctor__department")
        if user.role == PATIENT:
            qs = qs.filter(patient__user=user)
        elif user.role == DOCTOR:
            qs = qs.filter(doctor__user=user)

        params = self.request.query_params
        status = params.get("status", "").upper()
        if status in Appointment.Status.values:
            qs = qs.filter(status=status)
        day = parse_date(params.get("date", ""))
        if day:
            qs = qs.filter(date=day)
        for key in ("doctor", "patient"):
            if params.get(key, "").isdigit():
                qs = qs.filter(**{f"{key}_id": int(params[key])})
        return qs

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        appt = self.get_object()
        if appt.status != Appointment.Status.BOOKED:
            return Response({"detail": "Only booked appointments can be cancelled."}, status=400)
        appt.status = Appointment.Status.CANCELLED
        appt.save(update_fields=["status"])
        return Response(self.get_serializer(appt).data)

    @action(detail=True, methods=["post"])
    def complete(self, request, pk=None):
        from billing.models import Bill

        appt = self.get_object()
        if appt.status != Appointment.Status.BOOKED:
            return Response({"detail": "Only booked appointments can be completed."}, status=400)
        appt.status = Appointment.Status.COMPLETED
        appt.notes = request.data.get("notes", "")
        appt.save(update_fields=["status", "notes"])
        # Automated billing: completing a visit raises the consultation bill.
        Bill.objects.get_or_create(
            appointment=appt,
            defaults={
                "patient": appt.patient,
                "description": f"Consultation with {appt.doctor.display_name}",
                "amount": appt.doctor.consultation_fee,
            },
        )
        return Response(self.get_serializer(appt).data)
