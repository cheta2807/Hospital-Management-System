from django.db import models


class Bill(models.Model):
    class Status(models.TextChoices):
        UNPAID = "UNPAID", "Unpaid"
        PAID = "PAID", "Paid"

    class Method(models.TextChoices):
        CASH = "CASH", "Cash"
        CARD = "CARD", "Card"
        UPI = "UPI", "UPI"

    patient = models.ForeignKey("patients.Patient", on_delete=models.CASCADE, related_name="bills")
    appointment = models.OneToOneField(
        "appointments.Appointment", null=True, blank=True, on_delete=models.SET_NULL, related_name="bill"
    )
    description = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.UNPAID)
    payment_method = models.CharField(max_length=10, choices=Method.choices, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    paid_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]

    @property
    def invoice_no(self):
        return f"INV-{self.pk:05d}"

    def __str__(self):
        return f"{self.invoice_no} ({self.status})"
