"""Synthetic TGDE-like PDFs only; never read prototype/student data."""
import fitz


def build_fixture(owner="990000000004", mode="text", fields=None, pages=4, thai_font=None):
    document = fitz.open()
    rows = [
        ["Student personal information", "Student ID No.: " + owner, "Name - Surname: Synthetic Student", "Major: Information Technology", "Department: Synthetic Department", "Faculty: Synthetic Faculty", "Cumulative GPA: 3.50", "Date of birth: 2004-02-29", "Nationality: Thai", "Registered Address: 12/3 Road: Synthetic Road", "Province: Bangkok Postcode: 00120", "Driving license [X] No", "Military status [X] Served"],
        ["Education Background", "Bachelor", "University: Synthetic University", "Certificate: BSc Major: Computing", "GPA: 3.45 Year graduated: 2026", "High Vocational", "University: Synthetic College", "Certificate: Diploma Major: Computing", "GPA: 3.20 Year graduated: 2022", "Job Training/Inspection/Apprenticeship", "Course: Safety Institute: Synthetic Institute", "Degree/Certificate: Attendance Period: two weeks"],
        ["Special Abilities", "Computer Ability", "Language Ability"],
        ["This page contains workflow-only fields which the profile import does not write."]
    ]
    if mode == "blank":
        rows = [["Student personal information", "Student ID No.: " + owner, "Date of birth:", "Nationality:", "Registered Address:", "Province: Postcode:"],
                ["Education Background", "Bachelor", "University:", "Certificate: Major:", "GPA: Year graduated:", "Job Training/Inspection/Apprenticeship", "Course: Institute:"],
                ["Special Abilities", "Computer Ability", "Language Ability"], ["Workflow fields are excluded."]]
        if fields is None: fields = {}
    for index in range(pages):
        page = document.new_page(width=595, height=842)
        page.insert_text((40, 35), "Unrelated Resume" if mode == "unsupported" else "TGDE-COOP-02", fontsize=16)
        for row_index, text in enumerate(rows[index % 4]):
            if thai_font and index == 0 and text.startswith("Nationality:"): continue
            page.insert_text((40, 75 + row_index * 24), text, fontsize=12)
    if fields is None:
        fields = {"profile.english_first_name": "Synthetic", "profile.english_last_name": "Student", "profile.father_phone": "0812345678", "profile.has_driving_license": False,
                  "skills.0.category": "computer", "skills.0.skill_name": "Python", "skills.0.proficiency": "very_good", "skills.1.category": "language", "skills.1.skill_name": "English", "skills.1.proficiency": "good"}
    for index, (name, value) in enumerate(fields.items()):
        if value is None: continue
        page = document[2 if name.startswith("skills") else 0]
        widget = fitz.Widget(); widget.field_name = name
        widget.rect = fitz.Rect(350, 400 + (index % 12) * 22, 550, 419 + (index % 12) * 22)
        widget.field_type = fitz.PDF_WIDGET_TYPE_CHECKBOX if isinstance(value, bool) else fitz.PDF_WIDGET_TYPE_TEXT
        widget.field_value = value if isinstance(value, bool) else str(value)
        widget.text_fontsize = 10
        page.add_widget(widget)
    if thai_font:
        font = fitz.Font(fontbuffer=thai_font)
        writer = fitz.TextWriter(document[0].rect)
        writer.append((40, 267), "สัญชาติ ไทย", font=font, fontsize=18)
        writer.write_text(document[0])
    if mode == "scan":
        scanned = fitz.open()
        for page in document:
            target = scanned.new_page(width=595, height=842)
            target.insert_image(target.rect, stream=page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False).tobytes("png"))
        document.close(); document = scanned
    elif mode == "active":
        document.xref_set_key(document.pdf_catalog(), "OpenAction", "<< /S /JavaScript /JS (app.alert\\(1\\)) >>")
    if mode == "encrypted":
        output = document.tobytes(encryption=fitz.PDF_ENCRYPT_AES_256, owner_pw="synthetic-only", user_pw="synthetic-only")
    else:
        output = document.tobytes(deflate=True, garbage=4)
    document.close()
    return output
