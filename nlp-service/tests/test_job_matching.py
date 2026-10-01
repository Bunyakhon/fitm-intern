from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app, raise_server_exceptions=False)

JOB_A = "11111111-1111-4111-8111-111111111111"
JOB_B = "22222222-2222-4222-8222-222222222222"


def payload(candidate="python sql", jobs=None, options=None):
    return {
        "schema_version": "job-matching.v1",
        "candidate": {"text": candidate},
        "jobs": jobs
        if jobs is not None
        else [
            {"job_posting_id": JOB_A, "text": "Python developer SQL web API"},
            {"job_posting_id": JOB_B, "text": "Graphic design illustrator"},
        ],
        "options": options or {"top_k": 5, "min_score": 0.05},
    }


def test_job_matches_returns_ranked_minimal_results():
    response = client.post("/api/v1/job-matches", json=payload())

    assert response.status_code == 200
    body = response.json()
    assert body["schema_version"] == "job-matching.v1"
    assert body["matches"][0]["job_posting_id"] == JOB_A
    assert body["matches"][0]["rank"] == 1
    assert 0 <= body["matches"][0]["score"] <= 1
    assert body["matches"][0]["score"] == round(body["matches"][0]["score"], 4)


def test_job_matches_rejects_empty_candidate_and_duplicate_ids():
    empty_candidate = client.post("/api/v1/job-matches", json=payload(candidate="   "))
    assert empty_candidate.status_code == 422

    duplicate = client.post(
        "/api/v1/job-matches",
        json=payload(
            jobs=[
                {"job_posting_id": JOB_A, "text": "python"},
                {"job_posting_id": JOB_A, "text": "sql"},
            ]
        ),
    )
    assert duplicate.status_code == 422


def test_job_matches_enforces_schema_ids_and_option_bounds():
    invalid_payloads = [
        {**payload(), "schema_version": "job-matching.v2"},
        payload(jobs=[{"job_posting_id": "not-a-uuid", "text": "python"}]),
        payload(options={"top_k": 0, "min_score": 0.05}),
        payload(options={"top_k": 101, "min_score": 0.05}),
        payload(options={"top_k": 5, "min_score": -0.01}),
        payload(options={"top_k": 5, "min_score": 1.01}),
    ]

    for invalid_payload in invalid_payloads:
        assert client.post("/api/v1/job-matches", json=invalid_payload).status_code == 422

    zero_threshold = client.post(
        "/api/v1/job-matches",
        json=payload(options={"top_k": 5, "min_score": 0}),
    )
    assert zero_threshold.status_code == 200


def test_job_matches_accepts_empty_jobs_and_never_500s_for_empty_vocabulary():
    empty_jobs = client.post("/api/v1/job-matches", json=payload(jobs=[]))
    assert empty_jobs.status_code == 200
    assert empty_jobs.json()["matches"] == []

    empty_vocabulary = client.post(
        "/api/v1/job-matches",
        json=payload(candidate="!!!", jobs=[{"job_posting_id": JOB_A, "text": "..."}]),
    )
    assert empty_vocabulary.status_code == 200
    assert empty_vocabulary.json()["matches"] == []


def test_job_matches_handles_thai_english_and_mixed_text():
    cases = [
        ("พัฒนาเว็บด้วยไพทอน", "พัฒนาเว็บด้วยไพทอน และฐานข้อมูล"),
        ("python sql api", "Python SQL API development"),
        ("พัฒนา API ด้วย python", "งานพัฒนา API ด้วย Python และ SQL"),
    ]

    for candidate, text in cases:
        response = client.post(
            "/api/v1/job-matches",
            json=payload(candidate=candidate, jobs=[{"job_posting_id": JOB_A, "text": text}]),
        )
        assert response.status_code == 200
        assert response.json()["matches"][0]["job_posting_id"] == JOB_A


def test_job_matches_applies_threshold_top_k_and_deterministic_tie_ordering():
    below_threshold = client.post(
        "/api/v1/job-matches",
        json=payload(candidate="python", jobs=[{"job_posting_id": JOB_A, "text": "illustrator design"}]),
    )
    assert below_threshold.status_code == 200
    assert below_threshold.json()["matches"] == []

    top_one = client.post(
        "/api/v1/job-matches",
        json=payload(
            candidate="python sql",
            jobs=[
                {"job_posting_id": JOB_A, "text": "python sql"},
                {"job_posting_id": JOB_B, "text": "python sql"},
            ],
            options={"top_k": 1, "min_score": 0.05},
        ),
    )
    assert top_one.status_code == 200
    assert top_one.json()["matches"] == [
        {"job_posting_id": JOB_A, "score": 1.0, "rank": 1}
    ]


def test_job_matches_returns_contiguous_ranks_and_four_decimal_scores():
    response = client.post(
        "/api/v1/job-matches",
        json=payload(
            candidate="python sql api",
            jobs=[
                {"job_posting_id": JOB_B, "text": "python sql"},
                {"job_posting_id": JOB_A, "text": "python sql api"},
            ],
            options={"top_k": 2, "min_score": 0},
        ),
    )

    assert response.status_code == 200
    matches = response.json()["matches"]
    assert [match["rank"] for match in matches] == list(range(1, len(matches) + 1))
    assert all(0 <= match["score"] <= 1 for match in matches)
    assert all(match["score"] == round(match["score"], 4) for match in matches)
