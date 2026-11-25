from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from accounts.views import LoginView, MeView, RegisterView
from appointments.views import AppointmentViewSet
from billing.views import BillViewSet
from core.views import (
    AuditLogViewSet,
    DashboardStatsView,
    ReminderSentView,
    UpcomingRemindersView,
    health,
)
from doctors.views import DepartmentViewSet, DoctorViewSet
from patients.views import PatientViewSet
from records.views import MedicalRecordViewSet

router = DefaultRouter()
router.register("patients", PatientViewSet, basename="patient")
router.register("departments", DepartmentViewSet, basename="department")
router.register("doctors", DoctorViewSet, basename="doctor")
router.register("appointments", AppointmentViewSet, basename="appointment")
router.register("records", MedicalRecordViewSet, basename="record")
router.register("bills", BillViewSet, basename="bill")
router.register("audit-logs", AuditLogViewSet, basename="auditlog")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health),
    path("api/auth/login/", LoginView.as_view()),
    path("api/auth/refresh/", TokenRefreshView.as_view()),
    path("api/auth/register/", RegisterView.as_view()),
    path("api/auth/me/", MeView.as_view()),
    path("api/dashboard/stats/", DashboardStatsView.as_view()),
    path("api/internal/reminders/", UpcomingRemindersView.as_view()),
    path("api/internal/reminders/<int:pk>/sent/", ReminderSentView.as_view()),
    path("api/", include(router.urls)),
]
