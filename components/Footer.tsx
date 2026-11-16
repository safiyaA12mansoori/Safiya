import Link from "next/link";
import { Logo } from "@/components/Logo";
import { contactHref } from "@/lib/courses";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="wrap footer-inner">
        <div className="footer-brand">
          <Logo className="footer-logo" alt="Lerniqo. Learn More. Grow More." />
          <p>Practical courses. Fees in rupees. Contact on WhatsApp.</p>
        </div>
        <nav aria-label="Footer">
          <Link href="/courses">Courses</Link>
          <Link href="/contact">Contact</Link>
          <a href={contactHref}>WhatsApp +91 76200 68321</a>
        </nav>
        <p className="footer-note">
          Purchase and the contact form open a WhatsApp chat. Lerniqo does not collect card details
          on this website.
        </p>
      </div>
    </footer>
  );
}
