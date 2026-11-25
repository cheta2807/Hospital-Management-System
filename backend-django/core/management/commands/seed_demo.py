from datetime import time

from django.core.management.base import BaseCommand

from accounts.models import User
from doctors.models import Department, Doctor
from patients.models import Patient

DEMO_PASSWORDS = {
    "admin": "Admin@12345",
    "reception": "Reception@123",
    "dr.sharma": "Doctor@12345",
    "dr.mehta": "Doctor@12345",
    "patient1": "Patient@12345",
}


class Command(BaseCommand):
    help = "Create demo departments, doctors and users (safe to run repeatedly)."

    def handle(self, *args, **options):
        admin, created = User.objects.get_or_create(
            username="admin",
            defaults={"role": "ADMIN", "email": "admin@hms.local", "is_staff": True, "is_superuser": True},
        )
        if created:
            admin.set_password(DEMO_PASSWORDS["admin"])
            admin.save()

        rec, created = User.objects.get_or_create(
            username="reception",
            defaults={"role": "RECEPTIONIST", "email": "reception@hms.local", "first_name": "Riya", "last_name": "Desai"},
        )
        if created:
            rec.set_password(DEMO_PASSWORDS["reception"])
            rec.save()

        depts = {}
        for name, desc in [
            ("Cardiology", "Heart and blood vessels"),
            ("Orthopedics", "Bones, joints and muscles"),
            ("Pediatrics", "Child health"),
            ("General Medicine", "Primary care"),
        ]:
            depts[name], _ = Department.objects.get_or_create(name=name, defaults={"description": desc})

        for username, first, last, dept, spec, fee in [
            ("dr.sharma", "Anita", "Sharma", "Cardiology", "Interventional Cardiologist", 800),
            ("dr.mehta", "Rohan", "Mehta", "General Medicine", "Physician", 400),
        ]:
            user, created = User.objects.get_or_create(
                username=username,
                defaults={"role": "DOCTOR", "first_name": first, "last_name": last, "email": f"{username}@hms.local"},
            )
            if created:
                user.set_password(DEMO_PASSWORDS[username])
                user.save()
            Doctor.objects.get_or_create(
                user=user,
                defaults={
                    "department": depts[dept],
                    "specialization": spec,
                    "consultation_fee": fee,
                    "available_from": time(9, 0),
                    "available_to": time(17, 0),
                    "slot_minutes": 30,
                },
            )

        pat, created = User.objects.get_or_create(
            username="patient1",
            defaults={"role": "PATIENT", "first_name": "Aarav", "last_name": "Kumar", "email": "patient1@hms.local"},
        )
        if created:
            pat.set_password(DEMO_PASSWORDS["patient1"])
            pat.save()
        Patient.objects.get_or_create(
            user=pat,
            defaults={"full_name": "Aarav Kumar", "email": "patient1@hms.local", "phone": "9876543210", "gender": "M", "blood_group": "O+"},
        )
        self.stdout.write(self.style.SUCCESS("Demo data ready. Logins: admin, reception, dr.sharma, dr.mehta, patient1"))
