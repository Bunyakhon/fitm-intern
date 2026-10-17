import { apiRequest } from "../api/client.js";
import { getRoleToken } from "../auth/roleAuthStorage.js";
import { showToast } from "../ui/feedback.js";
import "../styles/account_overview.css";

export function mountRoleAccount({document,target=window,request=apiRequest,getToken=getRoleToken,toast=showToast}={}) {
  const role=document.body.dataset.workflowRole;
  if(!["teacher","department_head","department_staff"].includes(role))return;
  const type=role==="department_staff"?"department_staff":"teacher";
  const nav=document.querySelector(".sidebar-menu"),main=document.querySelector(".dashboard-content");
  if(!nav||!main||document.getElementById("own-account"))return;
  function el(tag,text,cls){const node=document.createElement(tag);if(text)node.textContent=text;if(cls)node.className=cls;return node;}
  const link=el("a","จัดการบัญชี","sidebar-item");link.href="#own-account";nav.append(link);
  const root=el("section",null,"account-overview");root.id="own-account";root.setAttribute("aria-labelledby","own-account-heading");
  const heading=el("div",null,"account-overview-heading"),title=el("h2","ข้อมูลบัญชีของฉัน");title.id="own-account-heading";
  const retry=el("button","โหลดข้อมูลอีกครั้ง","teacher-button");retry.type="button";
  heading.append(title,retry);const message=el("p"),content=el("div");message.setAttribute("aria-live","polite");root.append(heading,message,content);main.append(root);
  let busy=false,loadedToken=null,serial=0;
  function say(text,error=false){message.textContent=text;message.setAttribute("role",error?"alert":"status");}
  async function load(){
    if(busy)return;busy=true;retry.disabled=true;root.setAttribute("aria-busy","true");say("กำลังโหลดข้อมูลบัญชี...");const token=getToken(type),ticket=++serial;
    try{
      if(!token)throw new Error("session");
      const path=role==="department_staff"?"/api/staff/me":role==="department_head"?"/api/department-head/me":"/api/teachers/me";
      const response=await request(path,{auth:false,headers:{Authorization:`Bearer ${token}`}});
      if(ticket!==serial||getToken(type)!==token)return;
      const row=response.data;if(!row?.id)throw new Error("account");
      content.replaceChildren();const dl=el("dl");
      const values=[["ชื่อภาษาไทย",[row.first_name,row.last_name].filter(Boolean).join(" ")],
        ["ชื่อภาษาอังกฤษ",[row.first_name_en,row.last_name_en].filter(Boolean).join(" ")],["อีเมล",row.email],
        ...(type==="teacher"?[["คำนำหน้าทางวิชาการ",row.academic_title],["สาขา",row.major]]:[]),["ภาควิชา",row.department],["ตำแหน่ง",row.position],
        ["บทบาท",type==="department_staff"?"เจ้าหน้าที่ภาควิชา":row.is_department_head?"หัวหน้าภาควิชา":"อาจารย์"],
        ["สถานะ",(type==="department_staff"?row.is_active:row.status==="active")?"ใช้งานอยู่":"ไม่เปิดใช้งาน"]];
      for(const [label,value]of values){const item=el("div");item.append(el("dt",label),el("dd",value||"ยังไม่ระบุ"));dl.append(item);}content.append(dl);loadedToken=token;
      say("ข้อมูลบัญชีปัจจุบัน · อ่านอย่างเดียว หากต้องการแก้ไขให้ติดต่อผู้ดูแลระบบ");
    }catch{if(ticket===serial){content.replaceChildren();say("โหลดข้อมูลบัญชีไม่สำเร็จ กรุณาลองอีกครั้ง หรือเข้าสู่ระบบใหม่",true);toast("ตรวจสอบข้อมูลบัญชีไม่สำเร็จ","error");}}
    finally{if(ticket===serial){busy=false;retry.disabled=false;root.setAttribute("aria-busy","false");}}
  }
  retry.addEventListener("click",load);
  const clear=()=>{if(loadedToken&&loadedToken!==getToken(type)){++serial;content.replaceChildren();loadedToken=null;busy=false;retry.disabled=false;root.setAttribute("aria-busy","false");say("สถานะเข้าสู่ระบบเปลี่ยนแล้ว กรุณาเข้าสู่ระบบใหม่",true);}};
  target.addEventListener("storage",clear);target.addEventListener("pagehide",()=>{++serial;busy=false;retry.disabled=false;root.setAttribute("aria-busy","false");content.replaceChildren();say("โหลดข้อมูลบัญชีอีกครั้งเมื่อกลับมาที่หน้านี้");});
  const ready=load();return {ready,load};
}
if(typeof document!=="undefined")mountRoleAccount({document});
