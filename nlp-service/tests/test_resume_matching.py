from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_resume_match_ranks_relevant_job_higher():
    payload = {
        "resume_text": "มีทักษะ python, django, sql เขียนเว็บแอปพลิเคชันได้",
        "job_postings": [
            {
                "id": "job1",
                "company_name": "บริษัท A",
                "position": "Backend Developer",
                "description": "ต้องการผู้มีทักษะ python django sql ทำ web application",
            },
            {
                "id": "job2",
                "company_name": "บริษัท B",
                "position": "Graphic Designer",
                "description": "ต้องการผู้มีทักษะ photoshop illustrator ออกแบบกราฟิก",
            },
        ],
    }
    response = client.post("/api/v1/resume-match", json=payload)
    assert response.status_code == 200

    matches = response.json()["matches"]
    assert len(matches) >= 1
    assert matches[0]["job_id"] == "job1"  # ควร match บริษัท A มากกว่าเพราะ skill ตรงกัน
