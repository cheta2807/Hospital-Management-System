from django.db import transaction
from rest_framework import serializers

from appointments.models import Appointment

from .models import MedicalRecord, Prescription


class PrescriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Prescription
        fields = ["id", "medicine", "dosage", "duration", "instructions"]


class MedicalRecordSerializer(serializers.ModelSerializer):
    prescriptions = PrescriptionSerializer(many=True, required=False)
    patient_name = serializers.CharField(source="patient.full_name", read_only=True)
    doctor_name = serializers.CharField(source="doctor.display_name", read_only=True)

    class Meta:
        model = MedicalRecord
        fields = [
            "id", "patient", "patient_name", "doctor", "doctor_name", "appointment",
            "diagnosis", "notes", "prescriptions", "created_at",
        ]
        read_only_fields = ["doctor", "created_at"]

    def validate(self, attrs):
        user = self.context["request"].user
        if self.instance is None:
            doctor = getattr(user, "doctor_profile", None)
            if doctor is None:
                raise serializers.ValidationError("Only doctors can write medical records.")
            has_visit = (
                Appointment.objects.filter(doctor=doctor, patient=attrs["patient"])
                .exclude(status=Appointment.Status.CANCELLED)
                .exists()
            )
            if not has_visit:
                raise serializers.ValidationError({"patient": "You can only add records for patients you have an appointment with."})
            attrs["doctor"] = doctor
            appt = attrs.get("appointment")
            if appt and (appt.doctor_id != doctor.id or appt.patient_id != attrs["patient"].id):
                raise serializers.ValidationError({"appointment": "This appointment does not belong to this doctor and patient."})
        else:
            attrs.pop("patient", None)
            attrs.pop("appointment", None)
        return attrs

    @transaction.atomic
    def create(self, vd):
        items = vd.pop("prescriptions", [])
        record = MedicalRecord.objects.create(**vd)
        Prescription.objects.bulk_create([Prescription(record=record, **i) for i in items])
        return record

    @transaction.atomic
    def update(self, instance, vd):
        items = vd.pop("prescriptions", None)
        instance = super().update(instance, vd)
        if items is not None:  # replace the full prescription list
            instance.prescriptions.all().delete()
            Prescription.objects.bulk_create([Prescription(record=instance, **i) for i in items])
        return instance
