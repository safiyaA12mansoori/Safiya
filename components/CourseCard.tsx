import Link from "next/link";
import { PurchaseLink } from "@/components/PurchaseLink";
import { formatInr, type Course } from "@/lib/courses";

type CourseCardProps = {
  course: Course;
  headingLevel?: "h2" | "h3";
};

export function CourseCard({ course, headingLevel = "h2" }: CourseCardProps) {
  const Heading = headingLevel;
  const href = `/courses/${course.slug}`;

  return (
    <article className="card">
      <p className="card-category">{course.category}</p>
      <Heading className="card-title">
        <Link href={href}>{course.title}</Link>
      </Heading>
      <p className="card-summary">{course.summary}</p>
      <p className="card-meta">
        <span>{course.duration}</span>
        <span aria-hidden="true">·</span>
        <span>{course.level}</span>
      </p>
      <p className="card-price">
        <span className="sr-only">Fee </span>
        {formatInr(course.price)}
      </p>
      <div className="card-actions">
        <PurchaseLink title={course.title} />
        <Link className="btn btn-ghost" href={href}>
          View course
        </Link>
      </div>
    </article>
  );
}
