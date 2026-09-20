console.log("KIWI index page loaded");

// ==============================
// Authentication Navbar
// ==============================

const navAuth = document.getElementById("navAuth");

async function checkAuth() {
  const token = localStorage.getItem("token");

  // ไม่มี token = ยังไม่ได้ Login
  if (!token) {
    showGuestNavbar();
    return;
  }

  try {
    const response = await fetch(
      "http://localhost:5000/api/auth/me",
      {
        method: "GET",

        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.message || "ไม่สามารถตรวจสอบผู้ใช้งานได้"
      );
    }

    // อัปเดตข้อมูล student ล่าสุดจาก Backend
    localStorage.setItem(
      "student",
      JSON.stringify(result.data)
    );

    showStudentNavbar(result.data);
  } catch (error) {
    console.error("AUTH CHECK ERROR:", error);

    // Token หมดอายุ / Token ผิด
    localStorage.removeItem("token");
    localStorage.removeItem("student");

    showGuestNavbar();
  }
}

// ==============================
// Navbar ตอนยังไม่ได้ Login
// ==============================

function showGuestNavbar() {
  navAuth.innerHTML = `
    <a href="login.html" class="btn-login">
      เข้าสู่ระบบ
    </a>

    <a href="register.html" class="btn-register">
      สมัครสมาชิก
    </a>
  `;
}

// ==============================
// Navbar ตอน Login แล้ว
// ==============================

function showStudentNavbar(student) {
  navAuth.innerHTML = "";

  const userName = document.createElement("span");

  userName.className = "nav-user-name";

  userName.textContent =
    `${student.first_name || ""} ${student.last_name || ""}`.trim();

  const logoutButton = document.createElement("button");

  logoutButton.type = "button";
  logoutButton.id = "logoutBtn";
  logoutButton.className = "btn-register";
  logoutButton.textContent = "ออกจากระบบ";

  logoutButton.addEventListener("click", logout);

  navAuth.appendChild(userName);
  navAuth.appendChild(logoutButton);
}

// ==============================
// Logout
// ==============================

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("student");

  window.location.href = "/index.html";
}

// ตรวจ Login ตอนเปิดหน้า
checkAuth();

// ==============================
// Search
// ==============================

const searchInput = document.getElementById("searchInput");

const btnSearch = document.getElementById("btnSearch");

function searchJobs() {
  const keyword = searchInput.value.trim();

  if (!keyword) {
    return;
  }

  console.log("Search:", keyword);

  // ตอนนี้ยังเป็น Mockup
  // ภายหลังจะส่ง keyword ไป Backend
}

btnSearch.addEventListener("click", searchJobs);

searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    searchJobs();
  }
});

// ==============================
// Filter Modal
// ==============================

const filterModal =
  document.getElementById("filterModal");

const btnOpenFilter =
  document.getElementById("btnOpenFilter");

const btnCloseFilter =
  document.getElementById("btnCloseFilter");

const btnResetFilter =
  document.getElementById("btnResetFilter");

const btnApplyFilter =
  document.getElementById("btnApplyFilter");

const filterCompany =
  document.getElementById("filterCompany");

const filterPosition =
  document.getElementById("filterPosition");

const filterProvince =
  document.getElementById("filterProvince");

const filterOrganization =
  document.getElementById("filterOrganization");

const filterWorkType =
  document.getElementById("filterWorkType");

const filterWorkDays =
  document.getElementById("filterWorkDays");

const filterSalary =
  document.getElementById("filterSalary");

function openFilter() {
  filterModal.classList.remove("hidden");
}

function closeFilter() {
  filterModal.classList.add("hidden");
}

btnOpenFilter.addEventListener(
  "click",
  openFilter
);

btnCloseFilter.addEventListener(
  "click",
  closeFilter
);

// กดพื้นที่นอก Modal แล้วปิด
filterModal.addEventListener(
  "click",
  (event) => {
    if (event.target === filterModal) {
      closeFilter();
    }
  }
);

// Reset Filter
btnResetFilter.addEventListener(
  "click",
  () => {
    filterCompany.value = "";
    filterPosition.value = "";

    filterProvince.selectedIndex = 0;
    filterOrganization.selectedIndex = 0;
    filterWorkType.selectedIndex = 0;
    filterWorkDays.selectedIndex = 0;
    filterSalary.selectedIndex = 0;
  }
);

// Apply Filter
btnApplyFilter.addEventListener(
  "click",
  () => {
    const filters = {
      company: filterCompany.value.trim(),
      position: filterPosition.value.trim(),
      province: filterProvince.value,
      organization: filterOrganization.value,
      workType: filterWorkType.value,
      workDays: filterWorkDays.value,
      salary: filterSalary.value,
    };

    console.log(
      "Filters:",
      filters
    );

    closeFilter();

    // ตอนนี้ยังเป็น Mockup
    // ภายหลังจะส่ง filters ไป Backend
  }
);

// ==============================
// Recommended Jobs
// ==============================

const cardsContainer =
  document.getElementById(
    "cardsContainer"
  );

const dotsContainer =
  document.getElementById(
    "dotsContainer"
  );

const prevBtn =
  document.getElementById("prevBtn");

const nextBtn =
  document.getElementById("nextBtn");

// Mockup Job
const jobs = [
  {
    company: "BlueWave Digital Co., Ltd.",
    position: "Frontend Developer",
    province: "กรุงเทพมหานคร",
    workType: "Hybrid",
  },

  {
    company: "Cybersecurity Solutions",
    position: "Cybersecurity Analyst",
    province: "กรุงเทพมหานคร",
    workType: "On-site",
  },

  {
    company: "DataSphere Thailand",
    position: "Data Analyst Assistant",
    province: "ชลบุรี",
    workType: "Hybrid",
  },

  {
    company: "Cloud Matrix Thailand",
    position: "Backend Developer",
    province: "กรุงเทพมหานคร",
    workType: "Work from Home",
  },
];

let currentSlide = 0;

// ==============================
// Render Jobs
// ==============================

function renderJobs() {
  cardsContainer.innerHTML = "";

  jobs.forEach((job) => {
    const card =
      document.createElement(
        "article"
      );

    card.className = "job-card";

    card.innerHTML = `
      <div class="job-card-header">
        <h3>
          ${job.position}
        </h3>
      </div>

      <p class="job-company">
        ${job.company}
      </p>

      <div class="job-info">
        <span>
          <i class="fa-solid fa-location-dot"></i>
          ${job.province}
        </span>

        <span>
          <i class="fa-solid fa-briefcase"></i>
          ${job.workType}
        </span>
      </div>
    `;

    cardsContainer.appendChild(
      card
    );
  });

  renderDots();
}

// ==============================
// Slider Dots
// ==============================

function renderDots() {
  dotsContainer.innerHTML = "";

  jobs.forEach(
    (_, index) => {
      const dot =
        document.createElement(
          "button"
        );

      dot.type = "button";
      dot.className =
        "slider-dot";

      if (
        index === currentSlide
      ) {
        dot.classList.add(
          "active"
        );
      }

      dot.addEventListener(
        "click",
        () => {
          currentSlide =
            index;

          updateCarousel();
        }
      );

      dotsContainer.appendChild(
        dot
      );
    }
  );
}

// ==============================
// Update Carousel
// ==============================

function updateCarousel() {
  const cards =
    cardsContainer.querySelectorAll(
      ".job-card"
    );

  if (!cards.length) {
    return;
  }

  const card =
    cards[currentSlide];

  card.scrollIntoView({
    behavior: "smooth",
    block: "nearest",
    inline: "center",
  });

  renderDots();
}

// Previous
prevBtn.addEventListener(
  "click",
  () => {
    currentSlide--;

    if (currentSlide < 0) {
      currentSlide =
        jobs.length - 1;
    }

    updateCarousel();
  }
);

// Next
nextBtn.addEventListener(
  "click",
  () => {
    currentSlide++;

    if (
      currentSlide >=
      jobs.length
    ) {
      currentSlide = 0;
    }

    updateCarousel();
  }
);

renderJobs();

// ==============================
// Chatbot
// ==============================

const navChatbotBtn =
  document.getElementById(
    "navChatbotBtn"
  );

const btnToggleChat =
  document.getElementById(
    "btnToggleChat"
  );

const btnCloseChat =
  document.getElementById(
    "btnCloseChat"
  );

const chatWindow =
  document.getElementById(
    "chatWindow"
  );

const chatBody =
  document.getElementById(
    "chatBody"
  );

const quickReplies =
  document.getElementById(
    "quickReplies"
  );

const chatInput =
  document.getElementById(
    "chatInput"
  );

const btnSend =
  document.getElementById(
    "btnSend"
  );

// ==============================
// เปิด / ปิด Chat
// ==============================

function openChat() {
  chatWindow.classList.remove(
    "hidden"
  );
}

function closeChat() {
  chatWindow.classList.add(
    "hidden"
  );
}

navChatbotBtn.addEventListener(
  "click",
  (event) => {
    event.preventDefault();

    openChat();
  }
);

btnToggleChat.addEventListener(
  "click",
  () => {
    const isHidden =
      chatWindow.classList.contains(
        "hidden"
      );

    if (isHidden) {
      openChat();
    } else {
      closeChat();
    }
  }
);

btnCloseChat.addEventListener(
  "click",
  closeChat
);

// ==============================
// Chat Message
// ==============================

function createMessage(
  message,
  type = "bot"
) {
  const messageElement =
    document.createElement(
      "div"
    );

  messageElement.className =
    type === "user"
      ? "chat-message user-message"
      : "chat-message bot-message";

  messageElement.textContent =
    message;

  chatBody.appendChild(
    messageElement
  );

  chatBody.scrollTop =
    chatBody.scrollHeight;
}

// ==============================
// Send Chat Message
// ==============================

function sendMessage() {
  const message =
    chatInput.value.trim();

  if (!message) {
    return;
  }

  createMessage(
    message,
    "user"
  );

  chatInput.value = "";

  setTimeout(() => {
    createMessage(
      "ขณะนี้ระบบ Chatbot ยังอยู่ระหว่างการพัฒนา"
    );
  }, 500);
}

btnSend.addEventListener(
  "click",
  sendMessage
);

chatInput.addEventListener(
  "keydown",
  (event) => {
    if (
      event.key === "Enter"
    ) {
      sendMessage();
    }
  }
);

// ==============================
// Quick Replies
// ==============================

const quickReplyItems = [
  "ขั้นตอนยื่นคำร้อง",
  "เอกสารที่ต้องใช้",
  "ค้นหาสถานประกอบการ",
];

function renderQuickReplies() {
  quickReplies.innerHTML = "";

  quickReplyItems.forEach(
    (reply) => {
      const button =
        document.createElement(
          "button"
        );

      button.type = "button";
      button.textContent =
        reply;

      button.addEventListener(
        "click",
        () => {
          chatInput.value =
            reply;

          sendMessage();
        }
      );

      quickReplies.appendChild(
        button
      );
    }
  );
}

renderQuickReplies();

// ==============================
// Initial Chat Message
// ==============================

createMessage(
  "สวัสดีครับ ฉันคือ KIWI Chatbot มีอะไรให้ช่วยเกี่ยวกับสหกิจศึกษาหรือไม่"
);