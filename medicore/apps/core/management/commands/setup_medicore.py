"""
Bootstrap MediCore: super admin, demo accounts per role, sample clinic data.

Usage:
  python manage.py setup_medicore
  python manage.py setup_medicore --reset-demo
"""
from datetime import date, datetime, time, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import Role, User
from apps.appointments.models import Appointment
from apps.billing.models import Invoice, InvoiceItem
from apps.clinics.models import (
    Clinic,
    ClinicMembership,
    DoctorAvailability,
    DoctorLeave,
    DoctorProfile,
)
from apps.emr.models import Encounter, Prescription, PrescriptionItem
from apps.lab.models import LabOrder, LabTest
from apps.notifications.models import Notification
from apps.patients.models import Patient
from apps.pharmacy.models import Medicine
from apps.queue_mgmt import services as queue_services
from apps.staff.models import StaffProfile


DEMO_PASSWORD = "MediCore@Demo1"


class Command(BaseCommand):
    help = "Create super admin, role demo accounts, and sample clinic data"

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset-demo",
            action="store_true",
            help="Delete and recreate demo users/clinic sample data",
        )
        parser.add_argument(
            "--admin-username",
            default="superadmin",
        )
        parser.add_argument(
            "--admin-password",
            default="MediCore@Admin1",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if options["reset_demo"]:
            self.stdout.write("Resetting demo clinic data…")
            Clinic.objects.filter(code="demo-clinic").delete()
            User.objects.filter(username__startswith="demo_").delete()

        admin, created = User.objects.get_or_create(
            username=options["admin_username"],
            defaults={
                "email": "superadmin@medicore.local",
                "role": Role.SUPER_ADMIN,
                "is_staff": True,
                "is_superuser": True,
                "first_name": "Super",
                "last_name": "Admin",
            },
        )
        if created or options["reset_demo"]:
            admin.set_password(options["admin_password"])
            admin.role = Role.SUPER_ADMIN
            admin.is_staff = True
            admin.is_superuser = True
            admin.save()
            self.stdout.write(self.style.SUCCESS(f"Super admin: {admin.username}"))
        else:
            self.stdout.write(f"Super admin exists: {admin.username}")

        clinic, _ = Clinic.objects.get_or_create(
            code="demo-clinic",
            defaults={
                "name": "MediCore Demo Clinic",
                "address_line1": "12 Health Avenue",
                "city": "Bengaluru",
                "state": "Karnataka",
                "pincode": "560001",
                "phone": "08040000000",
                "email": "demo@medicore.local",
                "gstin": "29AAAAA0000A1Z5",
            },
        )

        role_users = {}
        specs = [
            (Role.CLINIC_OWNER, "demo_owner", "Priya", "Owner"),
            (Role.RECEPTIONIST, "demo_reception", "Ravi", "Reception"),
            (Role.DOCTOR, "demo_doctor", "Ananya", "Sharma"),
            (Role.ACCOUNTANT, "demo_accountant", "Kiran", "Accounts"),
            (Role.NURSE, "demo_nurse", "Meera", "Nurse"),
            (Role.PATIENT, "demo_patient", "Asha", "Patient"),
        ]
        for role, username, first, last in specs:
            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    "email": f"{username}@medicore.local",
                    "role": role,
                    "first_name": first,
                    "last_name": last,
                    "phone": "9876500000",
                    "is_staff": role != Role.PATIENT,
                },
            )
            user.set_password(DEMO_PASSWORD)
            user.role = role
            user.save()
            ClinicMembership.objects.update_or_create(
                user=user,
                clinic=clinic,
                role=role,
                defaults={"is_primary": True, "is_active": True},
            )
            role_users[role] = user
            self.stdout.write(f"  {role}: {username} / {DEMO_PASSWORD}")

        doctor = role_users[Role.DOCTOR]
        doc_profile, _ = DoctorProfile.objects.get_or_create(
            user=doctor,
            defaults={
                "clinic": clinic,
                "specialty": "General Medicine",
                "registration_number": "KMC-12345",
                "consultation_fee": Decimal("500.00"),
                "slot_duration_minutes": 15,
            },
        )
        if doc_profile.clinic_id != clinic.id:
            doc_profile.clinic = clinic
            doc_profile.save()

        for weekday in range(0, 6):
            DoctorAvailability.objects.get_or_create(
                doctor=doc_profile,
                weekday=weekday,
                start_time=time(9, 0),
                end_time=time(17, 0),
                defaults={"is_active": True},
            )

        DoctorLeave.objects.get_or_create(
            doctor=doc_profile,
            start_date=date.today() + timedelta(days=30),
            end_date=date.today() + timedelta(days=31),
            defaults={"reason": "Conference"},
        )

        for role, user in role_users.items():
            if role == Role.PATIENT:
                continue
            StaffProfile.objects.update_or_create(
                user=user,
                defaults={
                    "clinic": clinic,
                    "employee_id": f"EMP-{role[:3].upper()}-01",
                    "department": role.replace("_", " ").title(),
                    "designation": role.replace("_", " ").title(),
                    "role": role,
                    "join_date": date.today() - timedelta(days=120),
                    "is_active": True,
                },
            )

        patients = []
        sample_people = [
            ("Rahul", "Verma", "9876511111", "rahul@example.com", date(1990, 5, 12)),
            ("Sneha", "Iyer", "9876522222", "sneha@example.com", date(1988, 8, 21)),
            ("Asha", "Patient", "9876533333", "demo_patient@medicore.local", date(1995, 1, 3)),
        ]
        for idx, (fn, ln, phone, email, dob) in enumerate(sample_people, start=1):
            user = role_users[Role.PATIENT] if fn == "Asha" else None
            p, _ = Patient.objects.get_or_create(
                clinic=clinic,
                mrn=f"DEMO-{idx:05d}",
                defaults={
                    "first_name": fn,
                    "last_name": ln,
                    "phone": phone,
                    "email": email,
                    "date_of_birth": dob,
                    "gender": Patient.Gender.FEMALE if fn != "Rahul" else Patient.Gender.MALE,
                    "city": "Bengaluru",
                    "state": "Karnataka",
                    "pincode": "560001",
                    "user": user,
                    "created_by": role_users[Role.RECEPTIONIST],
                },
            )
            patients.append(p)

        tz = timezone.get_current_timezone()
        now = timezone.now()
        start = timezone.make_aware(datetime.combine(now.date(), time(10, 0)), tz)
        if start < now:
            start = now + timedelta(minutes=30)
        end = start + timedelta(minutes=15)
        appt, _ = Appointment.objects.get_or_create(
            clinic=clinic,
            patient=patients[0],
            doctor=doc_profile,
            start_time=start,
            defaults={
                "end_time": end,
                "status": Appointment.Status.CONFIRMED,
                "reason": "Fever and cough",
                "created_by": role_users[Role.RECEPTIONIST],
            },
        )

        Encounter.objects.get_or_create(
            clinic=clinic,
            patient=patients[0],
            doctor=doc_profile,
            appointment=appt,
            defaults={
                "chief_complaint": "Fever",
                "diagnosis": "Viral fever",
                "plan": "Rest, hydration, follow-up in 3 days",
                "vitals_json": {"temp_c": 38.2, "bp": "120/80", "pulse": 88},
            },
        )

        rx, created = Prescription.objects.get_or_create(
            clinic=clinic,
            patient=patients[0],
            doctor=doc_profile,
            defaults={
                "status": Prescription.Status.ACTIVE,
                "notes": "Take after food",
                "created_by": doctor,
            },
        )
        if created or not rx.items.exists():
            PrescriptionItem.objects.get_or_create(
                prescription=rx,
                medicine_name="Paracetamol",
                defaults={
                    "dosage": "500mg",
                    "frequency": "TID",
                    "duration_days": 3,
                    "quantity": 9,
                    "instructions": "After meals",
                },
            )

        med, _ = Medicine.objects.get_or_create(
            clinic=clinic,
            name="Paracetamol",
            strength="500mg",
            defaults={
                "generic_name": "Acetaminophen",
                "form": "tablet",
                "stock_quantity": 500,
                "reorder_level": 50,
                "unit_price": Decimal("2.50"),
            },
        )

        inv, created = Invoice.objects.get_or_create(
            clinic=clinic,
            invoice_number="INV-DEMO-00001",
            defaults={
                "patient": patients[0],
                "appointment": appt,
                "status": Invoice.Status.ISSUED,
                "issued_at": timezone.now(),
                "created_by": role_users[Role.ACCOUNTANT],
            },
        )
        if created or not inv.items.exists():
            InvoiceItem.objects.create(
                invoice=inv,
                description="Consultation",
                quantity=1,
                unit_price=Decimal("500.00"),
                tax_percent=Decimal("0"),
            )

        lab_test, _ = LabTest.objects.get_or_create(
            clinic=clinic,
            name="Complete Blood Count",
            defaults={"code": "CBC", "price": Decimal("350.00"), "sample_type": "Blood"},
        )
        LabOrder.objects.get_or_create(
            clinic=clinic,
            patient=patients[0],
            test=lab_test,
            defaults={
                "status": LabOrder.Status.ORDERED,
                "ordered_by": doctor,
            },
        )

        try:
            queue_services.issue_token(
                clinic=clinic,
                doctor=doc_profile,
                patient=patients[0],
                appointment=appt,
                user=role_users[Role.RECEPTIONIST],
            )
            queue_services.issue_token(
                clinic=clinic,
                doctor=doc_profile,
                patient=patients[1],
                user=role_users[Role.RECEPTIONIST],
            )
        except Exception as exc:
            self.stdout.write(self.style.WARNING(f"Queue seed note: {exc}"))

        for user in role_users.values():
            Notification.objects.get_or_create(
                user=user,
                title="Welcome to MediCore",
                defaults={
                    "clinic": clinic,
                    "message": "Your demo account is ready. Change the password in production.",
                    "level": "info",
                },
            )

        self.stdout.write(self.style.SUCCESS("MediCore demo data ready."))
        self.stdout.write(
            f"Login examples — superadmin / {options['admin_password']}; "
            f"demo_doctor / {DEMO_PASSWORD}"
        )
