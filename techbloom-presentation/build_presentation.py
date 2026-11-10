#!/usr/bin/env python3
"""Build the TechBloom photo deck from the six supplied photographs.

Dates, the college name, and the on-screen title are taken from the
pictures. The GPS Map Camera stamp is cropped away.
"""

from __future__ import annotations

import os
from PIL import Image
from lxml import etree
from pptx import Presentation
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.oxml.ns import qn
from pptx.util import Inches, Pt

ROOT = os.path.dirname(os.path.abspath(__file__))
PHOTO = os.path.join(ROOT, "photos")
OUT = os.path.join(ROOT, "TechBloom_Presentation.pptx")

SRC = {
    "lab": "/home/ubuntu/.cursor/projects/agent-repos-Safiya/assets/f3294b98-761e-47df-97f0-d4dfc72c2976.jpg",
    "class": "/home/ubuntu/.cursor/projects/agent-repos-Safiya/assets/0fa5e2ba-6d34-4955-8270-ce32d8cb4a7f.jpg",
    "board": "/home/ubuntu/.cursor/projects/agent-repos-Safiya/assets/28d471b1-db73-45d1-baaa-13f7f4154071.jpg",
    "gift": "/home/ubuntu/.cursor/projects/agent-repos-Safiya/assets/2de84678-07a8-4b73-a14e-bc78d73f1c61.jpg",
    "gift2": "/home/ubuntu/.cursor/projects/agent-repos-Safiya/assets/38d653d3-efc5-443d-9195-16b938abcac2.jpg",
    "group": "/home/ubuntu/.cursor/projects/agent-repos-Safiya/assets/f94436dc-ae1c-4bfd-ab4f-cd1c2fa7903a.jpg",
}

# Palette
INK = "10211C"
INK_DEEP = "0C1916"
CREAM = "F4EFE6"
CREAM_DEEP = "E7E0D2"
GOLD = "C6A15A"
GOLD_SOFT = "E7D3A2"
TERRACOTTA = "C46A4E"
TEXT = "1A2420"
MUTED = "5E6B63"
WHITE = "FFFFFF"

W = 13.333333
H = 7.5
SERIF = "Cambria"
SANS = "Calibri"


def rgb(value: str) -> RGBColor:
    return RGBColor.from_string(value)


def crop_box(im: Image.Image, box) -> Image.Image:
    return im.crop(box)


def cover(im: Image.Image, aspect: float, ax: float = 0.5, ay: float = 0.5) -> Image.Image:
    """Crop to aspect. ax/ay are the anchor point that stays in frame, 0–1."""
    w, h = im.size
    src = w / h
    if src > aspect:
        new_w = int(round(h * aspect))
        max_left = w - new_w
        # Place the anchor on the same relative spot inside the crop.
        left = int(round(ax * w - new_w * ax))
        left = max(0, min(max_left, left))
        return im.crop((left, 0, left + new_w, h))
    new_h = int(round(w / aspect))
    max_top = h - new_h
    top = int(round(ay * h - new_h * ay))
    top = max(0, min(max_top, top))
    return im.crop((0, top, w, top + new_h))


def save_jpg(im: Image.Image, name: str, width: int = 2000) -> str:
    im = im.convert("RGB")
    if im.width > width:
        height = int(round(im.height * width / im.width))
        im = im.resize((width, height), Image.Resampling.LANCZOS)
    path = os.path.join(PHOTO, name)
    im.save(path, "JPEG", quality=90, optimize=True)
    return path


def prepare() -> dict[str, str]:
    os.makedirs(PHOTO, exist_ok=True)
    # 752 cuts above the GPS Map Camera badge. The badge begins just under y=770.
    lab = Image.open(SRC["lab"]).convert("RGB").crop((0, 0, 1600, 752))
    classroom = Image.open(SRC["class"]).convert("RGB").crop((0, 0, 1600, 800))
    board = Image.open(SRC["board"]).convert("RGB").crop((0, 0, 1600, 800))
    gift = Image.open(SRC["gift"]).convert("RGB")
    gift2 = Image.open(SRC["gift2"]).convert("RGB").crop((0, 0, 980, 597))
    group = Image.open(SRC["group"]).convert("RGB")

    cover_aspect = (W - 6.15) / H
    board_aspect = 8.05 / H
    lab_aspect = (W - 5.15) / H
    gift_aspect = (W - 5.28) / H
    band = 1.32
    class_aspect = W / (H - band)
    thumb_aspect = 1.92 / 1.08
    # Zoom the group filmstrip onto the people, not the empty desks.
    group_people = group.crop((140, 155, 1160, 425))
    paths = {
        "cover": save_jpg(cover(classroom, cover_aspect, ax=0.72, ay=0.45), "cover.jpg"),
        "class_wide": save_jpg(cover(classroom, class_aspect, ax=0.52, ay=0.7), "class_wide.jpg"),
        "board": save_jpg(cover(board, board_aspect, ax=0.34, ay=0.42), "board.jpg"),
        "lab": save_jpg(cover(lab, lab_aspect, ax=0.46, ay=0.42), "lab.jpg"),
        "gift": save_jpg(cover(gift, gift_aspect, ax=0.46, ay=0.42), "gift.jpg"),
        "gift2": save_jpg(cover(gift2, 16 / 9, ax=0.46, ay=0.55), "gift2.jpg", width=1400),
        "group": save_jpg(group, "group.jpg", width=2000),
        "thumb_class": save_jpg(cover(classroom, thumb_aspect, ax=0.55, ay=0.4), "thumb_class.jpg", 800),
        "thumb_board": save_jpg(cover(board, thumb_aspect, ax=0.36, ay=0.4), "thumb_board.jpg", 800),
        "thumb_lab": save_jpg(cover(lab, thumb_aspect, ax=0.48, ay=0.4), "thumb_lab.jpg", 800),
        "thumb_gift": save_jpg(cover(gift, thumb_aspect, ax=0.48, ay=0.42), "thumb_gift.jpg", 800),
        "thumb_gift2": save_jpg(cover(gift2, thumb_aspect, ax=0.42, ay=0.5), "thumb_gift2.jpg", 800),
        "thumb_group": save_jpg(cover(group_people, thumb_aspect, ax=0.5, ay=0.48), "thumb_group.jpg", 800),
    }
    return paths


def blank_layout(prs: Presentation):
    for layout in prs.slide_layouts:
        if layout.name == "Blank":
            return layout
    return prs.slide_layouts[-1]


def add_rect(slide, l, t, w, h, fill):
    shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(l), Inches(t), Inches(w), Inches(h))
    shape.fill.solid()
    shape.fill.fore_color.rgb = rgb(fill)
    shape.line.fill.background()
    # No shadow.
    sp_pr = shape._element.spPr
    effect = sp_pr.find(qn("a:effectLst"))
    if effect is not None:
        sp_pr.remove(effect)
    return shape


def add_picture(slide, path, l, t, w, h):
    with Image.open(path) as im:
        src = im.size[0] / im.size[1]
    dst = w / h
    if abs(src - dst) / dst > 0.025:
        raise SystemExit(f"Aspect mismatch for {os.path.basename(path)}: image {src:.3f}, frame {dst:.3f}")
    picture = slide.shapes.add_picture(path, Inches(l), Inches(t), Inches(w), Inches(h))
    nv = picture._element.find(qn("p:nvPicPr"))
    if nv is not None:
        c_nv = nv.find(qn("p:cNvPr"))
        if c_nv is not None:
            c_nv.set("descr", os.path.splitext(os.path.basename(path))[0].replace("_", " "))
    return picture


def add_text(slide, l, t, w, h, paragraphs, align="left", anchor="top"):
    box = slide.shapes.add_textbox(Inches(l), Inches(t), Inches(w), Inches(h))
    tf = box.text_frame
    tf.word_wrap = True
    tf.auto_size = None
    body = tf._txBody.find(qn("a:bodyPr"))
    body.set("anchor", {"top": "t", "middle": "ctr", "bottom": "b"}[anchor])
    for inset in ("lIns", "rIns", "tIns", "bIns"):
        body.set(inset, "0")
    _fill_text_frame(tf, paragraphs, align)
    return box


def _fill_text_frame(tf, paragraphs, align):
    """Replace the text frame contents with a clean paragraph list."""
    # Clear existing paragraphs except the required first one by resetting XML.
    tx_body = tf._txBody
    for child in list(tx_body):
        if child.tag == qn("a:p"):
            tx_body.remove(child)
    align_map = {"left": "l", "center": "ctr", "right": "r"}
    for para in paragraphs:
        p = etree.SubElement(tx_body, qn("a:p"))
        p_pr = etree.SubElement(p, qn("a:pPr"))
        p_pr.set("algn", align_map[para.get("align", align)])
        if para.get("before"):
            node = etree.SubElement(p_pr, qn("a:spcBef"))
            spc = etree.SubElement(node, qn("a:spcPts"))
            spc.set("val", str(int(para["before"] * 100)))
        if para.get("after") is not None:
            node = etree.SubElement(p_pr, qn("a:spcAft"))
            spc = etree.SubElement(node, qn("a:spcPts"))
            spc.set("val", str(int(para["after"] * 100)))
        if para.get("line"):
            node = etree.SubElement(p_pr, qn("a:lnSpc"))
            spc = etree.SubElement(node, qn("a:spcPct"))
            spc.set("val", str(int(para["line"] * 1000)))
        for spec in para["runs"]:
            r = etree.SubElement(p, qn("a:r"))
            r_pr = etree.SubElement(r, qn("a:rPr"))
            r_pr.set("lang", "en-US")
            r_pr.set("dirty", "0")
            if spec.get("bold"):
                r_pr.set("b", "1")
            if spec.get("italic"):
                r_pr.set("i", "1")
            if spec.get("spc") is not None:
                r_pr.set("spc", str(int(spec["spc"])))
            r_pr.set("sz", str(int(spec["size"] * 100)))
            solid = etree.SubElement(r_pr, qn("a:solidFill"))
            color = etree.SubElement(solid, qn("a:srgbClr"))
            color.set("val", spec["color"])
            font = spec.get("font", SANS)
            for tag in ("a:latin", "a:ea", "a:cs"):
                el = etree.SubElement(r_pr, qn(tag))
                el.set("typeface", font)
            t = etree.SubElement(r, qn("a:t"))
            t.text = spec["text"]
    return tf


def notes(slide, text):
    slide.notes_slide.notes_text_frame.text = text


def P(runs, **kwargs):
    return {"runs": runs, **kwargs}


def R(text, size, color, font=SANS, bold=False, italic=False, spc=None):
    spec = {"text": text, "size": size, "color": color, "font": font, "bold": bold, "italic": italic}
    if spc is not None:
        spec["spc"] = spc
    return spec


def build(paths: dict[str, str]) -> None:
    prs = Presentation()
    prs.slide_width = Inches(W)
    prs.slide_height = Inches(H)
    prs.core_properties.title = "TechBloom — In the Room"
    prs.core_properties.subject = "Photographs from Pune"
    prs.core_properties.author = "TechBloom"
    prs.core_properties.category = "Presentation"
    layout = blank_layout(prs)

    # ----- 1. Cover -----
    s = prs.slides.add_slide(layout)
    add_picture(s, paths["cover"], 6.15, 0, 7.183333, 7.5)
    add_rect(s, 0, 0, 6.15, 7.5, INK)
    add_rect(s, 0.72, 1.85, 1.15, 0.018, GOLD)
    add_text(
        s, 0.72, 1.15, 4.9, 0.4,
        [P([R("TECHBLOOM", 13, GOLD_SOFT, bold=True, spc=360)])],
    )
    add_text(
        s, 0.70, 2.15, 5.1, 2.15,
        [P([R("In the room.", 54, CREAM, font=SERIF)], line=92)],
    )
    add_text(
        s, 0.72, 4.45, 4.9, 1.7,
        [
            P([R("Poona College of Arts,", 16, CREAM)], after=0),
            P([R("Science and Commerce", 16, CREAM)], after=10),
            P([R("Camp, Pune", 16, CREAM)], after=8),
            P([R("31 January 2025", 14, GOLD_SOFT, spc=40)]),
        ],
    )
    add_text(s, 0.72, 6.85, 2, 0.35, [P([R("01", 12, GOLD, spc=200)])])
    notes(s, "Cover photograph: AI Tools session, Poona College of Arts, Science and Commerce, Camp, Pune, 31 January 2025, 8:40 a.m. The GPS stamp has been cropped off.")

    # ----- 2. Index -----
    s = prs.slides.add_slide(layout)
    add_rect(s, 0, 0, W, H, CREAM)
    add_rect(s, 0.72, 0.48, 0.018, 0.72, GOLD)
    add_text(
        s, 0.95, 0.42, 6, 0.38,
        [P([R("THE PICTURES", 12, GOLD, bold=True, spc=320)])],
    )
    add_text(
        s, 0.70, 0.95, 8.5, 1.7,
        [
            P([R("Six frames", 44, TEXT, font=SERIF)], line=96, after=0),
            P([R("from two mornings.", 44, TERRACOTTA, font=SERIF, italic=True)], line=96),
        ],
    )

    entries = [
        ("01", "31 January 2025", "AI Tools on the projector. Poona College of Arts, Science and Commerce, Camp."),
        ("02", "3 February 2025", "Two facilitators in a computer laboratory in Pune."),
        ("03", "One more room", "A gold-wrapped gift, then certificates held up with the group."),
    ]
    top = 2.85
    for num, title, body in entries:
        add_text(s, 0.72, top, 0.7, 0.7, [P([R(num, 20, TERRACOTTA, font=SERIF)])])
        add_text(
            s, 1.65, top - 0.02, 10.5, 0.75,
            [
                P([R(title, 18, TEXT, bold=True)], after=1),
                P([R(body, 15, MUTED)]),
            ],
        )
        top += 0.92

    thumbs = [
        "thumb_class", "thumb_board", "thumb_lab",
        "thumb_gift", "thumb_gift2", "thumb_group",
    ]
    gap = 0.1
    thumb_w = 1.92
    thumb_h = 1.08
    x = 0.72
    y = 5.95
    for key in thumbs:
        add_picture(s, paths[key], x, y, thumb_w, thumb_h)
        x += thumb_w + gap
    add_text(s, 11.4, 7.12, 1.4, 0.28, [P([R("02", 12, GOLD, spc=200)], align="right")])
    notes(s, "31 January time on the photograph is 8:40 a.m. The following frame, at the whiteboard, is 8:41 a.m. The 3 February laboratory frame is 8:26 a.m. The gift and group photographs do not carry a readable date, so they are not given one.")

    # ----- 3. AI Tools -----
    s = prs.slides.add_slide(layout)
    band = 1.32
    add_rect(s, 0, 0, W, H, INK)
    add_picture(s, paths["class_wide"], 0, 0, W, H - band)
    add_text(
        s, 0.72, H - band + 0.22, 10.3, 0.95,
        [
            P([R("AI Tools", 32, CREAM, font=SERIF)], after=2, line=96),
            P([R("On the screen, in the lab.     31 January 2025,  8:40 in the morning.", 16, CREAM)]),
        ],
    )
    add_text(s, 11.3, H - 0.46, 1.4, 0.3, [P([R("03", 12, GOLD_SOFT, spc=200)], align="right")])
    notes(s, "The projector in this photograph is titled AI Tools. Poona College of Arts, Science and Commerce, Camp, Pune.")

    # ----- 4. At the board -----
    s = prs.slides.add_slide(layout)
    add_rect(s, 0, 0, W, H, INK)
    add_picture(s, paths["board"], 0, 0, 8.05, 7.5)
    add_rect(s, 8.05, 0, W - 8.05, H, INK)
    add_text(
        s, 8.42, 1.55, 4.5, 4.6,
        [
            P([R("04", 13, GOLD_SOFT, bold=True, spc=280)], after=14),
            P([R("Marker", 36, CREAM, font=SERIF)], line=94, after=0),
            P([R("in hand.", 36, CREAM, font=SERIF, italic=True)], line=94, after=16),
            P([R("Same morning, one minute later. The lesson moves from the slide to the whiteboard.", 16, CREAM)], after=18),
            P([R("31 January 2025", 14, GOLD_SOFT)], after=0),
            P([R("8:41 in the morning", 14, GOLD_SOFT)]),
        ],
        anchor="middle",
    )
    notes(s, "Whiteboard frame from the same AI Tools session, timestamped 8:41 a.m. on 31 January 2025.")

    # ----- 5. The laboratory -----
    s = prs.slides.add_slide(layout)
    add_rect(s, 0, 0, W, H, CREAM)
    add_rect(s, 0, 0, 5.15, H, INK)
    add_picture(s, paths["lab"], 5.15, 0, W - 5.15, H)
    add_text(
        s, 0.48, 1.45, 4.25, 4.8,
        [
            P([R("05", 13, GOLD_SOFT, bold=True, spc=280)], after=14),
            P([R("Two", 36, CREAM, font=SERIF)], line=94, after=0),
            P([R("facilitators.", 36, CREAM, font=SERIF, italic=True)], line=94, after=16),
            P([R("A computer laboratory in Pune, just after half past eight.", 16, CREAM)], after=18),
            P([R("3 February 2025", 14, GOLD_SOFT)], after=0),
            P([R("8:26 in the morning", 14, GOLD_SOFT)]),
        ],
        anchor="middle",
    )
    notes(s, "3 February 2025, 8:26 a.m. The photograph is stamped Pune. It was taken a few metres from the 31 January college pin, but the stamp itself does not name the college, so the slide says Pune.")

    # ----- 6. The gift -----
    s = prs.slides.add_slide(layout)
    add_rect(s, 0, 0, W, H, CREAM)
    add_rect(s, 0, 0, 5.28, H, INK)
    add_picture(s, paths["gift"], 5.28, 0, W - 5.28, H)
    add_text(
        s, 0.48, 0.48, 4.35, 3.55,
        [
            P([R("06", 13, GOLD_SOFT, bold=True, spc=280)], after=10),
            P([R("A gift,", 32, CREAM, font=SERIF)], line=96, after=0),
            P([R("wrapped in gold.", 32, CREAM, font=SERIF, italic=True)], line=96, after=10),
            P([R("Passed across in front of the board. The smaller frame is a closer angle.", 15, CREAM)]),
        ],
    )
    inset_w = 4.05
    inset_h = inset_w * 9 / 16
    mat = 0.07
    add_rect(s, 0.46, H - 0.32 - inset_h - mat * 2, inset_w + mat * 2, inset_h + mat * 2, CREAM)
    add_picture(s, paths["gift2"], 0.46 + mat, H - 0.32 - inset_h - mat, inset_w, inset_h)
    notes(s, "These two frames show the same gold-wrapped gift being handed over. They do not carry a date stamp, so no date is printed.")

    # ----- 7. The group -----
    s = prs.slides.add_slide(layout)
    add_rect(s, 0, 0, W, H, CREAM)
    with Image.open(paths["group"]) as group_im:
        group_h = W * group_im.size[1] / group_im.size[0]
    add_picture(s, paths["group"], 0, 0, W, group_h)
    add_text(
        s, 0.72, group_h + 0.16, 10.4, H - group_h - 0.22,
        [
            P([R("Certificates, held up.", 26, TEXT, font=SERIF)], after=2, line=100),
            P([R("The group fills the classroom. A gold gift is at the center.", 15, MUTED)]),
        ],
    )
    add_text(s, 11.15, H - 0.42, 1.5, 0.28, [P([R("07", 12, GOLD, spc=200)], align="right")])
    notes(s, "Group photograph with certificates and the gold gift. No date is printed on the slide because the picture has no readable timestamp.")

    # ----- 8. Close -----
    s = prs.slides.add_slide(layout)
    add_rect(s, 0, 0, W, H, CREAM)
    add_text(
        s, 0.7, 0.85, W - 1.4, 0.35,
        [P([R("TECHBLOOM", 13, GOLD, bold=True, spc=420)], align="center")],
    )
    add_text(
        s, 0.7, 1.25, W - 1.4, 1.15,
        [P([R("In the room.", 52, TEXT, font=SERIF)], align="center", line=96)],
    )
    add_rect(s, (W - 1.2) / 2, 2.5, 1.2, 0.016, GOLD)
    add_text(
        s, 1.2, 2.75, W - 2.4, 1.7,
        [
            P([R("31 January 2025     ·     AI Tools     ·     Poona College, Camp", 16, TEXT)], align="center", after=6),
            P([R("3 February 2025     ·     A computer laboratory in Pune", 16, TEXT)], align="center", after=6),
            P([R("A gold-wrapped gift, and certificates held up with the group", 16, MUTED)], align="center"),
        ],
    )
    thumbs = [
        "thumb_class", "thumb_board", "thumb_lab",
        "thumb_gift", "thumb_gift2", "thumb_group",
    ]
    strip_w = 1.72
    strip_h = 0.97
    gap = 0.12
    total = len(thumbs) * strip_w + (len(thumbs) - 1) * gap
    x = (W - total) / 2
    for key in thumbs:
        add_picture(s, paths[key], x, 5.55, strip_w, strip_h)
        x += strip_w + gap
    add_text(
        s, 0.7, 6.7, W - 1.4, 0.35,
        [P([R("08", 12, GOLD, spc=200)], align="center")],
    )
    notes(s, "Closing frame. Every line on this slide is visible in the photographs.")

    prs.save(OUT)
    print(OUT)


if __name__ == "__main__":
    build(prepare())
