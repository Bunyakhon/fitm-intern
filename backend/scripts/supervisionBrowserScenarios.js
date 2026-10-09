const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
module.exports = async function ({ t, m, owner, otherOwner, project, teacher, password, run, api, ok, login, frontendUrl, browser, evaluate, value, click, wait, until, pause, artifactRoot, runtimeErrors, consoleErrors, failedResponses }) {
  const mentor = await m.Mentor.create({ student_id: owner.student.id, first_name: 'Browser Mentor', last_name: 'Fixture', position: 'Engineer', email: `mentor-${run}@fixture.invalid` });
  const verification = await require('../src/services/mentorToken.service').createMentorVerificationToken(mentor.id);
  const loaded = new Set(); browser.on('Page.lifecycleEvent', event => { if (event.name === 'DOMContentLoaded') loaded.add(event.loaderId); }); await browser.send('Page.setLifecycleEventsEnabled', { enabled: true });
  const navigate = async url => {
    // A fresh email-link navigation must reload the page even when only its
    // fragment differs from the current Mentor URL.
    const blank = await browser.send('Page.navigate', { url: 'about:blank' }); if (blank.loaderId) await until(() => loaded.has(blank.loaderId), 'fresh email-link document', 45000);
    const result = await browser.send('Page.navigate', { url }); if (result.loaderId) await until(() => loaded.has(result.loaderId), 'new supervision page document', 45000);
  };
  async function confirm() { await wait("!!document.querySelector('.app-confirm-overlay:not(.is-leaving) .app-confirm-modal__confirm')", 'supervision confirmation modal'); await click('.app-confirm-overlay:not(.is-leaving) .app-confirm-modal__confirm'); await wait("!document.querySelector('.app-confirm-overlay:not(.is-leaving)')", 'supervision modal committed'); }
  async function teacherPage() { await navigate(`${frontendUrl}/src/teacher_coop/teacher_coop.html#supervisionScheduling`); await wait("document.getElementById('supervisionStudentSelect')?.options.length===3 && !document.getElementById('supervisionStudentSelect').disabled", 'two supervised students loaded'); await value('supervisionStudentSelect', owner.student.id); await wait("!document.getElementById('supervisionDetail').hidden && !document.getElementById('supervisionSave').disabled", 'supervision detail loaded'); }
  async function save() { await click('#supervisionSave'); await confirm(); await wait("!document.getElementById('supervisionSave').disabled && !document.getElementById('supervisionDetail').hidden", 'saved appointment reload'); }
  const capture = async name => { await evaluate("document.querySelectorAll('.app-toast__close').forEach(button=>button.click());document.getElementById('supervisionScheduling')?.scrollIntoView();"); await pause(300); const result = await browser.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }); await fs.writeFile(path.join(artifactRoot, name), Buffer.from(result.data, 'base64')); };
  const service = require('../src/services/supervision.service').createSupervisionService(m);
  let projectToken, first, second, oldToken, access, failed = false;
  const scenario = (name, fn) => t.test(name, { skip: failed }, async () => { try { await fn(); } catch (error) { failed = true; console.log('Supervision diagnostic:', await evaluate("JSON.stringify({path:location.pathname,message:document.getElementById('supervisionMessage')?.textContent,mentor:document.getElementById('verificationStateMessage')?.textContent,modal:document.querySelector('.app-confirm-modal__error')?.textContent,detailHidden:document.getElementById('supervisionDetail')?.hidden})")); throw error; } });
  await scenario('Original Mentor single-use profile verification works before supervision', async () => {
    await navigate(`${frontendUrl}/src/mentor_coop/mentor_verify_user.html?token=${verification.token}`); await wait("!document.getElementById('mentorFieldset').disabled", 'Mentor verification ready'); await click('#confirmVerificationButton'); await confirm(); await mentor.reload(); assert.equal(mentor.status, 'verified'); assert.ok(mentor.verified_at);
  });
  await scenario('Teacher real password login lists only project advisees and preserves existing sections', async () => {
    await navigate(`${frontendUrl}/teacher-login.html`); await value('teacherEmail', project.email); await value('teacherPassword', password); await click('#teacherLoginForm button[type=submit]'); await wait("location.pathname.includes('teacher_coop') && document.getElementById('supervisionStudentSelect')?.options.length===3", 'project teacher login');
    projectToken = await login('/api/teachers/auth/login', project.email); await teacherPage(); assert.ok(await evaluate("!!document.getElementById('coopApprovals') && !!document.getElementById('advisorRequests')")); assert.match(await evaluate("document.getElementById('supervisionMentorInfo').textContent"), /Browser Mentor/);
  });
  await scenario('Visit 1 create through real form persists Bangkok time and truthful failed SMTP', async () => {
    await value('supervisionDate', '2026-11-04'); await value('supervisionTime', '09:30'); await value('supervisionNotes', 'Browser supervision note'); await click('#supervisionMentorChecked'); await save();
    first = await m.SupervisionAppointment.findOne({ where: { student_id: owner.student.id, visit_number: 1 } }); assert.equal(first.scheduled_at.toISOString(), '2026-11-04T02:30:00.000Z'); assert.equal(first.status, 'pending_confirmation'); assert.equal(first.teacher_id, project.id); assert.match(await evaluate("document.getElementById('supervisionMessage').textContent"), /บันทึกนัดแล้ว.*ส่งอีเมลไม่สำเร็จ/);
  });
  await scenario('Duplicate visit form reports conflict and keeps one appointment/history', async () => {
    await value('supervisionDate', '2026-11-04'); await value('supervisionTime', '09:30'); await click('#supervisionMentorChecked'); await save(); assert.match(await evaluate("document.getElementById('supervisionMessage').textContent"), /มีนัดหมาย/); assert.equal(await m.SupervisionAppointment.count(), 1); assert.equal(await m.SupervisionEvent.count(), 1);
    oldToken = (await service.resend(project.id, owner.student.id, first.id, { version: 1 })).token;
  });
  await scenario('Mentor sees authorized appointment, must verify identity, confirms once', async () => {
    await navigate(`${frontendUrl}/src/mentor_coop/mentor_verify_user.html#appointment_token=${oldToken}`); await wait("!document.getElementById('mentorAppointmentConfirm').disabled", 'appointment loaded'); assert.equal(await evaluate('location.hash'), ''); assert.match(await evaluate("document.getElementById('mentorAppointmentDetails').textContent"), /Browser Accepted/);
    await click('#mentorAppointmentConfirm'); assert.match(await evaluate("document.getElementById('verificationStateMessage').textContent"), /กรุณายืนยัน/); assert.equal((await first.reload()).status, 'pending_confirmation');
    await click('#mentorAppointmentIdentity'); await click('#mentorAppointmentConfirm'); await confirm(); await wait("document.getElementById('mentorAppointmentActions').hidden", 'appointment confirmed'); await first.reload(); assert.equal(first.version, 2); assert.equal(first.status, 'confirmed');
    assert.equal((await api('/api/supervision/mentor/confirm', oldToken, { version: 1, confirm_identity: true })).status, 410);
  });
  await scenario('Reschedule confirmed visit requires reason, preserves snapshot and resets confirmation', async () => {
    await teacherPage(); await click('#supervisionAppointments article button'); assert.equal(await evaluate("document.getElementById('supervisionTime').value"), '09:30'); await value('supervisionDate', '2026-11-05'); await value('supervisionReason', 'Company requested reschedule'); await click('#supervisionMentorChecked'); await save(); await first.reload(); assert.equal(first.version, 3); assert.equal(first.status, 'pending_confirmation'); assert.equal(first.confirmed_at, null);
    const events = await m.SupervisionEvent.findAll({ where: { appointment_id: first.id }, order: [['version', 'ASC']] }); assert.equal(events[1].snapshot.status, 'confirmed'); assert.equal(events[1].snapshot.scheduled_at, '2026-11-04T02:30:00.000Z'); assert.match(await evaluate("document.getElementById('supervisionHistory').textContent"), /Company requested reschedule/);
  });
  await scenario('Visit 2 substitute nomination sends only to substitute and preserves original Mentor', async () => {
    await value('supervisionVisit', '2'); await value('supervisionDate', '2026-12-04'); await value('supervisionTime', '10:30'); await click('#supervisionMentorChecked'); await click('#supervisionSubstitute');
    for (const [key, input] of Object.entries({ email: `sub-${run}@fixture.invalid`, first_name: 'Browser Substitute', last_name: 'Fixture', position: 'Manager', reason: 'Original unavailable' })) await value('substitute_' + key, input);
    await save(); second = await m.SupervisionAppointment.findOne({ where: { student_id: owner.student.id, visit_number: 2 } }); assert.equal(second.snapshot.is_substitute, true); assert.equal(second.snapshot.attending_mentor.first_name, 'Browser Substitute'); assert.equal((await mentor.reload()).first_name, 'Browser Mentor');
    const delivery = await service.resend(project.id, owner.student.id, second.id, { version: 1 }); assert.equal(delivery.to, `sub-${run}@fixture.invalid`); access = delivery.token;
  });
  await scenario('Substitute uses own scoped link and confirms personal information in real UI', async () => {
    await navigate(`${frontendUrl}/src/mentor_coop/mentor_verify_user.html#appointment_token=${access}`); await wait("!document.getElementById('mentorAppointmentConfirm').disabled", 'substitute appointment'); assert.match(await evaluate("document.getElementById('mentorAppointmentDetails').textContent"), /Browser Substitute/); assert.match(await evaluate("document.getElementById('mentorAppointmentDetails').textContent"), /ครั้งที่ 2/);
    await click('#mentorAppointmentIdentity'); await click('#mentorAppointmentConfirm'); await confirm(); await wait("document.getElementById('mentorAppointmentActions').hidden", 'substitute confirmed'); assert.equal((await second.reload()).status, 'confirmed'); assert.equal((await m.SupervisionEvent.findOne({ where: { appointment_id: second.id, version: 2 } })).actor_name, 'Browser Substitute Fixture');
  });
  await scenario('Student real login reads latest appointments and complete revision history', async () => {
    await navigate(`${frontendUrl}/login.html`); await value('loginEmail', owner.student.email); await value('loginPassword', password); await click('#loginForm button[type=submit]'); await wait("location.pathname.includes('student_coop') && document.querySelectorAll('#studentSupervisionAppointments > article').length===2", 'Student appointment read-back');
    const text = await evaluate("document.getElementById('studentSupervisionAppointments').textContent"); assert.match(text, /Browser Substitute/); assert.match(text, /Company requested reschedule/); assert.match(text, /รอพี่เลี้ยงยืนยัน/); assert.match(text, /พี่เลี้ยงยืนยันแล้ว/);
  });
  await scenario('Teacher desktop/mobile and Mentor mobile render within viewport', async () => {
    await teacherPage(); await capture('teacher-supervision-desktop.png'); await browser.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true }); assert.ok(await evaluate('document.documentElement.scrollWidth<=391'), 'Teacher content must fit the configured 390px viewport'); await capture('teacher-supervision-mobile.png');
    access = (await service.resend(project.id, owner.student.id, first.id, { version: 3 })).token; await navigate(`${frontendUrl}/src/mentor_coop/mentor_verify_user.html#appointment_token=${access}`); await wait("!document.getElementById('mentorAppointmentConfirm').disabled", 'Mentor mobile appointment'); assert.ok(await evaluate('document.documentElement.scrollWidth<=391'), 'Mentor content must fit the configured 390px viewport'); await capture('mentor-supervision-mobile.png');
  });
  await scenario('Expired/rotated link fails visibly and actual offline Teacher refresh recovers', async () => {
    await navigate(`${frontendUrl}/src/mentor_coop/mentor_verify_user.html#appointment_token=${oldToken}`); await wait("document.getElementById('verificationStateMessage').textContent.includes('ลิงก์หมดอายุ')", 'invalid old link'); assert.equal(await evaluate("document.getElementById('mentorAppointmentActions').hidden"), true);
    await teacherPage(); await browser.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }); await click('#supervisionRefresh'); await wait("document.getElementById('supervisionMessage').textContent.includes('Unable to connect')", 'offline Teacher feedback'); assert.equal(await evaluate("document.getElementById('supervisionDetail').hidden"), true);
    await browser.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }); await click('#supervisionRefresh'); await wait("document.getElementById('supervisionStudentSelect').options.length===3 && !document.getElementById('supervisionStudentSelect').disabled", 'Teacher network recovery');
  });
  await scenario('No unexpected runtime errors; approval identities and protected Mentor history preserved', async () => {
    const deletion = await api('/api/mentors/me', owner.token, undefined, 'DELETE'); assert.equal(deletion.status, 409); assert.equal(deletion.data.code, 'MENTOR_HISTORY_EXISTS');
    assert.deepEqual(runtimeErrors, []); assert.deepEqual(consoleErrors.filter(row => row.source !== 'network'), []);
    assert.deepEqual(failedResponses.filter(row => !row.url.endsWith('/favicon.ico') && !(row.status === 409 && row.url.endsWith('/visits/1')) && !(row.status === 410 && row.url.endsWith('/mentor/appointment'))), []);
    assert.equal(await m.StudentFile.count(), 0); assert.equal((await m.CoopRequest.findByPk(owner.id)).status, 'approved'); const student = await m.Student.findByPk(owner.student.id); assert.equal(student.advisor_teacher_id, teacher.id); assert.equal(student.coop_advisor_teacher_id, project.id); assert.equal(await m.SupervisionAppointment.count({ where: { student_id: otherOwner.student.id } }), 0);
  });
  if (process.env.FITM_SUPERVISION_RESULTS_BROWSER === '1' && !failed) await require('./supervisionResultBrowserScenarios')({ t, m, owner, otherOwner, project, teacher, password, api, projectToken, frontendUrl, browser, evaluate, value, click, wait, until, pause, artifactRoot, runtimeErrors, consoleErrors, failedResponses, navigate, teacherPage, confirm, service, first, second });
};
