import Link from "next/link";
import { CourseCard } from "@/components/CourseCard";
import { Logo } from "@/components/Logo";
import { PurchaseLink } from "@/components/PurchaseLink";
import { Swoosh } from "@/components/Swoosh";
import {
  categories,
  formatInr,
  getCourse,
  getFeaturedCourses,
  startingFee,
  courses,
} from "@/lib/courses";

const steps = [
  {
    title: "Choose a course",
    body: "Read the duration, the level, and the fee in rupees. Open the course page if you want the lesson list before you decide.",
  },
  {
    title: "Purchase on WhatsApp",
    body: "Tap Purchase. WhatsApp opens with a message that already names the course, addressed to +91 76200 68321.",
  },
  {
    title: "Start when we confirm",
    body: "We reply, confirm the fee, and share how to begin. You study at your own pace. There is no account to create on this website.",
  },
];

const reasons = [
  {
    title: "Fees you can see",
    body: "Every course lists its fee in rupees before you write to us. There is no cart and no card form on this site.",
  },
  {
    title: "Built for people with a job",
    body: "Lessons fit into evenings. You finish with something you can show: a script, a screen, a campaign, a query, or a clearer answer in a meeting.",
  },
  {
    title: "A person replies",
    body: "Purchase opens WhatsApp to the Lerniqo number. You message us about the course you chose, and we confirm your seat.",
  },
  {
    title: "A small catalog on purpose",
    body: "Ten courses and five subjects. We would rather teach a few things carefully than list a hundred we cannot stand behind.",
  },
];

export default function HomePage() {
  const spotlight = getCourse("javascript-foundations");
  const featured = getFeaturedCourses();
  if (!spotlight) return null;

  return (
    <>
      <section className="hero">
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <Logo className="hero-logo" alt="" />
            <h1>Learn More. Grow More.</h1>
            <Swoosh />
            <p className="lede">
              Lerniqo is a small studio of practical courses for people who want a skill they can
              use at work. Study at your own pace, see the fee in rupees before you start, and
              message us on WhatsApp when you are ready to join.
            </p>
            <div className="hero-actions">
              <Link className="btn btn-primary" href="/courses">
                Browse courses
              </Link>
              <a className="btn btn-ghost" href="#how-it-works">
                How learning works
              </a>
            </div>
          </div>
          <aside className="sheet spotlight" aria-label="Suggested course">
            <p className="sheet-kicker">A good first course</p>
            <h2>
              <Link href={`/courses/${spotlight.slug}`}>{spotlight.title}</Link>
            </h2>
            <p>{spotlight.summary}</p>
            <dl className="spotlight-meta">
              <div>
                <dt>Duration</dt>
                <dd>{spotlight.duration}</dd>
              </div>
              <div>
                <dt>Level</dt>
                <dd>{spotlight.level}</dd>
              </div>
              <div>
                <dt>Fee</dt>
                <dd>{formatInr(spotlight.price)}</dd>
              </div>
            </dl>
            <PurchaseLink title={spotlight.title} />
            <Link className="text-link" href={`/courses/${spotlight.slug}`}>
              View the full course
            </Link>
          </aside>
        </div>
      </section>

      <section className="band" aria-label="At a glance">
        <div className="wrap stats">
          <p>
            <strong>{courses.length}</strong> courses
          </p>
          <p>
            <strong>{categories.length}</strong> subjects
          </p>
          <p>
            <strong>{formatInr(startingFee())}</strong> starting fee
          </p>
          <p>
            <strong>WhatsApp</strong> enrolment
          </p>
        </div>
      </section>

      <section className="section">
        <div className="wrap">
          <div className="section-head">
            <p className="eyebrow">Subjects</p>
            <h2>Start with the skill you need</h2>
          </div>
          <ul className="subject-list">
            {categories.map((category) => (
              <li key={category}>
                <Link href={`/courses?category=${encodeURIComponent(category)}`}>{category}</Link>
              </li>
            ))}
          </ul>
          <div className="section-head featured-head">
            <p className="eyebrow">Featured</p>
            <h2>Courses people ask about first</h2>
          </div>
          <div className="course-grid">
            {featured.map((course) => (
              <CourseCard key={course.slug} course={course} headingLevel="h3" />
            ))}
          </div>
        </div>
      </section>

      <section className="section section-paper" id="how-it-works">
        <div className="wrap">
          <div className="section-head">
            <p className="eyebrow">How learning works</p>
            <h2>Three steps, and then you begin</h2>
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

      <section className="section" id="why-lerniqo">
        <div className="wrap">
          <div className="section-head">
            <p className="eyebrow">Why Lerniqo</p>
            <h2>A quieter way to pick a course</h2>
          </div>
          <div className="reasons">
            {reasons.map((reason) => (
              <article key={reason.title} className="reason">
                <h3>{reason.title}</h3>
                <p>{reason.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="closing">
        <div className="wrap closing-inner">
          <div>
            <h2>Ready when you are</h2>
            <Swoosh className="swoosh swoosh-light" />
            <p>
              Browse the catalog and message us about the course you want. We read every note, and
              we never ask for a card on this page.
            </p>
          </div>
          <Link className="btn btn-gold" href="/courses">
            Browse the catalog
          </Link>
        </div>
      </section>
    </>
  );
}
