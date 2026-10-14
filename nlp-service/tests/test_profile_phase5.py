import unittest
from unittest.mock import patch
from pathlib import Path
import tempfile
import subprocess

from app.services.profile_pdf import extract_document
from app.api.v1.profile_pdf import _run_worker, run_worker
from profile_pdf_fixtures import build_fixture
from profile_phase5_fixtures import fixtures, flattened


class ProfilePhase5Tests(unittest.TestCase):
    def test_spaced_thai_template_context_and_education_labels_preserve_raw_values(self):
        def spaced(text):return ' '.join(text)
        lines=[[(.03,'TGDE-COOP-02'),(.1,spaced('ข้อมูลส่วนตัว')),
                (.15,spaced('รหัสนักศึกษา')+' 990000000004'),(.2,spaced('สัญชาติ')+' ไท ย'),
                (.3,spaced('บิดา')),(.35,spaced('อายุ')+' 42 '+spaced('ปี'))],
               [(.1,spaced('ประวัติการศึกษา')),(.2,spaced('ปริญญาตรี')),
                (.3,spaced('สถานศึกษา')+' สถาบันทดสอบ'),(.4,spaced('วุฒิการศึกษา')+' ปริญญาตรี'),
                (.5,spaced('วิชาเอก')+' คอมพิวเตอร์'),(.6,'GPA 3.25')],
               [(.1,spaced('ความสามารถพิเศษ'))],[(.1,'Synthetic only')]]
        with patch('app.services.profile_pdf.ocr_lines',side_effect=lines):result=extract_document(build_fixture(mode='scan',fields={}))
        actual=flattened(result)
        self.assertEqual(actual['profile.nationality'],'ไท ย')
        self.assertEqual(actual['identity.student_id'],'990000000004')
        self.assertEqual(actual['profile.father_age'],'42')
        self.assertEqual(actual['education.0.education_level'],'bachelor')
        self.assertEqual(actual['education.0.institution_name'],'สถาบันทดสอบ')
        self.assertEqual(actual['education.0.qualification'],'ปริญญาตรี')
        self.assertEqual(actual['education.0.major'],'คอมพิวเตอร์')
        self.assertEqual(actual['education.0.gpa'],'3.25')

    def test_actual_text_skill_grid_maps_each_rating_column(self):
        # E is ASCII; no OS font or personal document dependency in regression tests.
        import fitz
        font = fitz.Font('helv').buffer
        fixture = next(x for x in fixtures(font) if x['name'] == 'E_text_skill_table')
        actual = flattened(extract_document(fixture['pdf']))
        for key, value in fixture['expected'].items(): self.assertEqual(actual.get(key), value, key)

    def test_ambiguous_checkbox_has_warning_and_no_inferred_value(self):
        import fitz
        doc = fitz.open(stream=build_fixture(fields={}), filetype='pdf')
        page = doc[0]; page.add_redact_annot(fitz.Rect(30,330,580,358), fill=(1,1,1)); page.apply_redactions()
        page.insert_text((40,339),'Driving license [X] No [X] Yes',fontsize=12)
        result = extract_document(doc.tobytes());doc.close()
        self.assertFalse(any(x['key']=='has_driving_license' for x in result['candidates']))
        self.assertIn('LICENSE_CHECKBOX_REVIEW_REQUIRED',result['warnings'])

    def test_worker_timeout_kills_process_group_and_drains_process(self):
        with tempfile.TemporaryDirectory() as directory, patch('app.api.v1.profile_pdf.subprocess.Popen') as popen, patch('app.api.v1.profile_pdf.os.killpg') as kill:
            process = popen.return_value;process.pid=12345
            process.communicate.side_effect=[subprocess.TimeoutExpired('synthetic',45),(b'',None)]
            self.assertEqual(_run_worker(b'%PDF-test',directory),{'error':'PDF_PROCESSING_TIMEOUT'})
            kill.assert_called_once();self.assertEqual(process.communicate.call_count,2)

    def test_worker_parent_removes_temporary_directory_after_failure(self):
        directories=[]
        def fail(data,directory):
            directories.append(directory);Path(directory,'synthetic.txt').write_text('synthetic');raise RuntimeError('synthetic')
        with patch('app.api.v1.profile_pdf._run_worker',side_effect=fail):
            with self.assertRaises(RuntimeError):run_worker(b'%PDF-test')
        self.assertFalse(Path(directories[0]).exists())


if __name__=='__main__':unittest.main()
