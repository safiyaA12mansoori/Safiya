import Link from "next/link";

export default function NotFound() {
  return (
    <section className="section">
      <div className="wrap narrow">
        <p className="eyebrow">Missing page</p>
        <h1>That page is not on Lerniqo</h1>
        <p className="lede">The catalog is a better place to look.</p>
        <Link className="btn btn-primary" href="/courses">
          Browse courses
        </Link>
      </div>
    </section>
  );
}
