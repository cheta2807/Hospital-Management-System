from rest_framework import serializers

from .models import Bill


class BillSerializer(serializers.ModelSerializer):
    invoice_no = serializers.CharField(read_only=True)
    patient_name = serializers.CharField(source="patient.full_name", read_only=True)

    class Meta:
        model = Bill
        fields = [
            "id", "invoice_no", "patient", "patient_name", "appointment", "description",
            "amount", "status", "payment_method", "created_at", "paid_at",
        ]
        read_only_fields = ["status", "payment_method", "created_at", "paid_at"]

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Amount must be greater than zero.")
        return value

    def validate(self, attrs):
        if self.instance is not None and self.instance.status == Bill.Status.PAID:
            raise serializers.ValidationError("Paid bills cannot be edited.")
        return attrs
