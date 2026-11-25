from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from patients.models import Patient

from .models import User


class UserSerializer(serializers.ModelSerializer):
    patient_id = serializers.SerializerMethodField()
    doctor_id = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name", "role", "phone", "patient_id", "doctor_id"]

    def get_patient_id(self, obj):
        profile = getattr(obj, "patient_profile", None)
        return profile.id if profile else None

    def get_doctor_id(self, obj):
        profile = getattr(obj, "doctor_profile", None)
        return profile.id if profile else None


class LoginSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        token["username"] = user.username
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user).data
        return data


class RegisterSerializer(serializers.Serializer):
    """Public sign-up: always creates a PATIENT account plus its patient profile."""

    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True)
    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    phone = serializers.CharField(max_length=15, required=False, allow_blank=True)
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    gender = serializers.ChoiceField(choices=Patient.Gender.choices, required=False, allow_blank=True)

    def validate_username(self, value):
        if User.objects.filter(username__iexact=value).exists():
            raise serializers.ValidationError("This username is already taken.")
        return value

    def validate_password(self, value):
        validate_password(value)
        return value

    @transaction.atomic
    def create(self, vd):
        user = User.objects.create_user(
            username=vd["username"],
            password=vd["password"],
            email=vd["email"],
            first_name=vd["first_name"],
            last_name=vd.get("last_name", ""),
            phone=vd.get("phone", ""),
            role=User.Role.PATIENT,
        )
        Patient.objects.create(
            user=user,
            full_name=f"{vd['first_name']} {vd.get('last_name', '')}".strip(),
            email=vd["email"],
            phone=vd.get("phone", ""),
            date_of_birth=vd.get("date_of_birth"),
            gender=vd.get("gender", ""),
        )
        return user
