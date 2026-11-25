from django.db import models


class MedicalRecord(models.Model):
    patient = models.ForeignKey("patients.Patient", on_delete=models.CASCADE, related_name="records")
    doctor = models.ForeignKey("doctors.Doctor", on_delete=models.PROTECT, related_name="records")
    appointment = models.OneToOneField(
        "appointments.Appointment", null=True, blank=True, on_delete=models.SET_NULL, related_name="record"
    )
    diagnosis = models.CharField(max_length=255)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.patient}: {self.diagnosis}"


class Prescription(models.Model):
    record = models.ForeignKey(MedicalRecord, on_delete=models.CASCADE, related_name="prescriptions")
    medicine = models.CharField(max_length=150)
    dosage = models.CharField(max_length=100)
    duration = models.CharField(max_length=100, blank=True)
    instructions = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return f"{self.medicine} {self.dosage}"
