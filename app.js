// ===== DATEN & STATE =====
let habits = JSON.parse(localStorage.getItem("habits")) || [];
let history = JSON.parse(localStorage.getItem("history")) || {};
let currentTab = 'today';
let currentStatFilter = 'week'; 
let progressChart = null;

// DOM Elemente
const appContent = document.getElementById("appContent");
const dateDisplay = document.getElementById("dateDisplay");
const progressBar = document.getElementById("progressBar");
const dailyGoalText = document.getElementById("dailyGoalText");
const dailyGoalPercent = document.getElementById("dailyGoalPercent");
const perfectDayBadge = document.getElementById("perfectDayBadge");

// ===== HILFSFUNKTIONEN FÜR DATUM =====
function getToday() { return new Date().toISOString().split("T")[0]; }

function formatDate(dateString) {
    const options = { weekday: 'short', day: '2-digit', month: 'short' };
    return new Date(dateString).toLocaleDateString('de-DE', options);
}

function getPastDates(days) {
    const dates = [];
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        dates.push(d.toISOString().split("T")[0]);
    }
    return dates;
}

// Startpunkte berechnen (Für Woche, Monat, Jahr)
function getStartOfWeek() {
    const d = new Date();
    const day = d.getDay() || 7; 
    d.setDate(d.getDate() - day + 1);
    return d.toISOString().split("T")[0];
}
function getStartOfMonth() {
    const d = new Date(); d.setDate(1);
    return d.toISOString().split("T")[0];
}
function getStartOfYear() {
    const d = new Date(); d.setMonth(0, 1);
    return d.toISOString().split("T")[0];
}

function toggleText(element, event) {
    if(event) event.stopPropagation(); 
    element.classList.toggle('expanded');
}

// ===== MIGRATION (Für deine alten Gewohnheiten) =====
function migrateOldData() {
    let changed = false;
    habits.forEach(h => {
        if (!h.type) {
            h.type = h.perWeek === 7 ? 'daily' : 'weekly';
            h.target = h.perWeek === 7 ? 1 : h.perWeek;
            changed = true;
        }
    });
    if (changed) localStorage.setItem("habits", JSON.stringify(habits));
}

// ===== CORE LOGIK =====
function init() {
    migrateOldData();
    updateHeader();
    renderView();
}

// HEADER UPDATE: Nur TÄGLICHE Gewohnheiten zählen für den Perfect Day!
function updateHeader() {
    const today = getToday();
    dateDisplay.textContent = formatDate(today);

    const dailyHabits = habits.filter(h => h.type === 'daily');

    if (dailyHabits.length === 0) {
        dailyGoalText.textContent = "Keine täglichen Pflichten";
        dailyGoalPercent.textContent = "0%";
        progressBar.style.width = "0%";
        perfectDayBadge.classList.add("hidden");
        return;
    }

    const todayHistory = history[today] || {};
    let completed = 0;

    dailyHabits.forEach(h => {
        if (todayHistory[h.id]) completed++;
    });

    const percent = Math.round((completed / dailyHabits.length) * 100);
    
    dailyGoalText.textContent = `${completed} / ${dailyHabits.length} Tägliche erledigt`;
    dailyGoalPercent.textContent = `${percent}%`;
    progressBar.style.width = `${percent}%`;

    if (percent === 100 && dailyHabits.length > 0) perfectDayBadge.classList.remove("hidden");
    else perfectDayBadge.classList.add("hidden");
}

function toggleHabit(habitId) {
    const today = getToday();
    if (!history[today]) history[today] = {};
    
    // Toggle (An oder Aus für den heutigen Tag)
    history[today][habitId] = !history[today][habitId];
    localStorage.setItem("history", JSON.stringify(history));
    
    updateHeader();
    renderView();
}

function deleteHabit(habitId) {
    if(confirm("Wirklich löschen? Alle Daten dazu gehen verloren.")) {
        habits = habits.filter(h => h.id !== habitId);
        localStorage.setItem("habits", JSON.stringify(habits));
        updateHeader();
        renderView();
    }
}

// Berechnet, wie oft eine Gewohnheit in ihrem Zeitraum erledigt wurde
function getCurrentPeriodCount(habit) {
    let startStr = getToday();
    if (habit.type === 'weekly') startStr = getStartOfWeek();
    if (habit.type === 'monthly') startStr = getStartOfMonth();
    if (habit.type === 'yearly') startStr = getStartOfYear();

    let count = 0;
    Object.keys(history).forEach(date => {
        if (date >= startStr && date <= getToday() && history[date][habit.id]) {
            count++;
        }
    });
    return count;
}

// ===== VIEWS (Ansichten) =====
function switchTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    renderView();
}

function renderView() {
    appContent.innerHTML = "";
    if (currentTab === 'today') renderToday();
    else if (currentTab === 'week') renderWeek();
    else if (currentTab === 'progress') renderProgress();
}

// HAUPTSCREEN: Kategorien Trennung (Die Premium-Lösung)
function renderToday() {
    if (habits.length === 0) {
        appContent.innerHTML = `<p style="text-align:center; color:#94a3b8; margin-top:20px;">Klicke auf das + um zu starten!</p>`;
        return;
    }

    const daily = habits.filter(h => h.type === 'daily');
    const weekly = habits.filter(h => h.type === 'weekly');
    const monthly = habits.filter(h => h.type === 'monthly');
    const yearly = habits.filter(h => h.type === 'yearly');

    if(daily.length > 0) {
        appContent.innerHTML += `<div class="section-title">🎯 Tägliche Pflicht</div>`;
        daily.forEach(h => appContent.appendChild(createHabitElement(h)));
    }
    if(weekly.length > 0) {
        appContent.innerHTML += `<div class="section-title">🗓️ Wöchentliche Ziele</div>`;
        weekly.forEach(h => appContent.appendChild(createHabitElement(h)));
    }
    if(monthly.length > 0) {
        appContent.innerHTML += `<div class="section-title">📅 Monatsziele</div>`;
        monthly.forEach(h => appContent.appendChild(createHabitElement(h)));
    }
    if(yearly.length > 0) {
        appContent.innerHTML += `<div class="section-title">🌍 Jahresziele</div>`;
        yearly.forEach(h => appContent.appendChild(createHabitElement(h)));
    }
}

function createHabitElement(habit) {
    const today = getToday();
    const isDoneToday = history[today]?.[habit.id] || false;
    const div = document.createElement("div");
    div.className = "habit-item";

    let actionHTML = "";

    if (habit.type === 'daily') {
        const streak = calculateStreak(habit.id);
        actionHTML = `<div class="checkbox ${isDoneToday ? 'checked' : ''}" onclick="toggleHabit(${habit.id})"></div>`;
        
        div.innerHTML = `
            <div class="habit-info" onclick="toggleHabit(${habit.id})">
                <span class="habit-name truncate" onclick="toggleText(this, event)">${habit.name}</span>
                <span class="habit-streak"><i class="fas fa-fire"></i> ${streak} Tage Streak</span>
            </div>
            ${actionHTML}
            <div class="action-btns">
                <button class="icon-btn edit-btn" onclick="openModal(${habit.id})"><i class="fas fa-pen"></i></button>
                <button class="icon-btn delete-btn" onclick="deleteHabit(${habit.id})"><i class="fas fa-trash"></i></button>
            </div>
        `;
    } else {
        // Wochen/Monat/Jahr Logik (Overachiever System!)
        const count = getCurrentPeriodCount(habit);
        let badgeClass = "";
        let icon = "📈";

        if (count > habit.target) { badgeClass = "overachiever"; icon = "🔥"; } // Bonus Grind!
        else if (count === habit.target) { badgeClass = "done"; icon = "✅"; }  // Ziel erreicht

        actionHTML = `<div class="counter-badge ${badgeClass}" onclick="toggleHabit(${habit.id})">${count} / ${habit.target} ${icon}</div>`;
        
        div.innerHTML = `
            <div class="habit-info" onclick="toggleHabit(${habit.id})">
                <span class="habit-name truncate" onclick="toggleText(this, event)">${habit.name}</span>
                <span class="habit-streak" style="color: ${isDoneToday ? 'var(--accent)' : 'var(--text-muted)'};">
                    ${isDoneToday ? 'Heute erledigt! 🙌' : 'Heute noch nicht'}
                </span>
            </div>
            ${actionHTML}
            <div class="action-btns">
                <button class="icon-btn edit-btn" onclick="openModal(${habit.id})"><i class="fas fa-pen"></i></button>
                <button class="icon-btn delete-btn" onclick="deleteHabit(${habit.id})"><i class="fas fa-trash"></i></button>
            </div>
        `;
    }
    return div;
}

function renderWeek() {
    const dates = getPastDates(7);
    let html = `<div class="week-grid">`;
    habits.forEach(habit => {
        html += `<div class="week-row">
                    <div class="week-name truncate" onclick="toggleText(this, event)">${habit.name}</div>
                    <div class="week-days">`;
        dates.forEach(date => {
            const isDone = history[date]?.[habit.id] || false;
            const dayChar = new Date(date).toLocaleDateString('de-DE', {weekday: 'short'}).charAt(0);
            html += `<div class="day-circle ${isDone ? 'done' : ''}">${dayChar}</div>`;
        });
        html += `</div></div>`;
    });
    html += `</div>`;
    appContent.innerHTML = html;
}

// ===== PROGRESS BEREICH =====
function renderProgress() {
    if (progressChart) { progressChart.destroy(); progressChart = null; }

    let html = `
        <div class="section-title" style="margin-top:0;">Letzte 7 Tage (Nur Tägliche)</div>
        <div class="chart-container"><canvas id="progressChart"></canvas></div>

        <div class="section-title">Aktivitäts-Heatmap (Gesamt)</div>
        <div class="heatmap-grid" id="heatmapGrid"></div>

        <div class="section-title">Einzel-Fortschritt</div>
        <div class="stat-filters">
            <button class="stat-filter-btn ${currentStatFilter === 'week' ? 'active' : ''}" onclick="setStatFilter('week', event)">Woche</button>
            <button class="stat-filter-btn ${currentStatFilter === 'month' ? 'active' : ''}" onclick="setStatFilter('month', event)">Monat</button>
            <button class="stat-filter-btn ${currentStatFilter === 'year' ? 'active' : ''}" onclick="setStatFilter('year', event)">Jahr</button>
            <button class="stat-filter-btn ${currentStatFilter === 'all' ? 'active' : ''}" onclick="setStatFilter('all', event)">Alles</button>
        </div>
        <div id="indivStatsList"></div>
    `;
    appContent.innerHTML = html;
    renderChart();
    renderHeatmap();
    renderIndivStats();
}

function renderChart() {
    const dates = getPastDates(7);
    const dailyHabits = habits.filter(h => h.type === 'daily');
    
    const percentages = dates.map(date => {
        const dayHist = history[date] || {};
        if (dailyHabits.length === 0) return 0;
        let done = 0;
        dailyHabits.forEach(h => { if (dayHist[h.id]) done++; });
        return Math.round((done / dailyHabits.length) * 100);
    });

    const displayDates = dates.map(d => new Date(d).toLocaleDateString('de-DE', {weekday: 'short'}));
    const ctx = document.getElementById('progressChart').getContext('2d');
    
    progressChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: displayDates,
            datasets: [{
                label: 'Erledigt (%)', data: percentages, borderColor: '#0ea5e9',
                backgroundColor: 'rgba(14, 165, 233, 0.2)', borderWidth: 3, fill: true,
                tension: 0.4, pointBackgroundColor: '#0f172a', pointBorderColor: '#0ea5e9', pointBorderWidth: 2, pointRadius: 4
            }]
        },
        options: { responsive: true, scales: { y: { beginAtZero: true, max: 100, ticks: { color: '#94a3b8' } }, x: { ticks: { color: '#94a3b8' } } }, plugins: { legend: { display: false } } }
    });
}

function renderHeatmap() {
    const grid = document.getElementById("heatmapGrid");
    if (!grid) return;
    const dates = getPastDates(90);
    let html = '';

    dates.forEach(date => {
        const dayHist = history[date] || {};
        let done = 0;
        habits.forEach(h => { if (dayHist[h.id]) done++; });

        let percent = habits.length === 0 ? 0 : (done / habits.length) * 100;
        let lvl = 0;
        if (percent >= 100 && habits.length > 0) lvl = 4;
        else if (percent >= 75) lvl = 3;
        else if (percent >= 40) lvl = 2;
        else if (percent > 0) lvl = 1;

        const dateStr = new Date(date).toLocaleDateString('de-DE');
        html += `<div class="heatmap-box lvl-${lvl}" title="${dateStr}: ${done} Aktionen"></div>`;
    });
    grid.innerHTML = html;
}

function setStatFilter(filter, event) {
    currentStatFilter = filter;
    document.querySelectorAll('.stat-filter-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    renderIndivStats();
}

function renderIndivStats() {
    const container = document.getElementById("indivStatsList");
    if (!container) return;
    if (habits.length === 0) { container.innerHTML = `<p style="color:var(--text-muted); font-size:14px;">Keine Daten.</p>`; return; }

    let html = '';
    habits.forEach(habit => {
        const stats = getProgressStats(habit, currentStatFilter);
        let fillClass = "";
        let textStyle = "color: var(--accent);";
        
        if (stats.percent > 100) { fillClass = "overachiever"; textStyle = "color: var(--gold); font-weight: 800;"; }
        else if (stats.percent === 100) { fillClass = "perfect"; textStyle = "color: var(--success);"; }

        html += `
            <div class="stat-item">
                <div class="stat-header">
                    <span class="truncate" style="max-width: 60%;" onclick="toggleText(this, event)">${habit.name}</span>
                    <span>${stats.done} / ${stats.target} <span style="${textStyle}">(${stats.percent}%)</span></span>
                </div>
                <div class="stat-bar-bg">
                    <div class="stat-bar-fill ${fillClass}" style="width: ${Math.min(stats.percent, 100)}%;"></div>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function getProgressStats(habit, timeframe) {
    let days = 7;
    if (timeframe === 'month') days = 30;
    if (timeframe === 'year') days = 365;
    if (timeframe === 'all') {
        const allDates = Object.keys(history).sort();
        if (allDates.length > 0) {
            const firstDate = new Date(allDates[0]);
            days = Math.ceil(Math.abs(new Date() - firstDate) / (1000 * 60 * 60 * 24)) + 1;
        } else { days = 1; }
    }

    const datesToScan = getPastDates(days);
    let doneCount = 0;
    datesToScan.forEach(d => { if (history[d] && history[d][habit.id]) doneCount++; });

    // Mathe: Wie oft sollte es in diesem Zeitraum gemacht werden?
    let targetTotal = 1;
    if (habit.type === 'daily') targetTotal = days;
    else if (habit.type === 'weekly') targetTotal = Math.ceil((days / 7) * habit.target);
    else if (habit.type === 'monthly') targetTotal = Math.ceil((days / 30) * habit.target);
    else if (habit.type === 'yearly') targetTotal = Math.ceil((days / 365) * habit.target);

    const cappedTarget = targetTotal === 0 ? 1 : targetTotal;
    let percent = Math.round((doneCount / cappedTarget) * 100);
    return { done: doneCount, target: cappedTarget, percent };
}

function calculateStreak(habitId) {
    let streak = 0; let d = new Date();
    while (true) {
        const dateStr = d.toISOString().split("T")[0];
        if (history[dateStr] && history[dateStr][habitId]) { streak++; d.setDate(d.getDate() - 1); } 
        else if (dateStr === getToday()) { d.setDate(d.getDate() - 1); } 
        else { break; }
    }
    return streak;
}

// ===== MODAL (Hinzufügen & Bearbeiten) =====
function openModal(editId = null) {
    const modal = document.getElementById("addModal");
    const title = document.getElementById("modalTitle");
    const nameInput = document.getElementById("habitName");
    const typeSelect = document.getElementById("habitType");
    const targetInput = document.getElementById("habitTarget");
    const idInput = document.getElementById("editHabitId");

    if (editId) {
        const habit = habits.find(h => h.id === editId);
        title.textContent = "Gewohnheit bearbeiten";
        nameInput.value = habit.name;
        typeSelect.value = habit.type || 'daily';
        targetInput.value = habit.target || 1;
        idInput.value = habit.id;
    } else {
        title.textContent = "Neue Gewohnheit";
        nameInput.value = "";
        typeSelect.value = "daily";
        targetInput.value = 3;
        idInput.value = "";
    }

    toggleTargetInput();
    modal.classList.remove("hidden");
    nameInput.focus();
}

function toggleTargetInput() {
    const type = document.getElementById("habitType").value;
    const wrapper = document.getElementById("targetWrapper");
    if (type === 'daily') wrapper.classList.add("hidden");
    else wrapper.classList.remove("hidden");
}

function closeModal() {
    document.getElementById("addModal").classList.add("hidden");
}

function saveNewHabit() {
    const name = document.getElementById("habitName").value.trim();
    const type = document.getElementById("habitType").value;
    const target = parseInt(document.getElementById("habitTarget").value) || 1;
    const editId = document.getElementById("editHabitId").value;

    if (!name) return alert("Bitte einen Namen eingeben!");

    if (editId) {
        const habit = habits.find(h => h.id == editId);
        if (habit) { habit.name = name; habit.type = type; habit.target = target; }
    } else {
        habits.push({ id: Date.now(), name: name, type: type, target: target });
    }

    localStorage.setItem("habits", JSON.stringify(habits));
    closeModal();
    init();
}

// ===== START =====
init();
