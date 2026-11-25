from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from doctors.models import Doctor

from .models import Appointment
from .services import generate_slots

BOOKED = Appointment.Status.BOOKED
CANCELLED = Appointment.Status.CANCELLED


class AppointmentSerializer(serializers.ModelSerializer):
    patient_name = serializers.CharField(source="patient.full_name", read_only=True)
    doctor_name = serializers.CharField(source="doctor.display_name", read_only=True)
    department_name = serializers.CharField(source="doctor.department.name", read_only=True)

    class Meta:
        model = Appointment
        fields = [
            "id", "patient", "patient_name", "doctor", "doctor_name", "department_name",
            "date", "start_time", "status", "reason", "notes", "created_at",
        ]
        read_only_fields = ["status", "notes", "created_at"]
        extra_kwargs = {"patient": {"required": False}}

    def validate(self, attrs):
        user = self.context["request"].user
        inst = self.instance

        if inst is None:
            if user.role == "PATIENT":
                profile = getattr(user, "patient_profile", None)
                if profile is None:
                    raise serializers.ValidationError("No patient profile is linked to this account.")
                attrs["patient"] = profile
            elif "patient" not in attrs:
                raise serializers.ValidationError({"patient": "Select a patient."})
        else:
            if inst.status != BOOKED:
                raise serializers.ValidationError("Only booked appointments can be changed.")
            attrs.pop("patient", None)  # rescheduling never changes patient or doctor
            attrs.pop("doctor", None)

        doctor = attrs.get("doctor", inst.doctor if inst else None)
        day = attrs.get("date", inst.date if inst else None)
        start = attrs.get("start_time", inst.start_time if inst else None)

        now = timezone.localtime()
        if day < now.date():
            raise serializers.ValidationError({"date": "Choose today or a future date."})
        if day == now.date() and start <= now.time():
            raise serializers.ValidationError({"start_time": "That time has already passed."})
        if start not in generate_slots(doctor):
            raise serializers.ValidationError({"start_time": "Pick a valid slot within the doctor's working hours."})
        return attrs

    def _ensure_free(self, doctor, patient, day, start, exclude_pk=None):
        # Lock the doctor row so two concurrent requests cannot book the same slot.
        Doctor.objects.select_for_update().get(pk=doctor.pk)
        clash = Appointment.objects.filter(date=day, start_time=start).exclude(status=CANCELLED)
        if exclude_pk:
            clash = clash.exclude(pk=exclude_pk)
        if clash.filter(doctor=doctor).exists():
            raise serializers.ValidationError({"start_time": "This slot is already booked. Pick another time."})
        if clash.filter(patient=patient).exists():
            raise serializers.ValidationError({"start_time": "The patient already has an appointment at this time."})

    @transaction.atomic
    def create(self, vd):
        self._ensure_free(vd["doctor"], vd["patient"], vd["date"], vd["start_time"])
        return super().create(vd)

    @transaction.atomic
    def update(self, instance, vd):
        self._ensure_free(
            instance.doctor, instance.patient,
            vd.get("date", instance.date), vd.get("start_time", instance.start_time),
            exclude_pk=instance.pk,
        )
        if "date" in vd or "start_time" in vd:
            vd["reminder_sent"] = False
        return super().update(instance, vd)
