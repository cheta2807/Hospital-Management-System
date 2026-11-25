from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from rest_framework import serializers

from accounts.models import User

from .models import Department, Doctor

USER_FIELDS = ("username", "password", "first_name", "last_name", "email")


class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ["id", "name", "description"]


class DoctorSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="display_name", read_only=True)
    department_name = serializers.CharField(source="department.name", read_only=True)
    # Write-only login details, used only when an admin creates a doctor.
    username = serializers.CharField(write_only=True, max_length=150)
    password = serializers.CharField(write_only=True)
    first_name = serializers.CharField(write_only=True, max_length=150)
    last_name = serializers.CharField(write_only=True, max_length=150, required=False, allow_blank=True)
    email = serializers.EmailField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = Doctor
        fields = [
            "id", "name", "department", "department_name", "specialization", "qualification",
            "consultation_fee", "available_from", "available_to", "slot_minutes",
            *USER_FIELDS,
        ]

    def get_fields(self):
        fields = super().get_fields()
        if self.instance is not None:  # editing: login details are optional / ignored
            for key in USER_FIELDS:
                fields[key].required = False
        return fields

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("This username is already taken.")
        return value

    def validate_password(self, value):
        validate_password(value)
        return value

    def validate(self, attrs):
        if attrs.get("available_from") and attrs.get("available_to") and attrs["available_from"] >= attrs["available_to"]:
            raise serializers.ValidationError("Working hours must end after they start.")
        return attrs

    @transaction.atomic
    def create(self, vd):
        user_data = {k: vd.pop(k) for k in USER_FIELDS if k in vd}
        user = User.objects.create_user(role=User.Role.DOCTOR, **user_data)
        return Doctor.objects.create(user=user, **vd)

    def update(self, instance, vd):
        for key in USER_FIELDS:
            vd.pop(key, None)
        return super().update(instance, vd)
