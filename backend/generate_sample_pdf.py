"""Produce samples/sample_resume.pdf from samples/sample_resume.txt.

Run once after installing requirements:
    python generate_sample_pdf.py
"""
from __future__ import annotations
from pathlib import Path

from fpdf import FPDF


SRC = Path(__file__).parent / "samples" / "sample_resume.txt"
DST = Path(__file__).parent / "samples" / "sample_resume.pdf"


def main() -> None:
    if not SRC.exists():
        raise SystemExit(f"Missing source: {SRC}")

    text = SRC.read_text(encoding="utf-8")

    pdf = FPDF(unit="mm", format="A4")
    pdf.set_auto_page_break(auto=True, margin=18)
    pdf.add_page()

    # Heading
    pdf.set_font("Helvetica", "B", 18)
    pdf.set_text_color(109, 40, 217)
    first_line, *rest = text.splitlines()
    pdf.cell(0, 10, first_line.strip(), ln=1)

    # Body
    pdf.set_font("Helvetica", "", 10.5)
    pdf.set_text_color(30, 30, 50)
    for line in rest:
        line = line.rstrip()
        if not line:
            pdf.ln(2)
            continue
        if line.isupper() and len(line) < 40:
            pdf.ln(2)
            pdf.set_font("Helvetica", "B", 12)
            pdf.set_text_color(79, 70, 229)
            pdf.cell(0, 6, line.strip(), ln=1)
            pdf.set_font("Helvetica", "", 10.5)
            pdf.set_text_color(30, 30, 50)
            continue
        pdf.multi_cell(0, 5.2, line)

    pdf.output(str(DST))
    print(f"✓ Wrote {DST.relative_to(Path(__file__).parent)}")


if __name__ == "__main__":
    main()
