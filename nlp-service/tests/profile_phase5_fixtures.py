"""Acceptance fixtures contain only invented data; no prototype/student rows."""
import fitz
from profile_pdf_fixtures import build_fixture


def flattened(result):
    fields = {item['scope'] + '.' + item['key']: item['value'] for item in result.get('candidates', [])}
    fields.update({'identity.' + key: value for key, value in result.get('identity', {}).items()})
    for kind, rows in result.get('records', {}).items():
        for index, row in enumerate(rows):
            fields.update({f'{kind}.{index}.{key}': value for key, value in row['values'].items()})
    return fields


def fixtures(thai_font):
    common = {'identity.student_id': '990000000004', 'student.major': 'Information Technology',
              'student.department': 'Synthetic Department', 'student.faculty': 'Synthetic Faculty',
              'student.gpa': '3.50', 'profile.birth_date': '2004-02-29', 'profile.nationality': 'Thai',
              'profile.has_driving_license': False, 'profile.military_status': 'served',
              'addresses.0.house_no': '12/3', 'addresses.0.road': 'Synthetic Road',
              'addresses.0.province': 'Bangkok', 'addresses.0.postal_code': '00120',
              'education.0.education_level': 'bachelor', 'education.0.institution_name': 'Synthetic University',
              'education.0.qualification': 'BSc', 'education.0.major': 'Computing', 'education.0.gpa': '3.45',
              'education.0.graduation_year': '2026', 'education.1.education_level': 'high_vocational',
              'education.1.institution_name': 'Synthetic College', 'education.1.qualification': 'Diploma',
              'education.1.major': 'Computing', 'education.1.gpa': '3.20', 'education.1.graduation_year': '2022',
              'training.0.course_name': 'Safety', 'training.0.institution': 'Synthetic Institute',
              'training.0.qualification': 'Attendance', 'training.0.period_text': 'two weeks'}
    form = {'profile.english_first_name': 'Synthetic', 'profile.english_last_name': 'Student',
            'profile.father_phone': '0812345678', 'skills.0.category': 'computer', 'skills.0.skill_name': 'Python',
            'skills.0.proficiency': 'very_good', 'skills.1.category': 'language', 'skills.1.skill_name': 'English',
            'skills.1.proficiency': 'good'}
    result = [{'name': 'A_text_acroform', 'pdf': build_fixture(), 'expected': {**common, **form},
               'checkboxes': ['profile.has_driving_license', 'profile.military_status']}]
    # A fully scanned Thai fixture with Thai section anchors and independent values.
    doc = fitz.open()
    rows = [
        ['ข้อมูลส่วนตัว', 'รหัสนักศึกษา 990000000004', 'วันเกิด 2004-02-29', 'สัญชาติ ไทย',
         'ส่วนสูง 170 ซม.', 'น้ำหนัก 65 กก.', 'ศาสนา พุทธ', 'บิดา', 'ชื่อ - สกุล บิดาทดสอบ',
         'อายุ 42 ปี', 'โทรศัพท์ 0000000001'],
        ['ประวัติการศึกษา', 'ปริญญาตรี', 'สถานศึกษา สถาบันทดสอบ', 'วุฒิการศึกษา ปริญญาตรี',
         'วิชาเอก คอมพิวเตอร์', 'GPA 3.25', 'ปีที่สำเร็จการศึกษา 2026'],
        ['ความสามารถพิเศษ', 'ความสามารถทางคอมพิวเตอร์', 'ความสามารถทางภาษา'],
        ['ข้อมูลสังเคราะห์สำหรับทดสอบเท่านั้น']]
    font = fitz.Font(fontbuffer=thai_font)
    for content in rows:
        page = doc.new_page(width=595, height=842)
        page.insert_text((40, 35), 'TGDE-COOP-02', fontsize=16)
        writer = fitz.TextWriter(page.rect)
        for index, row in enumerate(content): writer.append((40, 85 + index * 34), row, font=font, fontsize=17)
        writer.write_text(page)
    scan = fitz.open()
    for page in doc:
        target = scan.new_page(width=595, height=842)
        target.insert_image(target.rect, stream=page.get_pixmap(matrix=fitz.Matrix(2, 2), alpha=False).tobytes('png'))
    expected_thai = {'identity.student_id': '990000000004', 'profile.birth_date': '2004-02-29',
                     'profile.nationality': 'ไทย', 'profile.height_cm': '170', 'profile.weight_kg': '65',
                     'profile.religion': 'พุทธ', 'profile.father_name': 'บิดาทดสอบ', 'profile.father_age': '42',
                     'profile.father_phone': '0000000001', 'education.0.education_level': 'bachelor',
                     'education.0.institution_name': 'สถาบันทดสอบ', 'education.0.qualification': 'ปริญญาตรี',
                     'education.0.major': 'คอมพิวเตอร์', 'education.0.gpa': '3.25', 'education.0.graduation_year': '2026'}
    result.append({'name': 'B_scan_thai', 'pdf': scan.tobytes(deflate=True, garbage=4), 'expected': expected_thai, 'checkboxes': []})
    doc.close(); scan.close()
    result.append({'name': 'C_scan_thai_english', 'pdf': build_fixture(mode='scan', fields={}, thai_font=thai_font),
                   'expected': {**common, 'profile.nationality': 'ไทย'},
                   'checkboxes': ['profile.has_driving_license', 'profile.military_status']})
    result.append({'name': 'D_explicit_checkbox', 'pdf': build_fixture(fields={'profile.has_driving_license': True}),
                   'expected': {**common, 'profile.has_driving_license': True},
                   'checkboxes': ['profile.has_driving_license', 'profile.military_status']})
    doc = fitz.open(stream=build_fixture(fields={}), filetype='pdf')
    page = doc[2]
    xs = [40, 270, 340, 410, 480, 550]; top = 200; height = 34
    grid = [['Computer Ability', '', '', '', ''], ['Skill', 'Very Good', 'Good', 'Moderate', 'Fair'],
            ['1) Python', '[X]', '', '', ''], ['2) SQL', '', '[X]', '', ''],
            ['Language Ability', '', '', '', ''], ['1) English', '', '', '[X]', '']]
    for x in xs: page.draw_line((x, top), (x, top + height * len(grid)))
    for row in range(len(grid)+1): page.draw_line((xs[0], top+height*row), (xs[-1], top+height*row))
    for row, cells in enumerate(grid):
        for col, value in enumerate(cells):
            if value: page.insert_text((xs[col]+5, top+height*row+21), value, fontsize=10)
    skills = {'skills.0.category': 'computer', 'skills.0.skill_name': 'Python', 'skills.0.proficiency': 'very_good',
              'skills.1.category': 'computer', 'skills.1.skill_name': 'SQL', 'skills.1.proficiency': 'good',
              'skills.2.category': 'language', 'skills.2.skill_name': 'English', 'skills.2.proficiency': 'moderate'}
    result.append({'name': 'E_text_skill_table', 'pdf': doc.tobytes(deflate=True, garbage=4), 'expected': skills, 'checkboxes': []})
    doc.close()
    result.append({'name': 'F_incomplete_blank', 'pdf': build_fixture(mode='blank'),
                   'expected': {'identity.student_id': '990000000004'}, 'checkboxes': [], 'no_candidates_or_children': True})
    result.append({'name': 'G_unsupported_template', 'pdf': build_fixture(mode='unsupported'),
                   'expected': {}, 'checkboxes': [], 'error': 'UNSUPPORTED_TEMPLATE'})
    return result
