// ===== DATEN & STATE =====
let habits = JSON.parse(localStorage.getItem("habits")) || [];
let history = JSON.parse(localStorage.getItem("history")) || {};
let currentTab = 'today';
let currentStatFilter = 'week'; // Für Einzel-Fortschritt (week, month, year, all)
let progressChart = null;

// DOM Elemente
const appContent = document.getElementById("appContent");
const dateDisplay = document.getElementById("dateDisplay");
const progressBar = document.getElementById("progressBar");
const dailyGoalText = document.getElementById("dailyGoalText");
const dailyGoalPercent = document.getElementById("dailyGoalPercent");
const perfectDayBadge = document.getElementById("perfectDayBadge");

// ===== HILFSFUNKTIONEN =====
function getToday() {
    return new Date().toISOString().split("T")[0];
}

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

function toggleText(element, event) {
    if(event) event.stopPropagation(); 
    element.classList.toggle('expanded');
}

// ===== CORE LOGIK =====
function init() {
    updateHeader();
    renderView();
}

function updateHeader() {
    const today = getToday();
    dateDisplay.textContent = formatDate(today);

    if (habits.length === 0) {
        dailyGoalText.textContent = "Keine Gewohnheiten";
        dailyGoalPercent.textContent = "0%";
        progressBar.style.width = "0%";
        perfectDayBadge.classList.add("hidden");
        return;
    }

    const todayHistory = history[today] || {};
    let completed = 0;

    habits.forEach(h => {
        if (todayHistory[h.id]) completed++;
    });

    const percent = Math.round((completed / habits.length) * 100);
    
    dailyGoalText.textContent = `${completed} / ${habits.length} erledigt`;
    dailyGoalPercent.textContent = `${percent}%`;
    progressBar.style.width = `${percent}%`;

    // Der Perfect Day Bugfix!
    if (percent === 100 && habits.length > 0) {
        perfectDayBadge.classList.remove("hidden");
    } else {
        perfectDayBadge.classList.add("hidden");
    }
}

function toggleHabit(habitId) {
    const today = getToday();
    if (!history[today]) history[today] = {};
    
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

function renderToday() {
    const today = getToday();
    const todayHistory = history[today] || {};

    if (habits.length === 0) {
        appContent.innerHTML = `<p style="text-align:center; color:#94a3b8; margin-top:20px;">Klicke auf das + um zu starten!</p>`;
        return;
    }

    habits.forEach(habit => {
        const isDone = todayHistory[habit.id] || false;
        const streak = calculateStreak(habit.id);

        const div = document.createElement("div");
        div.className = "habit-item";
        div.innerHTML = `
            <div class="habit-info" onclick="toggleHabit(${habit.id})">
                <span class="habit-name truncate" onclick="toggleText(this, event)">${habit.name}</span>
                <span class="habit-streak"><i class="fas fa-fire"></i> ${streak} Tage Streak</span>
            </div>
            <div class="checkbox ${isDone ? 'checked' : ''}" onclick="toggleHabit(${habit.id})"></div>
            <div class="action-btns">
                <button class="icon-btn edit-btn" onclick="openModal(${habit.id})"><i class="fas fa-pen"></i></button>
                <button class="icon-btn delete-btn" onclick="deleteHabit(${habit.id})"><i class="fas fa-trash"></i></button>
            </div>
        `;
        appContent.appendChild(div);
    });
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
    if (progressChart) {
        progressChart.destroy();
        progressChart = null;
    }

    // NEU: Der 'Jahr'-Button ist jetzt mit dabei!
    let html = `
        <div class="section-title" style="margin-top:0;">Letzte 7 Tage Gesamt</div>
        <div class="chart-container">
            <canvas id="progressChart"></canvas>
        </div>

        <div class="section-title">Aktivitäts-Heatmap (Letzte 90 Tage)</div>
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
    const percentages = dates.map(date => {
        const dayHist = history[date] || {};
        if (habits.length === 0) return 0;
        let done = 0;
        habits.forEach(h => { if (dayHist[h.id]) done++; });
        return Math.round((done / habits.length) * 100);
    });

    const displayDates = dates.map(d => new Date(d).toLocaleDateString('de-DE', {weekday: 'short'}));
    const ctx = document.getElementById('progressChart').getContext('2d');
    
    progressChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: displayDates,
            datasets: [{
                label: 'Erledigt (%)',
                data: percentages,
                borderColor: '#0ea5e9',
                backgroundColor: 'rgba(14, 165, 233, 0.2)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#0f172a',
                pointBorderColor: '#0ea5e9',
                pointBorderWidth: 2,
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: { beginAtZero: true, max: 100, ticks: { color: '#94a3b8' } },
                x: { ticks: { color: '#94a3b8' } }
            },
            plugins: { legend: { display: false } }
        }
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
        
        if (percent === 100 && habits.length > 0) lvl = 4;
        else if (percent >= 75) lvl = 3;
        else if (percent >= 40) lvl = 2;
        else if (percent > 0) lvl = 1;

        const dateStr = new Date(date).toLocaleDateString('de-DE');
        const tooltip = `${dateStr}: ${done}/${habits.length} erledigt`;

        html += `<div class="heatmap-box lvl-${lvl}" title="${tooltip}"></div>`;
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

    if (habits.length === 0) {
        container.innerHTML = `<p style="color:var(--text-muted); font-size:14px;">Keine Daten.</p>`;
        return;
    }

    let html = '';
    habits.forEach(habit => {
        const stats = getProgressStats(habit, currentStatFilter);
        const isPerfect = stats.percent >= 100;

        html += `
            <div class="stat-item">
                <div class="stat-header">
                    <span class="truncate" style="max-width: 60%;" onclick="toggleText(this, event)">${habit.name}</span>
                    <span>${stats.done} / ${stats.target} <span style="color:${isPerfect ? '#f59e0b' : 'var(--accent)'};">(${stats.percent}%)</span></span>
                </div>
                <div class="stat-bar-bg">
                    <div class="stat-bar-fill ${isPerfect ? 'perfect' : ''}" style="width: ${Math.min(stats.percent, 100)}%;"></div>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function getProgressStats(habit, timeframe) {
    let days = 7;
    if (timeframe === 'month') days = 30;
    if (timeframe === 'year') days = 365; // NEU: 365 Tage Berechnung
    if (timeframe === 'all') {
        const allDates = Object.keys(history).sort();
        if (allDates.length > 0) {
            const firstDate = new Date(allDates[0]);
            const diffTime = Math.abs(new Date() - firstDate);
            days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        } else {
            days = 1;
        }
    }

    const datesToScan = getPastDates(days);
    let doneCount = 0;
    
    datesToScan.forEach(d => {
        if (history[d] && history[d][habit.id]) doneCount++;
    });

    const targetTotal = Math.ceil((days / 7) * habit.perWeek);
    const cappedTarget = targetTotal === 0 ? 1 : targetTotal;

    let percent = Math.round((doneCount / cappedTarget) * 100);
    return { done: doneCount, target: cappedTarget, percent };
}

// ===== LOGIK: STREAK BERECHNEN =====
function calculateStreak(habitId) {
    let streak = 0;
    let d = new Date();
    
    while (true) {
        const dateStr = d.toISOString().split("T")[0];
        if (history[dateStr] && history[dateStr][habitId]) {
            streak++;
            d.setDate(d.getDate() - 1);
        } else if (dateStr === getToday()) {
            d.setDate(d.getDate() - 1);
        } else {
            break;
        }
    }
    return streak;
}

// ===== MODAL (Hinzufügen & Bearbeiten) =====
function openModal(editId = null) {
    const modal = document.getElementById("addModal");
    const title = document.getElementById("modalTitle");
    const nameInput = document.getElementById("habitName");
    const freqInput = document.getElementById("habitFreq");
    const idInput = document.getElementById("editHabitId");

    if (editId) {
        const habit = habits.find(h => h.id === editId);
        title.textContent = "Gewohnheit bearbeiten";
        nameInput.value = habit.name;
        freqInput.value = habit.perWeek;
        idInput.value = habit.id;
    } else {
        title.textContent = "Neue Gewohnheit";
        nameInput.value = "";
        freqInput.value = 7;
        idInput.value = "";
    }

    modal.classList.remove("hidden");
    nameInput.focus();
}

function closeModal() {
    document.getElementById("addModal").classList.add("hidden");
}

function saveNewHabit() {
    const name = document.getElementById("habitName").value.trim();
    const freq = document.getElementById("habitFreq").value;
    const editId = document.getElementById("editHabitId").value;

    if (!name) return alert("Bitte einen Namen eingeben!");

    if (editId) {
        const habit = habits.find(h => h.id == editId);
        if (habit) {
            habit.name = name;
            habit.perWeek = parseInt(freq);
        }
    } else {
        const habit = {
            id: Date.now(),
            name: name,
            perWeek: parseInt(freq)
        };
        habits.push(habit);
    }

    localStorage.setItem("habits", JSON.stringify(habits));
    closeModal();
    init();
}

// ===== START =====
init();
