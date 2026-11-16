import { ContactForm } from "@/components/ContactForm";

export function ContactSection() {
  return (
    <section className="section section-cream" id="contact">
      <div className="wrap contact-wrap">
        <div className="section-head">
          <p className="eyebrow">Contact</p>
          <h2>Write to us</h2>
          <p className="lede">
            Share your name, email id, phone no, and message. Submit opens WhatsApp to +91 76200
            68321.
          </p>
        </div>
        <ContactForm />
      </div>
    </section>
  );
}
