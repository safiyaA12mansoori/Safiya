import type { Metadata } from "next";
import { CourseCatalog } from "@/components/CourseCatalog";
import { courses } from "@/lib/courses";

export const metadata: Metadata = {
  title: "Courses",
  description:
    "Browse Lerniqo courses in programming, design, business, data, and languages. Fees are listed in INR. Purchase opens WhatsApp.",
};

export default function CoursesPage() {
  return (
    <section className="section catalog-page">
      <div className="wrap">
        <CourseCatalog courses={courses} />
      </div>
    </section>
  );
}
