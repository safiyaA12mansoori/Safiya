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
      <div className="wrap detail">
        <header className="detail-intro">
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
          <p className="eyebrow">{course.category}</p>
          <h1>{course.title}</h1>
          <p className="lede">{course.description}</p>
        </header>

        <div className="detail-body">
          <section className="detail-block">
            <h2>What you will learn</h2>
            <ul className="ticks">
              {course.outcomes.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>

          <section className="detail-block">
            <h2>Lessons</h2>
            <ol className="lessons">
              {course.lessons.map((lesson) => (
                <li key={lesson}>{lesson}</li>
              ))}
            </ol>
          </section>

          <section className="detail-block">
            <h2>Who it is for</h2>
            <p>{course.audience}</p>
          </section>
        </div>

        <aside className="sheet enrol" aria-label="Purchase this course">
          <p className="sheet-kicker">{course.level}</p>
          <h2>Enrol in this course</h2>
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
          <Link className="text-link" href="/courses">
            Back to all courses
          </Link>
        </aside>
      </div>
    </article>
  );
}
