from datetime import time, timedelta
from decimal import Decimal

from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import Role, User
from apps.appointments.models import Appointment
from apps.clinics.models import Clinic, ClinicMembership, DoctorAvailability, DoctorProfile
from apps.patients.models import Patient
from apps.queue_mgmt.models import QueueToken
from apps.queue_mgmt import services as queue_services


@override_settings(USE_SQLITE=True)
class CriticalWorkflowTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.clinic = Clinic.objects.create(name="Test Clinic", code="tst")
        self.admin = User.objects.create_user(
            username="admin", password="pass12345", role=Role.SUPER_ADMIN, is_superuser=True
        )
        self.reception = User.objects.create_user(
            username="reception", password="pass12345", role=Role.RECEPTIONIST
        )
        self.doctor_user = User.objects.create_user(
            username="doctor",
            password="pass12345",
            role=Role.DOCTOR,
            first_name="Doc",
            last_name="Tor",
        )
        ClinicMembership.objects.create(
            user=self.reception, clinic=self.clinic, role=Role.RECEPTIONIST, is_primary=True
        )
        ClinicMembership.objects.create(
            user=self.doctor_user, clinic=self.clinic, role=Role.DOCTOR, is_primary=True
        )
        self.doctor = DoctorProfile.objects.create(
            user=self.doctor_user, clinic=self.clinic, specialty="GP"
        )
        DoctorAvailability.objects.create(
            doctor=self.doctor,
            weekday=timezone.localdate().weekday(),
            start_time=time(0, 0),
            end_time=time(23, 59),
        )
        self.patient = Patient.objects.create(
            clinic=self.clinic,
            mrn="TST-00001",
            first_name="Pat",
            last_name="Ient",
            date_of_birth="1990-01-01",
            phone="9999900001",
            email="pat@example.com",
        )

    def auth(self, user):
        self.client.force_authenticate(user=user)
        self.client.credentials(HTTP_X_CLINIC_ID=str(self.clinic.id))

    def test_login_and_me(self):
        res = self.client.post(
            "/api/auth/login/",
            {"username": "reception", "password": "pass12345"},
            format="json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertIn("access", res.data["tokens"])
        token = res.data["tokens"]["access"]
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
        me = self.client.get("/api/auth/me/")
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.data["username"], "reception")

    def test_patient_duplicate_prevention(self):
        self.auth(self.reception)
        payload = {
            "clinic": self.clinic.id,
            "first_name": "Pat",
            "last_name": "Ient",
            "date_of_birth": "1990-01-01",
            "phone": "9999900001",
            "email": "other@example.com",
        }
        res = self.client.post("/api/patients/", payload, format="json")
        self.assertEqual(res.status_code, status.HTTP_409_CONFLICT)
        self.assertIn("duplicates", res.data)

    def test_appointment_double_booking_prevented(self):
        self.auth(self.reception)
        start = timezone.now() + timedelta(hours=1)
        end = start + timedelta(minutes=15)
        a1 = Appointment(
            clinic=self.clinic,
            patient=self.patient,
            doctor=self.doctor,
            start_time=start,
            end_time=end,
            status=Appointment.Status.SCHEDULED,
        )
        a1.save()
        with self.assertRaises(Exception):
            Appointment(
                clinic=self.clinic,
                patient=self.patient,
                doctor=self.doctor,
                start_time=start + timedelta(minutes=5),
                end_time=end + timedelta(minutes=5),
                status=Appointment.Status.SCHEDULED,
            ).save()

    def test_queue_call_skip_recall(self):
        t1 = queue_services.issue_token(
            clinic=self.clinic, doctor=self.doctor, patient=self.patient, user=self.reception
        )
        p2 = Patient.objects.create(
            clinic=self.clinic,
            mrn="TST-00002",
            first_name="Two",
            last_name="Patient",
            date_of_birth="1991-01-01",
            phone="9999900002",
        )
        t2 = queue_services.issue_token(
            clinic=self.clinic, doctor=self.doctor, patient=p2, user=self.reception
        )
        session = t1.session
        called = queue_services.call_next(session)
        self.assertEqual(called.id, t1.id)
        self.assertEqual(called.status, QueueToken.Status.CALLED)
        skipped = queue_services.skip_token(t2)
        self.assertEqual(skipped.status, QueueToken.Status.SKIPPED)
        recalled = queue_services.recall_token(t2)
        self.assertEqual(recalled.status, QueueToken.Status.CALLED)

    def test_clinic_isolation(self):
        other = Clinic.objects.create(name="Other", code="oth")
        Patient.objects.create(
            clinic=other,
            mrn="OTH-1",
            first_name="X",
            last_name="Y",
            date_of_birth="1990-01-01",
            phone="111",
        )
        self.auth(self.reception)
        res = self.client.get("/api/patients/")
        self.assertEqual(res.status_code, 200)
        ids = [r["id"] for r in res.data["results"]]
        self.assertIn(self.patient.id, ids)
        self.assertEqual(len(ids), 1)

    def test_dashboard_stats_real(self):
        self.auth(self.reception)
        res = self.client.get("/api/dashboard/stats/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["patients_total"], 1)
        self.assertIn("appointments_today", res.data)

    def test_tv_display_no_patient_name(self):
        queue_services.issue_token(
            clinic=self.clinic, doctor=self.doctor, patient=self.patient, user=self.reception
        )
        res = self.client.get(f"/api/queue/tv/{self.doctor.id}/")
        self.assertEqual(res.status_code, 200)
        blob = str(res.data)
        self.assertNotIn(self.patient.first_name, blob)
        self.assertNotIn(self.patient.phone, blob)
