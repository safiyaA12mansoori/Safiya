export const WHATSAPP_NUMBER = "917620068321";

export const categories = [
  "Accounting",
  "Office",
  "Computers",
  "Design",
  "Programming",
  "Marketing",
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
  {
    slug: "html-and-css-web-development",
    title: "HTML & CSS Web Development",
    category: "Programming",
    level: "Beginner",
    duration: "Self-paced",
    price: 2499,
    image: "/courses/html-and-css-web-development.png",
    featured: true,
    summary: "Build Modern, Responsive & Attractive Websites",
    description:
      "Learn to structure pages with HTML and style them with CSS: text, links, images, lists, tables, forms, Flexbox, Grid, and layouts that work on phones. You finish by building real pages.",
    outcomes: [
      "Mark up a page with clear HTML structure",
      "Style text, links, images, lists, tables, and forms",
      "Lay out a page with Flexbox and Grid",
      "Make a layout that works on a phone",
      "Publish a small set of real web pages",
    ],
    lessons: [
      "HTML Basics & Page Structure",
      "Text, Links, Images & Media",
      "Lists, Tables & Forms",
      "CSS Basics & Styling",
      "Layout Design (Flexbox & Grid)",
      "Responsive & Mobile-Friendly Design",
      "Create Real-World Web Pages & Projects",
    ],
    audience:
      "Beginners who want to build websites from scratch before they add JavaScript.",
  },
  {
    slug: "java-programming",
    title: "Java Programming",
    category: "Programming",
    level: "Beginner",
    duration: "Self-paced",
    price: 2499,
    image: "/courses/java-programming.png",
    featured: true,
    summary: "Learn Java from Basics to Real-World Application Development",
    description:
      "Learn Java from syntax through object-oriented programming, exceptions, collections, files, threads, and JDBC. You finish with mini projects you can run as real applications.",
    outcomes: [
      "Write Java with classes, objects, and core syntax",
      "Use inheritance, polymorphism, and encapsulation",
      "Handle exceptions and work with collections",
      "Read and write files and connect to a database with JDBC",
      "Build small Java applications",
    ],
    lessons: [
      "Java Fundamentals & Syntax",
      "OOP Concepts (Class, Object, Inheritance, Polymorphism, Abstraction, Encapsulation)",
      "Exception Handling",
      "Collections Framework",
      "File Handling & I/O",
      "Multithreading",
      "JDBC (Database Connectivity)",
      "Mini Projects & Real-World Applications",
    ],
    audience:
      "Students who want a first programming language that is used in college courses and backend jobs.",
  },
  {
    slug: "python-programming",
    title: "Python Programming",
    category: "Programming",
    level: "Beginner",
    duration: "Self-paced",
    price: 2499,
    image: "/courses/python-programming.png",
    featured: true,
    summary: "Learn Python from Basics to Real-World Applications",
    description:
      "Learn Python from syntax through control flow, functions, data structures, files, NumPy, Pandas, Matplotlib, and MySQL. You finish with mini projects you can run.",
    outcomes: [
      "Write Python with clear syntax, loops, and functions",
      "Use lists, tuples, sets, and dictionaries",
      "Read and write files",
      "Use NumPy, Pandas, and Matplotlib for simple analysis",
      "Connect to MySQL and complete a small project",
    ],
    lessons: [
      "Python Basics & Syntax",
      "Control Statements & Loops",
      "Functions & Modules",
      "Data Structures (Lists, Tuples, Sets, Dict)",
      "File Handling",
      "Libraries (NumPy, Pandas, Matplotlib)",
      "Database Connectivity (MySQL)",
      "Mini Projects & Real-World Applications",
    ],
    audience:
      "Beginners who want one language for scripts, data work, and small applications.",
  },
  {
    slug: "cpp-programming",
    title: "C++ Programming",
    category: "Programming",
    level: "Beginner",
    duration: "Self-paced",
    price: 2499,
    image: "/courses/cpp-programming.png",
    featured: true,
    summary: "Master Object-Oriented Programming with C++",
    description:
      "Learn C++ from fundamentals through control flow, functions, classes, file handling, and the Standard Template Library. You practise with programs you can compile and run.",
    outcomes: [
      "Write C++ with functions, scope, and core syntax",
      "Use classes, objects, inheritance, and polymorphism",
      "Read and write files",
      "Use STL containers and templates at a basic level",
      "Solve practice problems in C++",
    ],
    lessons: [
      "C++ Fundamentals & Syntax",
      "Control Statements & Loops",
      "Functions & Scope",
      "Object-Oriented Programming (Classes, Objects, Inheritance, Polymorphism)",
      "File Handling",
      "STL (Standard Template Library)",
      "Problem Solving & Practical Programs",
    ],
    audience:
      "Students who need C++ for college, contests, or a first look at object-oriented programming.",
  },
  {
    slug: "c-programming",
    title: "C Programming",
    category: "Programming",
    level: "Beginner",
    duration: "Self-paced",
    price: 2499,
    image: "/courses/c-programming.png",
    featured: true,
    summary: "Build a Strong Foundation in Programming with C",
    description:
      "Learn C from language fundamentals through loops, functions, arrays, strings, structures, and files. You finish by solving practice programs that build a first programming habit.",
    outcomes: [
      "Write C with functions and modular structure",
      "Use arrays, strings, and structures",
      "Read and write files",
      "Solve practice problems in C",
    ],
    lessons: [
      "C Language Fundamentals",
      "Control Statements & Loops",
      "Functions & Modular Programming",
      "Arrays, Strings & Structures",
      "File Handling",
      "Problem Solving & Practice Programs",
    ],
    audience:
      "Absolute beginners who want a first programming language before moving to C++ or Java.",
  },
  {
    slug: "facebook-and-instagram-marketing",
    title: "Facebook & Instagram Marketing",
    category: "Marketing",
    level: "Beginner",
    duration: "Self-paced",
    price: 2499,
    image: "/courses/facebook-and-instagram-marketing.png",
    featured: true,
    summary: "Build Brand Awareness, Get Leads and Grow Your Business on Facebook & Instagram",
    description:
      "Learn Facebook and Instagram from the platforms through business pages, content, Reels and Stories, audience targeting, Meta ads, and analytics. You finish able to run a small campaign and read the results.",
    outcomes: [
      "Set up a professional page and business account",
      "Plan content, Reels, and Stories",
      "Target an audience and grow it",
      "Run Meta ads for Facebook and Instagram",
      "Read insights and track a campaign",
    ],
    lessons: [
      "Facebook & Instagram Platform Basics",
      "Professional Page & Business Account Setup",
      "Content Strategy & Creative Post Design",
      "Reels, Stories & Short-Form Content",
      "Audience Targeting & Growth Strategies",
      "Meta (Facebook & Instagram) Ads",
      "Analytics, Insights & Performance Tracking",
      "Real-World Campaigns & Business Growth",
    ],
    audience:
      "Shop owners and marketers who want leads and sales from Facebook and Instagram, not only likes.",
  },
  {
    slug: "seo",
    title: "SEO (Search Engine Optimization)",
    category: "Marketing",
    level: "Beginner",
    duration: "Self-paced",
    price: 2499,
    image: "/courses/seo.png",
    featured: true,
    summary: "Learn to Rank Higher, Get More Traffic & Grow Your Business Online",
    description:
      "Learn how search engines work, then keyword research, on-page and technical SEO, backlinks, Google Business Profile, and the tools used to report on a live site.",
    outcomes: [
      "Research keywords and competitors",
      "Improve on-page content, titles, and meta tags",
      "Fix basic technical SEO such as speed, indexing, and sitemaps",
      "Use Google Business Profile for local search",
      "Report on ranking and traffic with Search Console and Analytics",
    ],
    lessons: [
      "SEO Fundamentals & How Search Engines Work",
      "Keyword Research & Competitor Analysis",
      "On-Page SEO (Content, Meta Tags, etc.)",
      "Technical SEO (Speed, Indexing, Sitemap, etc.)",
      "Off-Page SEO (Backlinks & Authority Building)",
      "Local SEO (Google Business Profile)",
      "SEO Tools (Google Search Console, Google Analytics, etc.)",
      "SEO Reporting & Real-World Implementation",
    ],
    audience:
      "Site owners and marketers who want more Google traffic without guessing at the checklist.",
  },
  {
    slug: "social-media-marketing",
    title: "Social Media Marketing",
    category: "Marketing",
    level: "Beginner",
    duration: "Self-paced",
    price: 2499,
    image: "/courses/social-media-marketing.png",
    featured: true,
    summary: "Grow Your Brand, Audience & Business with Social Media",
    description:
      "Learn social media from the basics through platform strategy, content planning, profiles, community growth, paid ads, and analytics. You leave with a campaign plan you can run.",
    outcomes: [
      "Choose a platform strategy for Instagram, Facebook, LinkedIn, and YouTube",
      "Plan and create a content calendar",
      "Optimise a profile and grow an audience",
      "Run basic paid ads",
      "Read performance and plan the next campaign",
    ],
    lessons: [
      "Social Media Marketing Fundamentals",
      "Platform Strategies (Instagram, Facebook, LinkedIn, YouTube, etc.)",
      "Content Planning & Creation",
      "Profile Optimization & Brand Building",
      "Audience Engagement & Community Growth",
      "Paid Advertising (Meta Ads, Instagram Ads)",
      "Performance Analytics & Insights",
      "Real-World Campaigns & Strategy Planning",
    ],
    audience:
      "People who already post on social media and want a plan that grows a brand, not only a feed.",
  },
  {
    slug: "digital-marketing-fundamentals",
    title: "Digital Marketing Fundamentals",
    category: "Marketing",
    level: "Beginner",
    duration: "Self-paced",
    price: 2499,
    image: "/courses/digital-marketing-fundamentals.png",
    featured: true,
    summary: "Learn the Basics to Build, Promote and Grow a Business Online",
    description:
      "A first course in digital marketing: presence and brand, website and SEO basics, social media, content, email, Google and Meta ads, and how to measure a campaign.",
    outcomes: [
      "Set up a simple online presence and brand",
      "Use website, SEO, social, content, and email together",
      "Understand Google Ads and Meta ads at a basic level",
      "Measure a campaign with analytics",
      "Walk through a real campaign as a case study",
    ],
    lessons: [
      "Introduction to Digital Marketing",
      "Online Presence & Brand Building",
      "Website & SEO Basics (Search Engine)",
      "Social Media Marketing (Organic & Paid)",
      "Content Marketing & Copywriting",
      "Email Marketing & Lead Generation",
      "Google Ads & Meta (Facebook & Instagram) Ads",
      "Analytics & Performance Measurement",
      "Real-World Campaigns & Case Studies",
    ],
    audience:
      "Beginners who need the whole map of digital marketing before they specialise.",
  },
  {
    slug: "logo-and-brand-designing",
    title: "Logo & Brand Designing",
    category: "Design",
    level: "Beginner",
    duration: "Self-paced",
    price: 2499,
    image: "/courses/logo-and-brand-designing.png",
    featured: true,
    summary: "Build Powerful Logos & Complete Brand Identities",
    description:
      "Learn logo design from fundamentals through brand strategy, colour, type, icons, mockups, and guidelines. You finish with a brand set you can put in a portfolio.",
    outcomes: [
      "Design a logo with clear concepts and variations",
      "Choose colour and type that fit a brand",
      "Make icons, patterns, and mockups",
      "Write simple brand guidelines",
      "Present a real brand project",
    ],
    lessons: [
      "Logo Design Fundamentals",
      "Brand Identity & Strategy",
      "Logo Concepts & Variations",
      "Colour Psychology & Combinations",
      "Typography for Branding",
      "Brand Assets (Icons, Patterns, Mockups)",
      "Brand Guidelines & Presentation",
      "Real-World Brand Projects & Portfolio",
    ],
    audience:
      "Design students and small-business owners who need a logo and a consistent brand, not only a mark.",
  },
  {
    slug: "video-editing",
    title: "Video Editing",
    category: "Design",
    level: "Beginner",
    duration: "Self-paced",
    price: 2499,
    image: "/courses/video-editing.png",
    featured: true,
    summary: "Create Professional & Engaging Videos for YouTube, Social Media and Business",
    description:
      "Learn video editing from the workflow through cutting, transitions, colour, titles, audio, and short-form videos for YouTube and Reels. You export work that is ready to publish.",
    outcomes: [
      "Cut, trim, and sequence a video",
      "Add transitions, effects, and colour correction",
      "Place titles, motion graphics, and background music",
      "Edit YouTube videos, Reels, and short-form clips",
      "Export with settings that match the platform",
    ],
    lessons: [
      "Video Editing Fundamentals",
      "Editing Workflow & Techniques",
      "Cutting, Trimming & Transitions",
      "Effects, Color Grading & Correction",
      "Text, Titles & Motion Graphics",
      "Audio Editing & Background Music",
      "YouTube, Reels & Short-Form Videos",
      "Real-World Projects & Export Settings",
    ],
    audience:
      "Creators and small businesses who need watchable videos for YouTube, Reels, and ads.",
  },
  {
    slug: "adobe-illustrator",
    title: "Adobe Illustrator",
    category: "Design",
    level: "Beginner",
    duration: "Self-paced",
    price: 2499,
    image: "/courses/adobe-illustrator.png",
    featured: true,
    summary: "Create Professional Vector Designs with Illustrator",
    description:
      "Learn Illustrator from the interface through vectors, the Pen tool, logos, type, icons, infographics, and print or digital layouts. You leave with portfolio pieces.",
    outcomes: [
      "Draw and edit vector shapes with the core tools",
      "Use Pen, Shape, and Pathfinder with control",
      "Design logos, icons, and type treatments",
      "Make infographics and illustrations",
      "Prepare files for print and digital use",
    ],
    lessons: [
      "Illustrator Interface & Tools",
      "Vector Graphics & Illustration",
      "Drawing Tools (Pen, Shape, Pathfinder)",
      "Logo & Brand Identity Design",
      "Typography & Creative Text Effects",
      "Icons, Infographics & Illustrations",
      "Print & Digital Media Design",
      "Real-World Projects & Portfolio",
    ],
    audience:
      "Beginners who want vector logos, icons, and print work in Illustrator rather than only photos in Photoshop.",
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
