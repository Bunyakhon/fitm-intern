"""Local TGDE-COOP-02 extraction. PDF values are data; never commands or logs."""
import json
import re
import sys
from collections import defaultdict
from datetime import date
from io import BytesIO

import fitz

MAX_BYTES = 10 * 1024 * 1024
MAX_PAGES = 4
MAX_TEXT = 120_000
MAX_PIXELS = 6_000_000
PROFILE = set("prefix english_first_name english_last_name birth_date gender height_cm weight_kg religion ethnicity nationality blood_type medical_conditions allergies special_abilities related_skills hometown_address hometown_phone current_address current_phone father_name father_age father_occupation father_address father_phone mother_name mother_age mother_occupation mother_address mother_phone parent_contact_address parent_phone emergency_contact_name emergency_contact_relation emergency_contact_occupation emergency_contact_workplace emergency_contact_address emergency_contact_phone national_id_issue_date national_id_expiry_date has_driving_license driving_license_number driving_license_type driving_license_expiry_date military_status".split())
STUDENT = set("major department faculty year_level gpa last_semester_gpa".split())
CHILD = {
    "addresses": set("address_type house_no road subdistrict district province postal_code".split()),
    "education": set("education_level institution_name qualification major gpa graduation_year".split()),
    "training": set("course_name institution qualification period_text".split()),
    "skills": set("category skill_name proficiency".split()),
}
LEVELS = {"bachelor": r"Bachelor|ปริญญาตรี", "high_vocational": r"High\s+Vocational|อนุปริญญา|ปวส\.?", "high_school_vocational": r"High\s+School\s*/?\s*Vocational|มัธยมปลาย|ปวช\.?"}
RATINGS = {"very_good": r"Very\s+Good|ดีมาก", "good": r"(?<!Very )\bGood\b|(?<!มาก)\bดี\b", "moderate": r"Moderately|Moderate|ปานกลาง", "fair": r"\bPoor\b|\bFair\b|พอใช้"}
CHECKED = re.compile(r"☑|☒|✓|✔|\[[xX]\]")


def thai_pattern(pattern):
    # Some exported Thai fonts split combining characters into separate spans.
    # Make LABEL matching tolerant without removing spaces from personal VALUES.
    return re.sub(r"([\u0e00-\u0e7f])(?=[\u0e00-\u0e7f])", lambda match: match[1] + r"\s*", pattern)


class PdfError(ValueError):
    pass


def clean(value):
    text = re.sub(r"[\x00-\x1f\x7f]", " ", str(value or ""))
    return re.sub(r"\s+", " ", text).strip(" _.:…-–\t")[:2000]


def meaningful(value):
    return bool(re.search(r"[A-Za-z0-9\u0e00-\u0e7f]", clean(value)))


def calendar_value(value):
    raw = clean(value)
    # Never silently assume that an unmarked Thai year is Buddhist or Gregorian.
    iso = re.fullmatch(r"(\d{4})-(\d{2})-(\d{2})", raw)
    parts = re.fullmatch(r"(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})\s*(พ\.?ศ\.?|ค\.?ศ\.?|BE|CE)?", raw, re.I)
    if iso:
        year, month, day = map(int, iso.groups())
    elif parts and parts[4]:
        day, month, year = map(int, parts.groups()[:3])
        if re.search(r"พ|BE", parts[4], re.I):
            year -= 543
    else:
        return raw
    try:
        return date(year, month, day).isoformat()
    except ValueError:
        return raw


def official_layout(document):
    if len(document) != 4 or document[0].rotation or abs(document[0].rect.width - 595) > 3 or abs(document[0].rect.height - 842) > 3:
        return False
    for page, label, expected in [(0, "Student ID", 231), (0, "Registered Address", 393), (0, "Father", 571), (1, "University", 124), (2, "Computer Ability", 162)]:
        boxes = document[page].search_for(label)
        if not any(abs(box.y0 - expected) <= 8 for box in boxes): return False
    return True


def field_has_ink(page, box):
    # Verified fixed export geometry only. Remove an underline spanning the box;
    # blank input regions must not become neighboring label text.
    pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), clip=fitz.Rect(box), colorspace=fitz.csGRAY, alpha=False)
    samples = pix.samples
    count = 0
    for y in range(pix.height):
        dark = sum(value < 180 for value in samples[y * pix.stride:y * pix.stride + pix.width])
        if dark < pix.width * .65: count += dark
    return count > 20


PROFILE_BOXES = {
    "birth_date": (168, 312, 299, 327), "gender": (385, 312, 441, 327), "height_cm": (487, 312, 526, 327),
    "weight_kg": (73, 332, 141, 347), "religion": (186, 332, 283, 347), "ethnicity": (332, 332, 410, 347), "nationality": (461, 332, 540, 347),
    "hometown_phone": (462, 435, 540, 451), "current_phone": (145, 526, 305, 542),
    "father_name": (196, 574, 339, 589), "father_age": (365, 574, 381, 589), "father_occupation": (417, 574, 540, 589),
    "father_address": (148, 594, 338, 609), "father_phone": (465, 594, 540, 609),
    "mother_name": (208, 614, 339, 629), "mother_age": (365, 614, 381, 629), "mother_occupation": (417, 614, 540, 629),
    "mother_address": (148, 634, 338, 649), "mother_phone": (465, 634, 540, 649),
    "emergency_contact_name": (76, 684, 339, 700), "emergency_contact_relation": (420, 684, 540, 700),
    "emergency_contact_occupation": (121, 704, 339, 720), "emergency_contact_workplace": (436, 704, 540, 720),
    "emergency_contact_address": (148, 724, 338, 740), "emergency_contact_phone": (465, 724, 540, 740),
}
ADDRESS_BOXES = {
    "registered": {"house_no": (232,395,339,411), "road": (383,395,540,411), "subdistrict": (143,415,339,431), "district": (417,415,540,431), "province": (118,435,197,451), "postal_code": (295,435,339,451)},
    "current": {"house_no": (150,465,339,481), "road": (383,465,540,481), "subdistrict": (143,485,339,501), "district": (417,485,540,501), "province": (118,506,382,522), "postal_code": (480,506,540,522)},
}
EDUCATION_BOXES = {"institution_name": (148,126,540,142), "qualification": (139,146,325,162), "major": (358,146,540,162), "gpa": (154,166,297,182), "graduation_year": (446,166,540,182)}
def line_spans(page):
    groups = []
    # MuPDF reconstructs logical words before geometry ordering. Sorting individual
    # font spans can put Thai combining marks before their base characters.
    for left, top, right, bottom, text, *_ in page.get_text("words", sort=True):
        if not text.strip(): continue
        y = (top + bottom) / 2
        group = next((g for g in groups if abs(g[0] - y) < 5), None)
        if group is None:
            group = [y, []]; groups.append(group)
        group[1].append((left, text))
    return [(y / page.rect.height, " ".join(text for _, text in sorted(items))) for y, items in sorted(groups)]


def ocr_lines(page):
    import pytesseract
    from PIL import Image
    if not {"tha", "eng"}.issubset(set(pytesseract.get_languages(config=""))):
        raise PdfError("OCR_LANGUAGES_UNAVAILABLE")
    scale = 200 / 72
    if page.rect.width * page.rect.height * scale * scale > MAX_PIXELS:
        raise PdfError("PDF_PAGE_TOO_LARGE")
    pix = page.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False)
    image = Image.open(BytesIO(pix.tobytes("png")))
    try:
        data = pytesseract.image_to_data(image, lang="tha+eng", config="--psm 6", output_type=pytesseract.Output.DICT, timeout=12)
    except RuntimeError as exc:
        raise PdfError("OCR_TIMEOUT") from exc
    finally:
        image.close()
    groups = defaultdict(list)
    for i, text in enumerate(data["text"]):
        if text.strip():
            groups[(data["block_num"][i], data["par_num"][i], data["line_num"][i])].append(i)
    return sorted((sum(data["top"][i] for i in items) / len(items) / pix.height,
                   " ".join(data["text"][i] for i in sorted(items, key=lambda i: data["left"][i]))) for items in groups.values())


def label_specs(context):
    # Matching bilingual labels independently makes blank Thai label segments harmless.
    names = [
        ("identity", "student_id", r"Student\s*ID\s*(?:No\.?)?|รหัส\s*(?:ประจำตัว|ประจําตัว)?\s*นักศึกษา"),
        ("identity", "thai_name", r"ชื่อ\s*[-–]\s*(?:สกุล|นามสกุล)"),
        ("identity", "english_name", r"Name\s*[-–]\s*Surname"),
        ("student", "major", r"สาขาวิชา|\bMajor\b"), ("student", "department", r"ภาควิชา|\bDepartment\b"),
        ("student", "faculty", r"คณะ|\bFaculty\b"), ("student", "year_level", r"ชั้นปี|Year\s*level"),
        ("student", "last_semester_gpa", r"เกรดเฉลี่ยเทอมที่ผ่านมา|Last\s*semester\s*GPA"),
        ("student", "gpa", r"เกรดเฉลี่ยสะสม|Cumulative\s*GPA"),
        ("profile", "birth_date", r"วัน/?เดือน/?ปีเกิด|วันเกิด|Date\s*of\s*birth"),
        ("profile", "gender", r"เพศ|\bGender\b"), ("profile", "height_cm", r"ส่วนสูง|\bHeight\b"),
        ("profile", "weight_kg", r"น้ำหนัก|น้ําหนัก|\bWeight\b"), ("profile", "religion", r"ศาสนา|\bReligion\b"),
        ("profile", "ethnicity", r"เชื้อชาติ|\bEthnicity\b"), ("profile", "nationality", r"สัญชาติ|\bNationality\b"),
        ("profile", "blood_type", r"กรุ๊ปเลือด|Blood\s*type"),
        ("profile", "national_id_issue_date", r"วันที่ออกบัตร|Issue\s*date"), ("profile", "national_id_expiry_date", r"วันที่หมดอายุ|วันหมดอายุ(?=.*บัตร)|ID\s*expiry\s*date"),
        ("blocked", "national_id", r"เลขบัตรประชาชน|National\s*ID\s*(?:No\.?)?"),
        ("boundary", "age", r"\bAge\b|อายุ|(?<![ก-๙])ปี(?![ก-๙])|ซม\.?|\bcm\b|กก\.?|\bkg\b"),
    ]
    if context != "personal":
        names = [("boundary", "unit", r"ซม\.?|\bcm\b|กก\.?|\bkg\b"), ("blocked", "email", r"อีเมล|E\s*[-–]?\s*mail")]
    if context in ["father", "mother", "emergency"]:
        prefix = context if context != "emergency" else "emergency_contact"
        names = [entry for entry in names if entry[:2] != ("identity", "thai_name")]
        names += [("profile", prefix + "_name", r"Father[’']?s?\s*name\s*[-–]\s*surname|Mother[’']?s?\s*name\s*[-–]\s*surname|ชื่อ\s*[-–]\s*(?:สกุล|นามสกุล)"),
                  ("profile", prefix + "_occupation", r"อาชีพ|\bOccupation\b"),
                  ("profile", prefix + "_address", r"ที่อยู่ปัจจุบัน(?:ที่)?(?:เลขที่)?|\bAddress\b"),
                  ("profile", prefix + "_phone", r"(?:เบอร์)?โทรศัพท์|Telephone\s*No\.?|\bPhone\b")]
        if context != "emergency":
            names = [entry for entry in names if entry[:2] != ("boundary", "age")]
            names += [("profile", prefix + "_age", r"อายุ|\bAge\b"), ("boundary", "unit", r"ปี")]
        else:
            names += [("profile", "emergency_contact_relation", r"ความเกี่ยวข้อง|\bRelationship\b"), ("profile", "emergency_contact_workplace", r"สถานที่ทำงาน|สถานที่ทํางาน|Place\s*of\s*work")]
    elif context in ["registered", "current"]:
        names += [("addresses", "house_no", r"(?:ที่อยู่ตามทะเบียนบ้าน|ที่อยู่ปัจจุบัน)?(?:เลขที่)|Registered\s*Address|\bAddress\b|House\s*(?:No\.?)?"),
                  ("addresses", "road", r"ถนน|\bRoad\b"), ("addresses", "subdistrict", r"แขวง/?ตำบล|แขวง/?ตําบล|Sub\s*[-–]?\s*District"),
                  ("addresses", "district", r"อำเภอ/?เขต|อําเภอ/?เขต|(?<!Sub-)\bDistrict\b"),
                  ("addresses", "province", r"จังหวัด|\bProvince\b"), ("addresses", "postal_code", r"รหัสไปรษณีย์|\bPostcode\b|Postal\s*code"),
                  ("profile", "hometown_phone" if context == "registered" else "current_phone", r"โทรศัพท์|Telephone\s*No\.?|\bPhone\b"),
                  ("blocked", "email", r"อีเมล|E\s*[-–]?\s*mail")]
    return names


def labelled_values(text, specs):
    matches = []
    for scope, key, pattern in specs:
        matches += [(m.start(), m.end(), scope, key) for m in re.finditer(thai_pattern(pattern), text, re.I)]
    # Longer label wins when aliases overlap (e.g. Sub-District vs District).
    selected = []
    for item in sorted(matches, key=lambda item: (item[0], -item[1])):
        if selected and item[0] < selected[-1][1]:
            continue
        same = next((i for i, entry in enumerate(selected) if entry[2:] == item[2:]), None)
        if same is not None:
            prior = selected[same]
            gap = text[prior[1]:item[0]]
            if not meaningful(gap) or re.search(r"/\s*$", gap):
                selected[same] = (prior[0], item[1], *prior[2:])
            continue  # A label word in a value is not another field (e.g. a University name).
        selected.append(item)
    for i, (_, end, scope, key) in enumerate(selected):
        stop = selected[i + 1][0] if i + 1 < len(selected) else len(text)
        value = clean(text[end:stop]).lstrip("/").strip()
        residue = value
        for _, _, pattern in specs:
            residue = re.sub(thai_pattern(pattern), "", residue, flags=re.I)
        # Empty underlines followed by another label/unit do not become data.
        if not meaningful(residue):
            continue
        if meaningful(value):
            yield scope, key, value


def extract_document(data):
    if len(data) > MAX_BYTES or not data.startswith(b"%PDF-"):
        raise PdfError("INVALID_PDF")
    try:
        document = fitz.open(stream=data, filetype="pdf")
    except Exception as exc:
        raise PdfError("CORRUPTED_PDF") from exc
    with document:
        if document.is_encrypted:
            raise PdfError("ENCRYPTED_PDF")
        if not 1 <= len(document) <= MAX_PAGES or document.xref_length() > 20_000:
            raise PdfError("PDF_RESOURCE_LIMIT")
        for xref in range(1, document.xref_length()):
            try:
                object_text = document.xref_object(xref)
            except RuntimeError:
                continue  # Free/unallocated xref slots in otherwise readable exports.
            if re.search(r"/(?:JavaScript|JS|Launch|RichMedia|EmbeddedFile|XFA|SubmitForm|ImportData|GoToR|GoToE)\b", object_text):
                raise PdfError("ACTIVE_PDF_NOT_SUPPORTED")
        fixed_layout = official_layout(document)
        text_owner, text_owners = None, set()
        for _, line in line_spans(document[0]):
            if not re.search(r"Student\s*ID", line, re.I): continue
            for scope, key, value in labelled_values(line, label_specs("personal")):
                if scope == "identity" and key == "student_id" and re.fullmatch(r"[A-Za-z0-9_-]{1,64}", value.replace(" ", "")):
                    text_owner = value.replace(" ", "")
                    text_owners.add(text_owner)
        pages = []
        sources = []
        for page in document:
            if page.rect.width > 1000 or page.rect.height > 1400 or page.rect.width < 100 or page.rect.height < 100:
                raise PdfError("PDF_PAGE_TOO_LARGE")
            lines = line_spans(page)
            layer = " ".join(line for _, line in lines)
            source = "pdf_text"
            thai_chars = sum("\u0e00" <= char <= "\u0e7f" for char in layer)
            # Broken ToUnicode ordering can make a layer look plentiful while
            # Thai labels/combining vowels are unreadable. Render and OCR locally.
            broken_thai = thai_chars > 80 and (page.number == 0 and "ส่วนสูง" not in layer
                or page.number == 1 and "ปีที่สำเร็จการศึกษา" not in layer and "ปีที่สําเร็จการศึกษา" not in layer)
            # A tiny header alone is insufficient for a scanned form; use local OCR.
            if broken_thai or len(re.findall(r"[A-Za-z0-9\u0e00-\u0e7f]", layer)) < 80 and (page.get_images() or page.get_drawings()):
                lines, source = ocr_lines(page), "ocr"
            pages.append(lines)
            sources.append(source)
        all_text = "\n".join(text for lines in pages for _, text in lines)
        if len(all_text) > MAX_TEXT:
            raise PdfError("PDF_TEXT_LIMIT")
        compact = re.sub(r"\s+", "", all_text).upper().replace("–", "-").replace("—", "-")
        anchors = [r"Student\s*personal\s*information|ข้อมูลส่วนตัว", r"Education\s*Background|ประวัติการศึกษา", r"Special\s*Abilities|ความสามารถพิเศษ", r"Registered\s*Address|ที่อยู่ตามทะเบียนบ้าน"]
        if "TGDE-COOP-02" not in compact or sum(bool(re.search(thai_pattern(pattern), all_text, re.I)) for pattern in anchors) < 2:
            raise PdfError("UNSUPPORTED_TEMPLATE")
        candidates, records, identity, warnings = {}, {kind: [] for kind in CHILD}, {}, set()
        if len(text_owners) > 1: warnings.add("STUDENT_ID_UNREADABLE")
        address_rows = {kind: {"address_type": kind} for kind in ["registered", "current"]}

        def put(scope, key, value, page, source):
            if scope == "identity":
                if key == "student_id":
                    value = clean(value).replace(" ", "")
                    if not re.fullmatch(r"[A-Za-z0-9_-]{1,64}", value):
                        warnings.add("STUDENT_ID_UNREADABLE")
                        return
                    if identity.get(key) and identity[key] != value:
                        warnings.add("STUDENT_ID_UNREADABLE")
                identity[key] = value
            elif scope == "profile" and key in PROFILE or scope == "student" and key in STUDENT:
                if key in ["father_age", "mother_age", "height_cm", "weight_kg", "year_level", "gpa", "last_semester_gpa"] and not re.search(r"\d", str(value)):
                    warnings.add("FIELD_VALUE_UNREADABLE")
                    return
                if key.endswith("_date"):
                    value = calendar_value(value)
                candidates[scope + "." + key] = {"scope": scope, "key": key, "value": value, "page": page, "source": source, "review_required": True}

        for index, lines in enumerate(pages):
            source, page_number = sources[index], index + 1
            if index == 0:
                context = "personal"
                for y, line in lines:
                    if y > .9:
                        continue  # Institutional footer is not a student's phone/address.
                    if re.search(thai_pattern(r"Registered\s*Address|ที่อยู่ตามทะเบียนบ้าน"), line, re.I): context = "registered"
                    elif context == "registered" and re.search(thai_pattern(r"ที่อยู่ปัจจุบัน|(?<!Registered )\bAddress\b"), line, re.I): context = "current"
                    if re.search(thai_pattern(r"Father|บิดา"), line, re.I): context = "father"
                    elif re.search(thai_pattern(r"Mother|มารดา"), line, re.I): context = "mother"
                    elif re.search(thai_pattern(r"Emergency\s*case|กรณีฉุกเฉิน"), line, re.I): context = "emergency"
                    specs = label_specs(context)
                    if re.search(r"เลขบัตรประชาชน|National\s*ID|วันที่ออกบัตร", line, re.I):
                        specs += [("profile", "national_id_expiry_date", r"วันหมดอายุ")]
                    for scope, key, value in labelled_values(line, specs):
                        if scope == "addresses":
                            address_rows[context][key] = value
                        elif scope not in ["blocked", "boundary"]:
                            put(scope, key, value, page_number, source)
                    if re.search(r"ใบอนุญาตขับขี่|ใบอนุญาตขับ|Driving\s*licen[cs]e", line, re.I):
                        for scope, key, value in labelled_values(line, [("profile", "driving_license_number", r"มี\s*เลขที่|License\s*(?:No\.?)"), ("profile", "driving_license_type", r"ประเภท|\bType\b"), ("profile", "driving_license_expiry_date", r"วันหมดอายุ|Expiry\s*date")]): put(scope, key, value, page_number, source)
                        checks = [(False, r"ไม่มี|\bNo\b"), (True, r"(?<!ไม่)มี(?:\s*เลขที่)?|\bYes\b")]
                        selected = [value for value, pattern in checks if re.search(r"(?:☑|☒|✓|✔|\[[xX]\])\s*(?:" + pattern + r")", line, re.I)]
                        if len(selected) == 1: put("profile", "has_driving_license", selected[0], page_number, source)
                        else: warnings.add("LICENSE_CHECKBOX_REVIEW_REQUIRED")
                    if re.search(r"Military\s*status|ภาวะทางทหาร", line, re.I):
                        selected = [value for value, pattern in [("served", r"รับการเกณฑ์แล้ว|Served"), ("not_yet_served", r"ยังไม่ได้รับการเกณฑ์|Not\s*yet\s*served")] if re.search(r"(?:☑|☒|✓|✔|\[[xX]\])\s*(?:" + pattern + r")", line, re.I)]
                        if len(selected) == 1: put("profile", "military_status", selected[0], page_number, source)
                        else: warnings.add("MILITARY_CHECKBOX_REVIEW_REQUIRED")
            if index == 1:
                education, training, mode = None, None, "education"
                for y, line in lines:
                    if y > .9: continue
                    if re.search(thai_pattern(r"Job\s*Training|ประวัติการฝึกอบรม|ประวัติฝึกอบรม"), line, re.I): mode = "training"
                    if mode == "education":
                        # A qualification/value containing a level is not a new section.
                        field_label = re.search(thai_pattern(r"สถานศึกษา|University|Institution|วุฒิการศึกษา|Certificate|Qualification|วิชาเอก|\bMajor\b|GPA|Year\s*graduated|ปีที่สำเร็จการศึกษา|ปีที่สําเร็จการศึกษา"), line, re.I)
                        found = None if field_label else next((key for key, pattern in LEVELS.items() if re.search(thai_pattern(pattern), line, re.I)), None)
                        if found:
                            if education and len(education) > 1: records["education"].append({"values": education, "page": page_number, "source": source})
                            education = {"education_level": found}
                        elif education is not None:
                            for _, key, value in labelled_values(line, [("education", "institution_name", r"สถานศึกษา|University|Institution"), ("education", "qualification", r"วุฒิการศึกษา|Certificate|Qualification"), ("education", "major", r"วิชาเอก|\bMajor\b"), ("education", "gpa", r"ระดับคะแนนเฉลี่ย\s*\(?GPA\.?\)?|\(?GPA\.?\)?"), ("education", "graduation_year", r"ปีที่สำเร็จการศึกษา|ปีที่สําเร็จการศึกษา|Year\s*graduated")]): education[key] = value
                    else:
                        if re.search(r"ชื่อหลักสูตร|\bCourse\b", line, re.I):
                            if training: records["training"].append({"values": training, "page": page_number, "source": source})
                            training = {}
                        if training is not None:
                            for _, key, value in labelled_values(line, [("training", "course_name", r"ชื่อหลักสูตร|\bCourse\b"), ("training", "institution", r"สถาบัน|\bInstitute\b"), ("training", "qualification", r"วุฒิที่ได้รับ|Degree\s*/?\s*Certificate"), ("training", "period_text", r"ระยะเวลา\s*\(?Period\)?|\(?Period\)?")]): training[key] = value
                if education and len(education) > 1: records["education"].append({"values": education, "page": page_number, "source": source})
                if training: records["training"].append({"values": training, "page": page_number, "source": source})
            if index == 2:
                if source == "pdf_text":
                    try:
                        for table in document[index].find_tables().tables:
                            category = None
                            for row in table.extract():
                                first = clean(row[0]) if row else ""
                                if re.search(r"Computer\s*Ability|ความสามารถทางคอมพิวเตอร์", first, re.I): category = "computer"; continue
                                if re.search(r"Language\s*Ability|ความสามารถทางภาษา", first, re.I): category = "language"; continue
                                if category and re.match(r"\d+\)", first):
                                    name = clean(CHECKED.sub("", re.sub(r"^\d+\)\s*", "", first)))
                                    marks = [i for i, cell in enumerate(row[1:5]) if CHECKED.search(str(cell or ""))]
                                    if meaningful(name):
                                        values = {"category": category, "skill_name": name}
                                        if len(marks) == 1: values["proficiency"] = ["very_good", "good", "moderate", "fair"][marks[0]]
                                        else: warnings.add("SKILL_RATING_REVIEW_REQUIRED")
                                        records["skills"].append({"values": values, "page": page_number, "source": source})
                    except Exception:
                        warnings.add("SKILL_TABLE_UNREADABLE")
                else:
                    warnings.add("OCR_SKILL_GRID_REVIEW_REQUIRED")
        for address in address_rows.values():
            if len(address) > 1: records["addresses"].append({"values": address, "page": 1, "source": sources[0]})
        # Only explicitly named, approved AcroForm fields. Unknown fields/actions never enter output.
        form_rows = defaultdict(dict)
        for page in document:
            for widget in page.widgets() or []:
                name, value = widget.field_name or "", widget.field_value
                if name in ["student_id", "identity.student_id", "identity.thai_name", "identity.english_name"]:
                    put("identity", name.split(".")[-1], clean(value), page.number + 1, "acroform")
                elif re.fullmatch(r"(?:profile|student)\.[a-z_]+", name) and meaningful(value):
                    scope, key = name.split(".")
                    if key == "has_driving_license":
                        if value not in ["Off", "No", "0", "Yes", "On", "1", "true", "false"]: continue
                        value = value in ["Yes", "On", "1", "true"]
                    put(scope, key, value, page.number + 1, "acroform")
                else:
                    match = re.fullmatch(r"(addresses|education|training|skills)\.(\d{1,2})\.([a-z_]+)", name)
                    if match and match[3] in CHILD[match[1]] and meaningful(value):
                        form_rows[(match[1], match[2])][match[3]] = clean(value)
        for (kind, _), row in form_rows.items():
            if kind == "addresses" and len(row) == 1 or kind == "education" and len(row) == 1 or kind == "skills" and not row.get("skill_name"): continue
            records[kind].append({"values": row, "page": None, "source": "acroform"})
        if text_owner:
            if identity.get("student_id") and identity["student_id"] != text_owner: warnings.add("STUDENT_ID_UNREADABLE")
            identity["student_id"] = text_owner
        if fixed_layout:
            for key, candidate in list(candidates.items()):
                box = PROFILE_BOXES.get(candidate["key"])
                if candidate["scope"] == "profile" and candidate["source"] != "acroform" and box and not field_has_ink(document[0], box): candidates.pop(key)
            filtered_addresses = []
            for item in records["addresses"]:
                row = item["values"]; boxes = ADDRESS_BOXES.get(row.get("address_type"), {})
                row = {key: value for key, value in row.items() if key not in boxes or field_has_ink(document[0], boxes[key])}
                if len(row) > 1: filtered_addresses.append({**item, "values": row})
            records["addresses"] = filtered_addresses
            filtered_education = []
            for item in records["education"]:
                row = item["values"]; offset = ["bachelor", "high_vocational", "high_school_vocational"].index(row["education_level"]) * 90.48
                row = {key: value for key, value in row.items() if key not in EDUCATION_BOXES or field_has_ink(document[1], (EDUCATION_BOXES[key][0], EDUCATION_BOXES[key][1]+offset, EDUCATION_BOXES[key][2], EDUCATION_BOXES[key][3]+offset))}
                if len(row) > 1: filtered_education.append({**item, "values": row})
            records["education"] = filtered_education
        if identity.get("english_name"): warnings.add("ENGLISH_FULL_NAME_NEEDS_MANUAL_SPLIT")
        if "profile.has_driving_license" not in candidates: warnings.add("LICENSE_CHECKBOX_REVIEW_REQUIRED")
        else: warnings.discard("LICENSE_CHECKBOX_REVIEW_REQUIRED")
        if "profile.military_status" not in candidates: warnings.add("MILITARY_CHECKBOX_REVIEW_REQUIRED")
        else: warnings.discard("MILITARY_CHECKBOX_REVIEW_REQUIRED")
        if "student_id" not in identity: warnings.add("STUDENT_ID_NOT_FOUND")
        if "ocr" in sources: warnings.add("OCR_VALUES_REQUIRE_REVIEW")
        warnings.add("BLOCKED_ID_SIGNATURE_WORKFLOW_NOT_IMPORTED")
        return {"template": "TGDE-COOP-02", "page_count": len(document), "method": "ocr" if "ocr" in sources else "pdf_text", "candidates": list(candidates.values()), "records": records, "identity": identity, "warnings": sorted(warnings)}


if __name__ == "__main__":
    try:
        try:
            import resource
            resource.setrlimit(resource.RLIMIT_AS, (1024 * 1024 * 1024, 1024 * 1024 * 1024))
            resource.setrlimit(resource.RLIMIT_CPU, (45, 45))
            resource.setrlimit(resource.RLIMIT_NOFILE, (64, 64))
        except ImportError:
            pass
        output = extract_document(sys.stdin.buffer.read(MAX_BYTES + 1))
        print(json.dumps(output, ensure_ascii=False))
    except PdfError as error:
        print(json.dumps({"error": str(error)}))
    except Exception:
        print(json.dumps({"error": "PDF_PROCESSING_FAILED"}))
