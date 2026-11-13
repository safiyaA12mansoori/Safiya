from io import BytesIO

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas


def build_prescription_pdf(prescription) -> bytes:
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4
    y = height - 20 * mm

    clinic = prescription.clinic
    c.setFont("Helvetica-Bold", 16)
    c.drawString(20 * mm, y, clinic.name)
    y -= 8 * mm
    c.setFont("Helvetica", 10)
    c.drawString(20 * mm, y, f"{clinic.address_line1} {clinic.city} {clinic.pincode}".strip())
    y -= 6 * mm
    c.drawString(20 * mm, y, f"Phone: {clinic.phone}")
    y -= 12 * mm

    c.setFont("Helvetica-Bold", 12)
    c.drawString(20 * mm, y, "Prescription")
    y -= 8 * mm
    c.setFont("Helvetica", 10)
    patient = prescription.patient
    doctor = prescription.doctor
    c.drawString(20 * mm, y, f"Patient: {patient.full_name}  MRN: {patient.mrn}")
    y -= 6 * mm
    c.drawString(20 * mm, y, f"DOB: {patient.date_of_birth}  Phone: {patient.phone}")
    y -= 6 * mm
    c.drawString(20 * mm, y, f"Doctor: {doctor}")
    y -= 6 * mm
    c.drawString(20 * mm, y, f"Date: {prescription.created_at.strftime('%Y-%m-%d %H:%M')}")
    y -= 10 * mm

    c.setFont("Helvetica-Bold", 10)
    c.drawString(20 * mm, y, "Rx")
    y -= 7 * mm
    c.setFont("Helvetica", 10)
    for idx, item in enumerate(prescription.items.all(), start=1):
        line = (
            f"{idx}. {item.medicine_name} — {item.dosage}, {item.frequency}, "
            f"{item.duration_days}d, qty {item.quantity}"
        )
        c.drawString(25 * mm, y, line[:95])
        y -= 5 * mm
        if item.instructions:
            c.drawString(30 * mm, y, f"Instr: {item.instructions[:90]}")
            y -= 5 * mm
        if y < 30 * mm:
            c.showPage()
            y = height - 20 * mm

    if prescription.notes:
        y -= 4 * mm
        c.drawString(20 * mm, y, f"Notes: {prescription.notes[:100]}")

    y -= 15 * mm
    c.drawString(120 * mm, y, "Authorized signature")
    c.showPage()
    c.save()
    return buffer.getvalue()
