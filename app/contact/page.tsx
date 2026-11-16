import type { Metadata } from "next";
import { ContactSection } from "@/components/ContactSection";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contact Lerniqo with your name, email, phone, and message. Submit opens WhatsApp to +91 76200 68321.",
};

export default function ContactPage() {
  return <ContactSection />;
}
