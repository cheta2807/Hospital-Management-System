from django.db import models


class Appointment(models.Model):
    class Status(models.TextChoices):
        BOOKED = "BOOKED", "Booked"
        COMPLETED = "COMPLETED", "Completed"
        CANCELLED = "CANCELLED", "Cancelled"

    patient = models.ForeignKey("patients.Patient", on_delete=models.CASCADE, related_name="appointments")
    doctor = models.ForeignKey("doctors.Doctor", on_delete=models.CASCADE, related_name="appointments")
    date = models.DateField()
    start_time = models.TimeField()
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.BOOKED)
    reason = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    reminder_sent = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date", "-start_time"]
        indexes = [models.Index(fields=["doctor", "date", "start_time"])]
        # NOTE: double-booking is prevented in the serializer inside a transaction that
        # locks the doctor row. A partial UNIQUE index ("ignore cancelled") is not
        # supported by MySQL, so we do not rely on a DB constraint here.

    def __str__(self):
        return f"{self.patient} with {self.doctor} on {self.date} {self.start_time}"
