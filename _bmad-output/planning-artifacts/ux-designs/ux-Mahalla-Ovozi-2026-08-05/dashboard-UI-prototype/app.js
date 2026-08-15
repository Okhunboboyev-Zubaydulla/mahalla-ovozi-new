/**
 * Mahalla Ovozi - Prototype Application Controller
 * Replicates the reference UI image interactions, quote snippets, subcategory tags, and dynamic metrics.
 */

import {
  DISTRICT_NAME,
  MAHALLAS,
  LANES_CONFIG,
  INITIAL_TOPICS,
  SIMULATION_EVENTS
} from './mockData.js';

// Application State
const state = {
  topics: JSON.parse(JSON.stringify(INITIAL_TOPICS)),
  activeDateFilter: 'today',
  activeMahalla: 'all',
  searchQuery: '',
  selectedTopicId: null,
  lastFocusedElement: null
};

// DOM references
const elements = {
  announcer: document.getElementById('aria-announcer'),

  // Date buttons
  btnDateToday: document.getElementById('btn-date-today'),
  btnDateYesterday: document.getElementById('btn-date-yesterday'),
  btnDateCustom: document.getElementById('btn-date-custom'),

  // Filters
  mahallaSelect: document.getElementById('mahalla-select'),
  searchInput: document.getElementById('search-input'),
  searchClearBtn: document.getElementById('search-clear-btn'),

  // Metrics
  valTopics: document.getElementById('val-topics'),
  subTopics: document.getElementById('sub-topics'),
  valHokim: document.getElementById('val-hokim'),
  subHokim: document.getElementById('sub-hokim'),
  valMahallas: document.getElementById('val-mahallas'),
  subMahallas: document.getElementById('sub-mahallas'),
  valService: document.getElementById('val-service'),
  subService: document.getElementById('sub-service'),
  valTopMahalla: document.getElementById('val-top-mahalla'),
  subTopMahalla: document.getElementById('sub-top-mahalla'),

  // Lane Stacks
  stackHokim: document.getElementById('stack-hokim'),
  stackWater: document.getElementById('stack-water'),
  stackElectricity: document.getElementById('stack-electricity'),
  stackGas: document.getElementById('stack-gas'),
  stackWaste: document.getElementById('stack-waste'),

  // Lane Count Badges
  badgeHokim: document.getElementById('badge-count-hokim'),
  badgeWater: document.getElementById('badge-count-water'),
  badgeElectricity: document.getElementById('badge-count-electricity'),
  badgeGas: document.getElementById('badge-count-gas'),
  badgeWaste: document.getElementById('badge-count-waste'),

  // Drawer
  drawer: document.getElementById('evidence-drawer'),
  drawerOverlay: document.getElementById('drawer-overlay'),
  btnCloseDrawer: document.getElementById('btn-close-drawer'),
  drawerCategoryLbl: document.getElementById('drawer-category-lbl'),
  drawerMahallaTitle: document.getElementById('drawer-mahalla-title'),
  drawerSummaryText: document.getElementById('drawer-summary-text'),
  drawerMahallaLbl: document.getElementById('drawer-mahalla-lbl'),
  drawerTimeLbl: document.getElementById('drawer-time-lbl'),
  drawerCountLbl: document.getElementById('drawer-count-lbl'),
  drawerEvidenceList: document.getElementById('drawer-evidence-list'),

  // Help Modal
  helpBtn: document.getElementById('help-btn'),
  helpModalWrap: document.getElementById('help-modal-wrap'),
  modalCloseBtn: document.getElementById('modal-close-btn'),
  modalOkBtn: document.getElementById('modal-ok-btn'),

  // Simulation
  simToggleBtn: document.getElementById('sim-toggle-btn'),
  simMenu: document.getElementById('sim-menu'),
  simAddWater: document.getElementById('sim-add-water'),
  simReset: document.getElementById('sim-reset')
};

function announce(msg) {
  if (elements.announcer) {
    elements.announcer.textContent = '';
    setTimeout(() => {
      elements.announcer.textContent = msg;
    }, 50);
  }
}

function getFilteredTopics() {
  const query = state.searchQuery.trim().toLowerCase();

  return state.topics.filter(topic => {
    // 1. Date Filter
    if (state.activeDateFilter !== 'all' && topic.date !== state.activeDateFilter) {
      return false;
    }

    // 2. Mahalla Filter
    if (state.activeMahalla !== 'all' && topic.mahalla !== state.activeMahalla) {
      return false;
    }

    // 3. Search Query
    if (query) {
      const inSummary = topic.summary.toLowerCase().includes(query);
      const inMahalla = topic.mahalla.toLowerCase().includes(query);
      const inQuote = topic.quote && topic.quote.toLowerCase().includes(query);
      const inTag = topic.tag && topic.tag.toLowerCase().includes(query);
      const inEvidence = topic.evidence && topic.evidence.some(ev =>
        ev.text.toLowerCase().includes(query) ||
        ev.senderName.toLowerCase().includes(query) ||
        (ev.username && ev.username.toLowerCase().includes(query))
      );

      if (!inSummary && !inMahalla && !inQuote && !inTag && !inEvidence) {
        return false;
      }
    }

    return true;
  });
}

function highlightText(text, query) {
  if (!query) return escapeHtml(text);
  const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
  return escapeHtml(text).replace(regex, '<mark class="search-match-highlight">$1</mark>');
}

function escapeHtml(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Update 5 Top Metric Cards
 */
function renderMetrics(filteredTopics) {
  // If showing default unfiltered view, render reference values 26, 7, 8, Elektr, Uch-Tepa
  if (state.activeMahalla === 'all' && !state.searchQuery && state.activeDateFilter === 'today') {
    elements.valTopics.textContent = "26";
    elements.subTopics.textContent = "+18% oldingi davrga nisbatan";

    elements.valHokim.textContent = "7";
    elements.subHokim.textContent = "22 dalil";

    elements.valMahallas.textContent = "8";
    elements.subMahallas.textContent = "68 dalil";

    elements.valService.textContent = "Elektr";
    elements.subService.textContent = "6 mavzu";

    elements.valTopMahalla.textContent = "Uch-Tepa";
    elements.subTopMahalla.textContent = "5 mavzu • 16 dalil";
    return;
  }

  // Filtered dynamic calculations
  const total = filteredTopics.length;
  elements.valTopics.textContent = total;
  elements.subTopics.textContent = state.activeMahalla === 'all' ? "tanlangan filtr bo'yicha" : `${state.activeMahalla}`;

  const hokimTopics = filteredTopics.filter(t => t.lane === 'hokim');
  const hokimEvidence = hokimTopics.reduce((acc, t) => acc + (t.evidenceCount || t.evidence.length), 0);
  elements.valHokim.textContent = hokimTopics.length;
  elements.subHokim.textContent = `${hokimEvidence} dalil`;

  const mahallaSet = new Set(filteredTopics.map(t => t.mahalla));
  const totalEvidence = filteredTopics.reduce((acc, t) => acc + (t.evidenceCount || t.evidence.length), 0);
  elements.valMahallas.textContent = mahallaSet.size;
  elements.subMahallas.textContent = `${totalEvidence} dalil`;

  // Top service
  const serviceCounts = { hokim: 0, water: 0, electricity: 0, gas: 0, waste: 0 };
  filteredTopics.forEach(t => {
    if (serviceCounts[t.lane] !== undefined) serviceCounts[t.lane]++;
  });
  let maxService = 'water';
  let maxCount = -1;
  for (const [k, count] of Object.entries(serviceCounts)) {
    if (count > maxCount && count > 0) {
      maxCount = count;
      maxService = k;
    }
  }
  if (maxCount > 0) {
    elements.valService.textContent = LANES_CONFIG[maxService].title;
    elements.subService.textContent = `${maxCount} mavzu`;
  } else {
    elements.valService.textContent = "-";
    elements.subService.textContent = "mavzular yo'q";
  }

  // Top mahalla
  const mahallaCounts = {};
  filteredTopics.forEach(t => {
    mahallaCounts[t.mahalla] = (mahallaCounts[t.mahalla] || 0) + 1;
  });
  let topMName = '-';
  let topMCount = 0;
  for (const [mName, c] of Object.entries(mahallaCounts)) {
    if (c > topMCount) {
      topMCount = c;
      topMName = mName;
    }
  }
  if (topMCount > 0) {
    elements.valTopMahalla.textContent = topMName.replace(' mahallasi', '');
    elements.subTopMahalla.textContent = `${topMCount} mavzu`;
  } else {
    elements.valTopMahalla.textContent = "-";
    elements.subTopMahalla.textContent = "mavzular yo'q";
  }
}

/**
 * Render 5 Columns of Cards
 */
function renderBoard(filteredTopics) {
  const lanes = ['hokim', 'water', 'electricity', 'gas', 'waste'];
  const query = state.searchQuery.trim();

  lanes.forEach(laneKey => {
    const stack = elements[`stack${laneKey.charAt(0).toUpperCase() + laneKey.slice(1)}`];
    const badge = elements[`badge${laneKey.charAt(0).toUpperCase() + laneKey.slice(1)}`];
    if (!stack || !badge) return;

    const laneTopics = filteredTopics.filter(t => t.lane === laneKey);
    badge.textContent = laneTopics.length;

    if (laneTopics.length === 0) {
      stack.innerHTML = `
        <div class="empty-lane-placeholder">
          ${query ? 'Mos mavzu topilmadi' : "Hozircha mavzular yo'q"}
        </div>
      `;
      return;
    }

    stack.innerHTML = laneTopics.map(topic => {
      const isSelected = state.selectedTopicId === topic.id;
      const pillClass = topic.tagType || 'red';

      return `
        <article
          class="reference-card ${isSelected ? 'active-selected' : ''}"
          data-topic-id="${topic.id}"
          tabindex="0"
          role="button"
          aria-expanded="${isSelected}"
          aria-label="${topic.mahalla}, ${topic.summary}. ${topic.evidenceCount || topic.evidence.length} ta dalil."
        >
          <div class="card-ai-label">AI XULOSASI</div>
          <div class="card-summary-heading">${highlightText(topic.summary, query)}</div>

          ${topic.tag ? `<div class="subcategory-pill ${pillClass}">${escapeHtml(topic.tag)}</div>` : ''}

          <div class="card-meta-line">
            <div class="meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              <span>${escapeHtml(topic.mahalla)}</span>
            </div>
            <div class="meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <span>${topic.time}</span>
            </div>
            <div class="meta-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
              </svg>
              <span>${topic.evidenceCount || topic.evidence.length} dalil</span>
            </div>
          </div>

          ${topic.quote ? `
            <div class="quote-snippet-box">
              <p class="quote-snippet-text">"${escapeHtml(topic.quote)}"</p>
              <svg class="quote-send-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </div>
          ` : ''}
        </article>
      `;
    }).join('');
  });

  attachCardEvents();
}

function attachCardEvents() {
  document.querySelectorAll('.reference-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.getAttribute('data-topic-id');
      if (id) {
        state.lastFocusedElement = card;
        openDetail(id);
      }
    });

    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const id = card.getAttribute('data-topic-id');
        if (id) {
          state.lastFocusedElement = card;
          openDetail(id);
        }
      }
    });
  });
}

function openDetail(topicId) {
  const topic = state.topics.find(t => t.id === topicId);
  if (!topic) return;

  state.selectedTopicId = topicId;
  const config = LANES_CONFIG[topic.lane] || { title: 'Xizmat', color: '#2563EB' };

  elements.drawerCategoryLbl.textContent = config.title;
  elements.drawerCategoryLbl.style.color = config.color;
  elements.drawerMahallaTitle.textContent = topic.mahalla;
  elements.drawerSummaryText.textContent = topic.summary;
  elements.drawerMahallaLbl.textContent = topic.mahalla;
  elements.drawerTimeLbl.textContent = topic.time;
  elements.drawerCountLbl.textContent = `${topic.evidenceCount || topic.evidence.length} ta dalil xabari`;

  elements.drawerEvidenceList.innerHTML = topic.evidence.map((ev, i) => `
    <div class="evidence-card-item" role="article">
      <div class="evidence-author-row">
        <div class="author-info">
          <span>${escapeHtml(ev.senderName)}</span>
          ${ev.username ? `<span class="author-handle">${escapeHtml(ev.username)}</span>` : ''}
        </div>
        <span class="evidence-timestamp">${escapeHtml(ev.timestamp)}</span>
      </div>
      <p class="evidence-message-text">“${escapeHtml(ev.text)}”</p>
      <div class="evidence-action-row">
        <a href="${ev.telegramLink}" target="_blank" rel="noopener noreferrer" class="telegram-link-btn">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="22" y1="2" x2="11" y2="13"></line>
            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
          </svg>
          <span>Telegramda ochish</span>
        </a>
      </div>
    </div>
  `).join('');

  elements.drawerOverlay.classList.add('visible');
  elements.drawer.classList.add('opened');
  elements.drawer.setAttribute('aria-hidden', 'false');

  document.querySelectorAll('.reference-card').forEach(c => {
    c.classList.toggle('active-selected', c.getAttribute('data-topic-id') === topicId);
  });

  setTimeout(() => elements.btnCloseDrawer.focus(), 80);
  announce(`Tafsilot ochildi: ${topic.mahalla}`);
}

function closeDetail() {
  state.selectedTopicId = null;
  elements.drawerOverlay.classList.remove('visible');
  elements.drawer.classList.remove('opened');
  elements.drawer.setAttribute('aria-hidden', 'true');

  document.querySelectorAll('.reference-card').forEach(c => {
    c.classList.remove('active-selected');
  });

  if (state.lastFocusedElement) state.lastFocusedElement.focus();
  announce('Tafsilot yopildi.');
}

function openHelp() {
  elements.helpModalWrap.classList.add('visible');
  elements.modalCloseBtn.focus();
}

function closeHelp() {
  elements.helpModalWrap.classList.remove('visible');
  elements.helpBtn.focus();
}

function updateUI() {
  const filtered = getFilteredTopics();
  renderMetrics(filtered);
  renderBoard(filtered);
}

function initEvents() {
  // Date buttons
  const dateBtns = [elements.btnDateToday, elements.btnDateYesterday, elements.btnDateCustom];
  dateBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      dateBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.activeDateFilter = btn.getAttribute('data-date');
      updateUI();
    });
  });

  // Mahalla selector
  elements.mahallaSelect.addEventListener('change', (e) => {
    state.activeMahalla = e.target.value;
    updateUI();
  });

  // Search
  let searchTimer = null;
  elements.searchInput.addEventListener('input', (e) => {
    const val = e.target.value;
    elements.searchClearBtn.classList.toggle('show', val.length > 0);
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.searchQuery = val;
      updateUI();
    }, 300);
  });

  elements.searchClearBtn.addEventListener('click', () => {
    elements.searchInput.value = '';
    elements.searchClearBtn.classList.remove('show');
    state.searchQuery = '';
    updateUI();
    elements.searchInput.focus();
  });

  // Drawer
  elements.btnCloseDrawer.addEventListener('click', closeDetail);
  elements.drawerOverlay.addEventListener('click', closeDetail);

  // Help Modal
  elements.helpBtn.addEventListener('click', openHelp);
  elements.modalCloseBtn.addEventListener('click', closeHelp);
  elements.modalOkBtn.addEventListener('click', closeHelp);
  elements.helpModalWrap.addEventListener('click', (e) => {
    if (e.target === elements.helpModalWrap) closeHelp();
  });

  // Escape key listener
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (elements.helpModalWrap.classList.contains('visible')) closeHelp();
      else if (elements.drawer.classList.contains('opened')) closeDetail();
    }
  });

  // Simulation
  elements.simToggleBtn.addEventListener('click', () => {
    elements.simMenu.classList.toggle('show');
  });

  elements.simAddWater.addEventListener('click', () => {
    const newTopic = JSON.parse(JSON.stringify(SIMULATION_EVENTS.newTopicWater));
    if (!state.topics.some(t => t.id === newTopic.id)) {
      state.topics.unshift(newTopic);
      updateUI();
      announce("Yangi suv avariyasi qo'shildi");
    }
  });

  elements.simReset.addEventListener('click', () => {
    state.topics = JSON.parse(JSON.stringify(INITIAL_TOPICS));
    state.activeDateFilter = 'today';
    state.activeMahalla = 'all';
    state.searchQuery = '';
    state.selectedTopicId = null;

    elements.searchInput.value = '';
    elements.searchClearBtn.classList.remove('show');
    elements.mahallaSelect.value = 'all';
    dateBtns.forEach(b => b.classList.remove('active'));
    elements.btnDateToday.classList.add('active');
    closeDetail();

    updateUI();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initEvents();
  updateUI();
  console.log('Mahalla Ovozi reference-matched prototype initialized.');
});
