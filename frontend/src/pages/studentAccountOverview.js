import { workspaceFields } from "./studentProfileWorkspaceDraft.js";
import { PROFILE_INPUTS } from "./studentProfileDraft.js";
import "../styles/account_overview.css";

export function accountProfileState(document,state){const root=document.getElementById("studentAccountProfileOverview"),message=document.getElementById("studentAccountProfileStatus");if(!root||!message)return;
  const retry=document.getElementById("studentAccountProfileReload");if(retry)retry.disabled=state==="loading";
  root.setAttribute("aria-busy",String(state==="loading"));message.setAttribute("role",state==="error"?"alert":"status");message.textContent=state==="loading"?"กำลังโหลดประวัติที่บันทึกแล้ว...":state==="error"?"โหลดประวัติไม่สำเร็จ กรุณาลองอีกครั้ง ข้อมูลที่แสดงอาจยังไม่ใช่ฉบับล่าสุด":"ข้อมูลจากประวัติที่บันทึกแล้ว · อ่านอย่างเดียว";
}
export function renderAccountProfile(document,snapshot){
  const content=document.getElementById("studentAccountProfileGroups");if(!content)return;content.replaceChildren();
  if(!snapshot?.student){accountProfileState(document,"error");return;}
  function el(tag,text){const node=document.createElement(tag);if(text!==undefined)node.textContent=text;return node;}
  function display(value,spec){if(value===null||value===undefined||value==="")return "ยังไม่ระบุ";if(spec.key==="driving_license_number")return "••••"+String(value).slice(-4);if(typeof value==="boolean")return value?"มี":"ไม่มี";return spec.options?.find(([key])=>key===String(value))?.[1]||String(value);}
  function fields(row,specs){const dl=el("dl");for(const spec of specs){const item=el("div");item.append(el("dt",spec.label),el("dd",display(row?.[spec.key],spec)));dl.append(item);}return dl;}
  function group(label,rows,specs){const details=el("details"),summary=el("summary",`${label} (${rows.length})`);details.append(summary);if(!rows.length){const empty=el("p","ยังไม่มีข้อมูลในหมวดนี้");empty.className="account-empty";details.append(empty);}for(const row of rows){const article=el("article");article.append(fields(row,specs));details.append(article);}content.append(details);}
  const legacy=Object.entries(PROFILE_INPUTS).map(([key,id])=>({key,label:document.querySelector(`label[for="${id}"]`)?.textContent.trim()||key}));
  const student={...snapshot.student,currentAdvisor:[snapshot.student.advisorTeacher?.academic_title,snapshot.student.advisorTeacher?.first_name,snapshot.student.advisorTeacher?.last_name].filter(Boolean).join(" ")};
  group("ข้อมูลนักศึกษา / การศึกษาเบื้องต้น",[student],[{key:"major",label:"สาขา"},{key:"track",label:"ประเภทการปฏิบัติงาน",options:[["co_op","สหกิจศึกษา"],["internship","ฝึกงาน"]]},{key:"status",label:"สถานะนักศึกษา",options:[["pending","รอดำเนินการ"],["searching","กำลังค้นหา"],["placed","ได้รับการตอบรับ"],["in_progress","กำลังปฏิบัติงาน"],["completed","เสร็จสิ้น"]]},{key:"year_level",label:"ชั้นปี"},{key:"gpa",label:"GPA สะสม"},{key:"currentAdvisor",label:"อาจารย์ประจำชั้น"},...workspaceFields.academic]);
  group("ข้อมูลส่วนตัว",[snapshot.profile||{}],[...legacy.filter(s=>! /^(hometown|current|father|mother|parent|emergency)_/.test(s.key)),...workspaceFields.personal]);
  group("ติดต่อ / ครอบครัว / ฉุกเฉิน",[snapshot.profile||{}],[...legacy.filter(s=>/^(hometown|current|father|mother|parent|emergency)_/.test(s.key)),...workspaceFields.family]);
  for(const [kind,label]of [["addresses","ที่อยู่ทะเบียนบ้าน / ปัจจุบัน"],["education","ประวัติการศึกษา"],["training","ประวัติฝึกอบรม"],["skills","ทักษะคอมพิวเตอร์ / ภาษา"]]){
    const specs=kind==="addresses"?[{key:"address_type",label:"ประเภทที่อยู่",options:[["registered","ทะเบียนบ้าน"],["current","ปัจจุบัน"]]},...workspaceFields.addresses]:workspaceFields[kind];
    group(label,[...(snapshot[kind]||[])].sort((a,b)=>(a.display_order||0)-(b.display_order||0)),specs);
  }
  group("รูปประจำตัว",[{available:snapshot.student.profile_image?"มีรูปที่บันทึกแล้ว":"ยังไม่มีรูป"}],[{key:"available",label:"รูปประจำตัว"}]);
  group("เอกสารประกอบ",snapshot.documents||[],[{key:"file_type",label:"ประเภท"},{key:"document_label",label:"ชื่อกำกับ"},{key:"original_name",label:"ชื่อไฟล์"},{key:"document_version",label:"ฉบับ"}]);
  accountProfileState(document,"ready");
}
