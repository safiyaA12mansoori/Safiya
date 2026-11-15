"""
Decision-table tests for eligibility screening.

Conditions (columns):
  C1 Education meets minimum
  C2 Experience meets minimum
  C3 All required skills present
  C4 Notice period within limit
  C5 Work authorization OK
  C6 Age within bounds
  C7 Location / remote policy OK

Action:
  A1 PASS / FAIL

The production rule is conjunctive (AND): any false condition ⇒ FAIL.
These cases cover representative true/false combinations, including
boundary singles and multi-rule failures.
"""

from __future__ import annotations

import pytest

from recruitment.eligibility import (
    ApplicantProfile,
    EducationLevel,
    EligibilityCriteria,
    evaluate_eligibility,
)


BASE_CRITERIA = EligibilityCriteria(
    min_education=EducationLevel.BACHELOR,
    min_experience_years=3.0,
    required_skills=("python", "sql"),
    max_notice_period_days=60,
    require_work_authorization=True,
    min_age=21,
    max_age=55,
    remote_ok=True,
    allowed_locations=("pune", "mumbai"),
)


def _applicant(**overrides) -> ApplicantProfile:
    data = dict(
        education=EducationLevel.BACHELOR,
        experience_years=3.0,
        skills=("python", "sql", "django"),
        notice_period_days=30,
        work_authorized=True,
        age=28,
        location="pune",
        prefers_remote=False,
    )
    data.update(overrides)
    return ApplicantProfile(**data)


# Decision table rows: (rule_id, condition_flags, overrides, expect_pass, expected_reason_substrings)
# Condition flags are documentation of which C* are True for the row.
DECISION_TABLE = [
    # R1 — all conditions true → PASS
    (
        "R1_all_true",
        (1, 1, 1, 1, 1, 1, 1),
        {},
        True,
        (),
    ),
    # R2 — education false only
    (
        "R2_education_fail",
        (0, 1, 1, 1, 1, 1, 1),
        {"education": EducationLevel.HIGH_SCHOOL},
        False,
        ("Education",),
    ),
    # R3 — experience false only
    (
        "R3_experience_fail",
        (1, 0, 1, 1, 1, 1, 1),
        {"experience_years": 2.9},
        False,
        ("Experience",),
    ),
    # R4 — skills false only
    (
        "R4_skills_fail",
        (1, 1, 0, 1, 1, 1, 1),
        {"skills": ("python",)},
        False,
        ("Missing required skills", "sql"),
    ),
    # R5 — notice period false only
    (
        "R5_notice_fail",
        (1, 1, 1, 0, 1, 1, 1),
        {"notice_period_days": 61},
        False,
        ("Notice period",),
    ),
    # R6 — work auth false only
    (
        "R6_auth_fail",
        (1, 1, 1, 1, 0, 1, 1),
        {"work_authorized": False},
        False,
        ("Work authorization",),
    ),
    # R7 — age false only (too young)
    (
        "R7_age_low_fail",
        (1, 1, 1, 1, 1, 0, 1),
        {"age": 20},
        False,
        ("Age",),
    ),
    # R8 — age false only (too old)
    (
        "R8_age_high_fail",
        (1, 1, 1, 1, 1, 0, 1),
        {"age": 56},
        False,
        ("Age",),
    ),
    # R9 — location false (wrong city, no remote preference)
    (
        "R9_location_fail",
        (1, 1, 1, 1, 1, 1, 0),
        {"location": "delhi", "prefers_remote": False},
        False,
        ("Location",),
    ),
    # R10 — location rescued by remote preference when remote_ok
    (
        "R10_remote_rescue",
        (1, 1, 1, 1, 1, 1, 1),
        {"location": "delhi", "prefers_remote": True},
        True,
        (),
    ),
    # R11 — multiple failures (education + experience + skills)
    (
        "R11_multi_fail",
        (0, 0, 0, 1, 1, 1, 1),
        {
            "education": EducationLevel.HIGH_SCHOOL,
            "experience_years": 0,
            "skills": ("excel",),
        },
        False,
        ("Education", "Experience", "Missing required skills"),
    ),
    # R12 — master exceeds bachelor minimum → still PASS
    (
        "R12_higher_education_pass",
        (1, 1, 1, 1, 1, 1, 1),
        {"education": EducationLevel.MASTER},
        True,
        (),
    ),
    # R13 — exact notice boundary (== max) → PASS
    (
        "R13_notice_boundary_pass",
        (1, 1, 1, 1, 1, 1, 1),
        {"notice_period_days": 60},
        True,
        (),
    ),
    # R14 — exact experience boundary (== min) → PASS
    (
        "R14_experience_boundary_pass",
        (1, 1, 1, 1, 1, 1, 1),
        {"experience_years": 3.0},
        True,
        (),
    ),
    # R15 — work auth not required → unauthorized still PASS
    (
        "R15_auth_not_required",
        (1, 1, 1, 1, 1, 1, 1),
        {"work_authorized": False},
        True,
        (),
        EligibilityCriteria(
            min_education=EducationLevel.BACHELOR,
            min_experience_years=3.0,
            required_skills=("python", "sql"),
            max_notice_period_days=60,
            require_work_authorization=False,
            min_age=21,
            max_age=55,
            remote_ok=True,
            allowed_locations=("pune", "mumbai"),
        ),
    ),
]


@pytest.mark.parametrize(
    "row",
    DECISION_TABLE,
    ids=[row[0] for row in DECISION_TABLE],
)
def test_decision_table_rows(row):
    if len(row) == 6:
        rule_id, _flags, overrides, expect_pass, reason_bits, criteria = row
    else:
        rule_id, _flags, overrides, expect_pass, reason_bits = row
        criteria = BASE_CRITERIA

    result = evaluate_eligibility(criteria, _applicant(**overrides))
    assert result.passed is expect_pass, f"{rule_id}: unexpected pass={result.passed}, reasons={result.reasons}"
    assert len(result.checked_rules) == 7
    for bit in reason_bits:
        assert any(bit in reason for reason in result.reasons), (
            f"{rule_id}: expected reason containing {bit!r}, got {result.reasons}"
        )
    if expect_pass:
        assert result.reasons == ()
        assert result.status == "PASSED"
    else:
        assert result.status == "FAILED"
        assert result.reasons


def test_decision_table_documents_all_seven_conditions():
    """Sanity: every single-condition failure row exists in the table."""
    ids = {row[0] for row in DECISION_TABLE}
    for needed in (
        "R2_education_fail",
        "R3_experience_fail",
        "R4_skills_fail",
        "R5_notice_fail",
        "R6_auth_fail",
        "R7_age_low_fail",
        "R9_location_fail",
    ):
        assert needed in ids
