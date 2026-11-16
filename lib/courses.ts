export const WHATSAPP_NUMBER = "917620068321";

export const categories = ["Accounting", "Office", "Computers"] as const;

export type Category = (typeof categories)[number];
export type Level = "Beginner" | "Intermediate";

export type Course = {
  slug: string;
  title: string;
  category: Category;
  level: Level;
  duration: string;
  price: number;
  image: string;
  featured?: boolean;
  summary: string;
  description: string;
  outcomes: string[];
  lessons: string[];
  audience: string;
};

export function purchaseMessage(title: string): string {
  return `Hi, I want to purchase the ${title} course on Lerniqo.`;
}

export function purchaseHref(title: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(purchaseMessage(title))}`;
}

export const contactHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
  "Hi, I have a question about Lerniqo courses.",
)}`;

export function formatInr(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export const courses: Course[] = [
  {
    slug: "tally-prime-with-gst",
    title: "Tally Prime with GST",
    category: "Accounting",
    level: "Beginner",
    duration: "Self-paced",
    price: 2499,
    image: "/courses/tally-prime-with-gst.png",
    featured: true,
    summary: "Complete Accounting, Billing & GST Management",
    description:
      "Learn Tally Prime for day-to-day accounts: set up a company, record cash, bank, sales, and purchase entries, keep stock, and handle GST from invoicing through returns. You finish able to read the reports and close the books.",
    outcomes: [
      "Install and configure Tally Prime for a working company",
      "Record cash, bank, sales, and purchase entries",
      "Manage inventory and stock alongside the accounts",
      "Raise GST invoices and prepare returns",
      "Use reports, the balance sheet, and finalization",
    ],
    lessons: [
      "Tally Prime Setup & Configuration",
      "Company Creation & Management",
      "Accounting Entries (Cash, Bank, Sales, Purchase)",
      "Inventory & Stock Management",
      "GST (Registration, Invoicing, Returns)",
      "Reports, Balance Sheet & Finalization",
    ],
    audience:
      "Shop owners, account staff, and students who need billing, stock, and GST in one place.",
  },
  {
    slug: "ms-office",
    title: "MS Office",
    category: "Office",
    level: "Beginner",
    duration: "Self-paced",
    price: 1999,
    image: "/courses/ms-office.png",
    featured: true,
    summary: "Master the most widely used Office tools for Study, Work and Business",
    description:
      "A practical course in Word, Excel, and PowerPoint. You write and format documents, organise data with formulas, and build a presentation you could give at college or at work. The examples are everyday tasks, not a tour of every menu.",
    outcomes: [
      "Create, format, and finish a document or report in Word",
      "Sort, calculate, and review data in Excel",
      "Build a clear PowerPoint presentation",
      "Apply the same tools to a study, work, or business task",
    ],
    lessons: [
      "MS Word – Documents, Formatting & Reports",
      "MS Excel – Data Management, Formulas & Analysis",
      "MS PowerPoint – Professional Presentations",
      "Practical Projects & Real-life Examples",
    ],
    audience:
      "Students and working people who use Word, Excel, and PowerPoint and want to be quicker and clearer with them.",
  },
  {
    slug: "basic-computer-course",
    title: "Basic Computer Course",
    category: "Computers",
    level: "Beginner",
    duration: "Self-paced",
    price: 1499,
    image: "/courses/basic-computer-course.png",
    featured: true,
    summary: "Learn Computer from Scratch",
    description:
      "Start from the beginning: what a computer is, how files are stored, and how to use Word, Excel, and PowerPoint for simple work. You also practise the internet, email, and the everyday tools people use to get something done online.",
    outcomes: [
      "Use a computer with confidence, from switching it on to saving your work",
      "Write, calculate, and present with Word, Excel, and PowerPoint",
      "Browse the internet and send email",
      "Organise files so you can find them again",
      "Use common online and productivity tools",
    ],
    lessons: [
      "Computer Fundamentals",
      "MS Office (Word, Excel, PowerPoint)",
      "Internet & Email Usage",
      "File & Data Management",
      "Online & Productivity Tools",
    ],
    audience:
      "Anyone starting from scratch, including students and first-time computer users.",
  },
];

export function getCourse(slug: string): Course | undefined {
  return courses.find((course) => course.slug === slug);
}

export function getFeaturedCourses(): Course[] {
  return courses.filter((course) => course.featured);
}

export function startingFee(): number {
  return Math.min(...courses.map((course) => course.price));
}
