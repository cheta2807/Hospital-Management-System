from datetime import time

from django.conf import settings
from django.db import models


class Department(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Doctor(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="doctor_profile")
    department = models.ForeignKey(Department, on_delete=models.PROTECT, related_name="doctors")
    specialization = models.CharField(max_length=150)
    qualification = models.CharField(max_length=150, blank=True)
    consultation_fee = models.DecimalField(max_digits=8, decimal_places=2, default=500)
    available_from = models.TimeField(default=time(9, 0))
    available_to = models.TimeField(default=time(17, 0))
    slot_minutes = models.PositiveSmallIntegerField(default=30)

    class Meta:
        ordering = ["user__first_name", "user__last_name"]

    @property
    def display_name(self):
        return f"Dr. {self.user.get_full_name() or self.user.username}"

    def __str__(self):
        return self.display_name
