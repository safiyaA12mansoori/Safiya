# AromaLuxe

A static website for AromaLuxe, a handmade gifting studio in Pune. The tagline is **Gifts That Create Memories**.

The site is a catalogue and an enquiry desk. People browse gifts, build a hamper summary, and contact the studio on WhatsApp or by email. It does not take payment, and it has no cart, accounts, database, or admin panel.

## Open it

From this folder, either open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```

Then visit `http://127.0.0.1:8000`.

JavaScript needs to be on for the product grids, product details, and the hamper summary. The rest of the pages are readable without it. Fonts and Bootstrap load from the network; if they are blocked, the pages still use Georgia and a system sans-serif.

## Orders

Orders are conversations, not website transactions.

- WhatsApp: [7620068321](https://wa.me/917620068321) (`+91 7620068321`)
- Email: [aromaluxe993@gmail.com](mailto:aromaluxe993@gmail.com)
- Instagram: [@aromaluxe993](https://instagram.com/aromaluxe993)

The contact form, the bulk form, and the hamper builder open WhatsApp or the visitor’s email app with the message filled in. This website does not store or send that message itself. A hamper selection can stay in the browser tab until it is cleared.

## Change the catalogue

Product names, prices, variants, and stock labels live in `js/catalog.js`. Prices are indicative labels for the conversation with AromaLuxe. They are not a charge.

Sample reviews are written on the homepage and marked **Sample review**. Replace them when real customer words are ready. The look follows the rose-gold AromaLuxe logo. Photographs in `assets/photos/` are styled stand-ins and can be swapped for the studio’s own pictures.

## Still to be confirmed by AromaLuxe

- Street address and map
- Business hours
- Final prices and the studio’s own product photographs
- Policy pages: delivery areas, production times, refunds, cancellation, and customization rules

Those policy pages are placeholders on purpose. They do not promise a delivery window or a refund rule.
