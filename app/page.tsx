import Link from "next/link";
import { CourseCard } from "@/components/CourseCard";
import { Logo } from "@/components/Logo";
import { Swoosh } from "@/components/Swoosh";
import { courses, getFeaturedCourses } from "@/lib/courses";

const paths = [
  {
    title: "Accounts",
    href: "/courses?category=Accounting",
    tilt: "left",
    pin: "gold",
    body: "Tally Prime with GST for billing, stock, and GST in one place.",
  },
  {
    title: "Office",
    href: "/courses?category=Office",
    tilt: "right",
    pin: "dark",
    body: "MS Office for documents, spreadsheets, and presentations.",
  },
  {
    title: "Design",
    href: "/courses?category=Design",
    tilt: "left",
    pin: "bright",
    body: "Photoshop, Illustrator, Canva, video, logos, and UI/UX.",
  },
  {
    title: "Programming",
    href: "/courses?category=Programming",
    tilt: "right",
    pin: "gold",
    body: "HTML, CSS, JavaScript, Python, Java, C, C++, SQL, and DSA.",
  },
  {
    title: "Marketing",
    href: "/courses?category=Marketing",
    tilt: "left",
    pin: "dark",
    body: "SEO, social, Google Ads, content, and affiliate work.",
  },
  {
    title: "Analytics",
    href: "/courses?category=Analytics",
    tilt: "right",
    pin: "bright",
    body: "Excel, Python, Power BI, and Tableau for tables and dashboards.",
  },
];

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
        <div className="wrap hero-stage">
          <div className="hero-orbit" aria-hidden="true">
            <span className="orbit-chip orbit-ps">Ps</span>
            <span className="orbit-chip orbit-ai">Ai</span>
            <span className="orbit-chip orbit-pr">Pr</span>
            <span className="orbit-chip orbit-py">Py</span>
            <span className="orbit-chip orbit-js">JS</span>
            <div className="orbit-card orbit-courses">
              <strong>{courses.length}</strong>
              <span>Courses</span>
            </div>
            <div className="orbit-card orbit-whatsapp">
              <strong>WA</strong>
              <span>Enrol on chat</span>
            </div>
            <div className="orbit-card orbit-fee">
              <strong>INR</strong>
              <span>Fees listed</span>
            </div>
          </div>
          <div className="hero-statement">
            <Logo className="hero-logo" alt="" />
            <h1>
              Learn More. <span className="hero-mark">Grow</span> More.
            </h1>
            <Swoosh />
            <p className="lede">
              Practical courses in accounts, Office, computers, design, programming, marketing,
              analytics, and workplace skills. See the fee, then enrol on WhatsApp.
            </p>
            <div className="hero-actions">
              <Link className="btn btn-primary" href="#courses">
                Browse courses
              </Link>
              <Link className="btn btn-ghost" href="/courses">
                Enrol on WhatsApp
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="section section-tight section-cream" id="courses">
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

      <section className="section section-gold" id="paths">
        <div className="wrap">
          <div className="section-head">
            <p className="eyebrow">Paths</p>
            <h2>Choose a path, then a course</h2>
            <p className="lede">
              Six groups from the catalog. Each card opens that subject. Fees stay in rupees.
            </p>
          </div>
          <ul className="path-board">
            {paths.map((path) => (
              <li key={path.title} className={`path-note path-${path.tilt}`}>
                <span className={`path-pin pin-${path.pin}`} aria-hidden="true" />
                <h3>
                  <Link href={path.href}>{path.title}</Link>
                </h3>
                <p>{path.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="section section-paper" id="why">
        <div className="wrap">
          <div className="section-head">
            <p className="eyebrow">Why Lerniqo</p>
            <h2>See the course, see the fee, then write to us</h2>
          </div>
          <div className="why-grid">
            <article className="why-panel">
              <p className="why-stat">
                <strong>{courses.length}</strong>
                <span>Courses on this site</span>
              </p>
              <p className="why-stat">
                <strong>INR</strong>
                <span>Every fee listed before you enrol</span>
              </p>
            </article>
            <article className="why-panel why-copy">
              <p className="eyebrow">Enrol</p>
              <h3>Purchase opens WhatsApp</h3>
              <p>
                There is no login and no card form. Tap Purchase and a chat opens to +91 76200 68321
                with the course already named.
              </p>
              <Link className="btn btn-primary" href="/courses">
                Enrol on WhatsApp
              </Link>
            </article>
          </div>
        </div>
      </section>

      <section className="section section-cream" id="how-it-works">
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

    </>
  );
}
