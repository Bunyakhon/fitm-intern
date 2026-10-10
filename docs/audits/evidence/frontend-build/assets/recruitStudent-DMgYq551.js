import"./client-DPLsZUU1.js";import{i as e,t}from"./feedback-CUQPlHFG.js";import{n,t as r}from"./recruitStudent.api-CiyfI2r3.js";var i=document.getElementById(`recruitForm`),a=document.getElementById(`jobCards`),o=document.getElementById(`addJobButton`),s=document.getElementById(`recruitSubmitButton`),c=document.getElementById(`turnstileContainer`),l=document.getElementById(`turnstileStatus`),u=document.getElementById(`recruitSubmissionStatus`),d=`0x4AAAAAAFPFkEsZDoU2WMIC`,f=10,p=1,m=``,h=null,g=!1,_=!1,v=document.createElement(`button`);v.type=`button`,v.className=`recruit-verification-home`,v.textContent=`ส่งอีเมลยืนยันอีกครั้ง`,v.hidden=!0,u.after(v),v.addEventListener(`click`,async()=>{v.disabled=!0;try{await r(),b(`ส่งอีเมลยืนยันแล้ว กรุณาตรวจสอบกล่องจดหมายและใช้ลิงก์จากอีเมลฉบับล่าสุด`)}catch(e){b(e.status===429?`ส่งอีเมลซ้ำบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่`:e.status===401||e.status===410?`ไม่สามารถส่งซ้ำได้ กรุณาตรวจสอบอีเมลฉบับล่าสุดหรือติดต่อผู้ดูแลระบบ`:`ยังส่งอีเมลไม่ได้ กรุณาลองอีกครั้งภายหลัง โดยไม่ต้องส่งแบบฟอร์มซ้ำ`,`warning`)}finally{v.disabled=!1}});function y(e=``){l.textContent=e}function b(e,t=`success`){u.textContent=e,u.hidden=!1,u.classList.toggle(`is-warning`,t===`warning`)}function x(){return window.turnstile}function S(){m=``;let e=x();e&&h!==null&&e.reset(h)}function C(){let e=x();!e||h!==null||(h=e.render(c,{sitekey:d,callback(e){m=e,y(``)},"expired-callback"(){m=``,y(`การยืนยันหมดอายุ กรุณายืนยันอีกครั้ง`)},"error-callback"(){m=``,y(`ไม่สามารถยืนยันความปลอดภัยได้ กรุณาลองใหม่อีกครั้ง`)}}))}function w(){let e=document.getElementById(`turnstileScript`);if(x()){C();return}if(!e){y(`ไม่สามารถโหลดการยืนยันความปลอดภัยได้ กรุณาลองใหม่อีกครั้ง`);return}e.addEventListener(`load`,C,{once:!0}),e.addEventListener(`error`,()=>y(`ไม่สามารถโหลดการยืนยันความปลอดภัยได้ กรุณาลองใหม่อีกครั้ง`),{once:!0})}function T(){let e=`job-${p}`;return p+=1,e}function E(){let e=T(),t=document.createElement(`article`);return t.className=`recruit-job-card`,t.dataset.jobKey=e,t.innerHTML=`
    <div class="recruit-job-card__header">
      <div>
        <p class="recruit-job-card__eyebrow">JOB POSTING</p>
        <h3 class="recruit-job-card__title">ตำแหน่งที่ 1</h3>
      </div>
      <button class="recruit-remove-job" type="button" hidden>
        <i class="fa-solid fa-trash-can" aria-hidden="true"></i>
        ลบตำแหน่ง
      </button>
    </div>

    <div class="recruit-fields recruit-fields--job">
      <div class="recruit-field">
        <label for="${e}-title">ชื่อตำแหน่ง <span aria-hidden="true">*</span></label>
        <input id="${e}-title" name="${e}-title" type="text" required data-job-field="title" />
        <p class="recruit-field__error" aria-live="polite"></p>
      </div>
      <div class="recruit-field">
        <label for="${e}-category">หมวดหมู่งาน <span aria-hidden="true">*</span></label>
        <select id="${e}-category" name="${e}-category" required data-job-field="category">
          <option value="">เลือกหมวดหมู่งาน</option>
          <option value="information_technology">เทคโนโลยีสารสนเทศ</option>
          <option value="business">ธุรกิจและการจัดการ</option>
          <option value="design">ออกแบบและสื่อดิจิทัล</option>
          <option value="engineering">วิศวกรรม</option>
          <option value="other">อื่น ๆ</option>
        </select>
        <p class="recruit-field__error" aria-live="polite"></p>
      </div>
      <div class="recruit-field recruit-field--wide">
        <label for="${e}-description">รายละเอียดงาน <span aria-hidden="true">*</span></label>
        <textarea id="${e}-description" name="${e}-description" rows="5" required data-job-field="description" placeholder="อธิบายลักษณะงาน ความรับผิดชอบ และคุณสมบัติที่เกี่ยวข้อง"></textarea>
        <p class="recruit-field__error" aria-live="polite"></p>
      </div>
      <div class="recruit-field">
        <label for="${e}-quota">จำนวนที่รับ <span aria-hidden="true">*</span></label>
        <input id="${e}-quota" name="${e}-quota" type="number" min="1" step="1" inputmode="numeric" required data-job-field="quota" placeholder="เช่น 2" />
        <p class="recruit-field__error" aria-live="polite"></p>
      </div>
      <div class="recruit-field">
        <label for="${e}-compensation">เบี้ยเลี้ยง / ค่าตอบแทน <span aria-hidden="true">*</span></label>
        <input id="${e}-compensation" name="${e}-compensation" type="text" required data-job-field="compensation" placeholder="เช่น 300 บาท/วัน, ตามตกลง หรือ ไม่ระบุ" />
        <p class="recruit-field__error" aria-live="polite"></p>
      </div>
      <div class="recruit-field">
        <label for="${e}-work-days">จำนวนวันทำงาน / สัปดาห์ <span aria-hidden="true">*</span></label>
        <select id="${e}-work-days" name="${e}-work-days" required data-job-field="workDaysPerWeek">
          <option value="">เลือกจำนวนวัน</option>
          <option value="1">1 วัน/สัปดาห์</option>
          <option value="2">2 วัน/สัปดาห์</option>
          <option value="3">3 วัน/สัปดาห์</option>
          <option value="4">4 วัน/สัปดาห์</option>
          <option value="5">5 วัน/สัปดาห์</option>
          <option value="6">6 วัน/สัปดาห์</option>
          <option value="7">7 วัน/สัปดาห์</option>
        </select>
        <p class="recruit-field__error" aria-live="polite"></p>
      </div>
      <fieldset class="recruit-field recruit-work-modes" data-job-work-modes>
        <legend>รูปแบบการทำงาน <span aria-hidden="true">*</span></legend>
        <div class="recruit-work-modes__options">
          <label><input type="checkbox" value="onsite" data-work-mode /> On-site</label>
          <label><input type="checkbox" value="work_from_home" data-work-mode /> Work From Home</label>
          <label><input type="checkbox" value="hybrid" data-work-mode /> Hybrid</label>
        </div>
        <p class="recruit-field__error" aria-live="polite"></p>
      </fieldset>
    </div>
  `,t.querySelector(`.recruit-remove-job`).addEventListener(`click`,()=>{t.remove(),D()}),t.querySelectorAll(`input, select, textarea`).forEach(e=>{e.addEventListener(`input`,()=>A(e)),e.addEventListener(`change`,()=>A(e))}),t}function D(){let e=[...a.querySelectorAll(`.recruit-job-card`)];e.forEach((t,n)=>{t.querySelector(`.recruit-job-card__title`).textContent=`ตำแหน่งที่ ${n+1}`,t.querySelector(`.recruit-remove-job`).hidden=e.length===1}),o.disabled=e.length>=f,o.setAttribute(`aria-disabled`,String(e.length>=f))}function O(e){return e.closest(`.recruit-field`)}function k(e,t){let n=O(e);if(!n)return;n.classList.add(`is-invalid`);let r=n.querySelector(`.recruit-field__error`);r&&(r.textContent=t),e.setAttribute(`aria-invalid`,`true`)}function A(e){let t=O(e);t&&(t.classList.remove(`is-invalid`),t.querySelector(`.recruit-field__error`).textContent=``,e.removeAttribute(`aria-invalid`))}function j(e){return e.validity.valueMissing?`กรุณากรอกข้อมูลในช่องนี้`:e.validity.typeMismatch?`กรุณากรอกรูปแบบข้อมูลให้ถูกต้อง`:e.validity.rangeUnderflow||e.validity.stepMismatch?`กรุณาระบุจำนวนเต็มอย่างน้อย 1`:`กรุณาตรวจสอบข้อมูลอีกครั้ง`}function M(e){return A(e),e.checkValidity()?!0:(k(e,j(e)),!1)}function N(e){let t=e.querySelector(`[data-job-work-modes]`),n=[...t.querySelectorAll(`[data-work-mode]`)],r=n.some(e=>e.checked);return t.classList.toggle(`is-invalid`,!r),t.querySelector(`.recruit-field__error`).textContent=r?``:`กรุณาเลือกรูปแบบการทำงานอย่างน้อย 1 รูปแบบ`,n.forEach(e=>{e.toggleAttribute(`aria-invalid`,!r)}),r}function P(){let e=[...i.querySelectorAll(`[data-company-field]`)].map(M).every(Boolean),t=[...a.querySelectorAll(`.recruit-job-card`)].map(e=>[...e.querySelectorAll(`[data-job-field]`)].map(M).every(Boolean)&&N(e));return e&&t.every(Boolean)}function F(e){return i.elements.namedItem(e).value.trim()}var I={name:`companyName`,email:`companyEmail`,phone:`companyPhone`,addressNo:`addressNo`,moo:`companyMoo`,subdistrict:`companySubdistrict`,district:`companyDistrict`,province:`companyProvince`};function L(e=[]){e.forEach(({path:e})=>{let t=/^company\.([A-Za-z]+)$/.exec(e);if(t&&I[t[1]]){k(i.elements.namedItem(I[t[1]]),`ข้อมูลในช่องนี้ไม่ถูกต้อง`);return}let n=/^jobPostings\[(\d+)\]\.([A-Za-z]+)(?:\[\d+\])?$/.exec(e);if(n){let e=a.querySelectorAll(`.recruit-job-card`)[Number(n[1])];if(!e)return;let t=n[2],r=t===`workModes`?e.querySelector(`[data-job-work-modes]`):e.querySelector(`[data-job-field="${t}"]`);r&&k(r,`ข้อมูลในช่องนี้ไม่ถูกต้อง`);return}e===`captchaToken`&&y(`กรุณายืนยันความปลอดภัยก่อนส่งข้อมูล`)})}function R(t){let n=t.status;if(n===400){Array.isArray(t.data?.errors)?(L(t.data.errors),e(`กรุณาตรวจสอบข้อมูลที่ระบุ`,`error`)):(y(`การยืนยันความปลอดภัยไม่ผ่าน กรุณายืนยันอีกครั้ง`),e(`ไม่สามารถยืนยันความปลอดภัยได้`,`error`));return}if(n===403){y(`การยืนยันความปลอดภัยไม่ผ่าน กรุณายืนยันอีกครั้ง`),e(`การยืนยันความปลอดภัยไม่ผ่าน`,`error`);return}if(n===429){let n=Number(t.retryAfter),r=Number.isFinite(n)&&n>0?` กรุณาลองใหม่ในอีกประมาณ ${n} วินาที`:` กรุณารอสักครู่แล้วลองใหม่`;e(`ส่งคำขอบ่อยเกินไป${r}`,`error`);return}if(n===503){t.data?.message===`Recruitment submission is temporarily unavailable`?e(`ระบบรับสมัครยังไม่เปิดใช้งานในขณะนี้`,`error`):e(`ระบบยืนยันความปลอดภัยไม่พร้อมใช้งาน กรุณาลองใหม่อีกครั้ง`,`error`);return}if(n&&n>=500){e(`ไม่สามารถเชื่อมต่อกับระบบได้ กรุณาลองใหม่อีกครั้ง`,`error`);return}e(`ไม่สามารถเชื่อมต่อกับระบบได้ กรุณาลองใหม่อีกครั้ง`,`error`)}function z(e=m){return{company:{name:F(`companyName`),email:F(`companyEmail`),phone:F(`companyPhone`),addressNo:F(`addressNo`),moo:F(`companyMoo`),subdistrict:F(`companySubdistrict`),district:F(`companyDistrict`),province:F(`companyProvince`)},jobPostings:[...a.querySelectorAll(`.recruit-job-card`)].map(e=>({title:e.querySelector(`[data-job-field="title"]`).value.trim(),category:e.querySelector(`[data-job-field="category"]`).value,description:e.querySelector(`[data-job-field="description"]`).value.trim(),quota:Number(e.querySelector(`[data-job-field="quota"]`).value),compensation:e.querySelector(`[data-job-field="compensation"]`).value.trim(),workDaysPerWeek:Number(e.querySelector(`[data-job-field="workDaysPerWeek"]`).value),workModes:[...e.querySelectorAll(`[data-work-mode]:checked`)].map(e=>e.value)})),captchaToken:e}}o.addEventListener(`click`,()=>{if(a.querySelectorAll(`.recruit-job-card`).length>=f){e(`เพิ่มตำแหน่งงานได้ไม่เกิน 10 ตำแหน่ง`,`error`);return}a.append(E()),D(),a.lastElementChild.querySelector(`[data-job-field="title"]`).focus()}),i.querySelectorAll(`[data-company-field]`).forEach(e=>{e.addEventListener(`input`,()=>A(e)),e.addEventListener(`change`,()=>A(e))}),i.addEventListener(`submit`,async r=>{if(r.preventDefault(),!(g||_)){if(!P()){e(`กรุณาตรวจสอบข้อมูลที่จำเป็นในแบบฟอร์ม`,`error`),i.querySelector(`.is-invalid input, .is-invalid select, .is-invalid textarea`)?.focus();return}if(!m){y(`กรุณายืนยันความปลอดภัยก่อนส่งข้อมูล`),e(`กรุณายืนยันความปลอดภัยก่อนส่งข้อมูล`,`error`);return}g=!0,t(s,!0,`กำลังส่งข้อมูล...`,`ส่งข้อมูลสำหรับยืนยันอีเมล`);try{let t=await n(z());_=!0,v.hidden=!1,t.status===201?(b(`ส่งข้อมูลเรียบร้อยแล้ว กรุณาตรวจสอบอีเมลของสถานประกอบการเพื่อยืนยันก่อนเข้าสู่ขั้นตอนตรวจสอบ`),e(`ส่งข้อมูลเรียบร้อยแล้ว กรุณาตรวจสอบอีเมลเพื่อยืนยัน`,`success`)):(b(`ระบบบันทึกข้อมูลเรียบร้อยแล้ว แต่ยังส่งอีเมลยืนยันไม่ได้ในขณะนี้ กรุณาอย่าส่งแบบฟอร์มซ้ำ`,`warning`),e(`ระบบบันทึกข้อมูลแล้ว แต่การส่งอีเมลยืนยันยังขัดข้อง`,`error`))}catch(e){R(e)}finally{g=!1,S(),t(s,!1,`กำลังส่งข้อมูล...`,`ส่งข้อมูลสำหรับยืนยันอีเมล`),_&&(s.disabled=!0,s.setAttribute(`aria-disabled`,`true`),s.textContent=`ส่งข้อมูลแล้ว`)}}}),a.append(E()),D(),w();