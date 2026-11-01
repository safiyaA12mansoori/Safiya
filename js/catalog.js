/* AromaLuxe catalogue
   The shop uses only the studio's categories. Photographs already supplied
   are listed with a price on request. Other subcategories are ready for
   the next photographs. Nothing here takes a payment. */

const AROMALUXE = {
  name: "AromaLuxe",
  tagline: "Gifts That Create Memories",
  whatsapp: "917620068321",
  phoneDisplay: "7620068321",
  email: "aromaluxe993@gmail.com",
  instagram: "https://instagram.com/aromaluxe993",
  instagramHandle: "@aromaluxe993",
  city: "Pune, Maharashtra, India",
  deliveryNote: "Estimated delivery is confirmed by AromaLuxe when you enquire. No dispatch time is promised on this website."
};

const CATEGORIES = [
  {
    id: "handmade-candles",
    name: "Handmade Candles",
    short: "Handmade Candles",
    href: "candles.html",
    blurb: "Scented, jar, pillar, flower, laddu and modak, decorative, and candle gift sets.",
    subs: [
      { id: "scented", name: "Scented Candles" },
      { id: "jar", name: "Jar Candles" },
      { id: "pillar", name: "Pillar Candles" },
      { id: "flower", name: "Flower Candles" },
      { id: "laddu", name: "Laddu & Modak Candles" },
      { id: "decorative", name: "Decorative & Designer Candles" },
      { id: "candle-sets", name: "Candle Gift Sets" }
    ]
  },
  {
    id: "hampers",
    name: "Gift Hampers",
    short: "Gift Hampers",
    href: "shop.html?cat=hampers",
    blurb: "Birthday, anniversary, couple, chocolate, self-care, luxury, and budget-friendly hampers.",
    subs: [
      { id: "birthday", name: "Birthday Hampers" },
      { id: "anniversary", name: "Anniversary Hampers" },
      { id: "couple", name: "Couple Hampers" },
      { id: "chocolate-hampers", name: "Chocolate Hampers" },
      { id: "self-care", name: "Self-Care Hampers" },
      { id: "luxury", name: "Luxury Gift Hampers" },
      { id: "budget", name: "Budget-Friendly Hampers" }
    ]
  },
  {
    id: "bouquets",
    name: "Bouquets",
    short: "Bouquets",
    href: "shop.html?cat=bouquets",
    blurb: "Ribbon rose, chocolate, candle, customized, and mini bouquets.",
    subs: [
      { id: "ribbon-rose", name: "Ribbon Rose Bouquets" },
      { id: "chocolate-bouquets", name: "Chocolate Bouquets" },
      { id: "candle-bouquets", name: "Candle Bouquets" },
      { id: "custom-bouquets", name: "Customized Bouquets" },
      { id: "mini", name: "Mini Bouquets" }
    ]
  },
  {
    id: "personalized",
    name: "Personalized Gifts",
    short: "Personalized Gifts",
    href: "shop.html?cat=personalized",
    blurb: "Photo frames, name and message gifts, memory gifts, QR voice messages, and personalized boxes.",
    subs: [
      { id: "frames", name: "Photo Frames" },
      { id: "name-message", name: "Name & Message Gifts" },
      { id: "memory", name: "Memory Gifts" },
      { id: "qr-voice", name: "QR Voice Message Gifts" },
      { id: "gift-boxes", name: "Personalized Gift Boxes" }
    ]
  },
  {
    id: "festive",
    name: "Festive Collections",
    short: "Festive Collections",
    href: "shop.html?cat=festive",
    blurb: "Diwali, Navratri and Dussehra, Raksha Bandhan, Eid, Christmas, Valentine's Day, and special occasions.",
    subs: [
      { id: "diwali", name: "Diwali Collection" },
      { id: "navratri", name: "Navratri & Dussehra" },
      { id: "rakhi", name: "Raksha Bandhan" },
      { id: "eid", name: "Eid Gifts" },
      { id: "christmas", name: "Christmas Gifts" },
      { id: "valentine", name: "Valentine's Day" },
      { id: "special-occasion", name: "Special Occasion Collections" }
    ]
  },
  {
    id: "decor",
    name: "Home Décor",
    short: "Home Décor",
    href: "shop.html?cat=decor",
    blurb: "Decorative diyas, urli and candle holders, festive decorations, table decorations, and decorative gift pieces.",
    subs: [
      { id: "diyas", name: "Decorative Diyas" },
      { id: "urli", name: "Urli & Candle Holders" },
      { id: "festive-decor", name: "Festive Decorations" },
      { id: "table", name: "Table Decorations" },
      { id: "gift-pieces", name: "Decorative Gift Pieces" }
    ]
  }
];

const PRODUCTS = [
  {
    id: "cream-daisy-candles",
    name: "Cream Daisy Flower Candles",
    category: "handmade-candles",
    sub: "flower",
    price: null,
    compareAt: null,
    stock: "in",
    customizable: true,
    quoteOnly: true,
    hamperGroup: "candles",
    bestseller: true,
    image: "assets/photos/flower-cream-daisies.jpg",
    unit: "set of daisy candles",
    description: "Handmade cream daisy candles with yellow centres, nestled in a woven basket.",
    details: "Flower candles from the studio. Quantity, colour, and the final amount are confirmed when you enquire. More photographs of other candle styles are still to come.",
    variants: []
  },
  {
    id: "blue-daisy-candles",
    name: "Blue and Cream Daisy Candles",
    category: "handmade-candles",
    sub: "flower",
    price: null,
    compareAt: null,
    stock: "in",
    customizable: true,
    quoteOnly: true,
    hamperGroup: "candles",
    bestseller: false,
    image: "assets/photos/flower-blue-daisies.jpg",
    unit: "daisy candles",
    description: "Blue and cream daisy candles with textured centres and cotton wicks.",
    details: "Ask for the blue, cream, or mixed set. AromaLuxe confirms how many pieces are in the set before making it.",
    variants: []
  },
  {
    id: "sunflower-candles",
    name: "Sunflower Candles",
    category: "handmade-candles",
    sub: "flower",
    price: null,
    compareAt: null,
    stock: "in",
    customizable: true,
    quoteOnly: true,
    hamperGroup: "candles",
    bestseller: true,
    image: "assets/photos/flower-sunflowers.jpg",
    unit: "sunflower candles",
    description: "Bright sunflower candles with golden petals and a dark, textured centre.",
    details: "A handful to give on their own or to tuck into a hamper. The studio confirms the count and the amount.",
    variants: []
  },
  {
    id: "red-daisy-candles",
    name: "Red Daisy Flower Candles",
    category: "handmade-candles",
    sub: "flower",
    price: null,
    compareAt: null,
    stock: "in",
    customizable: true,
    quoteOnly: true,
    hamperGroup: "candles",
    bestseller: false,
    image: "assets/photos/flower-red-daisies.jpg",
    unit: "red daisy candles",
    description: "Red daisy candles with white centres, shown here on a woven mat.",
    details: "Suitable for festive trays and return gifts. Pack size is confirmed on enquiry.",
    variants: []
  },
  {
    id: "mixed-daisy-candles",
    name: "Mixed Daisy Flower Candles",
    category: "handmade-candles",
    sub: "flower",
    price: null,
    compareAt: null,
    stock: "in",
    customizable: true,
    quoteOnly: true,
    hamperGroup: "candles",
    bestseller: true,
    image: "assets/photos/flower-mixed-daisies.jpg",
    unit: "mixed daisy candles",
    description: "White, pink, and lilac daisy candles arranged together.",
    details: "Choose one colour or a mix. AromaLuxe confirms the combination before making the set.",
    variants: []
  },
  {
    id: "lilac-daisy-candles",
    name: "Lilac and White Daisy Candles",
    category: "handmade-candles",
    sub: "flower",
    price: null,
    compareAt: null,
    stock: "in",
    customizable: true,
    quoteOnly: true,
    hamperGroup: "candles",
    bestseller: false,
    image: "assets/photos/flower-lilac-daisies.jpg",
    unit: "daisy candles in a basket",
    description: "White daisies with lilac centres beside lilac daisies, gathered in a round basket.",
    details: "The basket in the photograph is part of the presentation. Ask if you want the candles on their own.",
    variants: []
  },
  {
    id: "heart-candle-gift-set",
    name: "Heart and Flower Candle Gift Set",
    category: "handmade-candles",
    sub: "candle-sets",
    price: null,
    compareAt: null,
    stock: "in",
    customizable: true,
    quoteOnly: true,
    hamperGroup: "candles",
    bestseller: true,
    image: "assets/photos/candle-heart-gift-set.jpg",
    unit: "gift box",
    description: "A gift box of heart-shaped and flower-topped candles, packed in shredded paper.",
    details: "A candle gift set. The colours in the box can be discussed. The amount is confirmed by the studio.",
    variants: []
  },
  {
    id: "luxury-gift-hamper",
    name: "Luxury Gift Hamper",
    category: "hampers",
    sub: "luxury",
    price: null,
    compareAt: null,
    stock: "in",
    customizable: true,
    quoteOnly: true,
    hamperGroup: "",
    bestseller: true,
    image: "assets/photos/luxury-hamper.jpg",
    unit: "hamper box",
    description: "An open keepsake box with rolled fabrics, roses, and chocolates, finished with a ribbon.",
    details: "A luxury gift hamper. The pieces inside change with the occasion. AromaLuxe confirms the contents and the amount before making it.",
    variants: []
  },
  {
    id: "rose-box-bouquet",
    name: "Rose Box Bouquet",
    category: "bouquets",
    sub: "ribbon-rose",
    price: null,
    compareAt: null,
    stock: "in",
    customizable: true,
    quoteOnly: true,
    hamperGroup: "",
    bestseller: false,
    image: "assets/photos/rose-box-bouquets.jpg",
    unit: "rose box",
    description: "Roses arranged in round and square gift boxes, in red, blush, lilac, blue, and ivory.",
    details: "Choose a colour and a box. This sits with the ribbon rose bouquets until a separate ribbon-rose photograph is added.",
    variants: []
  },
  {
    id: "chocolate-bouquet",
    name: "Chocolate Bouquet",
    category: "bouquets",
    sub: "chocolate-bouquets",
    price: null,
    compareAt: null,
    stock: "in",
    customizable: true,
    quoteOnly: true,
    hamperGroup: "chocolates",
    bestseller: true,
    image: "assets/photos/chocolate-bouquet.jpg",
    unit: "bouquet",
    description: "A chocolate bouquet wrapped in black paper, with red roses and a satin bow.",
    details: "The chocolate bars in the bouquet are confirmed when you enquire, along with the final amount.",
    variants: []
  },
  {
    id: "mini-rose-bouquet",
    name: "Mini Rose Bouquet",
    category: "bouquets",
    sub: "mini",
    price: null,
    compareAt: null,
    stock: "in",
    customizable: true,
    quoteOnly: true,
    hamperGroup: "",
    bestseller: true,
    image: "assets/photos/mini-rose-bouquet.jpg",
    unit: "mini bouquet",
    description: "A single red rose with baby's breath, wrapped in cream paper and tied with a red ribbon.",
    details: "A mini bouquet. Colour of the rose and ribbon can be requested. The studio confirms what is available.",
    variants: []
  },
  {
    id: "personalized-gift-box",
    name: "Personalized Gift Box",
    category: "personalized",
    sub: "gift-boxes",
    price: null,
    compareAt: null,
    stock: "in",
    customizable: true,
    quoteOnly: true,
    hamperGroup: "",
    bestseller: false,
    image: "assets/photos/personalized-gift-box.jpg",
    unit: "gift box",
    description: "A gift box with a satin wrap, a flower clip, a small charm, and a few personal pieces.",
    details: "A personalized gift box. Names, notes, and the pieces inside are confirmed with you. This is not a ready-made set with a fixed price.",
    variants: []
  }
];

const CUSTOM_ADDONS = [
  { id: "mens-perfume", name: "Men's Perfumes", group: "fragrance", quoteOnly: true, price: null },
  { id: "womens-perfume", name: "Women's Perfumes", group: "fragrance", quoteOnly: true, price: null },
  { id: "unisex-fragrance", name: "Unisex Fragrances", group: "fragrance", quoteOnly: true, price: null },
  { id: "perfume-sets", name: "Perfume Gift Sets", group: "fragrance", quoteOnly: true, price: null },
  { id: "earrings", name: "Earrings", group: "jewellery", quoteOnly: true, price: null },
  { id: "bracelets", name: "Bracelets", group: "jewellery", quoteOnly: true, price: null },
  { id: "necklaces", name: "Necklaces", group: "jewellery", quoteOnly: true, price: null },
  { id: "rings", name: "Rings", group: "jewellery", quoteOnly: true, price: null },
  { id: "fashion-accessories", name: "Fashion Accessories", group: "jewellery", quoteOnly: true, price: null },
  { id: "jewellery-sets", name: "Jewellery Gift Sets", group: "jewellery", quoteOnly: true, price: null },
  { id: "chocolate-boxes", name: "Chocolate Gift Boxes", group: "chocolates", quoteOnly: true, price: null },
  { id: "dry-fruit-gifts", name: "Dry Fruit Gifts", group: "chocolates", quoteOnly: true, price: null },
  { id: "chocolate-combos", name: "Chocolate Combos", group: "chocolates", quoteOnly: true, price: null }
];

const HAMPER_BOXES = [
  { id: "box-ivory", name: "Ivory gift box", price: null, quoteOnly: true, detail: "A clean ivory box with a ribbon." },
  { id: "box-deep", name: "Deep keepsake box", price: null, quoteOnly: true, detail: "A deeper coloured box for anniversaries and festive gifts." },
  { id: "box-basket", name: "Woven basket", price: null, quoteOnly: true, detail: "A basket when the gift should feel generous." },
  { id: "box-custom", name: "Studio-designed box", price: null, quoteOnly: true, detail: "Shape and finish decided with AromaLuxe." }
];

const PACKAGING = [
  { id: "rose-gold", name: "Rose gold ribbon", detail: "A wrap finished with rose-gold ribbon." },
  { id: "cream", name: "Cream tissue and bow", detail: "Soft cream tissue with a bow." },
  { id: "clear", name: "Clear sleeve", detail: "A clear sleeve so the pieces stay visible." },
  { id: "basket-wrap", name: "Basket wrap", detail: "Packed to sit inside a basket." },
  { id: "studio", name: "Studio's choice", detail: "AromaLuxe chooses the packing for the occasion." }
];

const HAMPER_GROUPS = [
  { id: "fragrance", name: "Perfumes & Fragrances", copy: "Men's, women's, unisex, and perfume gift sets." },
  { id: "jewellery", name: "Jewellery & Accessories", copy: "Earrings, bracelets, necklaces, rings, fashion accessories, and jewellery gift sets." },
  { id: "chocolates", name: "Chocolates & Sweet Gifts", copy: "Chocolate boxes, the chocolate bouquet, dry fruits, and chocolate combos." },
  { id: "candles", name: "AromaLuxe candles", copy: "Flower candles and the heart candle gift set. Other candle styles can be requested in the message." }
];

const BUDGETS = [
  { id: "unsure", name: "Not sure yet", max: null },
  { id: "1500", name: "Under ₹1,500", max: 1500 },
  { id: "3000", name: "₹1,500 – ₹3,000", max: 3000 },
  { id: "5000", name: "₹3,000 – ₹5,000", max: 5000 },
  { id: "above", name: "₹5,000 and above", max: null }
];

function getProduct(id) {
  return PRODUCTS.find((item) => item.id === id) || null;
}

function getCategory(id) {
  return CATEGORIES.find((item) => item.id === id) || null;
}

function getSub(categoryId, subId) {
  const category = getCategory(categoryId);
  if (!category || !subId) return null;
  return (category.subs || []).find((item) => item.id === subId) || null;
}

function findCatalogueItem(id) {
  return getProduct(id) || CUSTOM_ADDONS.find((item) => item.id === id) || null;
}
