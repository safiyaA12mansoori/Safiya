import Link from "next/link";
import { CourseCard } from "@/components/CourseCard";
import { Logo } from "@/components/Logo";
import { PurchaseLink } from "@/components/PurchaseLink";
import { Swoosh } from "@/components/Swoosh";
import { courses, formatInr, getFeaturedCourses } from "@/lib/courses";

const steps = [
  {
    title: "Choose a course",
    body: "Pick accounts, Office, computers, design, programming, marketing, analytics, or skills. The fee is listed in rupees before you write to us.",
  },
  {
    title: "Purchase on WhatsApp",
    body: "Tap Purchase. WhatsApp opens with a message that already names the course, addressed to +91 76200 68321.",
  },
  {
    title: "Start when we confirm",
    body: "We reply, confirm the fee, and share how to begin. You study at your own pace. There is no account on this website.",
  },
];

export default function HomePage() {
  const featured = getFeaturedCourses();

  return (
    <>
      <section className="hero">
        <div className="wrap hero-statement">
          <Logo className="hero-logo" alt="" />
          <h1>Learn More. Grow More.</h1>
          <Swoosh />
          <p className="lede">
            Practical courses in accounts, Office, computers, design, programming, marketing,
            analytics, and workplace skills. See the fee, then enrol on WhatsApp.
          </p>
          <div className="hero-actions">
            <Link className="btn btn-primary" href="#courses">
              Browse courses
            </Link>
            <a className="btn btn-ghost" href="#enrol">
              Enrol on WhatsApp
            </a>
          </div>
        </div>
      </section>

      <section className="section section-tight" id="courses">
        <div className="wrap">
          <div className="section-head">
            <p className="eyebrow">Courses</p>
            <h2>Choose a course and start</h2>
          </div>
          <div className="course-grid">
            {featured.map((course) => (
              <CourseCard key={course.slug} course={course} headingLevel="h3" />
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="how-it-works">
        <div className="wrap">
          <div className="section-head">
            <p className="eyebrow">How it works</p>
            <h2>Three steps, then you begin</h2>
            <Swoosh />
          </div>
          <ol className="steps">
            {steps.map((step, index) => (
              <li key={step.title}>
                <span className="step-num" aria-hidden="true">
                  {index + 1}
                </span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section section-tight" id="enrol">
        <div className="wrap enroll-panel">
          <div>
            <p className="eyebrow">Enrol</p>
            <h2>Purchase opens WhatsApp</h2>
            <p className="lede">
              Each button messages +91 76200 68321 with the course already named. Lerniqo does not
              collect card details on this site.
            </p>
          </div>
          <ul className="enroll-list">
            {courses.map((course) => (
              <li key={course.slug}>
                <div>
                  <strong>{course.title}</strong>
                  <span>{formatInr(course.price)}</span>
                </div>
                <PurchaseLink title={course.title} />
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
