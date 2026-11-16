"use client";

import { useEffect, useMemo, useState } from "react";
import { CourseCard } from "@/components/CourseCard";
import { categories, type Category, type Course } from "@/lib/courses";

type CourseCatalogProps = {
  courses: Course[];
};

export function CourseCatalog({ courses }: CourseCatalogProps) {
  const [category, setCategory] = useState<"All" | Category>("All");

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("category");
    if (value && categories.includes(value as Category)) {
      setCategory(value as Category);
    }
  }, []);

  const visible = useMemo(
    () => (category === "All" ? courses : courses.filter((course) => course.category === category)),
    [category, courses],
  );

  const countLabel = `${visible.length} ${visible.length === 1 ? "course" : "courses"}`;

  return (
    <div>
      <div className="catalog-bar">
        <h1>Courses</h1>
        <p className="lede">
          Courses across accounts, Office, computers, design, programming, marketing, and analytics.
          Every fee is in rupees. Purchase opens WhatsApp with the course already named. This site
          does not take card details.
        </p>
        <div className="filters" role="toolbar" aria-label="Filter by subject">
          <FilterButton
            label="All"
            pressed={category === "All"}
            onClick={() => setCategory("All")}
          />
          {categories.map((item) => (
            <FilterButton
              key={item}
              label={item}
              pressed={category === item}
              onClick={() => setCategory(item)}
            />
          ))}
        </div>
        <p className="result-count" aria-live="polite">
          {category === "All" ? `Showing ${countLabel}` : `Showing ${countLabel} in ${category}`}
        </p>
      </div>
      {visible.length === 0 ? (
        <p className="empty">Nothing in this subject yet.</p>
      ) : (
        <div className="course-grid">
          {visible.map((course) => (
            <CourseCard key={course.slug} course={course} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterButton({
  label,
  pressed,
  onClick,
}: {
  label: string;
  pressed: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" className="filter" aria-pressed={pressed} onClick={onClick}>
      {label}
    </button>
  );
}
