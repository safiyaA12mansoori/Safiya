"""
Eligibility screening engine for job openings.

Rules are evaluated as a conjunctive decision table: an applicant PASSes
only when every enabled criterion is satisfied. Failures collect reasons
so recruiters can see which rule(s) rejected the candidate.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import IntEnum
from typing import Iterable, Sequence


class EducationLevel(IntEnum):
    HIGH_SCHOOL = 1
    BACHELOR = 2
    MASTER = 3
    PHD = 4

    @classmethod
    def parse(cls, value: str | int | "EducationLevel") -> "EducationLevel":
        if isinstance(value, EducationLevel):
            return value
        if isinstance(value, int):
            return cls(value)
        normalized = str(value).strip().lower().replace(" ", "_").replace("-", "_")
        aliases = {
            "high_school": cls.HIGH_SCHOOL,
            "highschool": cls.HIGH_SCHOOL,
            "hs": cls.HIGH_SCHOOL,
            "bachelor": cls.BACHELOR,
            "bachelors": cls.BACHELOR,
            "undergraduate": cls.BACHELOR,
            "ug": cls.BACHELOR,
            "master": cls.MASTER,
            "masters": cls.MASTER,
            "postgraduate": cls.MASTER,
            "pg": cls.MASTER,
            "phd": cls.PHD,
            "doctorate": cls.PHD,
        }
        if normalized not in aliases:
            raise ValueError(f"Unknown education level: {value!r}")
        return aliases[normalized]


@dataclass(frozen=True)
class EligibilityCriteria:
    """Job-level eligibility criteria used by the screening decision table."""

    min_education: EducationLevel = EducationLevel.BACHELOR
    min_experience_years: float = 0.0
    required_skills: tuple[str, ...] = ()
    max_notice_period_days: int = 90
    require_work_authorization: bool = True
    min_age: int = 18
    max_age: int = 65
    remote_ok: bool = True
    allowed_locations: tuple[str, ...] = ()

    def __post_init__(self) -> None:
        if self.min_experience_years < 0:
            raise ValueError("min_experience_years must be >= 0")
        if self.max_notice_period_days < 0:
            raise ValueError("max_notice_period_days must be >= 0")
        if self.min_age < 0 or self.max_age < self.min_age:
            raise ValueError("age bounds are invalid")
        object.__setattr__(
            self,
            "required_skills",
            tuple(_normalize_skill(s) for s in self.required_skills if str(s).strip()),
        )
        object.__setattr__(
            self,
            "allowed_locations",
            tuple(_normalize_location(s) for s in self.allowed_locations if str(s).strip()),
        )


@dataclass(frozen=True)
class ApplicantProfile:
    """Applicant attributes evaluated against eligibility criteria."""

    education: EducationLevel
    experience_years: float
    skills: tuple[str, ...] = ()
    notice_period_days: int = 0
    work_authorized: bool = True
    age: int = 25
    location: str = ""
    prefers_remote: bool = False

    def __post_init__(self) -> None:
        object.__setattr__(
            self,
            "education",
            EducationLevel.parse(self.education),
        )
        object.__setattr__(
            self,
            "skills",
            tuple(_normalize_skill(s) for s in self.skills if str(s).strip()),
        )
        object.__setattr__(self, "location", _normalize_location(self.location))


@dataclass(frozen=True)
class ScreeningResult:
    passed: bool
    reasons: tuple[str, ...] = ()
    checked_rules: tuple[str, ...] = field(default_factory=tuple)

    @property
    def status(self) -> str:
        return "PASSED" if self.passed else "FAILED"


def _normalize_skill(value: str) -> str:
    return " ".join(str(value).strip().lower().split())


def _normalize_location(value: str) -> str:
    return " ".join(str(value).strip().lower().split())


def evaluate_eligibility(
    criteria: EligibilityCriteria,
    applicant: ApplicantProfile,
) -> ScreeningResult:
    """
    Evaluate an applicant against job eligibility criteria.

    Decision table (conjunctive): PASS iff all of the following hold:
      C1 education >= min_education
      C2 experience_years >= min_experience_years
      C3 required_skills ⊆ applicant.skills
      C4 notice_period_days <= max_notice_period_days
      C5 work_authorized when require_work_authorization
      C6 min_age <= age <= max_age
      C7 location allowed OR (remote_ok AND prefers_remote)
    """
    reasons: list[str] = []
    checked: list[str] = []

    checked.append("C1_education")
    if applicant.education < criteria.min_education:
        reasons.append(
            f"Education {applicant.education.name} is below required "
            f"{criteria.min_education.name}"
        )

    checked.append("C2_experience")
    if applicant.experience_years < criteria.min_experience_years:
        reasons.append(
            f"Experience {applicant.experience_years}y is below required "
            f"{criteria.min_experience_years}y"
        )

    checked.append("C3_skills")
    missing = [s for s in criteria.required_skills if s not in applicant.skills]
    if missing:
        reasons.append(f"Missing required skills: {', '.join(missing)}")

    checked.append("C4_notice_period")
    if applicant.notice_period_days > criteria.max_notice_period_days:
        reasons.append(
            f"Notice period {applicant.notice_period_days}d exceeds max "
            f"{criteria.max_notice_period_days}d"
        )

    checked.append("C5_work_authorization")
    if criteria.require_work_authorization and not applicant.work_authorized:
        reasons.append("Work authorization is required")

    checked.append("C6_age")
    if applicant.age < criteria.min_age or applicant.age > criteria.max_age:
        reasons.append(
            f"Age {applicant.age} is outside allowed range "
            f"{criteria.min_age}-{criteria.max_age}"
        )

    checked.append("C7_location")
    location_ok = _location_satisfies(criteria, applicant)
    if not location_ok:
        if criteria.allowed_locations:
            allowed = ", ".join(criteria.allowed_locations)
            reasons.append(
                f"Location '{applicant.location or '(blank)'}' is not in "
                f"allowed locations [{allowed}]"
                + (" and remote work is not accepted" if not criteria.remote_ok else
                   " and applicant does not prefer remote")
            )
        else:
            reasons.append("Remote work is required but applicant does not prefer remote")

    return ScreeningResult(
        passed=not reasons,
        reasons=tuple(reasons),
        checked_rules=tuple(checked),
    )


def _location_satisfies(criteria: EligibilityCriteria, applicant: ApplicantProfile) -> bool:
    if criteria.allowed_locations:
        if applicant.location in criteria.allowed_locations:
            return True
        return bool(criteria.remote_ok and applicant.prefers_remote)
    # No on-site restriction: remote preference is optional unless remote-only policy
    if criteria.remote_ok:
        return True
    # Job is on-site only with no allowed_locations list — treat blank location as fail
    return bool(applicant.location)


def evaluate_many(
    criteria: EligibilityCriteria,
    applicants: Iterable[ApplicantProfile],
) -> list[ScreeningResult]:
    return [evaluate_eligibility(criteria, applicant) for applicant in applicants]


def skills_from_csv(raw: str | Sequence[str] | None) -> tuple[str, ...]:
    if raw is None:
        return ()
    if isinstance(raw, str):
        parts = [p.strip() for p in raw.replace(";", ",").split(",")]
        return tuple(_normalize_skill(p) for p in parts if p)
    return tuple(_normalize_skill(p) for p in raw if str(p).strip())
