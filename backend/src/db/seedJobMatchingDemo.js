require("dotenv").config();

const {
  Company,
  JobPosting,
  JobPostingWorkMode,
  JobSubmission,
  sequelize,
} = require("../models");

const DEMO_CATEGORY = "information_technology";

const DEMO_COMPANIES = [
  {
    name: "NovaLink Network Solutions Co., Ltd.", email: "hr@novalink.example", phone: "02-000-1101", address_no: "99/18", moo: "4", subdistrict: "ลาดยาว", district: "จตุจักร", province: "กรุงเทพมหานคร",
    jobs: [
      { title: "Network Engineer Intern", quota: 3, compensation_text: "400 บาท/วัน", work_days_per_week: 5, workModes: ["onsite", "hybrid"], description: "ดูแลและสนับสนุนระบบเครือข่าย LAN/WAN ภายในองค์กร ช่วยติดตั้งและตั้งค่า Cisco Router และ Switch เรียนรู้การทำ VLAN, TCP/IP, DHCP, DNS และ VPN ตรวจสอบ Network Monitoring และแก้ไขปัญหาเบื้องต้น มีโอกาสทำงานร่วมกับ Firewall และ Wireless Network เหมาะสำหรับนักศึกษาที่สนใจ Network Engineer และมีพื้นฐาน CCNA" },
      { title: "NOC Support Intern", quota: 2, compensation_text: "350 บาท/วัน", work_days_per_week: 5, workModes: ["onsite"], description: "ปฏิบัติงานใน Network Operation Center ตรวจสอบสถานะ Router, Switch และ Network Link ผ่านระบบ Monitoring วิเคราะห์ Alarm และ Incident เบื้องต้น เรียนรู้ TCP/IP, SNMP, Ping, Traceroute และการจัดทำ Incident Report เหมาะสำหรับผู้ที่สนใจงาน NOC และ Network Support" },
    ],
  },
  {
    name: "Siam Cloud & Data Systems Co., Ltd.", email: "career@siamcloud.example", phone: "02-000-1202", address_no: "88/45", moo: "2", subdistrict: "บางกระสอ", district: "เมืองนนทบุรี", province: "นนทบุรี",
    jobs: [
      { title: "System Administrator Intern", quota: 2, compensation_text: "8,000 บาท/เดือน", work_days_per_week: 5, workModes: ["onsite", "hybrid"], description: "ช่วยดูแล Linux Server และ Windows Server จัดการ User Account และ Active Directory เรียนรู้ DNS, DHCP, File Server และ Backup ตรวจสอบ CPU, Memory และ Storage Monitoring ช่วยแก้ไขปัญหา Server และ Network เบื้องต้น มีโอกาสใช้งาน VMware และ Virtual Machine" },
      { title: "Cloud Support Intern", quota: 2, compensation_text: "9,000 บาท/เดือน", work_days_per_week: 5, workModes: ["hybrid", "work_from_home"], description: "สนับสนุนระบบ Cloud Infrastructure เรียนรู้ AWS และ Microsoft Azure ช่วยตรวจสอบ Virtual Machine, Storage และ Network เรียนรู้ Docker Container, Linux และ Cloud Monitoring จัดทำเอกสารระบบและช่วยวิเคราะห์ Incident เบื้องต้น เหมาะกับนักศึกษาที่สนใจ Cloud Engineer และ DevOps" },
    ],
  },
  {
    name: "Eastern Fiber Tech Co., Ltd.", email: "jobs@easternfiber.example", phone: "038-000-1303", address_no: "155/9", moo: "6", subdistrict: "หนองไม้แดง", district: "เมืองชลบุรี", province: "ชลบุรี",
    jobs: [
      { title: "Network Infrastructure Intern", quota: 4, compensation_text: "400 บาท/วัน", work_days_per_week: 6, workModes: ["onsite"], description: "ช่วยติดตั้งระบบ Network Infrastructure ภายในสำนักงานและโรงงาน เดินสาย LAN และ Fiber Optic ติดตั้ง Rack, Patch Panel, Switch และ Access Point ทดสอบสาย Network และตรวจสอบ Link เรียนรู้ VLAN, IP Addressing และ Network Diagram" },
      { title: "Fiber Optic Technician Intern", quota: 3, compensation_text: "450 บาท/วัน", work_days_per_week: 6, workModes: ["onsite"], description: "เรียนรู้การติดตั้งและตรวจสอบระบบ Fiber Optic ช่วยเตรียมสายและอุปกรณ์ Optical Network ตรวจสอบ Fiber Link และ Network Cabinet จัดทำเอกสารเส้นทางสาย เหมาะสำหรับนักศึกษาที่สนใจ Telecommunication และ Network Infrastructure" },
    ],
  },
  {
    name: "SecureMesh Cyber Defense Co., Ltd.", email: "intern@securemesh.example", phone: "02-000-1404", address_no: "71/20", moo: "5", subdistrict: "คลองหนึ่ง", district: "คลองหลวง", province: "ปทุมธานี",
    jobs: [
      { title: "SOC Analyst Intern", quota: 2, compensation_text: "10,000 บาท/เดือน", work_days_per_week: 5, workModes: ["onsite", "hybrid"], description: "ช่วย Security Operations Center ตรวจสอบ Security Event ผ่านระบบ SIEM วิเคราะห์ Log จาก Firewall, Server และ Endpoint เรียนรู้ Incident Detection, Alert Triage และ Cybersecurity Monitoring มีโอกาสศึกษา Network Security, TCP/IP และ Threat Detection" },
      { title: "Network Security Intern", quota: 2, compensation_text: "10,000 บาท/เดือน", work_days_per_week: 5, workModes: ["hybrid"], description: "ช่วยดูแล Network Security เรียนรู้ Firewall, VPN, Access Control และ IDS/IPS วิเคราะห์ Network Traffic เบื้องต้น ศึกษา Vulnerability และ Security Policy ช่วยจัดทำ Network Security Documentation เหมาะกับผู้สนใจ Cybersecurity และ Network" },
    ],
  },
  {
    name: "BlueRack Data Center Services Co., Ltd.", email: "hr@bluerack.example", phone: "02-000-1505", address_no: "120/33", moo: "7", subdistrict: "บางแก้ว", district: "บางพลี", province: "สมุทรปราการ",
    jobs: [
      { title: "Data Center Operations Intern", quota: 3, compensation_text: "450 บาท/วัน", work_days_per_week: 5, workModes: ["onsite"], description: "เรียนรู้การปฏิบัติงานใน Data Center ตรวจสอบ Server Rack, Network Equipment และ UPS ช่วยตรวจสอบอุณหภูมิและระบบ Monitoring ติดตั้ง Server, Switch และ Network Cable เรียนรู้ Incident Management และมาตรฐานการทำงาน Data Center" },
      { title: "Infrastructure Support Intern", quota: 2, compensation_text: "400 บาท/วัน", work_days_per_week: 5, workModes: ["onsite"], description: "สนับสนุนระบบ IT Infrastructure ดูแล Hardware, Server และ Network ช่วยติดตั้ง Windows และ Linux ตรวจสอบ LAN, IP Address และ Connectivity ช่วยแก้ไขปัญหา Hardware และ Network พร้อมจัดทำ Technical Documentation" },
    ],
  },
  {
    name: "Lanna Smart Network Co., Ltd.", email: "career@lannasmart.example", phone: "053-000-1606", address_no: "45/12", moo: "3", subdistrict: "สุเทพ", district: "เมืองเชียงใหม่", province: "เชียงใหม่",
    jobs: [
      { title: "IoT Network Intern", quota: 2, compensation_text: "350 บาท/วัน", work_days_per_week: 5, workModes: ["onsite", "hybrid"], description: "ช่วยพัฒนาและติดตั้งระบบ IoT Network เชื่อมต่อ Sensor และ Gateway เรียนรู้ MQTT, TCP/IP, Wi-Fi และ Ethernet ตรวจสอบการเชื่อมต่อ Device กับ Server ทดลอง Raspberry Pi และ Linux เหมาะกับผู้ที่สนใจ IoT และ Network Infrastructure" },
      { title: "IT Helpdesk Intern", quota: 3, compensation_text: "350 บาท/วัน", work_days_per_week: 5, workModes: ["onsite"], description: "ให้บริการ IT Support แก่ผู้ใช้งาน แก้ไขปัญหา Windows, Printer และ Software ตรวจสอบ LAN, Wi-Fi และ Internet ติดตั้งโปรแกรมและอุปกรณ์คอมพิวเตอร์ จัดการ Ticket และบันทึกการแก้ไขปัญหา เรียนรู้ Helpdesk และ Technical Support" },
    ],
  },
  {
    name: "Isan Digital Infrastructure Co., Ltd.", email: "internship@isandigital.example", phone: "043-000-1707", address_no: "222/8", moo: "10", subdistrict: "ในเมือง", district: "เมืองขอนแก่น", province: "ขอนแก่น",
    jobs: [
      { title: "Network Administrator Intern", quota: 2, compensation_text: "8,000 บาท/เดือน", work_days_per_week: 5, workModes: ["onsite"], description: "ช่วย Network Administrator ดูแล LAN และ WAN ตั้งค่า Switch, VLAN และ Access Point ตรวจสอบ DHCP, DNS และ IP Address เรียนรู้ Firewall และ VPN วิเคราะห์ปัญหา Network Connectivity และจัดทำ Network Diagram" },
      { title: "Linux Server Intern", quota: 2, compensation_text: "8,000 บาท/เดือน", work_days_per_week: 5, workModes: ["hybrid"], description: "ดูแล Linux Server เบื้องต้น เรียนรู้ Ubuntu Server, SSH และ Linux Command Line ติดตั้ง Web Server และ Database ตรวจสอบ Log, CPU, RAM และ Disk เรียนรู้ Docker และ Server Monitoring เหมาะสำหรับผู้สนใจ System Administrator" },
    ],
  },
  {
    name: "Andaman Tech Connect Co., Ltd.", email: "hr@andamantech.example", phone: "076-000-1808", address_no: "18/72", moo: "1", subdistrict: "ตลาดใหญ่", district: "เมืองภูเก็ต", province: "ภูเก็ต",
    jobs: [
      { title: "Wireless Network Intern", quota: 2, compensation_text: "400 บาท/วัน", work_days_per_week: 5, workModes: ["onsite"], description: "ช่วยติดตั้งและดูแล Wireless Network สำหรับสำนักงาน โรงแรม และพื้นที่บริการ ตั้งค่า Access Point และ SSID เรียนรู้ Wi-Fi, VLAN, DHCP และ Network Security ตรวจสอบ Signal Coverage และแก้ไขปัญหาการเชื่อมต่อ Wireless" },
      { title: "IT Support Technician Intern", quota: 3, compensation_text: "350 บาท/วัน", work_days_per_week: 6, workModes: ["onsite"], description: "ดูแลอุปกรณ์ Computer และ Network ติดตั้ง Windows, Printer และ Application แก้ไขปัญหา LAN, Wi-Fi และ Internet ตรวจสอบ Router และ Switch เบื้องต้น ให้ Technical Support แก่ผู้ใช้งาน และบันทึก Ticket การให้บริการ" },
    ],
  },
  {
    name: "Vertex Enterprise Systems Co., Ltd.", email: "talent@vertexsystems.example", phone: "02-000-1909", address_no: "159/25", moo: null, subdistrict: "บางนาเหนือ", district: "บางนา", province: "กรุงเทพมหานคร",
    jobs: [
      { title: "DevOps Intern", quota: 2, compensation_text: "12,000 บาท/เดือน", work_days_per_week: 5, workModes: ["hybrid", "work_from_home"], description: "เรียนรู้ DevOps Workflow ใช้ Git, Docker และ Linux ช่วยดูแล CI/CD Pipeline เรียนรู้ Cloud Infrastructure บน AWS ตรวจสอบ Application และ Server Monitoring มีโอกาสศึกษา Container, Networking และ Infrastructure Automation" },
      { title: "Enterprise Infrastructure Intern", quota: 2, compensation_text: "10,000 บาท/เดือน", work_days_per_week: 5, workModes: ["onsite", "hybrid"], description: "ช่วยดูแล Enterprise Infrastructure ประกอบด้วย Windows Server, Linux, VMware, Active Directory, DNS และ DHCP ตรวจสอบ Server และ Network Monitoring ช่วยแก้ไข Incident และจัดทำ Infrastructure Documentation" },
    ],
  },
  {
    name: "GreenWave Telecom Integration Co., Ltd.", email: "jobs@greenwave.example", phone: "038-000-2010", address_no: "301/15", moo: "4", subdistrict: "มาบตาพุด", district: "เมืองระยอง", province: "ระยอง",
    jobs: [
      { title: "Telecom Network Intern", quota: 3, compensation_text: "450 บาท/วัน", work_days_per_week: 6, workModes: ["onsite"], description: "ช่วยทีมวิศวกรติดตั้งและตรวจสอบ Telecommunication Network เรียนรู้ Router, Switch และ Fiber Optic ตรวจสอบ Network Link และ Signal จัดทำ Network Diagram และรายงานผลการตรวจสอบระบบ เหมาะสำหรับนักศึกษาสาย Network และ Telecom" },
      { title: "Network Monitoring Intern", quota: 2, compensation_text: "400 บาท/วัน", work_days_per_week: 5, workModes: ["onsite", "hybrid"], description: "ตรวจสอบระบบ Network Monitoring ดูสถานะ WAN, Router, Switch และ Server วิเคราะห์ Alarm และ Network Incident ใช้ Ping, Traceroute, SNMP และ Monitoring Tools ช่วยบันทึก Incident และประสานงาน Network Engineer เหมาะสำหรับผู้สนใจ NOC และ Network Operations" },
    ],
  },
];

function normalize(value) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function assertDevelopmentEnvironment() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Development seed is disabled in production.");
  }
}

async function seedJobMatchingDemo(modelRegistry = { Company, JobSubmission, JobPosting, JobPostingWorkMode, sequelize }) {
  assertDevelopmentEnvironment();
  const now = new Date();
  const counters = { companiesCreated: 0, submissionsCreated: 0, jobsCreated: 0, workModesCreated: 0 };

  await modelRegistry.sequelize.transaction(async (transaction) => {
    for (const demoCompany of DEMO_COMPANIES) {
      const normalizedEmail = normalize(demoCompany.email);
      let company = await modelRegistry.Company.findOne({ where: { normalized_email: normalizedEmail }, transaction });
      if (!company) {
        const { jobs, ...companyData } = demoCompany;
        company = await modelRegistry.Company.create({ ...companyData, normalized_name: normalize(demoCompany.name), normalized_email: normalizedEmail, email_verified_at: now }, { transaction });
        counters.companiesCreated += 1;
      }

      let submission = await modelRegistry.JobSubmission.findOne({ where: { company_id: company.id, normalized_submitted_email: normalizedEmail, verification_status: "verified" }, transaction });
      if (!submission) {
        submission = await modelRegistry.JobSubmission.create({ company_id: company.id, submitted_email: normalizedEmail, normalized_submitted_email: normalizedEmail, verification_status: "verified", submitted_at: now, verified_at: now }, { transaction });
        counters.submissionsCreated += 1;
      }

      for (const demoJob of demoCompany.jobs) {
        let jobPosting = await modelRegistry.JobPosting.findOne({ where: { company_id: company.id, title: demoJob.title }, transaction });
        if (!jobPosting) {
          jobPosting = await modelRegistry.JobPosting.create({ company_id: company.id, submission_id: submission.id, title: demoJob.title, category: DEMO_CATEGORY, description: demoJob.description, quota: demoJob.quota, compensation_text: demoJob.compensation_text, work_days_per_week: demoJob.work_days_per_week, status: "published", submitted_at: now, reviewed_at: now, published_at: now }, { transaction });
          counters.jobsCreated += 1;
        }

        for (const mode of demoJob.workModes) {
          const existingWorkMode = await modelRegistry.JobPostingWorkMode.findOne({ where: { job_posting_id: jobPosting.id, mode }, transaction });
          if (!existingWorkMode) {
            await modelRegistry.JobPostingWorkMode.create({ job_posting_id: jobPosting.id, mode }, { transaction });
            counters.workModesCreated += 1;
          }
        }
      }
    }
  });
  return counters;
}

async function main() {
  try {
    assertDevelopmentEnvironment();
    await sequelize.authenticate();
    const counters = await seedJobMatchingDemo();
    console.log("Development job matching seed completed.");
    console.log(`Companies created: ${counters.companiesCreated}`);
    console.log(`Job submissions created: ${counters.submissionsCreated}`);
    console.log(`Job postings created: ${counters.jobsCreated}`);
    console.log(`Work mode rows created: ${counters.workModesCreated}`);
  } catch (error) {
    console.error("Development job matching seed failed:", error.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

if (require.main === module) main();

module.exports = { DEMO_COMPANIES, assertDevelopmentEnvironment, seedJobMatchingDemo };
