"""
Equivalence class partitioning tests for eligibility inputs.

For each input factor we define:
  - Valid classes that should satisfy the related criterion
  - Invalid classes that should violate it
  - Boundary values where applicable (on/just-inside/just-outside)

Other factors are held in a known-good baseline so failures are attributable.
"""

from __future__ import annotations

import pytest

from recruitment.eligibility import (
    ApplicantProfile,
    EducationLevel,
    EligibilityCriteria,
    evaluate_eligibility,
    skills_from_csv,
)


CRITERIA = EligibilityCriteria(
    min_education=EducationLevel.MASTER,
    min_experience_years=5.0,
    required_skills=("java", "spring"),
    max_notice_period_days=45,
    require_work_authorization=True,
    min_age=22,
    max_age=50,
    remote_ok=False,
    allowed_locations=("bangalore",),
)


def baseline(**overrides) -> ApplicantProfile:
    data = dict(
        education=EducationLevel.MASTER,
        experience_years=5.0,
        skills=("java", "spring", "sql"),
        notice_period_days=30,
        work_authorized=True,
        age=30,
        location="bangalore",
        prefers_remote=False,
    )
    data.update(overrides)
    return ApplicantProfile(**data)


# --- Education equivalence classes ---
# Valid: MASTER, PHD ( >= min MASTER )
# Invalid: HIGH_SCHOOL, BACHELOR ( < min MASTER )

@pytest.mark.parametrize(
    "education, expect_pass",
    [
        (EducationLevel.HIGH_SCHOOL, False),  # invalid EC
        (EducationLevel.BACHELOR, False),  # invalid EC / just below
        (EducationLevel.MASTER, True),  # valid EC / boundary equal
        (EducationLevel.PHD, True),  # valid EC / above
    ],
)
def test_education_equivalence_classes(education, expect_pass):
    result = evaluate_eligibility(CRITERIA, baseline(education=education))
    assert result.passed is expect_pass


@pytest.mark.parametrize(
    "raw, expected",
    [
        ("master", EducationLevel.MASTER),
        ("Masters", EducationLevel.MASTER),
        ("pg", EducationLevel.MASTER),
        ("bachelor", EducationLevel.BACHELOR),
        ("PhD", EducationLevel.PHD),
        ("high-school", EducationLevel.HIGH_SCHOOL),
    ],
)
def test_education_alias_parsing(raw, expected):
    assert EducationLevel.parse(raw) is expected


def test_education_unknown_rejected():
    with pytest.raises(ValueError):
        EducationLevel.parse("associates")


# --- Experience equivalence classes ---
# Invalid: < 5.0
# Valid: >= 5.0
# Boundaries: 4.99 (invalid), 5.0 (valid), 5.01 (valid)

@pytest.mark.parametrize(
    "years, expect_pass",
    [
        (0.0, False),
        (4.99, False),
        (5.0, True),
        (5.01, True),
        (20.0, True),
    ],
)
def test_experience_equivalence_and_boundaries(years, expect_pass):
    result = evaluate_eligibility(CRITERIA, baseline(experience_years=years))
    assert result.passed is expect_pass


# --- Skills equivalence classes ---
# Valid: superset or exact required set
# Invalid: missing any required skill, empty, unrelated skills

@pytest.mark.parametrize(
    "skills, expect_pass",
    [
        (("java", "spring"), True),
        (("java", "spring", "kafka"), True),
        (("JAVA", "Spring"), True),  # normalization
        (("java",), False),
        (("spring",), False),
        (("python", "django"), False),
        ((), False),
    ],
)
def test_skills_equivalence_classes(skills, expect_pass):
    # ApplicantProfile normalizes case; pass mixed case through constructor for one row
    if skills == ("JAVA", "Spring"):
        profile = baseline(skills=("JAVA", "Spring"))
    else:
        profile = baseline(skills=skills)
    result = evaluate_eligibility(CRITERIA, profile)
    assert result.passed is expect_pass


def test_skills_from_csv_partitions():
    assert skills_from_csv("Java, Spring; Kafka") == ("java", "spring", "kafka")
    assert skills_from_csv("") == ()
    assert skills_from_csv(None) == ()
    assert skills_from_csv([" SQL ", "Python"]) == ("sql", "python")


# --- Notice period equivalence classes ---
# Valid: 0 .. max inclusive
# Invalid: > max

@pytest.mark.parametrize(
    "days, expect_pass",
    [
        (0, True),
        (45, True),
        (46, False),
        (120, False),
    ],
)
def test_notice_period_equivalence_classes(days, expect_pass):
    result = evaluate_eligibility(CRITERIA, baseline(notice_period_days=days))
    assert result.passed is expect_pass


# --- Work authorization ---
# When required: True valid, False invalid
# When not required: both valid

@pytest.mark.parametrize("authorized, expect_pass", [(True, True), (False, False)])
def test_work_authorization_required(authorized, expect_pass):
    result = evaluate_eligibility(CRITERIA, baseline(work_authorized=authorized))
    assert result.passed is expect_pass


def test_work_authorization_not_required_both_valid():
    criteria = EligibilityCriteria(
        min_education=EducationLevel.MASTER,
        min_experience_years=5.0,
        required_skills=("java", "spring"),
        max_notice_period_days=45,
        require_work_authorization=False,
        min_age=22,
        max_age=50,
        remote_ok=False,
        allowed_locations=("bangalore",),
    )
    assert evaluate_eligibility(criteria, baseline(work_authorized=True)).passed
    assert evaluate_eligibility(criteria, baseline(work_authorized=False)).passed


# --- Age equivalence classes ---
# Invalid: < min, > max
# Valid: [min, max]
# Boundaries: min-1, min, max, max+1

@pytest.mark.parametrize(
    "age, expect_pass",
    [
        (21, False),
        (22, True),
        (35, True),
        (50, True),
        (51, False),
    ],
)
def test_age_equivalence_and_boundaries(age, expect_pass):
    result = evaluate_eligibility(CRITERIA, baseline(age=age))
    assert result.passed is expect_pass


# --- Location / remote policy ---
# With remote_ok=False and allowed_locations set:
#   Valid: location in allowed set
#   Invalid: other locations, blank, remote preference alone (remote not OK)

@pytest.mark.parametrize(
    "location, prefers_remote, expect_pass",
    [
        ("bangalore", False, True),
        ("Bangalore", False, True),
        ("pune", False, False),
        ("", False, False),
        ("pune", True, False),  # remote not accepted
    ],
)
def test_location_equivalence_on_site_only(location, prefers_remote, expect_pass):
    result = evaluate_eligibility(
        CRITERIA, baseline(location=location, prefers_remote=prefers_remote)
    )
    assert result.passed is expect_pass


def test_location_remote_ok_allows_offsite_with_preference():
    criteria = EligibilityCriteria(
        min_education=EducationLevel.MASTER,
        min_experience_years=5.0,
        required_skills=("java", "spring"),
        max_notice_period_days=45,
        require_work_authorization=True,
        min_age=22,
        max_age=50,
        remote_ok=True,
        allowed_locations=("bangalore",),
    )
    assert evaluate_eligibility(
        criteria, baseline(location="delhi", prefers_remote=True)
    ).passed
    assert not evaluate_eligibility(
        criteria, baseline(location="delhi", prefers_remote=False)
    ).passed


# --- Criteria construction invalid classes ---

@pytest.mark.parametrize(
    "kwargs",
    [
        {"min_experience_years": -1},
        {"max_notice_period_days": -5},
        {"min_age": 40, "max_age": 30},
    ],
)
def test_invalid_criteria_rejected(kwargs):
    base = dict(
        min_education=EducationLevel.BACHELOR,
        min_experience_years=0,
        required_skills=(),
        max_notice_period_days=30,
        require_work_authorization=True,
        min_age=18,
        max_age=65,
        remote_ok=True,
        allowed_locations=(),
    )
    base.update(kwargs)
    with pytest.raises(ValueError):
        EligibilityCriteria(**base)
