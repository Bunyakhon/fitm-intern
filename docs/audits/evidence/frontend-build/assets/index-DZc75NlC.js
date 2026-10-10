import"./client-DPLsZUU1.js";import{t as e}from"./auth.api-DwOJUyKR.js";console.log(`KIWI index page loaded`);var t=document.getElementById(`navAuth`);async function n(){if(!localStorage.getItem(`token`)){r();return}try{let t=await e();localStorage.setItem(`student`,JSON.stringify(t.data)),i(t.data)}catch(e){console.error(`AUTH CHECK ERROR:`,e),localStorage.removeItem(`token`),localStorage.removeItem(`student`),r()}}function r(){t.innerHTML=`
    <a href="login.html" class="btn-login">
      เข้าสู่ระบบ
    </a>

    <a href="register.html" class="btn-register">
      สมัครสมาชิก
    </a>
  `}function i(e){t.innerHTML=``;let n=document.createElement(`span`);n.className=`nav-user-name`,n.textContent=`${e.first_name||``} ${e.last_name||``}`.trim();let r=document.createElement(`button`);r.type=`button`,r.id=`logoutBtn`,r.className=`btn-register`,r.textContent=`ออกจากระบบ`,r.addEventListener(`click`,a),t.appendChild(n),t.appendChild(r)}function a(){localStorage.removeItem(`token`),localStorage.removeItem(`student`),window.location.href=`/index.html`}n();var o=document.getElementById(`searchInput`),s=document.getElementById(`btnSearch`);function c(){let e=o.value.trim();e&&console.log(`Search:`,e)}s.addEventListener(`click`,c),o.addEventListener(`keydown`,e=>{e.key===`Enter`&&c()});var l=document.getElementById(`filterModal`),u=document.getElementById(`btnOpenFilter`),d=document.getElementById(`btnCloseFilter`),f=document.getElementById(`btnResetFilter`),p=document.getElementById(`btnApplyFilter`),m=document.getElementById(`filterCompany`),h=document.getElementById(`filterPosition`),g=document.getElementById(`filterProvince`),_=document.getElementById(`filterOrganization`),v=document.getElementById(`filterWorkType`),y=document.getElementById(`filterWorkDays`),b=document.getElementById(`filterSalary`),x=null;function S(){x=document.activeElement,l.classList.remove(`hidden`),l.setAttribute(`aria-hidden`,`false`),d.focus()}function C(){l.classList.add(`hidden`),l.setAttribute(`aria-hidden`,`true`),x?.focus?.()}u.addEventListener(`click`,S),d.addEventListener(`click`,C),l.addEventListener(`click`,e=>{e.target===l&&C()}),document.addEventListener(`keydown`,e=>{e.key===`Escape`&&!l.classList.contains(`hidden`)&&C()}),f.addEventListener(`click`,()=>{m.value=``,h.value=``,g.selectedIndex=0,_.selectedIndex=0,v.selectedIndex=0,y.selectedIndex=0,b.selectedIndex=0}),p.addEventListener(`click`,()=>{let e={company:m.value.trim(),position:h.value.trim(),province:g.value,organization:_.value,workType:v.value,workDays:y.value,salary:b.value};console.log(`Filters:`,e),C()});var w=document.getElementById(`cardsContainer`),T=document.getElementById(`dotsContainer`),E=document.getElementById(`prevBtn`),D=document.getElementById(`nextBtn`),O=[{company:`BlueWave Digital Co., Ltd.`,position:`Frontend Developer`,province:`กรุงเทพมหานคร`,workType:`Hybrid`},{company:`Cybersecurity Solutions`,position:`Cybersecurity Analyst`,province:`กรุงเทพมหานคร`,workType:`On-site`},{company:`DataSphere Thailand`,position:`Data Analyst Assistant`,province:`ชลบุรี`,workType:`Hybrid`},{company:`Cloud Matrix Thailand`,position:`Backend Developer`,province:`กรุงเทพมหานคร`,workType:`Work from Home`}],k=0;function A(){w.innerHTML=``,O.forEach(e=>{let t=document.createElement(`article`);t.className=`job-card`,t.innerHTML=`
      <div class="job-card-header">
        <h3>
          ${e.position}
        </h3>
      </div>

      <p class="job-company">
        ${e.company}
      </p>

      <div class="job-info">
        <span>
          <i class="fa-solid fa-location-dot"></i>
          ${e.province}
        </span>

        <span>
          <i class="fa-solid fa-briefcase"></i>
          ${e.workType}
        </span>
      </div>
    `,w.appendChild(t)}),j()}function j(){T.innerHTML=``,O.forEach((e,t)=>{let n=document.createElement(`button`);n.type=`button`,n.className=`slider-dot`,t===k&&n.classList.add(`active`),n.addEventListener(`click`,()=>{k=t,M()}),T.appendChild(n)})}function M(){let e=w.querySelectorAll(`.job-card`);e.length&&(e[k].scrollIntoView({behavior:`smooth`,block:`nearest`,inline:`center`}),j())}E.addEventListener(`click`,()=>{k--,k<0&&(k=O.length-1),M()}),D.addEventListener(`click`,()=>{k++,k>=O.length&&(k=0),M()}),A();var N=document.getElementById(`navChatbotBtn`),P=document.getElementById(`btnToggleChat`),F=document.getElementById(`btnCloseChat`),I=document.getElementById(`chatWindow`),L=document.getElementById(`chatBody`),R=document.getElementById(`quickReplies`),z=document.getElementById(`chatInput`),B=document.getElementById(`btnSend`);function V(){I.classList.remove(`hidden`)}function H(){I.classList.add(`hidden`)}N.addEventListener(`click`,e=>{e.preventDefault(),V()}),P.addEventListener(`click`,()=>{I.classList.contains(`hidden`)?V():H()}),F.addEventListener(`click`,H);function U(e,t=`bot`){let n=document.createElement(`div`);n.className=t===`user`?`chat-message user-message`:`chat-message bot-message`,n.textContent=e,L.appendChild(n),L.scrollTop=L.scrollHeight}function W(){let e=z.value.trim();e&&(U(e,`user`),z.value=``,setTimeout(()=>{U(`ขณะนี้ระบบ Chatbot ยังอยู่ระหว่างการพัฒนา`)},500))}B.addEventListener(`click`,W),z.addEventListener(`keydown`,e=>{e.key===`Enter`&&W()});var G=[`ขั้นตอนยื่นคำร้อง`,`เอกสารที่ต้องใช้`,`ค้นหาสถานประกอบการ`];function K(){R.innerHTML=``,G.forEach(e=>{let t=document.createElement(`button`);t.type=`button`,t.textContent=e,t.addEventListener(`click`,()=>{z.value=e,W()}),R.appendChild(t)})}K(),U(`สวัสดีครับ ฉันคือ KIWI Chatbot มีอะไรให้ช่วยเกี่ยวกับสหกิจศึกษาหรือไม่`);