"""End-to-end recruitment pipeline: job → apply → screen → interview."""

from __future__ import annotations

from datetime import timedelta

import pytest
from django.utils import timezone

from recruitment.eligibility import EducationLevel
from recruitment.models import Application, Interview, JobOpening
from recruitment.services import (
    PipelineError,
    apply_to_job,
    create_job_opening,
    register_applicant,
    schedule_interview,
    screen_application,
    update_job_opening,
)


@pytest.fixture
def open_job(db):
    return create_job_opening(
        title="Backend Engineer",
        department="Engineering",
        location="Pune",
        description="Build APIs",
        status=JobOpening.Status.OPEN,
        min_education=EducationLevel.BACHELOR,
        min_experience_years=2,
        required_skills=["python", "django"],
        max_notice_period_days=60,
        require_work_authorization=True,
        min_age=21,
        max_age=50,
        remote_ok=True,
        allowed_locations=["pune"],
    )


@pytest.fixture
def strong_applicant(db):
    return register_applicant(
        full_name="Asha Kulkarni",
        email="asha@example.com",
        phone="9999999999",
        education=EducationLevel.MASTER,
        experience_years=4,
        skills=["Python", "Django", "SQL"],
        notice_period_days=30,
        work_authorized=True,
        age=29,
        location="Pune",
        prefers_remote=False,
    )


@pytest.fixture
def weak_applicant(db):
    return register_applicant(
        full_name="Rohan Mehta",
        email="rohan@example.com",
        education=EducationLevel.HIGH_SCHOOL,
        experience_years=0.5,
        skills=["excel"],
        notice_period_days=90,
        work_authorized=False,
        age=19,
        location="Delhi",
        prefers_remote=False,
    )


@pytest.mark.django_db
def test_create_and_update_job(open_job):
    assert open_job.required_skills_list == ("python", "django")
    updated = update_job_opening(open_job, min_experience_years=3, status=JobOpening.Status.CLOSED)
    assert updated.min_experience_years == 3
    assert updated.status == JobOpening.Status.CLOSED


@pytest.mark.django_db
def test_register_applicant_upserts_by_email(strong_applicant):
    again = register_applicant(
        full_name="Asha K.",
        email="ASHA@example.com",
        education=EducationLevel.PHD,
        experience_years=6,
        skills=["python"],
        notice_period_days=15,
        work_authorized=True,
        age=30,
        location="Mumbai",
        prefers_remote=True,
    )
    assert again.pk == strong_applicant.pk
    assert again.full_name == "Asha K."
    assert again.education == EducationLevel.PHD


@pytest.mark.django_db
def test_apply_rejects_closed_job(open_job, strong_applicant):
    update_job_opening(open_job, status=JobOpening.Status.CLOSED)
    with pytest.raises(PipelineError, match="open jobs"):
        apply_to_job(job=open_job, applicant=strong_applicant)


@pytest.mark.django_db
def test_duplicate_application_rejected(open_job, strong_applicant):
    apply_to_job(job=open_job, applicant=strong_applicant)
    with pytest.raises(PipelineError, match="already applied"):
        apply_to_job(job=open_job, applicant=strong_applicant)


@pytest.mark.django_db
def test_screening_pass_then_schedule_interview(open_job, strong_applicant):
    application = apply_to_job(job=open_job, applicant=strong_applicant, cover_letter="Hello")
    result = screen_application(application)
    application.refresh_from_db()
    assert result.passed
    assert application.status == Application.Status.PASSED
    assert application.screening_reasons == ""
    assert application.screened_at is not None

    when = timezone.now() + timedelta(days=3)
    interview = schedule_interview(
        application=application,
        scheduled_at=when,
        interviewer_name="Priya Shah",
        location_or_link="Zoom",
    )
    application.refresh_from_db()
    assert interview.status == Interview.Status.SCHEDULED
    assert application.status == Application.Status.INTERVIEW_SCHEDULED


@pytest.mark.django_db
def test_screening_fail_blocks_interview(open_job, weak_applicant):
    application = apply_to_job(job=open_job, applicant=weak_applicant)
    result = screen_application(application)
    application.refresh_from_db()
    assert not result.passed
    assert application.status == Application.Status.FAILED
    assert application.screening_reasons
    with pytest.raises(PipelineError, match="passed screening"):
        schedule_interview(
            application=application,
            scheduled_at=timezone.now() + timedelta(days=1),
            interviewer_name="Priya Shah",
        )


@pytest.mark.django_db
def test_cannot_double_schedule(open_job, strong_applicant):
    application = apply_to_job(job=open_job, applicant=strong_applicant)
    screen_application(application)
    application.refresh_from_db()
    when = timezone.now() + timedelta(days=2)
    schedule_interview(
        application=application,
        scheduled_at=when,
        interviewer_name="Priya Shah",
    )
    application.refresh_from_db()
    # Status is now INTERVIEW_SCHEDULED, so scheduling again fails the status check
    with pytest.raises(PipelineError):
        schedule_interview(
            application=application,
            scheduled_at=when + timedelta(days=1),
            interviewer_name="Other",
        )
