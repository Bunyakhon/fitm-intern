import sys
import unittest
from pathlib import Path

from app.services.profile_pdf import extract_document, PdfError, calendar_value, labelled_values, official_layout
from profile_pdf_fixtures import build_fixture


class ProfilePdfTests(unittest.TestCase):
    def test_text_form_fields_checkbox_and_multiple_education(self):
        result = extract_document(build_fixture())
        fields = {(item["scope"], item["key"]): item["value"] for item in result["candidates"]}
        self.assertEqual(result["identity"]["student_id"], "990000000004")
        self.assertEqual(result["method"], "pdf_text")
        self.assertEqual(fields[("profile", "english_first_name")], "Synthetic")
        self.assertFalse(fields[("profile", "has_driving_license")])
        self.assertEqual(fields[("profile", "military_status")], "served")
        self.assertEqual(len(result["records"]["education"]), 2)
        self.assertEqual(result["records"]["education"][0]["values"]["institution_name"], "Synthetic University")
        self.assertEqual(len(result["records"]["training"]), 1)
        self.assertEqual(len(result["records"]["skills"]), 2)
        self.assertEqual(result["records"]["addresses"][0]["values"]["postal_code"], "00120")

    def test_blank_form_fields_do_not_generate_deletions(self):
        result = extract_document(build_fixture(fields={"profile.father_name": "", "profile.mother_phone": ""}))
        self.assertFalse(any(item["key"] in ["father_name", "mother_phone"] for item in result["candidates"]))
        blank = extract_document(build_fixture(mode="blank"))
        self.assertFalse(blank["candidates"])
        self.assertTrue(all(not records for records in blank["records"].values()))

    def test_verified_layout_blank_regions_and_filled_birth_date(self):
        import fitz
        document = fitz.open()
        for _ in range(4): document.new_page(width=595, height=842)
        for page, x, y, text in [(0,40,35,"TGDE-COOP-02"),(0,40,75,"Student personal information"),(0,130,244,"Student ID: 990000000004"),(0,148,406,"Registered Address"),(0,95,584,"Father"),(1,40,75,"Education Background"),(1,375,52,"University"),(1,87,137,"University"),(2,40,75,"Special Abilities"),(2,179,175,"Computer Ability")]:
            document[page].insert_text((x,y),text,fontsize=12)
        self.assertTrue(official_layout(document), "header University must not conceal the field anchor")
        blank = extract_document(document.tobytes())
        self.assertFalse(blank["candidates"])
        self.assertFalse(blank["records"]["addresses"])
        document[0].insert_text((40,324),"Date of birth:",fontsize=10)
        document[0].insert_text((180,324),"2004-02-29",fontsize=10)
        filled = extract_document(document.tobytes())
        self.assertEqual(next(x["value"] for x in filled["candidates"] if x["key"] == "birth_date"), "2004-02-29")
        document.close()

    def test_read_only_and_blocked_form_fields_do_not_enter_candidates(self):
        result = extract_document(build_fixture(fields={"profile.national_id": "9999999999999", "student.first_name": "Injected", "student.status": "approved", "profile.signature": "signed"}))
        self.assertFalse(any(item["key"] in ["national_id", "first_name", "status", "signature"] for item in result["candidates"]))

    def test_conflicting_text_and_acroform_student_ids_are_not_silently_reconciled(self):
        result = extract_document(build_fixture(fields={"identity.student_id":"990000000888"}))
        self.assertIn("STUDENT_ID_UNREADABLE", result["warnings"])

    def test_calendar_conversion_requires_explicit_era(self):
        self.assertEqual(calendar_value("29/02/2547 พ.ศ."), "2004-02-29")
        self.assertEqual(calendar_value("29/02/2547"), "29/02/2547")
        self.assertEqual(calendar_value("2023-02-30"), "2023-02-30")

    def test_labels_inside_values_do_not_truncate_values(self):
        result = list(labelled_values("University: Synthetic University Certificate: BSc", [("education", "institution_name", "University"), ("education", "qualification", "Certificate")]))
        self.assertEqual(result[0][2], "Synthetic University")

    def test_resource_encrypted_corrupted_active_and_unsupported(self):
        for mode, error in [("encrypted", "ENCRYPTED_PDF"), ("active", "ACTIVE_PDF_NOT_SUPPORTED")]:
            with self.assertRaisesRegex(PdfError, error): extract_document(build_fixture(mode=mode))
        with self.assertRaisesRegex(PdfError, "PDF_RESOURCE_LIMIT"): extract_document(build_fixture(pages=5))
        with self.assertRaises(PdfError): extract_document(b"%PDF-corrupt")
        with self.assertRaises(PdfError): extract_document(b"not a PDF")
        document = __import__("fitz").open(); page = document.new_page(); page.insert_text((40,40), "A completely unrelated resume with enough readable text to avoid OCR.")
        with self.assertRaisesRegex(PdfError, "UNSUPPORTED_TEMPLATE"): extract_document(document.tobytes())
        document.close()

    def test_scanned_english_fixture_uses_actual_local_ocr(self):
        result = extract_document(build_fixture(mode="scan", fields={}))
        self.assertEqual(result["method"], "ocr")
        self.assertEqual(result["identity"]["student_id"], "990000000004")
        self.assertIn("OCR_VALUES_REQUIRE_REVIEW", result["warnings"])


if __name__ == "__main__":
    unittest.main()
