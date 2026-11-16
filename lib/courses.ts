export const WHATSAPP_NUMBER = "917620068321";

export const categories = [
  "Programming",
  "Design",
  "Business",
  "Data",
  "Languages",
] as const;

export type Category = (typeof categories)[number];
export type Level = "Beginner" | "Intermediate";

export type Course = {
  slug: string;
  title: string;
  category: Category;
  level: Level;
  duration: string;
  price: number;
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
    slug: "javascript-foundations",
    title: "JavaScript Foundations",
    category: "Programming",
    level: "Beginner",
    duration: "6 weeks",
    price: 2499,
    summary:
      "Learn the JavaScript you need to make a page respond: variables, functions, the DOM, and a small project you can show.",
    description:
      "This course is for anyone who has written a little HTML and CSS and wants the page to do something. You write JavaScript in the browser, read the errors it throws, and finish with a project that filters a list and remembers a preference. There is no framework, so the language itself stays visible.",
    outcomes: [
      "Write functions that take an input and return a clear result",
      "Select elements, listen for clicks, and update the page",
      "Work with arrays and objects without getting lost in the syntax",
      "Fetch a JSON file and show what comes back",
      "Use the browser console to find and fix your own mistakes",
    ],
    lessons: [
      "Values, variables, and the question to ask before you code",
      "Functions, scope, and names a colleague can follow",
      "Arrays, objects, and the data you will actually see",
      "The DOM, events, and forms",
      "Fetch, JSON, and a loading state",
      "Build the project and explain how it works",
    ],
    audience:
      "You are comfortable editing a web page and you want JavaScript to feel ordinary. You do not need a computer science degree.",
  },
  {
    slug: "python-for-everyday-work",
    title: "Python for Everyday Work",
    category: "Programming",
    level: "Beginner",
    duration: "7 weeks",
    price: 2799,
    summary:
      "Write small Python scripts that read a spreadsheet, clean a column, and hand you back a file you can use on Monday.",
    description:
      "Most people do not need a new application. They need a script that renames files, fixes a CSV, or totals a column the same way every Friday. You install Python, run scripts from the terminal, and leave with three tools you wrote for a task of your own.",
    outcomes: [
      "Set up Python and run a script with confidence",
      "Read and write CSV files",
      "Clean text, dates, and numbers with the standard library",
      "Handle a missing file or a bad row without the script failing quietly",
      "Turn a repeated task into a command you can run again",
    ],
    lessons: [
      "Getting set up and running your first script",
      "Types, lists, and dictionaries in plain language",
      "Reading folders and files",
      "Spreadsheets and CSV, including the messy ones",
      "Functions you can reuse next week",
      "Errors, prints, and checking the output",
      "Your own automation, reviewed step by step",
    ],
    audience:
      "Analysts, coordinators, and freelancers who repeat the same tidy-up work and would rather not do it by hand.",
  },
  {
    slug: "react-interfaces",
    title: "React Interfaces",
    category: "Programming",
    level: "Intermediate",
    duration: "8 weeks",
    price: 4499,
    featured: true,
    summary:
      "Build a component-based interface with React: screens, forms, and a small dashboard you can walk through in an interview.",
    description:
      "You already know JavaScript. This course shows how a React interface is put together, why state lives where it does, and how to keep a project understandable when a second screen arrives. You build a progress dashboard with a list, a form, and empty states.",
    outcomes: [
      "Break a screen into components with honest names",
      "Keep state in the right place and pass only what a child needs",
      "Build forms that show an error next to the field",
      "Fetch data and render loading, empty, and ready states",
      "Explain your component tree without reading the file aloud",
    ],
    lessons: [
      "Components, props, and what not to abstract yet",
      "State, events, and rendering lists",
      "Forms and validation a person can understand",
      "Effects and loading data",
      "Two screens and a simple route between them",
      "Empty states, errors, and a layout that holds",
      "The dashboard project",
      "A second pass: what you would change",
    ],
    audience:
      "You can write JavaScript functions and you have used HTML. You want React as a working skill, not a tour of every API.",
  },
  {
    slug: "ui-design-in-figma",
    title: "UI Design in Figma",
    category: "Design",
    level: "Beginner",
    duration: "5 weeks",
    price: 2499,
    featured: true,
    summary:
      "Design a mobile screen and a desktop page in Figma with type, spacing, and components a developer can build from.",
    description:
      "You learn Figma by designing one product, not by collecting effects. The example is a study planner: a home screen, a task list, and a desktop week view. Each week you practice one idea — type, space, color, or components — and apply it the same day.",
    outcomes: [
      "Set type and spacing so a screen feels calm",
      "Use color with a reason, including contrast you can check",
      "Build buttons, fields, and cards as components",
      "Design a mobile screen and the desktop version of the same task",
      "Hand off a frame with notes a developer does not have to guess",
    ],
    lessons: [
      "Frames, type, and a spacing scale",
      "Color, contrast, and states",
      "Components for buttons and fields",
      "A mobile flow: home, list, and a dialog",
      "Desktop layout and a short handoff note",
    ],
    audience:
      "Career switchers, founders, and developers who want to design a screen themselves before they hire or start coding.",
  },
  {
    slug: "brand-identity-for-small-studios",
    title: "Brand Identity for Small Studios",
    category: "Design",
    level: "Intermediate",
    duration: "6 weeks",
    price: 3499,
    summary:
      "Shape a small identity: a wordmark, a palette, type, and a one-page brand sheet a client can actually use.",
    description:
      "This is not a tour of logo history. You design an identity for a neighborhood bakery, or for a real project of your own, then assemble a one-page sheet: the name, the colors, the type, and three examples of what to do and what to avoid. The test is whether someone else could apply it.",
    outcomes: [
      "Choose a direction and explain it in a few sentences",
      "Build a small palette that still has enough contrast",
      "Pair two typefaces and set a real headline and paragraph",
      "Assemble a simple wordmark and a few rules",
      "Produce a one-page brand sheet someone else can follow",
    ],
    lessons: [
      "What a small business actually needs from an identity",
      "Three directions, then one",
      "Color and type that survive a phone screen",
      "The wordmark and a short list of rules",
      "A card, a story frame, and an invoice",
      "The one-page sheet and how to present it",
    ],
    audience:
      "Designers who already use Figma and want a tighter offer than a logo on its own.",
  },
  {
    slug: "digital-marketing-essentials",
    title: "Digital Marketing Essentials",
    category: "Business",
    level: "Beginner",
    duration: "6 weeks",
    price: 2999,
    featured: true,
    summary:
      "Plan a modest campaign: one offer, one page, and a month of posts you could run without an agency.",
    description:
      "You write an offer a specific person would understand, sketch the page it lives on, and plan four weeks of proof, teaching, and invitation. The example is a local service business, and there is room to use your own. The course does not chase likes.",
    outcomes: [
      "Name the person you are talking to and the job they want done",
      "Write an offer with a price, a promise, and a boundary",
      "Outline a single page with a headline, proof, and a next step",
      "Plan a month of posts that each have a job",
      "Read a simple result: enquiries, not applause",
    ],
    lessons: [
      "The customer and the offer",
      "Headlines and proof",
      "A one-page plan",
      "Organic posts for a month",
      "A small paid test, with the budget written down first",
      "What happened, and what to repeat",
    ],
    audience:
      "Founders, freelancers, and shop owners who are already posting and still not sure what the post is for.",
  },
  {
    slug: "freelance-business-basics",
    title: "Freelance Business Basics",
    category: "Business",
    level: "Beginner",
    duration: "4 weeks",
    price: 1999,
    summary:
      "Price a project, send a proposal, and keep a simple record of what you earned and what you spent.",
    description:
      "A short course for people in India who are starting to take client work. You pick a service, set a price you can explain, write a one-page proposal, and set up a sheet for invoices and expenses. The focus is the next client, not a company you do not have yet.",
    outcomes: [
      "Describe your service in one paragraph a client can forward",
      "Price a project from the work involved",
      "Write a proposal with scope, timeline, fee, and what is not included",
      "Track invoices, receipts, and a monthly total",
      "Ask for the work in writing before you start",
    ],
    lessons: [
      "Your offer and who it is for",
      "Pricing a project in plain language",
      "The one-page proposal",
      "Money in, money out, and a Friday check",
    ],
    audience:
      "Designers, developers, tutors, and writers who are sending their first paid invoices.",
  },
  {
    slug: "sql-for-analysts",
    title: "SQL for Analysts",
    category: "Data",
    level: "Beginner",
    duration: "6 weeks",
    price: 3299,
    summary:
      "Ask useful questions of a table. Filter, join, and group rows, and leave a query a colleague can read later.",
    description:
      "You work with a small set of tables about courses, learners, and payments — the kind of records a studio actually keeps. Each lesson answers a question a manager might ask, then tidies the SQL so it is still readable next month.",
    outcomes: [
      "Read a schema before you write a query",
      "Filter, sort, and aggregate without repeating yourself",
      "Join two tables and notice which rows disappeared",
      "Write a GROUP BY that matches the decision in front of you",
      "Name columns and leave a note a teammate can follow",
    ],
    lessons: [
      "Tables, keys, and the question before the query",
      "Filtering and sorting",
      "Aggregates and GROUP BY",
      "Joins, and the rows that go missing",
      "A subquery when the join gets noisy",
      "A short analysis you can paste into a document",
    ],
    audience:
      "People who already live in spreadsheets and have just been handed a database login. No prior SQL is required.",
  },
  {
    slug: "data-storytelling-with-spreadsheets",
    title: "Data Storytelling with Spreadsheets",
    category: "Data",
    level: "Beginner",
    duration: "5 weeks",
    price: 2299,
    summary:
      "Turn a messy export into a one-page brief: clean numbers, one honest chart, and a recommendation in sentences.",
    description:
      "You start from a rough export and end with a page someone can read in three minutes. The tool is a spreadsheet. The skill is deciding what the number means and what should happen next. A chart is there to support a sentence.",
    outcomes: [
      "Clean a column without hiding the rows you removed",
      "Choose a comparison that matches the question",
      "Build one chart whose title states the point",
      "Write a recommendation with the number beside it",
      "Say what the data cannot tell you",
    ],
    lessons: [
      "The question and the export",
      "Cleaning without losing the trail",
      "Summaries that answer the question",
      "A chart that argues, and a chart that should have been a table",
      "The one-page brief",
    ],
    audience:
      "Coordinators, marketers, and junior analysts who are asked to share the numbers and want the page to be useful.",
  },
  {
    slug: "english-for-meetings-and-interviews",
    title: "English for Meetings and Interviews",
    category: "Languages",
    level: "Beginner",
    duration: "5 weeks",
    price: 1799,
    summary:
      "Practice the English you need at work: introducing your work, explaining a delay, and answering a straight interview question.",
    description:
      "This is spoken and written workplace English, not grammar for its own sake. Each week you prepare a short answer, say it aloud, and trim it until it is clear. The examples sit in Indian offices: stand-ups, client calls, and first-round interviews.",
    outcomes: [
      "Introduce yourself and your work in under a minute",
      "Explain a delay or a change without a long apology",
      "Answer “tell me about a project” with a start, a middle, and a result",
      "Write a short email that asks for one thing",
      "Hear the difference between a vague answer and a specific one",
    ],
    lessons: [
      "Introducing yourself and your role",
      "Meetings: agreeing, disagreeing, and asking for clarity",
      "Status, delays, and the next step",
      "Interview answers that use a real example",
      "Emails and the follow-up message",
    ],
    audience:
      "Students and professionals who know everyday English and want to sound clear at work. You do not need to be fluent to start.",
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
