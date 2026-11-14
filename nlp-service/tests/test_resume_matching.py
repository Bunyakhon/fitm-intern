"""Focused HTTP regression tests against an already running Local NLP service.

Uses only the standard library and synthetic request bodies. Does not start
services, write files, access the database or create accounts.
Run from repository root: python -B nlp-service/tests/test_resume_matching.py
"""
import json
import unittest
from urllib.request import Request, urlopen


class ResumeMatchingTests(unittest.TestCase):
    def post(self, path, payload):
        request = Request(
            "http://127.0.0.1:8000/api/v1/" + path,
            data=json.dumps(payload).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urlopen(request, timeout=15) as response:
            self.assertEqual(response.status, 200)
            result = json.load(response)
        self.assertIsInstance(result["matches"], list)
        for match in result["matches"]:
            self.assertGreaterEqual(match["score"], 0)
            self.assertLessEqual(match["score"], 1)
            self.assertEqual(round(match["score"], 4), match["score"])
        return result

    def resume(self, text, position, description):
        return self.post("resume-match", {
            "resume_text": text,
            "job_postings": [{"id": "fixture", "company_name": "Fixture",
                              "position": position, "description": description}],
            "top_k": 1,
        })

    def assert_exact_match(self, text, position, description):
        result = self.resume(text, position, description)
        self.assertEqual(result, {"matches": [{
            "job_id": "fixture", "company_name": "Fixture", "position": position,
            "score": 1.0,
        }]})

    def test_normal_english(self):
        self.assert_exact_match("python backend database", "python backend", "database")

    def test_normal_thai(self):
        self.assert_exact_match("พัฒนาโปรแกรม ฐานข้อมูล", "พัฒนาโปรแกรม", "ฐานข้อมูล")

    def test_mixed_thai_english(self):
        self.assert_exact_match("python ฐานข้อมูล", "python", "ฐานข้อมูล")

    def test_empty_corpus(self):
        self.assertEqual(self.resume("", "", ""), {"matches": []})

    def test_whitespace_corpus(self):
        self.assertEqual(self.resume(" \n\t ", " ", " "), {"matches": []})

    def test_stopwords_only(self):
        self.assertEqual(self.resume("the and for", "the", "and or"), {"matches": []})

    def test_punctuation_only(self):
        self.assertEqual(self.resume("!!!", "???", "---"), {"matches": []})

    def test_empty_resume_with_valid_job(self):
        self.assertEqual(self.resume("", "python", "database"), {"matches": []})

    def test_no_jobs(self):
        self.assertEqual(self.post("resume-match", {
            "resume_text": "python", "job_postings": [],
        }), {"matches": []})

    def test_job_matching_contract_regression(self):
        identifier = "00000000-0000-4000-8000-000000000001"
        result = self.post("job-matches", {
            "schema_version": "job-matching.v1",
            "candidate": {"text": "python database", "resume_text": "python database"},
            "jobs": [{"job_posting_id": identifier, "text": "python database"}],
            "options": {"top_k": 10, "min_score": 0.05},
        })
        self.assertEqual(result, {"schema_version": "job-matching.v1", "matches": [
            {"job_posting_id": identifier, "score": 1.0, "rank": 1},
        ]})

    def test_job_matching_stopwords_regression(self):
        result = self.post("job-matches", {
            "schema_version": "job-matching.v1", "candidate": {"text": "the and"},
            "jobs": [{"job_posting_id": "00000000-0000-4000-8000-000000000001",
                      "text": "the or"}],
            "options": {"top_k": 10, "min_score": 0.05},
        })
        self.assertEqual(result, {"schema_version": "job-matching.v1", "matches": []})


if __name__ == "__main__":
    unittest.main(verbosity=2)
