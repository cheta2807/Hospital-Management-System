from datetime import timedelta

from django.core.management import call_command
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from accounts.models import User
from appointments.models import Appointment
from billing.models import Bill
from doctors.models import Doctor
from patients.models import Patient


def login(client, username, password):
    res = client.post("/api/auth/login/", {"username": username, "password": password}, format="json")
    assert res.status_code == 200, res.content
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")
    return res.data


class HmsApiTests(APITestCase):
    def setUp(self):
        call_command("seed_demo", verbosity=0)
        self.tomorrow = (timezone.localdate() + timedelta(days=1)).isoformat()
        self.doctor = Doctor.objects.get(user__username="dr.sharma")
        self.patient = Patient.objects.get(user__username="patient1")

    def as_user(self, username, password):
        client = self.client_class()
        login(client, username, password)
        return client

    # --- auth -------------------------------------------------------------
    def test_register_creates_patient_profile_and_login_returns_role(self):
        res = self.client.post(
            "/api/auth/register/",
            {"username": "newbie", "password": "StrongPass#123", "email": "n@x.com", "first_name": "New", "last_name": "Bie"},
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.content)
        self.assertTrue(Patient.objects.filter(user__username="newbie").exists())
        data = login(self.client_class(), "newbie", "StrongPass#123")
        self.assertEqual(data["user"]["role"], "PATIENT")

    def test_register_rejects_weak_password(self):
        res = self.client.post(
            "/api/auth/register/",
            {"username": "weak", "password": "123", "email": "w@x.com", "first_name": "W"},
            format="json",
        )
        self.assertEqual(res.status_code, 400)

    def test_unauthenticated_requests_are_rejected(self):
        self.assertEqual(self.client.get("/api/patients/").status_code, 401)

    # --- appointments -------------------------------------------------------
    def test_patient_books_slot_and_double_booking_is_blocked(self):
        c = self.as_user("patient1", "Patient@12345")
        body = {"doctor": self.doctor.id, "date": self.tomorrow, "start_time": "10:00", "reason": "Chest pain"}
        self.assertEqual(c.post("/api/appointments/", body, format="json").status_code, 201)

        reception = self.as_user("reception", "Reception@123")
        other = Patient.objects.create(full_name="Walk In")
        clash = reception.post("/api/appointments/", {**body, "patient": other.id}, format="json")
        self.assertEqual(clash.status_code, 400)
        self.assertIn("already booked", str(clash.data["start_time"]))

    def test_slots_endpoint_hides_booked_slot_and_cancel_frees_it(self):
        c = self.as_user("patient1", "Patient@12345")
        res = c.post("/api/appointments/", {"doctor": self.doctor.id, "date": self.tomorrow, "start_time": "09:30"}, format="json")
        slots = c.get(f"/api/doctors/{self.doctor.id}/slots/?date={self.tomorrow}").data["slots"]
        self.assertNotIn("09:30", slots)
        self.assertIn("09:00", slots)
        c.post(f"/api/appointments/{res.data['id']}/cancel/")
        slots = c.get(f"/api/doctors/{self.doctor.id}/slots/?date={self.tomorrow}").data["slots"]
        self.assertIn("09:30", slots)

    def test_invalid_slot_and_past_date_rejected(self):
        c = self.as_user("patient1", "Patient@12345")
        bad_time = c.post("/api/appointments/", {"doctor": self.doctor.id, "date": self.tomorrow, "start_time": "09:10"}, format="json")
        self.assertEqual(bad_time.status_code, 400)
        yesterday = (timezone.localdate() - timedelta(days=1)).isoformat()
        past = c.post("/api/appointments/", {"doctor": self.doctor.id, "date": yesterday, "start_time": "10:00"}, format="json")
        self.assertEqual(past.status_code, 400)

    def test_reschedule_moves_appointment(self):
        c = self.as_user("patient1", "Patient@12345")
        res = c.post("/api/appointments/", {"doctor": self.doctor.id, "date": self.tomorrow, "start_time": "11:00"}, format="json")
        moved = c.patch(f"/api/appointments/{res.data['id']}/", {"start_time": "11:30"}, format="json")
        self.assertEqual(moved.status_code, 200, moved.content)
        self.assertEqual(moved.data["start_time"], "11:30:00")

    # --- role based access ----------------------------------------------------
    def test_patient_cannot_see_other_patients_or_manage_doctors(self):
        Patient.objects.create(full_name="Someone Else")
        c = self.as_user("patient1", "Patient@12345")
        ids = [p["id"] for p in c.get("/api/patients/").data["results"]]
        self.assertEqual(ids, [self.patient.id])
        self.assertEqual(c.post("/api/doctors/", {}, format="json").status_code, 403)
        self.assertEqual(c.get("/api/audit-logs/").status_code, 403)

    def test_receptionist_cannot_read_medical_records(self):
        c = self.as_user("reception", "Reception@123")
        self.assertEqual(c.get("/api/records/").status_code, 403)

    def test_admin_creates_doctor_with_login(self):
        c = self.as_user("admin", "Admin@12345")
        dept = self.doctor.department_id
        res = c.post(
            "/api/doctors/",
            {"username": "dr.new", "password": "Doctor#98765", "first_name": "Neha", "last_name": "Rao",
             "department": dept, "specialization": "Dermatologist", "consultation_fee": "600"},
            format="json",
        )
        self.assertEqual(res.status_code, 201, res.content)
        self.assertEqual(User.objects.get(username="dr.new").role, "DOCTOR")
        login(self.client_class(), "dr.new", "Doctor#98765")

    # --- clinical + billing flow ---------------------------------------------
    def test_full_visit_flow_complete_bill_pay_and_record(self):
        patient_c = self.as_user("patient1", "Patient@12345")
        appt = patient_c.post("/api/appointments/", {"doctor": self.doctor.id, "date": self.tomorrow, "start_time": "14:00"}, format="json").data

        doctor_c = self.as_user("dr.sharma", "Doctor@12345")
        done = doctor_c.post(f"/api/appointments/{appt['id']}/complete/", {"notes": "BP normal"}, format="json")
        self.assertEqual(done.status_code, 200)
        bill = Bill.objects.get(appointment_id=appt["id"])
        self.assertEqual(str(bill.amount), "800.00")  # doctor's consultation fee

        rec = doctor_c.post(
            "/api/records/",
            {"patient": self.patient.id, "appointment": appt["id"], "diagnosis": "Hypertension",
             "prescriptions": [{"medicine": "Amlodipine", "dosage": "5mg", "duration": "30 days"}]},
            format="json",
        )
        self.assertEqual(rec.status_code, 201, rec.content)
        self.assertEqual(len(rec.data["prescriptions"]), 1)

        # patient reads own record, pays the bill
        self.assertEqual(len(patient_c.get("/api/records/").data["results"]), 1)
        paid = patient_c.post(f"/api/bills/{bill.id}/pay/", {"payment_method": "UPI"}, format="json")
        self.assertEqual(paid.status_code, 200)
        self.assertEqual(paid.data["status"], "PAID")
        self.assertEqual(patient_c.post(f"/api/bills/{bill.id}/pay/", {"payment_method": "UPI"}, format="json").status_code, 400)

        # access was audited
        admin_c = self.as_user("admin", "Admin@12345")
        patient_c.get(f"/api/records/{rec.data['id']}/")
        logs = admin_c.get("/api/audit-logs/?search=MedicalRecord").data["results"]
        self.assertTrue(any(l["action"] == "VIEW" for l in logs))

    def test_doctor_cannot_write_record_for_unrelated_patient(self):
        stranger = Patient.objects.create(full_name="Stranger")
        c = self.as_user("dr.sharma", "Doctor@12345")
        res = c.post("/api/records/", {"patient": stranger.id, "diagnosis": "x"}, format="json")
        self.assertEqual(res.status_code, 400)

    def test_doctor_only_sees_own_patients(self):
        Patient.objects.create(full_name="Stranger")
        Appointment.objects.create(patient=self.patient, doctor=self.doctor, date=timezone.localdate() + timedelta(days=2), start_time="09:00")
        c = self.as_user("dr.sharma", "Doctor@12345")
        names = [p["full_name"] for p in c.get("/api/patients/").data["results"]]
        self.assertEqual(names, ["Aarav Kumar"])

    # --- dashboard + internal API ----------------------------------------------
    def test_dashboard_stats_by_role(self):
        admin_data = self.as_user("admin", "Admin@12345").get("/api/dashboard/stats/").data
        self.assertEqual(len(admin_data["appointments_by_day"]), 7)
        patient_data = self.as_user("patient1", "Patient@12345").get("/api/dashboard/stats/").data
        self.assertNotIn("revenue_by_day", patient_data)

    @override_settings(INTERNAL_API_KEY="secret-key")
    def test_internal_reminders_require_key(self):
        self.assertEqual(self.client.get("/api/internal/reminders/").status_code, 403)
        ok = self.client.get("/api/internal/reminders/", HTTP_X_INTERNAL_KEY="secret-key")
        self.assertEqual(ok.status_code, 200)

    def test_health(self):
        self.assertEqual(self.client.get("/api/health/").json(), {"status": "ok"})
