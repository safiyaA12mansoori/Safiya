"""Domain services for the recruitment pipeline."""

from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from .eligibility import (
    ApplicantProfile,
    EducationLevel,
    EligibilityCriteria,
    ScreeningResult,
    evaluate_eligibility,
    skills_from_csv,
)
from .models import Applicant, Application, Interview, JobOpening


class PipelineError(ValueError):
    """Raised when a pipeline step is attempted in an invalid state."""


def criteria_from_job(job: JobOpening) -> EligibilityCriteria:
    return EligibilityCriteria(
        min_education=EducationLevel(job.min_education),
        min_experience_years=job.min_experience_years,
        required_skills=job.required_skills_list,
        max_notice_period_days=job.max_notice_period_days,
        require_work_authorization=job.require_work_authorization,
        min_age=job.min_age,
        max_age=job.max_age,
        remote_ok=job.remote_ok,
        allowed_locations=job.allowed_locations_list,
    )


def profile_from_applicant(applicant: Applicant) -> ApplicantProfile:
    return ApplicantProfile(
        education=EducationLevel(applicant.education),
        experience_years=applicant.experience_years,
        skills=applicant.skills_list,
        notice_period_days=applicant.notice_period_days,
        work_authorized=applicant.work_authorized,
        age=applicant.age,
        location=applicant.location,
        prefers_remote=applicant.prefers_remote,
    )


@transaction.atomic
def create_job_opening(**fields) -> JobOpening:
    """Create a job opening, normalizing skill/location CSV fields."""
    if "required_skills" in fields and not isinstance(fields["required_skills"], str):
        fields["required_skills"] = ", ".join(skills_from_csv(fields["required_skills"]))
    if "allowed_locations" in fields and not isinstance(fields["allowed_locations"], str):
        fields["allowed_locations"] = ", ".join(skills_from_csv(fields["allowed_locations"]))
    return JobOpening.objects.create(**fields)


@transaction.atomic
def update_job_opening(job: JobOpening, **fields) -> JobOpening:
    if "required_skills" in fields and not isinstance(fields["required_skills"], str):
        fields["required_skills"] = ", ".join(skills_from_csv(fields["required_skills"]))
    if "allowed_locations" in fields and not isinstance(fields["allowed_locations"], str):
        fields["allowed_locations"] = ", ".join(skills_from_csv(fields["allowed_locations"]))
    for key, value in fields.items():
        setattr(job, key, value)
    job.save()
    return job


@transaction.atomic
def register_applicant(**fields) -> Applicant:
    if "skills" in fields and not isinstance(fields["skills"], str):
        fields["skills"] = ", ".join(skills_from_csv(fields["skills"]))
    email = fields["email"].strip().lower()
    fields["email"] = email
    existing = Applicant.objects.filter(email=email).first()
    if existing:
        for key, value in fields.items():
            setattr(existing, key, value)
        existing.save()
        return existing
    return Applicant.objects.create(**fields)


@transaction.atomic
def apply_to_job(
    *,
    job: JobOpening,
    applicant: Applicant,
    cover_letter: str = "",
) -> Application:
    if job.status != JobOpening.Status.OPEN:
        raise PipelineError("Applications are only accepted for open jobs")
    application, created = Application.objects.get_or_create(
        job=job,
        applicant=applicant,
        defaults={"cover_letter": cover_letter, "status": Application.Status.APPLIED},
    )
    if not created:
        raise PipelineError("Applicant has already applied to this job")
    return application


@transaction.atomic
def screen_application(application: Application) -> ScreeningResult:
    """Evaluate eligibility and update application status."""
    if application.status not in {
        Application.Status.APPLIED,
        Application.Status.SCREENING,
        Application.Status.FAILED,
        Application.Status.PASSED,
    }:
        raise PipelineError(
            f"Cannot screen application in status {application.status}"
        )

    application.status = Application.Status.SCREENING
    application.save(update_fields=["status", "updated_at"])

    result = evaluate_eligibility(
        criteria_from_job(application.job),
        profile_from_applicant(application.applicant),
    )
    application.screened_at = timezone.now()
    application.screening_reasons = "\n".join(result.reasons)
    application.status = (
        Application.Status.PASSED if result.passed else Application.Status.FAILED
    )
    application.save(
        update_fields=["status", "screening_reasons", "screened_at", "updated_at"]
    )
    return result


@transaction.atomic
def schedule_interview(
    *,
    application: Application,
    scheduled_at,
    interviewer_name: str,
    duration_minutes: int = 60,
    location_or_link: str = "",
    notes: str = "",
) -> Interview:
    if application.status != Application.Status.PASSED:
        raise PipelineError("Only candidates who passed screening can be scheduled")
    if Interview.objects.filter(application=application).exists():
        raise PipelineError("Interview already scheduled for this application")

    interview = Interview.objects.create(
        application=application,
        scheduled_at=scheduled_at,
        interviewer_name=interviewer_name,
        duration_minutes=duration_minutes,
        location_or_link=location_or_link,
        notes=notes,
        status=Interview.Status.SCHEDULED,
    )
    application.status = Application.Status.INTERVIEW_SCHEDULED
    application.save(update_fields=["status", "updated_at"])
    return interview
