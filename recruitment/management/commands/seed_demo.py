from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from recruitment.eligibility import EducationLevel
from recruitment.models import Application, JobOpening
from recruitment.services import (
    apply_to_job,
    create_job_opening,
    register_applicant,
    schedule_interview,
    screen_application,
)


class Command(BaseCommand):
    help = "Seed demo jobs, applicants, screening results, and one interview."

    def handle(self, *args, **options):
        job = create_job_opening(
            title="Software Engineer",
            department="Engineering",
            location="Pune",
            description="Build and maintain recruitment platform services.",
            status=JobOpening.Status.OPEN,
            min_education=EducationLevel.BACHELOR,
            min_experience_years=2,
            required_skills=["python", "sql"],
            max_notice_period_days=60,
            require_work_authorization=True,
            min_age=21,
            max_age=50,
            remote_ok=True,
            allowed_locations=["pune", "mumbai"],
        )

        asha = register_applicant(
            full_name="Asha Kulkarni",
            email="asha.kulkarni@example.com",
            phone="9000000001",
            education=EducationLevel.MASTER,
            experience_years=4,
            skills=["Python", "SQL", "Django"],
            notice_period_days=30,
            work_authorized=True,
            age=28,
            location="Pune",
            prefers_remote=False,
        )
        rohan = register_applicant(
            full_name="Rohan Mehta",
            email="rohan.mehta@example.com",
            education=EducationLevel.HIGH_SCHOOL,
            experience_years=1,
            skills=["Excel"],
            notice_period_days=90,
            work_authorized=False,
            age=20,
            location="Delhi",
            prefers_remote=False,
        )

        app_asha = apply_to_job(job=job, applicant=asha, cover_letter="Excited to join.")
        app_rohan = apply_to_job(job=job, applicant=rohan)

        screen_application(app_asha)
        screen_application(app_rohan)

        app_asha.refresh_from_db()
        if app_asha.status == Application.Status.PASSED:
            schedule_interview(
                application=app_asha,
                scheduled_at=timezone.now() + timedelta(days=5),
                interviewer_name="Priya Shah",
                location_or_link="Office – Pune / Meet",
                notes="First-round technical screen",
            )

        self.stdout.write(self.style.SUCCESS("Demo recruitment data seeded."))
