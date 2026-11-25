import hmac
from datetime import datetime, timedelta

from django.conf import settings
from django.db.models import Sum
from django.http import JsonResponse
from django.utils import timezone
from rest_framework import serializers, viewsets
from rest_framework.authentication import BaseAuthentication  # noqa: F401
from rest_framework.permissions import AllowAny, BasePermission
from rest_framework.response import Response
from rest_framework.views import APIView

from appointments.models import Appointment
from billing.models import Bill
from doctors.models import Doctor
from patients.models import Patient
from records.models import MedicalRecord

from .models import AuditLog
from .permissions import ADMIN, DOCTOR, PATIENT, RECEPTIONIST, RoleMapMixin


def health(request):
    return JsonResponse({"status": "ok"})


# ----------------------------------------------------------------------------- audit logs
class AuditLogSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True, default=None)

    class Meta:
        model = AuditLog
        fields = ["id", "username", "action", "model", "object_id", "path", "created_at"]


class AuditLogViewSet(RoleMapMixin, viewsets.ReadOnlyModelViewSet):
    queryset = AuditLog.objects.select_related("user")
    serializer_class = AuditLogSerializer
    role_map = {"*": [ADMIN]}
    search_fields = ["user__username", "model", "action"]


# ----------------------------------------------------------------------------- dashboard
class DashboardStatsView(APIView):
    def get(self, request):
        user = request.user
        today = timezone.localdate()
        upcoming = Appointment.objects.filter(status="BOOKED", date__gte=today)

        if user.role in (ADMIN, RECEPTIONIST):
            cards = [
                {"label": "Patients", "value": Patient.objects.count()},
                {"label": "Doctors", "value": Doctor.objects.count()},
                {"label": "Appointments today", "value": Appointment.objects.filter(date=today).exclude(status="CANCELLED").count()},
                {"label": "Upcoming appointments", "value": upcoming.count()},
                {"label": "Unpaid bills", "value": Bill.objects.filter(status="UNPAID").count()},
            ]
            data = {"role": user.role, "cards": cards}
            if user.role == ADMIN:
                days = [today - timedelta(days=i) for i in range(6, -1, -1)]
                data["appointments_by_day"] = [
                    {"date": d.strftime("%d %b"), "count": Appointment.objects.filter(date=d).exclude(status="CANCELLED").count()}
                    for d in days
                ]
                data["revenue_by_day"] = [
                    {
                        "date": d.strftime("%d %b"),
                        "revenue": float(Bill.objects.filter(status="PAID", paid_at__date=d).aggregate(t=Sum("amount"))["t"] or 0),
                    }
                    for d in days
                ]
                total = Bill.objects.filter(status="PAID").aggregate(t=Sum("amount"))["t"] or 0
                data["cards"].append({"label": "Revenue collected (Rs.)", "value": float(total)})
            return Response(data)

        if user.role == DOCTOR:
            doctor = getattr(user, "doctor_profile", None)
            mine = Appointment.objects.filter(doctor=doctor) if doctor else Appointment.objects.none()
            cards = [
                {"label": "Appointments today", "value": mine.filter(date=today, status="BOOKED").count()},
                {"label": "Upcoming appointments", "value": mine.filter(date__gte=today, status="BOOKED").count()},
                {"label": "Completed", "value": mine.filter(status="COMPLETED").count()},
                {"label": "My patients", "value": mine.exclude(status="CANCELLED").values("patient").distinct().count()},
            ]
            return Response({"role": user.role, "cards": cards})

        patient = getattr(user, "patient_profile", None)
        cards = [
            {"label": "Upcoming appointments", "value": upcoming.filter(patient=patient).count() if patient else 0},
            {"label": "Unpaid bills", "value": Bill.objects.filter(patient=patient, status="UNPAID").count() if patient else 0},
            {"label": "Medical records", "value": MedicalRecord.objects.filter(patient=patient).count() if patient else 0},
        ]
        return Response({"role": user.role or PATIENT, "cards": cards})


# ----------------------------------------------------------------------------- internal API
class InternalKeyPermission(BasePermission):
    """Only the Node notification service (holding INTERNAL_API_KEY) may call these."""

    def has_permission(self, request, view):
        key = settings.INTERNAL_API_KEY
        sent = request.headers.get("X-Internal-Key", "")
        return bool(key) and hmac.compare_digest(sent, key)


class UpcomingRemindersView(APIView):
    authentication_classes = []
    permission_classes = [InternalKeyPermission]

    def get(self, request):
        now = timezone.localtime()
        horizon = now + timedelta(hours=24)
        qs = Appointment.objects.filter(
            status="BOOKED", reminder_sent=False, date__gte=now.date(), date__lte=horizon.date()
        ).select_related("patient__user", "doctor__user")
        out = []
        for a in qs:
            when = timezone.make_aware(datetime.combine(a.date, a.start_time))
            if not (now <= when <= horizon):
                continue
            email = a.patient.email or (a.patient.user.email if a.patient.user else "")
            out.append(
                {
                    "id": a.id,
                    "patient_name": a.patient.full_name,
                    "patient_email": email,
                    "doctor_name": a.doctor.display_name,
                    "date": a.date.isoformat(),
                    "start_time": a.start_time.strftime("%H:%M"),
                }
            )
        return Response(out)


class ReminderSentView(APIView):
    authentication_classes = []
    permission_classes = [InternalKeyPermission]

    def post(self, request, pk):
        updated = Appointment.objects.filter(pk=pk).update(reminder_sent=True)
        return Response({"updated": updated}, status=200 if updated else 404)
