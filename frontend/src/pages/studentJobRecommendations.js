function element(tag, text, className = "") {
  const node = document.createElement(tag);
  if (text != null) node.textContent = text;
  node.className = className;
  return node;
}

function sourceLink(url) {
  if (typeof url !== "string" || !/^https:\/\/internth\.com\/job\/\d+$/.test(url)) return null;
  const link = element("a", "Internth", "job-source-link");
  link.href = url; link.target = "_blank"; link.rel = "noopener noreferrer";
  return link;
}

function contactSection(job) {
  const section = element("section", null, "job-contact-details");
  const contact = job.contact || {};
  section.setAttribute("aria-label", "ติดต่อสถานประกอบการ");
  section.append(element("h5", "ติดต่อสถานประกอบการ"));
  if (contact.synthetic && contact.samples_visible) {
    section.append(element("p", "ข้อมูลจำลองสำหรับ Development", "job-contact-synthetic-label"));
  }
  const fields = element("dl", null, "job-contact-fields");
  const row = (label, value) => {
    if (!value) value = "ยังไม่มีข้อมูล";
    const description = element("dd");
    if (typeof value === "string") description.textContent = value;
    else description.append(value);
    fields.append(element("dt", label), description);
  };
  row("บริษัท", job.company?.name || "ไม่ระบุสถานประกอบการ");
  const unavailable = field => contact.provenance?.[field] === "UNVERIFIED"
    ? "ข้อมูลติดต่อยังไม่ได้รับการยืนยัน"
    : contact.provenance?.[field] === "SYNTHETIC" ? "ข้อมูลจำลองสำหรับ Development" : "ยังไม่มีข้อมูล";
  const canShowContact = !contact.synthetic || contact.samples_visible === true;
  if (canShowContact && contact.phone) {
    let phone = contact.phone;
    if (!contact.synthetic && (contact.phone_source_verified || contact.phone_verified)) {
      phone = element("a", contact.phone);
      phone.href = `tel:${contact.phone.replace(/[^+\d]/g, "")}`;
    }
    row("โทร", phone);
  } else row("โทร", unavailable("phone"));
  if (canShowContact && contact.email) {
    let email = contact.email;
    if (!contact.synthetic && (contact.email_source_verified || contact.email_verified)) {
      email = element("a", contact.email);
      email.href = `mailto:${encodeURIComponent(contact.email)}`;
    }
    row("อีเมลทั่วไป", email);
  } else row("อีเมลทั่วไป", unavailable("email"));
  let shownWebsite = false;
  if (!contact.synthetic && contact.source?.type === "company_website") {
    try {
      const website = new URL(contact.website);
      if (website.protocol === "https:") {
        const link = element("a", website.hostname);
        link.href = website.href; link.target = "_blank"; link.rel = "noopener noreferrer";
        row("เว็บไซต์", link);
        shownWebsite = true;
      }
    } catch { /* Omit malformed URLs without adding debug text. */ }
  }
  if (!shownWebsite) row("เว็บไซต์", unavailable("website"));
  row("ที่อยู่สำนักงาน", canShowContact && contact.office_address || unavailable("office_address"));
  row("ประกาศต้นฉบับ", sourceLink(job.source_url));
  section.append(fields);
  if (contact.source?.type === "company_website") section.append(element("p", "ข้อมูลติดต่อทั่วไปอ้างอิงจากเว็บไซต์บริษัท ไม่ใช่การยืนยัน Email Ownership, ผู้ติดต่อ HR หรือการเปิดรับนักศึกษาปัจจุบัน", "job-matching-note"));
  else if (!contact.synthetic && Object.values(contact.provenance || {}).includes("UNVERIFIED")) section.append(element("p", "ข้อมูลติดต่อยังไม่ได้รับการยืนยัน", "job-matching-note"));
  if (!contact.phone && !contact.email) section.append(element("p", "ยังไม่มีข้อมูลติดต่อที่ยืนยันแหล่งที่มา", "job-matching-note"));
  section.append(element("p", "แนะนำให้ติดต่อสถานประกอบการเพื่อสอบถามการรับนักศึกษาสหกิจศึกษาก่อนเขียนคำร้อง", "job-matching-note"));
  return section;
}

export function renderMatchingAnalysis(target, analysis) {
  if (!target) return;
  target.replaceChildren();
  target.hidden = !analysis;
  if (analysis) target.append(element("p", analysis.computed
    ? "คะแนนแสดงความสอดคล้องของข้อความ ไม่ใช่โอกาสได้รับงาน ระดับทักษะใช้แสดงข้อมูลเท่านั้น"
    : "ยังไม่มีประกาศที่พร้อมใช้วิเคราะห์ ลองค้นหาประกาศทั้งหมดด้านล่าง", "job-matching-note"));
}

export function createJobCard(job, { recommendation = true, canWrite = false } = {}) {
  const card = element("article", null, "job-matching-card job-recommendation-card");
  if (recommendation && job.rank === 1) card.classList.add("is-top-ranked");
  const header = element("div", null, "job-recommendation-heading");
  if (recommendation && Number.isInteger(job.rank)) header.append(element("span", `#${job.rank}`, "job-matching-rank"));
  const identity = element("div", null, "job-recommendation-identity");
  identity.append(element("h4", job.title || "ไม่ระบุตำแหน่ง", "job-matching-title"),
    element("p", job.company?.name || "ไม่ระบุสถานประกอบการ", "job-matching-company"));
  if (job.source_name) identity.append(element("span", `แหล่งข้อมูล ${job.source_name}`, "job-source-label"));
  header.append(identity);
  card.append(header);

  if (recommendation && typeof job.score === "number" && Number.isFinite(job.score) && job.score >= 0 && job.score <= 1) {
    const percent = job.score * 100;
    const score = element("div", null, "job-recommendation-score");
    score.append(element("span", "ความสอดคล้องของข้อความ"), element("strong", `${percent.toFixed(1)}%`));
    const bar = element("div", null, "job-score-track");
    bar.setAttribute("role", "progressbar"); bar.setAttribute("aria-label", "คะแนนความสอดคล้องของข้อความ");
    bar.setAttribute("aria-valuemin", "0"); bar.setAttribute("aria-valuemax", "100"); bar.setAttribute("aria-valuenow", percent.toFixed(1));
    const fill = element("span"); fill.style.width = `${percent}%`; bar.append(fill);
    card.append(score, bar);
  }
  if (job.development_data) card.append(element("p", job.development_label || "ชุดข้อมูล Development · ยังไม่ยืนยันการเปิดรับจริง", "job-development-label"));
  if (job.hiring_status === "UNKNOWN / UNVERIFIED") card.append(element("p", "สถานะเปิดรับนักศึกษายังไม่ได้รับการยืนยัน กรุณาตรวจสอบกับสถานประกอบการ", "job-matching-note"));
  const metadata = element("div", null, "job-matching-metadata");
  if (job.company?.province) metadata.append(element("span", job.company.province));
  if (job.quota) metadata.append(element("span", `จำนวนตามประกาศ ${job.quota} คน`));
  if (job.compensation_text) metadata.append(element("span", job.compensation_text));
  if (job.work_schedule) metadata.append(element("span", job.work_schedule));
  else if (job.work_days_per_week) metadata.append(element("span", `${job.work_days_per_week} วัน/สัปดาห์${job.work_schedule_synthetic ? " (จำลอง)" : ""}`));
  const modes = { onsite: "On-site", hybrid: "Hybrid", work_from_home: "Work from home" };
  (job.workModes || []).forEach(({ mode }) => metadata.append(element("span", modes[mode] || mode)));
  card.append(metadata);
  if (recommendation) {
    const skills = job.explanation?.exact_skill_matches || [];
    const chips = element("div", null, "job-skill-chips");
    chips.setAttribute("aria-label", "ทักษะที่ตรวจพบในข้อความประกาศ");
    skills.forEach((skill) => chips.append(element("span", skill.skill_name, "job-skill-chip")));
    if (skills.length) card.append(element("p", "ทักษะที่ตรวจพบในประกาศ", "job-card-label"), chips);
    else card.append(element("p", "ยังไม่พบชื่อทักษะที่ตรงแบบชัดเจน ไม่ใช่การตัดสินคุณสมบัติ", "job-matching-note"));
  }
  const details = element("details", null, "job-card-details");
  details.append(element("summary", "รายละเอียดงาน"), element("p", job.display_description || job.description || "ยังไม่มีรายละเอียด"));
  card.append(details);

  const actions = element("div", null, "job-card-actions");
  const contact = contactSection(job);
  contact.hidden = true;
  contact.id = `job-contact-${recommendation ? "recommended" : "browse"}-${job.job_posting_id}`;
  const contactButton = element("button", "ดูช่องทางติดต่อสถานประกอบการ", "btn-secondary");
  contactButton.type = "button"; contactButton.setAttribute("aria-controls", contact.id); contactButton.setAttribute("aria-expanded", "false");
  contactButton.addEventListener("click", () => { contact.hidden = !contact.hidden; contactButton.setAttribute("aria-expanded", String(!contact.hidden)); });
  const write = element("button", "เขียนคำร้องสหกิจศึกษา", "btn-primary job-matching-coop-request");
  write.type = "button"; write.dataset.jobPostingId = job.job_posting_id;
  write.dataset.companyName = job.company?.name || ""; write.dataset.jobTitle = job.title || "";
  write.disabled = !canWrite || !job.company?.id || job.selectable !== true;
  actions.append(contactButton, write); card.append(actions, contact);
  return card;
}
