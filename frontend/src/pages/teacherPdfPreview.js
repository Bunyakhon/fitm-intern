import { API_BASE_URL } from '../api/client.js';

const assets = `${API_BASE_URL.replace(/\/$/, '')}/api/teachers/project-documents/viewer-assets/`;
let enginePromise;
async function engine() {
  if (!enginePromise) enginePromise = import(/* @vite-ignore */ `${assets}pdf.mjs`).catch(error => { enginePromise = null; throw error; });
  return enginePromise;
}

// Render one page at a time. PDF actions/JavaScript/attachments/annotations are
// never mounted; only canvas pixels and textContent enter the existing modal.
export function mountTeacherPdfPreview({ document, root, blob, isCurrent }) {
  const target = document.defaultView;
  let disposed = false, loadingTask, pdf, pdfWorker, worker, workerUrl, renderTask, page = 1, rendering = false;
  const active = () => !disposed && isCurrent();
  const el = (tag, text = '') => { const node = document.createElement(tag); node.textContent = text; return node; };
  const wrapper = el('div'); wrapper.className = 'teacher-document-pdf';
  const bar = el('div'); bar.className = 'teacher-document-actions';
  const previous = el('button', 'หน้าก่อน'), next = el('button', 'หน้าถัดไป'), retry = el('button', 'ลองแสดงหน้านี้อีกครั้ง'), status = el('span');
  for (const button of [previous, next, retry]) { button.type = 'button'; button.className = 'teacher-button'; button.disabled = true; }
  retry.hidden = true;
  status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
  const canvas = el('canvas'); canvas.setAttribute('role', 'img');
  const accessible = el('details'), summary = el('summary', 'อ่านข้อความในหน้านี้'), text = el('p'); accessible.append(summary, text);
  bar.append(previous, status, next, retry); wrapper.append(bar, canvas, accessible); root.append(wrapper);
  function controls() { previous.disabled = !active() || rendering || page <= 1; next.disabled = !active() || rendering || !pdf || page >= pdf.numPages; retry.disabled = !active() || rendering; }
  async function render() {
    if (!active() || rendering) return;
    rendering = true; retry.hidden = true; controls(); status.textContent = `กำลังแสดงหน้า ${page}...`; text.textContent = ''; canvas.width = canvas.height = 0;
    try {
      const currentPage = await pdf.getPage(page);
      if (!active()) return;
      const base = currentPage.getViewport({ scale: 1 });
      const width = Math.max(240, Math.min(root.clientWidth || 800, 1600));
      const scale = Math.min(width / base.width * Math.min(target.devicePixelRatio || 1, 2), 2,
        Math.sqrt(4000000 / (base.width * base.height)));
      const viewport = currentPage.getViewport({ scale });
      canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height); canvas.setAttribute('aria-label', `เอกสาร PDF หน้า ${page} จาก ${pdf.numPages}`);
      renderTask = currentPage.render({ canvasContext: canvas.getContext('2d'), viewport, annotationMode: 0 });
      await renderTask.promise;
      if (!active()) return;
      const content = await currentPage.getTextContent();
      if (!active()) return;
      text.textContent = content.items.map(item => item.str || '').join(' ') || 'หน้านี้ไม่มีข้อความที่ดึงอ่านได้';
      status.textContent = `หน้า ${page} / ${pdf.numPages}`; currentPage.cleanup();
    } finally { rendering = false; controls(); }
  }
  function renderError() { if (active()) { status.textContent = 'แสดงหน้านี้ไม่ได้ กรุณาลองอีกครั้งหรือดาวน์โหลด'; retry.hidden = false; controls(); } }
  previous.addEventListener('click', () => { if (active() && !rendering && page > 1) { page--; render().catch(renderError); } });
  next.addEventListener('click', () => { if (active() && !rendering && pdf && page < pdf.numPages) { page++; render().catch(renderError); } });
  retry.addEventListener('click', () => { if (active() && !rendering) render().catch(renderError); });
  function dispose() {
    disposed = true; renderTask?.cancel();
    if (loadingTask) loadingTask.destroy().catch(() => {});
    pdfWorker?.destroy(); worker?.terminate();
    if (workerUrl) target.URL.revokeObjectURL(workerUrl);
    canvas.width = canvas.height = 0; wrapper.remove();
  }
  const ready = (async () => {
    const library = await engine(); if (!active()) return;
    workerUrl = target.URL.createObjectURL(new target.Blob([`import ${JSON.stringify(`${assets}pdf.worker.mjs`)};`], { type: 'text/javascript' }));
    worker = new target.Worker(workerUrl, { type: 'module' }); pdfWorker = new library.PDFWorker({ port: worker });
    const data = new Uint8Array(await blob.arrayBuffer()); if (!active()) return;
    loadingTask = library.getDocument({ data, worker: pdfWorker, isEvalSupported: false, enableXfa: false,
      useWasm: false, useWorkerFetch: false, useSystemFonts: true, cMapUrl: `${assets}cmaps/`, cMapPacked: true, standardFontDataUrl: `${assets}standard_fonts/` });
    pdf = await loadingTask.promise; if (!active()) return;
    await render();
  })();
  return { ready, dispose };
}
