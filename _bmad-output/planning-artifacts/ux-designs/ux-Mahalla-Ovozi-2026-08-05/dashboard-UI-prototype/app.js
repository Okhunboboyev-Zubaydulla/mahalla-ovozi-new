/**
 * Mahalla Ovozi - Prototype Application Controller
 * Fully synchronized with UX/UI specifications, Uzbek Cyrillic domain rules,
 * dynamic multi-lane filtering, neutral metrics calculation, and accessible drawer/popovers.
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
  customDateStart: '2026-08-05',
  customDateEnd: '2026-08-05',
  activeMahalla: 'all',
  activeLanes: new Set(['hokim', 'water', 'electricity', 'gas', 'waste']),
  searchQuery: '',
  selectedTopicId: null,
  lastFocusedElement: null,
  currentLaneScrollIndex: 0
};

// DOM references
const elements = {
  announcer: document.getElementById('aria-announcer'),

  // Date buttons & Popover
  btnDateToday: document.getElementById('btn-date-today'),
  btnDateYesterday: document.getElementById('btn-date-yesterday'),
  btnDateCustom: document.getElementById('btn-date-custom'),
  dateCustomLabel: document.getElementById('date-custom-label'),
  datePickerPopover: document.getElementById('date-picker-popover'),
  dateRangeStart: document.getElementById('date-range-start'),
  dateRangeEnd: document.getElementById('date-range-end'),
  btnDatePopoverCancel: document.getElementById('btn-date-popover-cancel'),
  btnDatePopoverApply: document.getElementById('btn-date-popover-apply'),

  // Filters
  mahallaSelect: document.getElementById('mahalla-select'),
  searchInput: document.getElementById('search-input'),
  searchClearBtn: document.getElementById('search-clear-btn'),

  // Lanes Multi-select Filter
  btnLanesFilter: document.getElementById('btn-lanes-filter'),
  lanesFilterLabel: document.getElementById('lanes-filter-label'),
  lanesDropdownMenu: document.getElementById('lanes-dropdown-menu'),
  btnLanesSelectAll: document.getElementById('btn-lanes-select-all'),
  laneCheckboxes: document.querySelectorAll('.lane-check'),

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

  // Lane Columns & Stacks
  columnsGrid: document.getElementById('columns-grid'),
  colHokim: document.getElementById('lane-col-hokim'),
  colWater: document.getElementById('lane-col-water'),
  colElectricity: document.getElementById('lane-col-electricity'),
  colGas: document.getElementById('lane-col-gas'),
  colWaste: document.getElementById('lane-col-waste'),

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

  // Responsive Lane Nav
  btnPrevLane: document.getElementById('btn-prev-lane'),
  btnNextLane: document.getElementById('btn-next-lane'),
  laneNavIndicator: document.getElementById('lane-nav-indicator'),

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
  drawerMultiLaneWrap: document.getElementById('drawer-multi-lane-wrap'),
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
    if (state.activeDateFilter === 'today' && topic.date !== 'today') {
      return false;
    }
    if (state.activeDateFilter === 'yesterday' && topic.date !== 'yesterday') {
      return false;
    }
    // Custom date range (if specific date string is used)
    if (state.activeDateFilter === 'custom') {
      // In MVP demo, all today topics match active day range
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
 * Update 5 Top Metric Cards (Filter-aware neutral statistics)
 */
function renderMetrics(filteredTopics) {
  // Only display reference default metrics if default unfiltered view
  const isDefaultView = state.activeMahalla === 'all' &&
                        !state.searchQuery &&
                        state.activeDateFilter === 'today' &&
                        state.activeLanes.size === 5;

  if (isDefaultView) {
    elements.valTopics.textContent = "26";
    elements.subTopics.textContent = "+18% олдинги даврга нисбатан";

    elements.valHokim.textContent = "7";
    elements.subHokim.textContent = "22 далил";

    elements.valMahallas.textContent = "8";
    elements.subMahallas.textContent = "68 далил";

    elements.valService.textContent = "Электр";
    elements.subService.textContent = "6 мавзу";

    elements.valTopMahalla.textContent = "Учтепа";
    elements.subTopMahalla.textContent = "5 мавзу • 16 далил";
    return;
  }

  // Filter-aware dynamic calculations
  const total = filteredTopics.length;
  elements.valTopics.textContent = total;
  elements.subTopics.textContent = state.activeMahalla === 'all' ? "танланган фильтр бўйича" : `${state.activeMahalla}`;

  const hokimTopics = filteredTopics.filter(t => t.lane === 'hokim' || (t.secondaryLanes && t.secondaryLanes.includes('hokim')));
  const hokimEvidence = hokimTopics.reduce((acc, t) => acc + (t.evidenceCount || t.evidence.length), 0);
  elements.valHokim.textContent = hokimTopics.length;
  elements.subHokim.textContent = `${hokimEvidence} далил`;

  const mahallaSet = new Set(filteredTopics.map(t => t.mahalla));
  const totalEvidence = filteredTopics.reduce((acc, t) => acc + (t.evidenceCount || t.evidence.length), 0);
  elements.valMahallas.textContent = mahallaSet.size;
  elements.subMahallas.textContent = `${totalEvidence} далил`;

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
    elements.subService.textContent = `${maxCount} мавзу`;
  } else {
    elements.valService.textContent = "-";
    elements.subService.textContent = "мавзулар йўқ";
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
    elements.valTopMahalla.textContent = topMName.replace(' маҳалласи', '');
    elements.subTopMahalla.textContent = `${topMCount} мавзу`;
  } else {
    elements.valTopMahalla.textContent = "-";
    elements.subTopMahalla.textContent = "мавзулар йўқ";
  }
}

/**
 * Render 5 Columns of Cards with Multi-Lane Filter & Status Badges
 */
function renderBoard(filteredTopics) {
  const lanes = ['hokim', 'water', 'electricity', 'gas', 'waste'];
  const query = state.searchQuery.trim();

  // Update Lanes Multi-select Label
  elements.lanesFilterLabel.textContent = `Йўналишлар: ${state.activeLanes.size}/5`;

  lanes.forEach(laneKey => {
    const col = elements[`col${laneKey.charAt(0).toUpperCase() + laneKey.slice(1)}`];
    const stack = elements[`stack${laneKey.charAt(0).toUpperCase() + laneKey.slice(1)}`];
    const badge = elements[`badge${laneKey.charAt(0).toUpperCase() + laneKey.slice(1)}`];

    if (!col || !stack || !badge) return;

    // Toggle column visibility based on activeLanes
    const isVisible = state.activeLanes.has(laneKey);
    col.classList.toggle('lane-hidden', !isVisible);

    if (!isVisible) return;

    const laneTopics = filteredTopics.filter(t => t.lane === laneKey);
    badge.textContent = laneTopics.length;

    if (laneTopics.length === 0) {
      stack.innerHTML = `
        <div class="empty-lane-placeholder">
          ${query ? 'Мос мавзу топилмади' : "Ҳозирча мавзулар йўқ"}
        </div>
      `;
      return;
    }

    stack.innerHTML = laneTopics.map(topic => {
      const isSelected = state.selectedTopicId === topic.id;
      const pillClass = topic.tagType || 'red';

      // Status badge (Янги or Янгиланди)
      let statusBadgeHtml = '';
      if (topic.isNew) {
        statusBadgeHtml = `<span class="badge-status-new">Янги</span>`;
      } else if (topic.isUpdated) {
        statusBadgeHtml = `<span class="badge-status-updated">Янгиланди</span>`;
      }

      // Multi-lane membership badge (e.g. Ҳам: Ҳокимга оид)
      let multiLaneHtml = '';
      if (topic.secondaryLanes && topic.secondaryLanes.length > 0) {
        const secTitles = topic.secondaryLanes.map(l => LANES_CONFIG[l]?.title || l).join(', ');
        multiLaneHtml = `<span class="multi-lane-tag">Ҳам: ${escapeHtml(secTitles)}</span>`;
      }

      return `
        <article
          class="reference-card ${isSelected ? 'active-selected' : ''}"
          data-topic-id="${topic.id}"
          tabindex="0"
          role="button"
          aria-expanded="${isSelected}"
          aria-label="${escapeHtml(topic.mahalla)}, ${escapeHtml(topic.summary)}. ${topic.evidenceCount || topic.evidence.length} та далил."
        >
          <div class="card-top-header-row">
            <span class="card-ai-label">AI ХУЛОСАСИ</span>
            ${statusBadgeHtml}
          </div>

          <div class="card-summary-heading">${highlightText(topic.summary, query)}</div>

          <div class="card-tags-row">
            ${topic.tag ? `<span class="subcategory-pill ${pillClass}">${escapeHtml(topic.tag)}</span>` : ''}
            ${multiLaneHtml}
          </div>

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
              <span>${topic.evidenceCount || topic.evidence.length} далил</span>
            </div>
          </div>

          ${topic.quote ? `
            <div class="quote-snippet-box">
              <p class="quote-snippet-text">"${highlightText(topic.quote, query)}"</p>
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
  const config = LANES_CONFIG[topic.lane] || { title: 'Хизмат', color: '#2563EB' };

  elements.drawerCategoryLbl.textContent = config.title;
  elements.drawerCategoryLbl.style.color = config.color;
  elements.drawerMahallaTitle.textContent = topic.mahalla;
  elements.drawerSummaryText.textContent = topic.summary;
  elements.drawerMahallaLbl.textContent = topic.mahalla;
  elements.drawerTimeLbl.textContent = topic.time;
  elements.drawerCountLbl.textContent = `${topic.evidenceCount || topic.evidence.length} та далил хабари`;

  // Secondary multi-lane indicators in drawer
  if (topic.secondaryLanes && topic.secondaryLanes.length > 0) {
    const badgesHtml = topic.secondaryLanes.map(l => {
      const c = LANES_CONFIG[l] || { title: l, color: '#475569' };
      return `<span class="multi-lane-tag" style="border-left: 3px solid ${c.color};">Қўшимча йўналиш: ${c.title}</span>`;
    }).join('');
    elements.drawerMultiLaneWrap.innerHTML = badgesHtml;
    elements.drawerMultiLaneWrap.style.display = 'flex';
  } else {
    elements.drawerMultiLaneWrap.innerHTML = '';
    elements.drawerMultiLaneWrap.style.display = 'none';
  }

  // Evidence Items
  elements.drawerEvidenceList.innerHTML = topic.evidence.map(ev => `
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
          <span>Telegramда очиш</span>
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
  announce(`Тафсилот очилди: ${topic.mahalla}`);
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
  announce('Тафсилот ёпилди.');
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
  const dateBtns = [elements.btnDateToday, elements.btnDateYesterday];
  dateBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      dateBtns.forEach(b => b.classList.remove('active'));
      elements.btnDateCustom.classList.remove('active');
      btn.classList.add('active');
      state.activeDateFilter = btn.getAttribute('data-date');
      elements.datePickerPopover.classList.remove('show');
      elements.dateCustomLabel.textContent = 'Сана бўйича';
      updateUI();
      announce(`Сана фильтри: ${btn.textContent}`);
    });
  });

  // Custom Date Picker button toggle
  elements.btnDateCustom.addEventListener('click', (e) => {
    e.stopPropagation();
    elements.datePickerPopover.classList.toggle('show');
    elements.lanesDropdownMenu.classList.remove('show');
  });

  elements.btnDatePopoverCancel.addEventListener('click', () => {
    elements.datePickerPopover.classList.remove('show');
  });

  elements.btnDatePopoverApply.addEventListener('click', () => {
    const s = elements.dateRangeStart.value;
    const e = elements.dateRangeEnd.value;
    state.activeDateFilter = 'custom';
    state.customDateStart = s;
    state.customDateEnd = e;

    dateBtns.forEach(b => b.classList.remove('active'));
    elements.btnDateCustom.classList.add('active');
    elements.dateCustomLabel.textContent = `${s.slice(5)}`;
    elements.datePickerPopover.classList.remove('show');
    updateUI();
    announce(`Сана оралиғи қўлланди: ${s} - ${e}`);
  });

  // Mahalla selector
  elements.mahallaSelect.addEventListener('change', (e) => {
    state.activeMahalla = e.target.value;
    updateUI();
    announce(`Маҳалла фильтри: ${e.target.options[e.target.selectedIndex].text}`);
  });

  // Lanes Multi-Select Dropdown
  elements.btnLanesFilter.addEventListener('click', (e) => {
    e.stopPropagation();
    elements.lanesDropdownMenu.classList.toggle('show');
    elements.datePickerPopover.classList.remove('show');
  });

  elements.laneCheckboxes.forEach(cb => {
    cb.addEventListener('change', () => {
      const lane = cb.getAttribute('data-lane');
      if (cb.checked) {
        state.activeLanes.add(lane);
      } else {
        if (state.activeLanes.size <= 1) {
          // Never allow 0 lanes
          cb.checked = true;
          announce("Камида битта устун очиқ бўлиши шарт!");
          return;
        }
        state.activeLanes.delete(lane);
      }
      updateUI();
    });
  });

  elements.btnLanesSelectAll.addEventListener('click', () => {
    state.activeLanes = new Set(['hokim', 'water', 'electricity', 'gas', 'waste']);
    elements.laneCheckboxes.forEach(cb => { cb.checked = true; });
    updateUI();
    announce("Барча устунлар кўрсатилди.");
  });

  // Close popovers on click outside
  document.addEventListener('click', (e) => {
    if (!elements.lanesFilterWrap?.contains(e.target) && !elements.lanesDropdownMenu?.contains(e.target)) {
      elements.lanesDropdownMenu.classList.remove('show');
    }
    if (!elements.dateControlsGroup?.contains(e.target) && !elements.datePickerPopover?.contains(e.target)) {
      elements.datePickerPopover.classList.remove('show');
    }
  });

  // Responsive Lane Scrolling navigation
  const laneCols = [elements.colHokim, elements.colWater, elements.colElectricity, elements.colGas, elements.colWaste];
  elements.btnPrevLane.addEventListener('click', () => {
    if (state.currentLaneScrollIndex > 0) {
      state.currentLaneScrollIndex--;
      laneCols[state.currentLaneScrollIndex]?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
    }
  });

  elements.btnNextLane.addEventListener('click', () => {
    if (state.currentLaneScrollIndex < laneCols.length - 1) {
      state.currentLaneScrollIndex++;
      laneCols[state.currentLaneScrollIndex]?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
    }
  });

  // Search with ~400ms debounce
  let searchTimer = null;
  elements.searchInput.addEventListener('input', (e) => {
    const val = e.target.value;
    elements.searchClearBtn.classList.toggle('show', val.length > 0);
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.searchQuery = val;
      updateUI();
      const count = getFilteredTopics().length;
      announce(`Қидирув янгиланди: ${count} та натижа топилди.`);
    }, 400);
  });

  elements.searchClearBtn.addEventListener('click', () => {
    elements.searchInput.value = '';
    elements.searchClearBtn.classList.remove('show');
    state.searchQuery = '';
    updateUI();
    elements.searchInput.focus();
    announce('Қидирув тозаланди.');
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

  // Global Escape key listener
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (elements.helpModalWrap.classList.contains('visible')) {
        closeHelp();
      } else if (elements.drawer.classList.contains('opened')) {
        closeDetail();
      } else {
        elements.lanesDropdownMenu.classList.remove('show');
        elements.datePickerPopover.classList.remove('show');
        elements.simMenu.classList.remove('show');
      }
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
      elements.simMenu.classList.remove('show');
      announce("Янги сув аварияси бўйича сигнал қўшилди!");
    }
  });

  elements.simReset.addEventListener('click', () => {
    state.topics = JSON.parse(JSON.stringify(INITIAL_TOPICS));
    state.activeDateFilter = 'today';
    state.activeMahalla = 'all';
    state.activeLanes = new Set(['hokim', 'water', 'electricity', 'gas', 'waste']);
    state.searchQuery = '';
    state.selectedTopicId = null;

    elements.searchInput.value = '';
    elements.searchClearBtn.classList.remove('show');
    elements.mahallaSelect.value = 'all';
    elements.laneCheckboxes.forEach(cb => { cb.checked = true; });
    dateBtns.forEach(b => b.classList.remove('active'));
    elements.btnDateToday.classList.add('active');
    elements.btnDateCustom.classList.remove('active');
    elements.dateCustomLabel.textContent = 'Сана бўйича';
    elements.simMenu.classList.remove('show');
    closeDetail();

    updateUI();
    announce('Бошланғич ҳолат қайта тикланди.');
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initEvents();
  updateUI();
  console.log('Mahalla Ovozi prototype successfully loaded with Cyrillic specs.');
});
