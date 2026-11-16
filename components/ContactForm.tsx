"use client";

import { FormEvent } from "react";
import { contactFormHref } from "@/lib/courses";

export function ContactForm() {
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const phone = String(data.get("phone") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();
    if (!name || !email || !phone || !message) return;
    window.location.assign(contactFormHref({ name, email, phone, message }));
  }

  return (
    <form className="contact-form" onSubmit={onSubmit}>
      <label>
        Name
        <input type="text" name="name" autoComplete="name" required maxLength={80} />
      </label>
      <label>
        Email id
        <input type="email" name="email" autoComplete="email" required maxLength={120} />
      </label>
      <label>
        Phone no
        <input type="tel" name="phone" autoComplete="tel" inputMode="tel" required maxLength={20} />
      </label>
      <label>
        Message
        <textarea name="message" rows={5} required maxLength={800} />
      </label>
      <button className="btn btn-primary" type="submit">
        Submit
      </button>
      <p className="fine">Submit opens WhatsApp to +91 76200 68321 with your details. We do not store this form on the website.</p>
    </form>
  );
}
