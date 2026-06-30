/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const STORAGE_KEY = "madrasati-arabic-poetry-v1";

// Retrieve questions from global window scope
const QUESTIONS = window.QUESTIONS || [];

// Initial state structure
let state = {
  currentScreen: "home", // "home", "practice", "results"
  currentIndex: 0,
  answers: {},
  shownAnswers: {},
  ratings: {},
  mastery: {},
  expandedCards: { "q-01": true }, // Question 1 open by default
  theme: "light",
  filterStatus: "all", // "all", "unanswered", "unrated", "needs_review", "not_mastered", "mastered"
  filterPoet: "all" // "all", "haboub", "sharqi"
};

// Return the poet of a question based on its number
function getQuestionPoet(q) {
  return q.num <= 33 ? "haboub" : "sharqi";
}

// Academic label generator based on self-evaluation score
function getAcademicLabel(score) {
  if (score === undefined || score === null) return "غير مقيّم";
  const num = parseInt(score);
  if (isNaN(num)) return "غير مقيّم";
  if (num === 0) return "بحاجة لتركيز أكبر وتأسيس كامل ❌";
  if (num <= 2) return "تحتاج جهد إضافي ومراجعة دقيقة ⚠️";
  if (num <= 4) return "مقبول — تحتاج سد بعض الثغرات 👍";
  if (num <= 6) return "جيد — أداء مرضي ومتماسك ✨";
  if (num <= 8) return "جيد جداً — اقتربت من الإتقان الكامل 🌟";
  if (num <= 9) return "ممتاز — فهم عميق ومتميز 🏆";
  return "أداء عبقري ودرجة كاملة! 👑";
}

// Load saved state from localStorage
function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      state = { ...state, ...parsed };
    } catch (e) {
      console.error("Error parsing saved state:", e);
    }
  }
}

// Save state to localStorage
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// Initialize application
document.addEventListener("DOMContentLoaded", () => {
  loadState();
  applyTheme();
  renderApp();
  setupGlobalEvents();
});

// Setup modal behaviors & general screen elements
function setupGlobalEvents() {
  // Theme Toggle Button
  const themeBtn = document.getElementById("theme-toggle");
  if (themeBtn) {
    themeBtn.addEventListener("click", toggleTheme);
  }

  // Home logo click to return to home safely
  const brand = document.getElementById("nav-brand");
  if (brand) {
    brand.addEventListener("click", (e) => {
      e.preventDefault();
      navigateTo("home");
    });
  }

  // Confirm reset modal actions
  const btnCancelReset = document.getElementById("modal-cancel");
  const btnConfirmReset = document.getElementById("modal-confirm");
  const resetModal = document.getElementById("reset-modal");

  if (btnCancelReset && resetModal) {
    btnCancelReset.addEventListener("click", () => {
      resetModal.style.display = "none";
    });
  }

  if (btnConfirmReset && resetModal) {
    btnConfirmReset.addEventListener("click", () => {
      resetModal.style.display = "none";
      performReset();
    });
  }

  // Close modal clicking outside
  window.addEventListener("click", (e) => {
    if (e.target === resetModal) {
      resetModal.style.display = "none";
    }
  });
}

// Switch Themes between Light & Dark
function applyTheme() {
  const html = document.documentElement;
  html.setAttribute("data-theme", state.theme);
  
  const themeIcon = document.getElementById("theme-icon");
  if (themeIcon) {
    if (state.theme === "dark") {
      themeIcon.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-sun"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>
      `;
    } else {
      themeIcon.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-moon"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>
      `;
    }
  }
}

function toggleTheme() {
  state.theme = state.theme === "dark" ? "light" : "dark";
  applyTheme();
  saveState();
}

// Screen Routing
function navigateTo(screen) {
  state.currentScreen = screen;
  saveState();
  renderApp();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Perform full state reset
function performReset() {
  state.answers = {};
  state.shownAnswers = {};
  state.ratings = {};
  state.mastery = {};
  state.currentIndex = 0;
  state.filterStatus = "all";
  state.filterPoet = "all";
  state.expandedCards = { "q-01": true };
  saveState();
  navigateTo("poet-selection");
}

function promptReset() {
  const resetModal = document.getElementById("reset-modal");
  if (resetModal) {
    resetModal.style.display = "flex";
  } else {
    if (confirm("هل أنت متأكد من رغبتك في حذف جميع إجاباتك وبدء محاولة جديدة؟")) {
      performReset();
    }
  }
}

// Filter helper functions
function getFilteredQuestions() {
  const currentStatus = state.filterStatus || "all";
  const currentPoet = state.filterPoet || "all";

  return QUESTIONS.filter(q => {
    // 1. Poet filter
    const poet = getQuestionPoet(q);
    if (currentPoet !== "all" && poet !== currentPoet) {
      return false;
    }

    // 2. Status filter
    const isAnswered = !!state.answers[q.id] && state.answers[q.id].trim().length > 0;
    const hasRating = state.ratings[q.id] !== undefined;
    const masteryStatus = state.mastery[q.id];

    if (currentStatus === "unanswered") {
      return !isAnswered;
    }
    if (currentStatus === "unrated") {
      return !hasRating;
    }
    if (currentStatus === "needs_review") {
      return masteryStatus === "mid";
    }
    if (currentStatus === "not_mastered") {
      return masteryStatus === "low";
    }
    if (currentStatus === "mastered") {
      return masteryStatus === "high";
    }
    return true; // "all"
  });
}

function getFilteredIndex() {
  const filtered = getFilteredQuestions();
  const currentQ = QUESTIONS[state.currentIndex];
  if (!currentQ) return -1;
  return filtered.findIndex(q => q.id === currentQ.id);
}

function ensureValidFilterSelection() {
  const filtered = getFilteredQuestions();
  if (filtered.length === 0) return;
  const idx = getFilteredIndex();
  if (idx === -1) {
    const targetQ = filtered[0];
    const origIndex = QUESTIONS.findIndex(q => q.id === targetQ.id);
    if (origIndex !== -1) {
      state.currentIndex = origIndex;
      state.expandedCards = {};
      state.expandedCards[targetQ.id] = true;
      saveState();
    }
  }
}

window.setFilterStatus = function(newStatus) {
  state.filterStatus = newStatus;
  ensureValidFilterSelection();
  saveState();
  renderApp();
};

window.setFilterPoet = function(newPoet) {
  state.filterPoet = newPoet;
  ensureValidFilterSelection();
  saveState();
  renderApp();
};

// 1. Home Screen Layout
function renderHomeScreen(container) {
  const answeredCount = Object.keys(state.answers).filter(q => state.answers[q].trim().length > 0).length;
  const totalQuestions = QUESTIONS.length;
  const hasHistory = answeredCount > 0;

  const homeHTML = `
    <div class="home-screen" id="home-screen">
      <h1 class="home-title">تطبيق مدرسي التعليمي</h1>
      <p class="home-subtitle">التقييم الذاتي التفاعلي للأسئلة الوزارية الخاصة بالشاعرين الكبيرين: <strong>محمد سعيد الحبوبي</strong> و<strong>علي الشرقي</strong> للصف السادس الإعدادي</p>
      
      <div class="home-steps-card">
        <h3 class="home-steps-title">طريقة العمل الأكاديمية والتقييم الذاتي:</h3>
        <ul class="home-steps-list">
          <li>
            <span class="home-steps-num">١</span>
            <span>اقرأ السؤال الوزاري بعناية، واكتب جوابك الشخصي والأدبي كاملاً في الحقل المخصص.</span>
          </li>
          <li>
            <span class="home-steps-num">٢</span>
            <span>اضغط على زر (أظهر الجواب النموذجي) لمقارنة جوابك مع المصدر الرسمي لوزارة التربية العراقية.</span>
          </li>
          <li>
            <span class="home-steps-num">٣</span>
            <span>قيّم جوابك بموضوعية على تدريج الدرجات من (0 إلى 10) باستخدام الميزان الأكاديمي التفاعلي.</span>
          </li>
          <li>
            <span class="home-steps-num">٤</span>
            <span>حدّد مستوى تمكنك من السؤال (متمكن، يحتاج مراجعة، غير متمكن) لمتابعة تقارير التحصيل والتمكن لاحقاً.</span>
          </li>
        </ul>
      </div>

      <div class="home-stats-preview">
        يحتوي التطبيق على ${totalQuestions} سؤالاً وزارياً مقسماً على الشاعرين.
        ${hasHistory ? `<br><span style="color:var(--color-primary); font-weight: 700;">لقد قمت بحل ${answeredCount} من أصل ${totalQuestions} سؤالاً سابقاً.</span>` : ""}
      </div>

      <div class="home-actions">
        ${hasHistory ? `
          <button class="btn btn-primary" id="btn-continue">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-play"><polygon points="6 3 20 12 6 21 6 3"/></svg>
            متابعة التدريب الحالي
          </button>
          <button class="btn btn-secondary" id="btn-new-attempt">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-rotate-ccw"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
            بدء محاولة جديدة تماماً
          </button>
        ` : `
          <button class="btn btn-primary" id="btn-start">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-graduation-cap"><path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M6 18.8 6 12"/><path d="M18 12v6.8a2 2 0 0 1-1.332 1.888L12 22"/></svg>
            ابدأ التقييم الذاتي الآن
          </button>
        `}
      </div>
    </div>
  `;

  container.innerHTML = homeHTML;

  const btnStart = document.getElementById("btn-start");
  const btnContinue = document.getElementById("btn-continue");
  const btnNewAttempt = document.getElementById("btn-new-attempt");

  if (btnStart) btnStart.addEventListener("click", () => navigateTo("poet-selection"));
  if (btnContinue) btnContinue.addEventListener("click", () => navigateTo("practice"));
  if (btnNewAttempt) btnNewAttempt.addEventListener("click", () => promptReset());
}

// 1.5. Poet Selection Screen Layout
function renderPoetSelectionScreen(container) {
  const totalHaboub = 33;
  const totalSharqi = QUESTIONS.length - totalHaboub; // 27

  const solvedHaboub = QUESTIONS.filter(q => getQuestionPoet(q) === "haboub" && (state.answers[q.id] || "").trim().length > 0).length;
  const solvedSharqi = QUESTIONS.filter(q => getQuestionPoet(q) === "sharqi" && (state.answers[q.id] || "").trim().length > 0).length;

  const pctHaboub = Math.round((solvedHaboub / totalHaboub) * 100);
  const pctSharqi = Math.round((solvedSharqi / totalSharqi) * 100);

  const selectionHTML = `
    <div class="poet-selection-screen animate-fade-in">
      <h1 class="selection-title">اختر الشاعر للبدء بالتقييم الذاتي</h1>
      <p class="selection-subtitle">حدد المنهج الذي ترغب في مراجعته وحل أسئلته الوزارية والمناقشات الخاصة به</p>
      
      <div class="poet-selection-grid">
        <!-- 1. Mohammed Saeed Al-Haboubi Card -->
        <div class="poet-selection-card ${state.filterPoet === 'haboub' ? 'active' : ''}" onclick="selectPoet('haboub')">
          <h2 class="poet-card-name">محمد سعيد الحبوبي</h2>
          <p class="poet-card-description">شاعر عراقي ولد في النجف الأشرف، كان مجدداً وبطلاً لثورة العشرين ومقاومًا للمحتل، واشتهر بفن الموشحات وخاصة موشحة "يا غزال الكرخ".</p>
          
          <div class="poet-card-progress-wrapper" onclick="event.stopPropagation();">
            <div class="poet-progress-header">
              <span>الأسئلة المنجزة: ${solvedHaboub} من ${totalHaboub}</span>
              <span>${pctHaboub}%</span>
            </div>
            <div class="poet-progress-bar-outer">
              <div class="poet-progress-bar-inner" style="width: ${pctHaboub}%;"></div>
            </div>
          </div>
          
          <button class="btn btn-primary btn-poet-select" onclick="selectPoet('haboub'); event.stopPropagation();">
            ابدأ دراسة الحبوبي
          </button>
        </div>

        <!-- 2. Ali Al-Sharqi Card -->
        <div class="poet-selection-card ${state.filterPoet === 'sharqi' ? 'active' : ''}" onclick="selectPoet('sharqi')">
          <h2 class="poet-card-name">علي الشرقي</h2>
          <p class="poet-card-description">شاعر عراقي ولد في مدينة الشطرة، عُرف بنضاله وجهاده ووطنيته الفذة، تميز بأسلوبه اللغوي الرصين وقصيدته الشهيرة "بنت العقيدة".</p>
          
          <div class="poet-card-progress-wrapper" onclick="event.stopPropagation();">
            <div class="poet-progress-header">
              <span>الأسئلة المنجزة: ${solvedSharqi} من ${totalSharqi}</span>
              <span>${pctSharqi}%</span>
            </div>
            <div class="poet-progress-bar-outer">
              <div class="poet-progress-bar-inner" style="width: ${pctSharqi}%;"></div>
            </div>
          </div>
          
          <button class="btn btn-primary btn-poet-select" onclick="selectPoet('sharqi'); event.stopPropagation();">
            ابدأ دراسة الشرقي
          </button>
        </div>
      </div>
    </div>
  `;

  container.innerHTML = selectionHTML;
}

// Handle poet selection and navigate to practice
function selectPoet(poet) {
  state.filterPoet = poet;
  state.filterStatus = "all";

  if (poet === "haboub") {
    state.currentIndex = 0;
  } else if (poet === "sharqi") {
    const firstSharqiIndex = QUESTIONS.findIndex(q => getQuestionPoet(q) === "sharqi");
    state.currentIndex = firstSharqiIndex !== -1 ? firstSharqiIndex : 33;
  } else {
    state.currentIndex = 0;
  }

  state.expandedCards = {};
  const targetQ = QUESTIONS[state.currentIndex];
  if (targetQ) {
    state.expandedCards[targetQ.id] = true;
  }

  state.currentScreen = "practice";
  saveState();
  renderApp();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Render dynamic elements according to active screen state
function renderApp() {
  const mainContent = document.getElementById("main-content");
  if (!mainContent) return;

  const navHomeBtn = document.getElementById("nav-home-btn");
  if (navHomeBtn) {
    if (state.currentScreen === "home") {
      navHomeBtn.style.display = "none";
    } else {
      navHomeBtn.style.display = "inline-flex";
    }
  }

  mainContent.innerHTML = "";

  if (state.currentScreen === "home") {
    renderHomeScreen(mainContent);
  } else if (state.currentScreen === "poet-selection") {
    renderPoetSelectionScreen(mainContent);
  } else if (state.currentScreen === "practice") {
    renderPracticeScreen(mainContent);
  } else if (state.currentScreen === "results") {
    renderResultsScreen(mainContent);
  }
}

// Helper to render compact, zero-height poetry blocks matching strict layout rules
function renderPoetryBlock(poetryList) {
  if (!poetryList || poetryList.length === 0) return "";
  
  const rows = poetryList.map(item => `
    <div class="poetry-row">
      <div class="poetry-sadr">${item.sadr}</div>
      <div class="poetry-ajuz">${item.ajuz}</div>
    </div>
  `).join("");
  
  return `
    <div class="poetry-grid">
      ${rows}
    </div>
  `;
}

// 2. Practice Screen Layout
function renderPracticeScreen(container) {
  const totalQuestions = QUESTIONS.length;
  
  ensureValidFilterSelection();
  
  const filtered = getFilteredQuestions();
  const filteredIdx = getFilteredIndex();
  
  const answeredCount = QUESTIONS.filter(q => (state.answers[q.id] || "").trim().length > 0).length;
  const progressPercent = Math.round((answeredCount / totalQuestions) * 100);

  const ratedCount = QUESTIONS.filter(q => state.ratings[q.id] !== undefined).length;
  const ratedPercent = Math.round((ratedCount / totalQuestions) * 100);

  const practiceHTML = `
    <div class="practice-header">
      <!-- Solution Progress -->
      <div class="progress-container" style="margin-bottom: 0.4rem;">
        <span class="progress-label" style="font-size: 0.85rem; color: var(--color-text-muted); display: flex; align-items: center; gap: 0.25rem;">
          <span style="width: 8px; height: 8px; border-radius: 50%; background-color: var(--madrasati-medium-purple); display: inline-block;"></span>
          تقدمك في الإجابة: ${answeredCount} من ${totalQuestions}
        </span>
        <span class="progress-label" style="font-size: 0.85rem; color: var(--madrasati-medium-purple); font-weight: 600;">${progressPercent}%</span>
      </div>
      <div class="progress-bar-outer" style="height: 6px; margin-bottom: 0.75rem;">
        <div class="progress-bar-inner" style="width: ${progressPercent}%; background-color: var(--madrasati-medium-purple);"></div>
      </div>

      <!-- Self Evaluation Progress -->
      <div class="progress-container" style="margin-bottom: 0.4rem;">
        <span class="progress-label" style="font-size: 0.9rem; color: var(--color-text-main); font-weight: 700; display: flex; align-items: center; gap: 0.25rem;">
          <span style="width: 8px; height: 8px; border-radius: 50%; background-color: var(--color-primary); display: inline-block;"></span>
          نسبة الأسئلة المقيّمة ذاتياً: ${ratedCount} من ${totalQuestions}
        </span>
        <span class="progress-label" style="font-size: 0.9rem; color: var(--color-primary); font-weight: 700;">${ratedPercent}%</span>
      </div>
      <div class="progress-bar-outer" style="height: 8px; margin-bottom: 1.5rem;">
        <div class="progress-bar-inner" style="width: ${ratedPercent}%; background-color: var(--color-primary);"></div>
      </div>

      <!-- Multi-tier Filter Bar -->
      <div class="filter-bar" style="flex-direction: column; align-items: stretch; gap: 1rem;">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem;">
          <span class="filter-label" style="font-size: 0.9rem;">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            تصفية حسب الشاعر:
          </span>
          <div class="filter-options">
            <button class="filter-btn ${state.filterPoet === 'all' ? 'active' : ''}" onclick="setFilterPoet('all')">كلا الشاعرين</button>
            <button class="filter-btn ${state.filterPoet === 'haboub' ? 'active' : ''}" onclick="setFilterPoet('haboub')">محمد سعيد الحبوبي</button>
            <button class="filter-btn ${state.filterPoet === 'sharqi' ? 'active' : ''}" onclick="setFilterPoet('sharqi')">علي الشرقي</button>
          </div>
        </div>

        <div style="border-top: 1px dashed var(--color-border); padding-top: 0.75rem; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.75rem;">
          <span class="filter-label" style="font-size: 0.9rem;">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-filter"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            تصفية حالة السؤال:
          </span>
          <div class="filter-options">
            <button class="filter-btn ${state.filterStatus === 'all' ? 'active' : ''}" onclick="setFilterStatus('all')">الكل</button>
            <button class="filter-btn ${state.filterStatus === 'unanswered' ? 'active' : ''}" onclick="setFilterStatus('unanswered')">غير المحلولة</button>
            <button class="filter-btn ${state.filterStatus === 'unrated' ? 'active' : ''}" onclick="setFilterStatus('unrated')">لم تقيّم</button>
            <button class="filter-btn ${state.filterStatus === 'needs_review' ? 'active' : ''}" onclick="setFilterStatus('needs_review')">تحتاج مراجعة</button>
            <button class="filter-btn ${state.filterStatus === 'not_mastered' ? 'active' : ''}" onclick="setFilterStatus('not_mastered')">غير متمكن</button>
            <button class="filter-btn ${state.filterStatus === 'mastered' ? 'active' : ''}" onclick="setFilterStatus('mastered')">متمكن</button>
          </div>
        </div>
      </div>
      
      <!-- Horizontal Navigation Dot Rail -->
      <div class="question-navigator" id="nav-rail"></div>
    </div>

    <div class="questions-list" id="accordion-container"></div>

    <!-- Bottom Fast-Jump Pagination -->
    <div class="bottom-pagination-container">
      <div class="pagination-header">
        <span class="pagination-title">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-layout-grid"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>
          لوحة الانتقال السريع:
        </span>
        <div class="pagination-legend">
          <span class="legend-item"><span class="legend-dot unanswered"></span>غير مجاب</span>
          <span class="legend-item"><span class="legend-dot answered"></span>مجاب</span>
          <span class="legend-item"><span class="legend-dot active"></span>السؤال النشط</span>
        </div>
      </div>
      <div class="pagination-list" id="bottom-pagination-list"></div>
    </div>

    <!-- Screen Action controls -->
    <div class="bottom-nav">
      <button class="btn btn-secondary" id="btn-prev-q">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-right"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
        السؤال السابق
      </button>

      <button class="btn btn-primary" id="btn-finish-practice">
        عرض تقرير التمكين والنتيجة
      </button>

      <button class="btn btn-secondary" id="btn-next-q">
        السؤال التالي
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-left"><path d="m12 19 7-7-7-7"/><path d="M5 12h14"/></svg>
      </button>
    </div>
  `;

  container.innerHTML = practiceHTML;

  renderNavigationRail();
  renderBottomPagination();
  renderAccordionCards();

  const btnPrev = document.getElementById("btn-prev-q");
  const btnNext = document.getElementById("btn-next-q");
  const btnFinish = document.getElementById("btn-finish-practice");

  if (btnPrev) {
    btnPrev.disabled = filtered.length === 0 || filteredIdx <= 0;
    btnPrev.addEventListener("click", () => {
      if (filteredIdx > 0) {
        const targetQ = filtered[filteredIdx - 1];
        const origIndex = QUESTIONS.findIndex(q => q.id === targetQ.id);
        if (origIndex !== -1) setFocusedIndex(origIndex);
      }
    });
  }

  if (btnNext) {
    btnNext.disabled = filtered.length === 0 || filteredIdx === -1 || filteredIdx >= filtered.length - 1;
    btnNext.addEventListener("click", () => {
      if (filteredIdx < filtered.length - 1) {
        const targetQ = filtered[filteredIdx + 1];
        const origIndex = QUESTIONS.findIndex(q => q.id === targetQ.id);
        if (origIndex !== -1) setFocusedIndex(origIndex);
      }
    });
  }

  if (btnFinish) {
    btnFinish.addEventListener("click", () => navigateTo("results"));
  }
}

// Render the top horizontal navigation rail of dots
function renderNavigationRail() {
  const rail = document.getElementById("nav-rail");
  if (!rail) return;

  const filtered = getFilteredQuestions();

  filtered.forEach((q) => {
    const originalNum = QUESTIONS.findIndex(item => item.id === q.id) + 1;
    const isDotActive = state.currentIndex === QUESTIONS.findIndex(item => item.id === q.id);

    const dot = document.createElement("div");
    dot.className = `nav-dot ${isDotActive ? 'active' : ''} ${state.answers[q.id] ? 'answered' : ''}`;
    dot.dataset.qId = q.id;
    dot.textContent = originalNum;
    dot.title = `سؤال ${originalNum}`;
    
    dot.addEventListener("click", () => {
      const origIndex = QUESTIONS.findIndex(item => item.id === q.id);
      if (origIndex !== -1) setFocusedIndex(origIndex);
    });

    rail.appendChild(dot);
  });

  const activeDot = rail.querySelector(".nav-dot.active");
  if (activeDot) {
    activeDot.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }
}

// Render the bottom quick navigation dashboard list
function renderBottomPagination() {
  const list = document.getElementById("bottom-pagination-list");
  if (!list) return;

  const filtered = getFilteredQuestions();

  filtered.forEach((q) => {
    const originalIdx = QUESTIONS.findIndex(item => item.id === q.id);
    const originalNum = originalIdx + 1;
    const isCurrent = state.currentIndex === originalIdx;
    const isAnswered = !!state.answers[q.id] && state.answers[q.id].trim().length > 0;

    const btn = document.createElement("button");
    btn.className = `pagination-item-btn ${isCurrent ? 'active' : ''} ${isAnswered ? 'answered' : 'unanswered'}`;
    btn.dataset.qId = q.id;
    
    let indicatorHTML = "";
    if (isAnswered) {
      indicatorHTML = `
        <span class="status-indicator-badge answered-badge">
          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check"><path d="M20 6 9 17l-5-5"/></svg>
        </span>
      `;
    } else {
      indicatorHTML = `<span class="status-indicator-badge unanswered-badge"></span>`;
    }

    btn.innerHTML = `
      <span class="btn-num">${originalNum}</span>
      ${indicatorHTML}
    `;
    btn.title = `سؤال ${originalNum}: ${isAnswered ? 'مُجاب' : 'غير مُجاب'}`;

    btn.addEventListener("click", () => {
      setFocusedIndex(originalIdx);
    });

    list.appendChild(btn);
  });

  const activeBtn = list.querySelector(".pagination-item-btn.active");
  if (activeBtn) {
    activeBtn.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }
}

// Changes active question focus and forces card expansion
function setFocusedIndex(idx) {
  state.currentIndex = idx;
  state.expandedCards = {};
  
  const targetQ = QUESTIONS[idx];
  state.expandedCards[targetQ.id] = true;

  saveState();
  renderApp();

  setTimeout(() => {
    const activeCard = document.getElementById(`card-${targetQ.id}`);
    if (activeCard) {
      activeCard.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, 50);
}

// Render the active focused question card with full separation locks
function renderAccordionCards() {
  const container = document.getElementById("accordion-container");
  if (!container) return;

  const filtered = getFilteredQuestions();
  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-filter-state">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-filter-x"><path d="M13.013 3H21v2l-7.381 7.381a1 1 0 0 0-.262.535l-.757 3.533-3.411-3.411M3 3l18 18M9 3h1.243a1 1 0 0 1 .707.293L13.01 5.36M9 9.172 4.381 4.552A1 1 0 0 0 3 5v2l6 6v6l3 3v-7"/></svg>
        <h3>لا توجد أسئلة تطابق التصفية الحالية</h3>
        <p>يرجى اختيار تصنيفات أخرى أو عرض الأسئلة كاملة.</p>
        <button class="btn btn-primary" onclick="setFilterStatus('all'); setFilterPoet('all')">عرض جميع الأسئلة</button>
      </div>
    `;
    return;
  }

  const filteredIdx = getFilteredIndex();
  if (filteredIdx === -1) return;

  const q = filtered[filteredIdx];
  const originalIdx = QUESTIONS.findIndex(item => item.id === q.id);
  const originalNum = originalIdx + 1;

  const isAnswered = !!state.answers[q.id] && state.answers[q.id].trim().length > 0;
  const isShown = !!state.shownAnswers[q.id];
  const hasRating = state.ratings[q.id] !== undefined;
  const masteryStatus = state.mastery[q.id];

  const poetName = getQuestionPoet(q) === "haboub" ? "محمد سعيد الحبوبي" : "علي الشرقي";

  // Build status and mastery badge elements
  let statusText = "لم تتم الإجابة";
  let statusClass = "status-unanswered";

  if (hasRating) {
    statusText = "تم التقييم";
    statusClass = "status-rated";
  } else if (isShown) {
    statusText = "تم عرض الجواب";
    statusClass = "status-viewed";
  } else if (isAnswered) {
    statusText = "تمت الإجابة";
    statusClass = "status-answered";
  }

  let masteryBadgeHTML = "";
  if (masteryStatus) {
    let mText = "";
    let mClass = "";
    if (masteryStatus === "high") {
      mText = "متمكن";
      mClass = "mastery-high";
    } else if (masteryStatus === "mid") {
      mText = "يحتاج مراجعة";
      mClass = "mastery-mid";
    } else if (masteryStatus === "low") {
      mText = "غير متمكن";
      mClass = "mastery-low";
    }
    masteryBadgeHTML = `<span class="mastery-badge ${mClass}">${mText}</span>`;
  }

  const card = document.createElement("div");
  card.id = `card-${q.id}`;
  card.className = "accordion-card active";

  // 1. Render prompt poetry only when included in promptPoetry (Case B)
  let promptPoetryHTML = "";
  if (q.promptPoetry) {
    promptPoetryHTML = renderPoetryBlock(q.promptPoetry);
  }

  // 2. Render answer poetry strictly inside the model-answer section, locked until reveal (Case A & Case C)
  let answerPoetryHTML = "";
  if (q.answerPoetry) {
    answerPoetryHTML = renderPoetryBlock(q.answerPoetry);
  }

  card.innerHTML = `
    <!-- Header of Question -->
    <div class="card-header" style="cursor: default;">
      <div class="card-header-left">
        <span class="question-num-badge">${originalNum}</span>
        <span class="question-preview-text" style="font-weight: 700;">الشاعر: ${poetName}</span>
      </div>
      <div class="card-header-right">
        ${masteryBadgeHTML}
        <span class="status-badge ${statusClass}">${statusText}</span>
      </div>
    </div>

    <!-- Body of active workspace -->
    <div class="card-body" style="display: block;">
      <div class="badges-row">
        ${q.years ? `<span class="year-badge" style="background-color: var(--color-accent-bg); color: var(--color-primary); border-color: var(--color-primary);">${q.years}</span>` : ''}
      </div>

      <h3 class="question-text">${q.question}</h3>

      <!-- Prompt Poetry (visible only if Case B: question itself gives verses) -->
      ${promptPoetryHTML}

      <!-- Student Input Area -->
      <div class="answer-input-container">
        <label class="answer-label" for="textarea-${q.id}">صياغة إجابتك النموذجية المكتوبة:</label>
        <textarea 
          class="answer-textarea" 
          id="textarea-${q.id}" 
          placeholder="اكتب هنا إجابتك الأدبية الكاملة والمضبوطة لمقارنتها لاحقاً بالأجوبة الرسمية..."
          ${isShown ? 'disabled' : ''}
        >${state.answers[q.id] || ""}</textarea>
      </div>

      <!-- Reveal action button -->
      <div class="submit-action-row">
        <button 
          class="btn btn-primary" 
          id="btn-show-${q.id}" 
          onclick="revealModelAnswer('${q.id}')"
          ${(!state.answers[q.id] || state.answers[q.id].trim().length === 0 || isShown) ? 'disabled' : ''}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eye"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0z"/><circle cx="12" cy="12" r="3"/></svg>
          تمت الإجابة — أظهر الجواب النموذجي
        </button>
      </div>

      <!-- Hidden Model Answer Section -->
      <div class="model-answer-section" id="model-${q.id}" style="${isShown ? 'display:block;' : 'display:none;'}">
        <h4 class="model-answer-title">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check-circle-2"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
          الجواب النموذجي والوزاري المعتمد:
        </h4>
        <p class="model-answer-text" style="margin-bottom: 1rem;">${q.modelAnswer}</p>
        
        <!-- Answer Poetry (visible only after click, satisfying Case A & C separation rules) -->
        ${answerPoetryHTML}
      </div>

      <!-- Hidden Self-Assessment Dashboard -->
      <div class="evaluation-section" id="eval-${q.id}" style="${isShown ? 'display:block;' : 'display:none;'}">
        <h4 class="eval-title">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-award"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>
          ميزان التقييم والمطابقة (0 - 10 درجات)
        </h4>
        <p class="eval-subtitle">طابق إجابتك مع الأجوبة والشواهد الوزارية الرسمية المعروضة أعلاه ثم اختر درجة تقييمك بدقة:</p>
        
        <div class="academic-slider-wrapper">
          <div class="academic-badge-container">
            <span class="academic-score-title">مستوى الأداء:</span>
            <div class="academic-score-badge" id="score-badge-${q.id}">
              ${state.ratings[q.id] !== undefined ? `${state.ratings[q.id]} / 10 — ${getAcademicLabel(state.ratings[q.id])}` : 'بانتظار تحديد درجة التقييم'}
            </div>
          </div>

          <div class="academic-slider-container">
            <div class="academic-slider-track">
              <div class="academic-slider-fill" id="slider-fill-${q.id}" style="width: ${state.ratings[q.id] !== undefined ? (state.ratings[q.id] * 10) : 0}%;"></div>
            </div>

            <!-- Steps buttons -->
            <div class="academic-slider-steps">
              ${Array.from({length: 11}).map((_, i) => {
                const isSelected = state.ratings[q.id] === i;
                const leftPos = i * 10;
                return `
                  <button 
                    class="step-node ${isSelected ? 'selected' : ''}" 
                    style="left: ${leftPos}%;" 
                    onclick="rateQuestion('${q.id}', ${i})"
                    title="تقييم بـ ${i} درجات"
                  >
                    <span class="step-dot"></span>
                    <span class="step-number">${i}</span>
                  </button>
                `;
              }).join('')}
            </div>
          </div>

          <div class="academic-milestones">
            <span class="milestone milestone-low">غير متمكن / بحاجة لتأسيس (0-2)</span>
            <span class="milestone milestone-mid">مستوى متوسط يحتاج لدعم (3-6)</span>
            <span class="milestone milestone-high">إجابة نموذجية ومتمكنة (7-10)</span>
          </div>
        </div>

        <!-- Mastery status section -->
        <div class="mastery-section">
          <h4 class="mastery-title">تصنيف مستوى المهارة والتمكن النهائي:</h4>
          <div class="mastery-buttons">
            <button 
              class="btn-mastery ${state.mastery[q.id] === 'high' ? 'selected-high' : ''}" 
              onclick="setMasteryStatus('${q.id}', 'high')"
            >
              متمكن بالكامل من السؤال
            </button>
            <button 
              class="btn-mastery ${state.mastery[q.id] === 'mid' ? 'selected-mid' : ''}" 
              onclick="setMasteryStatus('${q.id}', 'mid')"
            >
              أحتاج لمراجعة وحل إضافي
            </button>
            <button 
              class="btn-mastery ${state.mastery[q.id] === 'low' ? 'selected-low' : ''}" 
              onclick="setMasteryStatus('${q.id}', 'low')"
            >
              غير متمكن حالياً من الإجابة
            </button>
          </div>
        </div>

      </div>
    </div>
  `;

  container.appendChild(card);

  const textarea = card.querySelector(".answer-textarea");
  const btnShow = card.querySelector(`#btn-show-${q.id}`);

  if (textarea && btnShow) {
    textarea.addEventListener("input", (e) => {
      const val = e.target.value;
      state.answers[q.id] = val;
      saveState();

      const hasText = val.trim().length > 0;

      const dot = document.querySelector(`.nav-dot[data-q-id="${q.id}"]`);
      if (dot) {
        if (hasText) dot.classList.add("answered");
        else dot.classList.remove("answered");
      }

      const pBtn = document.querySelector(`.pagination-item-btn[data-q-id="${q.id}"]`);
      if (pBtn) {
        if (hasText) {
          pBtn.classList.add("answered");
          pBtn.classList.remove("unanswered");
          const dotIcon = pBtn.querySelector(".unanswered-badge");
          if (dotIcon) {
            dotIcon.outerHTML = `
              <span class="status-indicator-badge answered-badge">
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check"><path d="M20 6 9 17l-5-5"/></svg>
              </span>
            `;
          }
        } else {
          pBtn.classList.remove("answered");
          pBtn.classList.add("unanswered");
          const checkIcon = pBtn.querySelector(".answered-badge");
          if (checkIcon) {
            checkIcon.outerHTML = `<span class="status-indicator-badge unanswered-badge"></span>`;
          }
        }
      }

      if (hasText && !state.shownAnswers[q.id]) {
        btnShow.disabled = false;
      } else {
        btnShow.disabled = true;
      }
    });
  }
}

// Reveal Model Answer
window.revealModelAnswer = function(qId) {
  state.shownAnswers[qId] = true;
  saveState();

  const textarea = document.getElementById(`textarea-${qId}`);
  if (textarea) textarea.disabled = true;

  const btnShow = document.getElementById(`btn-show-${qId}`);
  if (btnShow) {
    btnShow.disabled = true;
    btnShow.style.display = "none";
  }

  const modelSection = document.getElementById(`model-${qId}`);
  const evalSection = document.getElementById(`eval-${qId}`);

  if (modelSection) modelSection.style.display = "block";
  if (evalSection) evalSection.style.display = "block";

  const cardHeader = document.getElementById(`card-${qId}`);
  if (cardHeader) {
    const badge = cardHeader.querySelector(".status-badge");
    if (badge) {
      badge.textContent = "تم عرض الجواب";
      badge.className = "status-badge status-viewed";
    }
  }

  renderPracticeScreenProgressOnly();
};

// Rate Question (0 to 10 marks on the premium academic slider)
window.rateQuestion = function(qId, score) {
  state.ratings[qId] = score;
  saveState();

  const evalSec = document.getElementById(`eval-${qId}`);
  if (evalSec) {
    const nodes = evalSec.querySelectorAll(".step-node");
    nodes.forEach((node, i) => {
      if (i === score) node.classList.add("selected");
      else node.classList.remove("selected");
    });

    const fill = document.getElementById(`slider-fill-${qId}`);
    if (fill) fill.style.width = `${score * 10}%`;

    const badge = document.getElementById(`score-badge-${qId}`);
    if (badge) {
      badge.textContent = `${score} / 10 — ${getAcademicLabel(score)}`;
      badge.classList.remove("badge-pulse");
      void badge.offsetWidth; // Force reflow
      badge.classList.add("badge-pulse");
    }
  }

  const cardHeader = document.getElementById(`card-${qId}`);
  if (cardHeader) {
    const badge = cardHeader.querySelector(".status-badge");
    if (badge) {
      badge.textContent = "تم التقييم";
      badge.className = "status-badge status-rated";
    }
  }
};

// Set mastery status
window.setMasteryStatus = function(qId, status) {
  state.mastery[qId] = status;
  saveState();

  const evalSec = document.getElementById(`eval-${qId}`);
  if (evalSec) {
    const btns = evalSec.querySelectorAll(".btn-mastery");
    btns.forEach((btn, idx) => {
      btn.className = "btn-mastery";
      if (idx === 0 && status === "high") btn.classList.add("selected-high");
      if (idx === 1 && status === "mid") btn.classList.add("selected-mid");
      if (idx === 2 && status === "low") btn.classList.add("selected-low");
    });
  }

  const cardHeader = document.getElementById(`card-${qId}`);
  if (cardHeader) {
    let badgeContainer = cardHeader.querySelector(".mastery-badge");
    if (!badgeContainer) {
      badgeContainer = document.createElement("span");
      const statusBadge = cardHeader.querySelector(".status-badge");
      cardHeader.querySelector(".card-header-right").insertBefore(badgeContainer, statusBadge);
    }

    badgeContainer.className = "mastery-badge";
    if (status === "high") {
      badgeContainer.textContent = "متمكن";
      badgeContainer.classList.add("mastery-high");
    } else if (status === "mid") {
      badgeContainer.textContent = "يحتاج مراجعة";
      badgeContainer.classList.add("mastery-mid");
    } else if (status === "low") {
      badgeContainer.textContent = "غير متمكن";
      badgeContainer.classList.add("mastery-low");
    }
  }
};

// Tiny helper to update progress bar without full re-render (smooth performance)
function renderPracticeScreenProgressOnly() {
  const totalQuestions = QUESTIONS.length;
  const answeredCount = QUESTIONS.filter(q => (state.answers[q.id] || "").trim().length > 0).length;
  const progressPercent = Math.round((answeredCount / totalQuestions) * 100);

  const labels = document.querySelectorAll(".progress-label");
  if (labels.length >= 2) {
    labels[0].textContent = `تقدمك في الإجابة: ${answeredCount} من ${totalQuestions}`;
    labels[1].textContent = `${progressPercent}%`;
  }
  const bar = document.querySelector(".progress-bar-inner");
  if (bar) bar.style.width = `${progressPercent}%`;

  const rail = document.getElementById("nav-rail");
  if (rail) {
    const dots = rail.querySelectorAll(".nav-dot");
    QUESTIONS.forEach((q, idx) => {
      if (dots[idx]) {
        if (state.answers[q.id]) dots[idx].classList.add("answered");
        else dots[idx].classList.remove("answered");
      }
    });
  }
}

// Function to generate interactive Recharts-style mastery chart SVG
function generateMasteryChartSVG(high, mid, low) {
  const maxVal = Math.max(high, mid, low, 4);
  const scaleVal = 140 / maxVal;
  
  const hHigh = high * scaleVal;
  const hMid = mid * scaleVal;
  const hLow = low * scaleVal;
  
  const yHigh = 190 - hHigh;
  const yMid = 190 - hMid;
  const yLow = 190 - hLow;

  const yTicks = [
    { y: 190, val: 0 },
    { y: 143, val: Math.round(maxVal * 0.33) },
    { y: 96, val: Math.round(maxVal * 0.67) },
    { y: 50, val: maxVal }
  ];

  return `
    <div class="recharts-wrapper" style="direction: ltr; position: relative; width: 100%; max-width: 480px; margin: 1.5rem auto; padding: 1.25rem; background: var(--color-card-bg); border: 2px solid var(--color-border); border-radius: 20px; box-shadow: var(--shadow-md);">
      <h4 style="text-align: right; font-family: var(--font-sans); font-size: 1rem; font-weight: 800; color: var(--color-text-main); margin-bottom: 1.5rem; display: flex; align-items: center; justify-content: space-between; direction: rtl;">
        <span>📊 توزيع مستويات التمكن والتحصيل</span>
        <span style="font-size: 0.8rem; color: var(--color-text-muted); font-weight: normal;">(تفاعلي)</span>
      </h4>
      
      <svg viewBox="0 0 450 250" width="100%" height="100%" style="overflow: visible;">
        <defs>
          <linearGradient id="colorHigh" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stop-color="#10B981" stop-opacity="0.9"/>
            <stop offset="95%" stop-color="#047857" stop-opacity="0.9"/>
          </linearGradient>
          <linearGradient id="colorMid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stop-color="#F59E0B" stop-opacity="0.9"/>
            <stop offset="95%" stop-color="#B45309" stop-opacity="0.9"/>
          </linearGradient>
          <linearGradient id="colorLow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stop-color="#EF4444" stop-opacity="0.9"/>
            <stop offset="95%" stop-color="#B91C1C" stop-opacity="0.9"/>
          </linearGradient>
          <filter id="shadow-glow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#5B2596" flood-opacity="0.1"/>
          </filter>
        </defs>

        <!-- Y-Axis Grid Lines -->
        ${yTicks.map(tick => `
          <line x1="50" y1="${tick.y}" x2="400" y2="${tick.y}" stroke="var(--color-border)" stroke-dasharray="3 3" opacity="0.5" />
          <text x="35" y="${tick.y + 4}" fill="var(--color-text-muted)" font-family="var(--font-sans)" font-size="11" text-anchor="end" font-weight="600">${tick.val}</text>
        `).join("")}

        <!-- X-Axis Line -->
        <line x1="50" y1="190" x2="400" y2="190" stroke="var(--color-border)" stroke-width="1.5" />

        <!-- High Mastery Bar -->
        <g class="chart-bar-group" style="cursor: pointer;">
          <rect class="chart-bar" x="90" y="${yHigh}" width="45" height="${hHigh || 2}" rx="6" ry="6" fill="url(#colorHigh)" filter="url(#shadow-glow)">
            <animate attributeName="height" from="0" to="${hHigh || 2}" dur="0.8s" fill="freeze" />
            <animate attributeName="y" from="190" to="${yHigh}" dur="0.8s" fill="freeze" />
          </rect>
          <text x="112.5" y="${yHigh - 8}" fill="#10B981" font-family="var(--font-sans)" font-size="12" font-weight="800" text-anchor="middle">${high}</text>
          <g class="chart-tooltip" style="pointer-events: none;">
            <rect x="72.5" y="${yHigh - 45}" width="80" height="30" rx="6" fill="var(--madrasati-dark-ink)" opacity="0.95" />
            <text x="112.5" y="${yHigh - 26}" fill="white" font-family="var(--font-sans)" font-size="11" font-weight="bold" text-anchor="middle">متمكن: ${high}</text>
          </g>
        </g>

        <!-- Mid Mastery Bar -->
        <g class="chart-bar-group" style="cursor: pointer;">
          <rect class="chart-bar" x="202.5" y="${yMid}" width="45" height="${hMid || 2}" rx="6" ry="6" fill="url(#colorMid)" filter="url(#shadow-glow)">
            <animate attributeName="height" from="0" to="${hMid || 2}" dur="0.8s" fill="freeze" />
            <animate attributeName="y" from="190" to="${yMid}" dur="0.8s" fill="freeze" />
          </rect>
          <text x="225" y="${yMid - 8}" fill="#F59E0B" font-family="var(--font-sans)" font-size="12" font-weight="800" text-anchor="middle">${mid}</text>
          <g class="chart-tooltip" style="pointer-events: none;">
            <rect x="180" y="${yMid - 45}" width="90" height="30" rx="6" fill="var(--madrasati-dark-ink)" opacity="0.95" />
            <text x="225" y="${yMid - 26}" fill="white" font-family="var(--font-sans)" font-size="10" font-weight="bold" text-anchor="middle">مراجعة: ${mid}</text>
          </g>
        </g>

        <!-- Low Mastery Bar -->
        <g class="chart-bar-group" style="cursor: pointer;">
          <rect class="chart-bar" x="315" y="${yLow}" width="45" height="${hLow || 2}" rx="6" ry="6" fill="url(#colorLow)" filter="url(#shadow-glow)">
            <animate attributeName="height" from="0" to="${hLow || 2}" dur="0.8s" fill="freeze" />
            <animate attributeName="y" from="190" to="${yLow}" dur="0.8s" fill="freeze" />
          </rect>
          <text x="337.5" y="${yLow - 8}" fill="#EF4444" font-family="var(--font-sans)" font-size="12" font-weight="800" text-anchor="middle">${low}</text>
          <g class="chart-tooltip" style="pointer-events: none;">
            <rect x="292.5" y="${yLow - 45}" width="90" height="30" rx="6" fill="var(--madrasati-dark-ink)" opacity="0.95" />
            <text x="337.5" y="${yLow - 26}" fill="white" font-family="var(--font-sans)" font-size="10" font-weight="bold" text-anchor="middle">غير متمكن: ${low}</text>
          </g>
        </g>

        <!-- X-Axis Labels -->
        <text x="112.5" y="212" fill="var(--color-text-main)" font-family="var(--font-sans)" font-size="11" font-weight="bold" text-anchor="middle">متمكن</text>
        <text x="225" y="212" fill="var(--color-text-main)" font-family="var(--font-sans)" font-size="11" font-weight="bold" text-anchor="middle">مراجعة</text>
        <text x="337.5" y="212" fill="var(--color-text-main)" font-family="var(--font-sans)" font-size="11" font-weight="bold" text-anchor="middle">غير متمكن</text>
      </svg>

      <!-- Legend -->
      <div style="display: flex; justify-content: center; gap: 1rem; margin-top: 1rem; font-family: var(--font-sans); font-size: 0.8rem; direction: rtl; font-weight: 700;">
        <span style="display: flex; align-items: center; gap: 0.25rem;">
          <span style="width: 10px; height: 10px; border-radius: 2px; background: linear-gradient(#10B981, #047857); display: inline-block;"></span>
          متمكن
        </span>
        <span style="display: flex; align-items: center; gap: 0.25rem;">
          <span style="width: 10px; height: 10px; border-radius: 2px; background: linear-gradient(#F59E0B, #B45309); display: inline-block;"></span>
          مراجعة
        </span>
        <span style="display: flex; align-items: center; gap: 0.25rem;">
          <span style="width: 10px; height: 10px; border-radius: 2px; background: linear-gradient(#EF4444, #B91C1C); display: inline-block;"></span>
          غير متمكن
        </span>
      </div>
    </div>
  `;
}

// 3. Results Screen Layout
function renderResultsScreen(container) {
  const totalQuestions = QUESTIONS.length;
  
  const answeredCount = QUESTIONS.filter(q => (state.answers[q.id] || "").trim().length > 0).length;
  const shownCount = QUESTIONS.filter(q => state.shownAnswers[q.id]).length;
  const ratedCount = QUESTIONS.filter(q => state.ratings[q.id] !== undefined).length;
  
  const maxScore = totalQuestions * 10;
  
  let totalScore = 0;
  QUESTIONS.forEach(q => {
    if (state.ratings[q.id] !== undefined) {
      totalScore += state.ratings[q.id];
    }
  });

  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  let masteryHigh = 0;
  let masteryMid = 0;
  let masteryLow = 0;

  QUESTIONS.forEach(q => {
    const m = state.mastery[q.id];
    if (m === "high") masteryHigh++;
    else if (m === "mid") masteryMid++;
    else if (m === "low") masteryLow++;
  });

  const unratedQuestions = [];
  QUESTIONS.forEach((q, idx) => {
    if (state.shownAnswers[q.id] && state.ratings[q.id] === undefined) {
      unratedQuestions.push({ num: idx + 1, id: q.id });
    }
  });

  // Calculate Badge Achievements
  let badgeHTML = "";
  if (answeredCount === totalQuestions) {
    let badgeSvg = "";
    let badgeTitle = "";
    let badgeColorClass = "";
    let badgeDesc = "";

    if (percentage >= 90) {
      badgeTitle = "وسام التميز الأكاديمي الذهبي";
      badgeColorClass = "badge-gold";
      badgeDesc = "ألف مبروك! لقد أتممت حل جميع الأسئلة وحققت مستوى تمكن استثنائي باهر (90% فما فوق). أنت بطل حقيقي وقائد متميز في قواعد اللغة العربية!";
      badgeSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="badge-glowing-image" style="width: 130px; height: 130px; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.15));">
          <circle cx="50" cy="50" r="40" fill="url(#goldGradient)" stroke="#EAB308" stroke-width="4"/>
          <circle cx="50" cy="50" r="32" fill="none" stroke="#CA8A04" stroke-width="2" stroke-dasharray="4 2"/>
          <polygon points="50,23 57,38 73,41 62,53 65,69 50,61 35,69 38,53 27,41 43,38" fill="#FFE082" stroke="#B7791F" stroke-width="1.5"/>
          <defs>
            <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#FEF08A"/>
              <stop offset="50%" stop-color="#EAB308"/>
              <stop offset="100%" stop-color="#CA8A04"/>
            </linearGradient>
          </defs>
        </svg>
      `;
    } else if (percentage >= 70) {
      badgeTitle = "وسام الإبداع اللغوي الفضي";
      badgeColorClass = "badge-silver";
      badgeDesc = "أداء ممتاز جداً! أتممت حل جميع الأسئلة بمهارة عالية ودقة ممتازة (70% - 89%). واصل هذا التميز اللغوي الرائع لتعتلي الصدارة دائماً!";
      badgeSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="badge-glowing-image" style="width: 130px; height: 130px; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.15));">
          <circle cx="50" cy="50" r="40" fill="url(#silverGradient)" stroke="#94A3B8" stroke-width="4"/>
          <circle cx="50" cy="50" r="32" fill="none" stroke="#64748B" stroke-width="2" stroke-dasharray="4 2"/>
          <polygon points="50,23 57,38 73,41 62,53 65,69 50,61 35,69 38,53 27,41 43,38" fill="#E2E8F0" stroke="#475569" stroke-width="1.5"/>
          <defs>
            <linearGradient id="silverGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#F1F5F9"/>
              <stop offset="50%" stop-color="#94A3B8"/>
              <stop offset="100%" stop-color="#64748B"/>
            </linearGradient>
          </defs>
        </svg>
      `;
    } else {
      badgeTitle = "وسام المثابرة والاجتهاد البرونزي";
      badgeColorClass = "badge-bronze";
      badgeDesc = "أحسنت صنعاً! لقد أثبتّ التزامك التام وحللت جميع أسئلة الوحدة بجد واجتهاد. استمر في المراجعة والتدرب لتطوير نقاط تمكنك وستصل للذهبي قريباً!";
      badgeSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="badge-glowing-image" style="width: 130px; height: 130px; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.15));">
          <circle cx="50" cy="50" r="40" fill="url(#bronzeGradient)" stroke="#D97706" stroke-width="4"/>
          <circle cx="50" cy="50" r="32" fill="none" stroke="#B45309" stroke-width="2" stroke-dasharray="4 2"/>
          <polygon points="50,23 57,38 73,41 62,53 65,69 50,61 35,69 38,53 27,41 43,38" fill="#FDE68A" stroke="#78350F" stroke-width="1.5"/>
          <defs>
            <linearGradient id="bronzeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#FDE68A"/>
              <stop offset="50%" stop-color="#D97706"/>
              <stop offset="100%" stop-color="#92400E"/>
            </linearGradient>
          </defs>
        </svg>
      `;
    }

    badgeHTML = `
      <div class="achievement-badge-card ${badgeColorClass}">
        <div class="badge-ribbon">وسام الإنجاز والتمكن</div>
        <div class="badge-image-container" style="background: none; box-shadow: none;">
          ${badgeSvg}
        </div>
        <h3 class="badge-card-title">${badgeTitle}</h3>
        <p class="badge-card-desc">${badgeDesc}</p>
      </div>
    `;
  } else {
    badgeHTML = `
      <div class="achievement-badge-card badge-locked">
        <div class="badge-image-container">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-lock" style="color: var(--color-text-muted);"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        </div>
        <h3 class="badge-card-title">أوسمة التمكن مغلقة</h3>
        <p class="badge-card-desc">أكمل حل جميع الأسئلة (${answeredCount} من أصل ${totalQuestions}) لتفتح وسام التمكن والتميز وتزين به سجل إنجازاتك في اللغة العربية!</p>
      </div>
    `;
  }

  const resultsHTML = `
    <div class="results-screen">
      <h2 class="results-title">تقرير الأداء والتمكن الأكاديمي</h2>
      
      <div class="score-circle-container">
        <div class="score-circle">
          <span class="score-value">${totalScore}/${maxScore}</span>
          <span class="score-label">النسبة الكلية: ${percentage}%</span>
        </div>
      </div>

      ${badgeHTML}

      ${generateMasteryChartSVG(masteryHigh, masteryMid, masteryLow)}

      <div class="results-grid">
        <div class="stat-item">
          <span class="stat-label">عدد الأسئلة الكلي:</span>
          <span class="stat-val">${totalQuestions}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">الأسئلة التي تمت إجابتها:</span>
          <span class="stat-val">${answeredCount}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">الإجابات النموذجية المعروضة:</span>
          <span class="stat-val">${shownCount}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">الأسئلة التي تم تقييمها:</span>
          <span class="stat-val">${ratedCount}</span>
        </div>
      </div>

      <div class="mastery-summary">
        <h3 class="mastery-summary-title">ملخص مستويات التمكن:</h3>
        <div class="mastery-summary-grid">
          <div class="mastery-sum-card high">
            <span class="mastery-sum-count">${masteryHigh}</span>
            <span class="mastery-sum-label">متمكن بالكامل</span>
          </div>
          <div class="mastery-sum-card mid">
            <span class="mastery-sum-count">${masteryMid}</span>
            <span class="mastery-sum-label">أحتاج لمراجعة</span>
          </div>
          <div class="mastery-sum-card low">
            <span class="mastery-sum-count">${masteryLow}</span>
            <span class="mastery-sum-label">غير متمكن</span>
          </div>
        </div>
      </div>

      ${unratedQuestions.length > 0 ? `
        <div class="unrated-list">
          <div class="unrated-title">تنبيه: لديك أسئلة قمت بعرض جوابها الوزاري النموذجي ولكن لم تمنحها درجة تقييم بعد:</div>
          <div class="unrated-items">
            ${unratedQuestions.map(q => `
              <span class="unrated-link" onclick="jumpToQuestion(${QUESTIONS.findIndex(item => item.id === q.id)})">
                سؤال ${q.num}
              </span>
            `).join("")}
          </div>
        </div>
      ` : ""}

      <div class="results-actions">
        <button class="btn btn-primary" id="btn-return-practice">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-edit-3"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
          العودة لتعديل الإجابات والتقييمات
        </button>
        <button class="btn btn-secondary" id="btn-results-reset">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-rotate-ccw"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
          إعادة المحاولة من جديد
        </button>
      </div>
    </div>
  `;

  container.innerHTML = resultsHTML;

  const btnReturn = document.getElementById("btn-return-practice");
  const btnReset = document.getElementById("btn-results-reset");

  if (btnReturn) btnReturn.addEventListener("click", () => navigateTo("practice"));
  if (btnReset) btnReset.addEventListener("click", () => promptReset());
}

// Result list click to jump to specific question index
window.jumpToQuestion = function(idx) {
  navigateTo("practice");
  setFocusedIndex(idx);
};

// Bind remaining modular functions to window scope for inline HTML handlers
window.navigateTo = navigateTo;
window.getAcademicLabel = getAcademicLabel;
window.loadState = loadState;
window.saveState = saveState;
window.setupGlobalEvents = setupGlobalEvents;
window.applyTheme = applyTheme;
window.toggleTheme = toggleTheme;
window.performReset = performReset;
window.promptReset = promptReset;
window.renderApp = renderApp;
window.renderHomeScreen = renderHomeScreen;
window.getFilteredQuestions = getFilteredQuestions;
window.getFilteredIndex = getFilteredIndex;
window.ensureValidFilterSelection = ensureValidFilterSelection;
window.renderPracticeScreen = renderPracticeScreen;
window.renderNavigationRail = renderNavigationRail;
window.renderBottomPagination = renderBottomPagination;
window.setFocusedIndex = setFocusedIndex;
window.renderAccordionCards = renderAccordionCards;
window.renderPracticeScreenProgressOnly = renderPracticeScreenProgressOnly;
window.renderResultsScreen = renderResultsScreen;
