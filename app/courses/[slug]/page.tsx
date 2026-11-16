import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PurchaseLink } from "@/components/PurchaseLink";
import { courses, formatInr, getCourse } from "@/lib/courses";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return courses.map((course) => ({ slug: course.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const course = getCourse(slug);
  if (!course) return { title: "Course" };
  return {
    title: course.title,
    description: course.summary,
  };
}

export default async function CoursePage({ params }: PageProps) {
  const { slug } = await params;
  const course = getCourse(slug);
  if (!course) notFound();

  return (
    <article className="section course-page">
      <div className="wrap">
        <nav className="crumbs" aria-label="Breadcrumb">
          <ol>
            <li>
              <Link href="/">Home</Link>
            </li>
            <li>
              <Link href="/courses">Courses</Link>
            </li>
            <li aria-current="page">{course.title}</li>
          </ol>
        </nav>

        <div className="detail-hero">
          <img className="poster detail-poster" src={course.image} alt="" />
          <aside className="sheet enrol" aria-label="Purchase this course">
            <p className="sheet-kicker">{course.category}</p>
            <h1>{course.title}</h1>
            <p className="lede">{course.summary}</p>
            <p className="enrol-price">
              <span className="sr-only">Fee </span>
              {formatInr(course.price)}
            </p>
            <dl className="spotlight-meta">
              <div>
                <dt>Duration</dt>
                <dd>{course.duration}</dd>
              </div>
              <div>
                <dt>Level</dt>
                <dd>{course.level}</dd>
              </div>
              <div>
                <dt>Subject</dt>
                <dd>{course.category}</dd>
              </div>
            </dl>
            <PurchaseLink title={course.title} className="btn btn-purchase btn-block" />
            <p className="fine">
              Opens WhatsApp to +91 76200 68321 with a message that names {course.title}. We do not
              collect card details on this site.
            </p>
          </aside>
        </div>

        <section className="enroll-panel enroll-repeat" aria-label="Enrol in this course">
          <div>
            <p className="eyebrow">Enrol</p>
            <h2>Start {course.title}</h2>
            <p className="lede">{course.audience}</p>
          </div>
          <div className="enroll-repeat-action">
            <p className="enrol-price">
              <span className="sr-only">Fee </span>
              {formatInr(course.price)}
            </p>
            <PurchaseLink title={course.title} className="btn btn-purchase btn-block" />
            <Link className="text-link" href="/courses">
              Back to all courses
            </Link>
          </div>
        </section>
      </div>
    </article>
  );
}
