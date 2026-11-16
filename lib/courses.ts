export const WHATSAPP_NUMBER = "917620068321";

export const categories = ["Accounting", "Office", "Computers", "Design", "Programming"] as const;

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
  {
    slug: "adobe-photoshop",
    title: "Adobe Photoshop",
    category: "Design",
    level: "Beginner",
    duration: "Self-paced",
    price: 2499,
    image: "/courses/adobe-photoshop.png",
    featured: true,
    summary: "Master Photo Editing & Creative Design with Photoshop",
    description:
      "Learn Photoshop for photo editing and creative design: the interface and tools, retouching, layers and masks, colour, compositing, and posters for social and print. You finish with projects you can show.",
    outcomes: [
      "Use the Photoshop interface and core tools",
      "Edit and retouch photographs",
      "Work with layers, masks, and adjustments",
      "Correct colour and composite images",
      "Design posters, banners, and social or print layouts",
    ],
    lessons: [
      "Photoshop Interface & Tools",
      "Image Editing & Retouching",
      "Layers, Masks & Adjustments",
      "Color Correction & Enhancement",
      "Photo Manipulation & Compositing",
      "Creative Poster & Banner Design",
      "Social Media & Print Media Designs",
      "Real-World Projects & Design Tricks",
    ],
    audience:
      "Students and beginners who want to edit photos and make posters, banners, and social designs in Photoshop.",
  },
  {
    slug: "ui-ux-design",
    title: "UI/UX Design",
    category: "Design",
    level: "Beginner",
    duration: "Self-paced",
    price: 2499,
    image: "/courses/ui-ux-design.png",
    featured: true,
    summary: "Design User-Centric & Visually Stunning Digital Experiences",
    description:
      "Learn how to plan and design screens people can actually use: research, personas, journeys, information architecture, wireframes, visual UI, and a prototype you can test. The course ends with a case-study project for a portfolio.",
    outcomes: [
      "Define a problem and map a user journey",
      "Build low-fidelity wireframes",
      "Design a clear visual UI",
      "Prototype a flow and check it with users",
      "Present one case study for a portfolio",
    ],
    lessons: [
      "UI/UX Design Fundamentals",
      "User Research & Problem Definition",
      "User Personas & Journey Mapping",
      "Information Architecture (IA)",
      "Wireframing & Low-Fidelity Designs",
      "UI Design (Layout, Colour, Typography)",
      "Prototyping & Usability Testing",
      "Real-World Project & Portfolio (Case Study)",
    ],
    audience:
      "Students and career-changers who want to design apps and websites, not only decorate screens.",
  },
  {
    slug: "graphics-designing",
    title: "Graphics Designing",
    category: "Design",
    level: "Beginner",
    duration: "Self-paced",
    price: 2499,
    image: "/courses/graphics-designing.png",
    featured: true,
    summary: "Create Professional & Creative Visuals for Digital & Print Media",
    description:
      "A practical graphic design course covering fundamentals, colour, type, layout, logos, social posts, posters, packaging, and photo work. You leave with pieces you can put in a portfolio.",
    outcomes: [
      "Apply colour, type, and layout with intent",
      "Design a simple logo and brand set",
      "Make social posts, posters, and flyers",
      "Prepare work for digital and print",
      "Build a small portfolio of real pieces",
    ],
    lessons: [
      "Graphic Design Fundamentals",
      "Color, Typography & Layout",
      "Logo & Brand Identity Design",
      "Social Media Creative Design",
      "Posters, Flyers & Banners",
      "Product & Packaging Design",
      "Photo Editing & Manipulation",
      "Real-World Projects & Portfolio Building",
    ],
    audience:
      "Anyone who needs to make logos, social creatives, posters, and print work for study or a small business.",
  },
  {
    slug: "canva-designing",
    title: "Canva Designing",
    category: "Design",
    level: "Beginner",
    duration: "Self-paced",
    price: 1999,
    image: "/courses/canva-designing.png",
    featured: true,
    summary: "Design Like a Pro with Canva",
    description:
      "Learn Canva from the interface through social posts, posters, presentations, infographics, resumes, YouTube thumbnails, and brand templates. The work is practical: you make pieces you can use the same day.",
    outcomes: [
      "Find your way around Canva and its templates",
      "Design social posts, posters, and flyers",
      "Build presentations, infographics, and a resume",
      "Make YouTube thumbnails and brand templates",
    ],
    lessons: [
      "Canva Basics & Interface",
      "Designing Social Media Posts",
      "Posters, Banners & Flyers",
      "Presentations & Infographics",
      "Resume & Portfolio Design",
      "YouTube Thumbnails & Channel Art",
      "Branding & Content Templates",
      "Real-World Projects & Design Tips",
    ],
    audience:
      "Students, teachers, and small-business owners who want usable designs without a full design suite.",
  },
  {
    slug: "data-structures-and-algorithms",
    title: "Data Structures & Algorithms (DSA)",
    category: "Programming",
    level: "Beginner",
    duration: "Self-paced",
    price: 2499,
    image: "/courses/data-structures-and-algorithms.png",
    featured: true,
    summary: "Build Problem-Solving & Logical Thinking Skills",
    description:
      "Learn the structures and algorithms used to solve coding problems: arrays, strings, linked lists, stacks, queues, trees, graphs, sorting, searching, recursion, and dynamic programming, with examples you can code.",
    outcomes: [
      "Explain Big-O for a simple routine",
      "Use arrays, strings, lists, stacks, and queues",
      "Work with trees and graphs at a basic level",
      "Apply sorting, searching, recursion, and simple DP",
      "Solve practice problems with real code",
    ],
    lessons: [
      "DSA Fundamentals & Complexity (Big-O)",
      "Arrays, Strings & Matrices",
      "Linked List, Stack & Queue",
      "Trees (Binary Tree, BST, Heap)",
      "Graphs & Graph Algorithms",
      "Sorting & Searching Algorithms",
      "Recursion & Dynamic Programming",
      "Problem Solving with Real Coding Examples",
    ],
    audience:
      "Students preparing for coding interviews or a first data-structures course.",
  },
  {
    slug: "sql-and-database-management",
    title: "SQL & Database Management",
    category: "Programming",
    level: "Beginner",
    duration: "Self-paced",
    price: 2499,
    image: "/courses/sql-and-database-management.png",
    featured: true,
    summary: "Learn, Manage & Work with Real-World Databases",
    description:
      "Learn how databases are designed and how to query them: ER diagrams, SQL (DDL, DML, DCL, TCL), joins and grouping, constraints, normalisation, views, procedures, and triggers, then a small real-world project.",
    outcomes: [
      "Model a simple database with an ER diagram",
      "Write SELECT, JOIN, and GROUP BY queries",
      "Create tables with constraints and relationships",
      "Normalise a messy schema",
      "Use views, procedures, and triggers in a small project",
    ],
    lessons: [
      "Introduction to Databases & SQL",
      "Database Design & Data Modeling (ERD)",
      "SQL Basics (DDL, DML, DCL, TCL)",
      "Writing Queries (Select, Join, Group By, etc.)",
      "Constraints & Relationships",
      "Normalization & Optimization",
      "Views, Stored Procedures & Triggers",
      "Real-World Database Projects",
    ],
    audience:
      "Students and office staff who need to store, query, and report on data in a real database.",
  },
  {
    slug: "javascript-programming",
    title: "JavaScript Programming",
    category: "Programming",
    level: "Beginner",
    duration: "Self-paced",
    price: 2499,
    image: "/courses/javascript-programming.png",
    featured: true,
    summary: "Make Your Websites Dynamic & Interactive",
    description:
      "Learn JavaScript from syntax through the DOM and events, then ES6 features such as let/const and arrow functions. You finish with mini projects you can run in the browser.",
    outcomes: [
      "Write JavaScript with clear variables, types, and control flow",
      "Use functions and understand scope",
      "Change a page with the DOM and events",
      "Use let/const, arrow functions, and related ES6 features",
      "Build small interactive pages",
    ],
    lessons: [
      "JavaScript Basics & Syntax",
      "Variables, Data Types & Operators",
      "Control Statements & Loops",
      "Functions & Scope",
      "DOM Manipulation",
      "Events & User Interactions",
      "ES6+ Features (let/const, Arrow Functions, etc.)",
      "Mini Projects & Real-World Applications",
    ],
    audience:
      "Beginners who already know a little HTML and want pages that respond to the user.",
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
