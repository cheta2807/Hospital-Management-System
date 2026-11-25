from rest_framework import serializers

from .models import Patient


class PatientSerializer(serializers.ModelSerializer):
    class Meta:
        model = Patient
        fields = ["id", "user", "full_name", "email", "phone", "date_of_birth", "gender", "blood_group", "address", "created_at"]
        read_only_fields = ["user", "created_at"]
