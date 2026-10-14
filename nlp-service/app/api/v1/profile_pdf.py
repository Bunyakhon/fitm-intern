"""Bounded internal processing; no account/database/file persistence."""
import asyncio
import json
import os
import signal
import subprocess
import sys
import tempfile

from fastapi import APIRouter, File, HTTPException, UploadFile

router = APIRouter(prefix="/profile-pdf", tags=["profile-pdf"])
MAX_BYTES = 10 * 1024 * 1024
_slots = asyncio.Semaphore(2)


def run_worker(data):
    # OCR subprocesses use this private, per-request directory. Parent cleans it
    # after normal completion or a killed worker/process group.
    with tempfile.TemporaryDirectory(prefix="fitm-profile-pdf-") as directory:
        return _run_worker(data, directory)


def _run_worker(data, directory):
    process = subprocess.Popen([sys.executable, "-m", "app.services.profile_pdf"], stdin=subprocess.PIPE,
                               stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, start_new_session=True,
                               env={**os.environ, "TMPDIR": directory, "TMP": directory, "TEMP": directory})
    try:
        output, _ = process.communicate(data, timeout=45)
        if len(output) > 512_000 or process.returncode != 0:
            return {"error": "PDF_PROCESSING_FAILED"}
        return json.loads(output)
    except subprocess.TimeoutExpired:
        os.killpg(process.pid, signal.SIGKILL)
        process.communicate()
        return {"error": "PDF_PROCESSING_TIMEOUT"}
    except Exception:
        if process.poll() is None:
            os.killpg(process.pid, signal.SIGKILL)
            process.communicate()
        return {"error": "PDF_PROCESSING_FAILED"}


@router.post("")
async def extract_profile_pdf(file: UploadFile = File(...)):
    if file.content_type != "application/pdf" or not (file.filename or "").lower().endswith(".pdf"):
        await file.close()
        raise HTTPException(400, detail="INVALID_PDF")
    if _slots.locked():
        await file.close()
        raise HTTPException(503, detail="PDF_PROCESSOR_BUSY")
    async with _slots:
        try:
            data = await file.read(MAX_BYTES + 1)
            if len(data) > MAX_BYTES:
                raise HTTPException(413, detail="PDF_TOO_LARGE")
            result = await asyncio.to_thread(run_worker, data)
            if result.get("error"):
                code = result["error"]
                raise HTTPException(503 if code in ["OCR_LANGUAGES_UNAVAILABLE", "PDF_PROCESSOR_BUSY"] else 422, detail=code)
            return result
        finally:
            await file.close()
