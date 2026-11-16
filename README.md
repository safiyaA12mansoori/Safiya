# Lerniqo

Marketing site for **Lerniqo** — Learn More. Grow More.

The site lists practical courses in accounts, Office, computers, design, programming, and marketing. Each course has a duration, a level, a poster, and a fee in INR. Every **Purchase** link is a normal anchor that opens WhatsApp at `https://wa.me/917620068321` with a message that names the course. There is no account, cart, or card checkout.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Pages

- `/` — home, with the logo, tagline, featured courses, how learning works, and why Lerniqo
- `/courses` — course catalog
- `/courses/[slug]` — course detail
