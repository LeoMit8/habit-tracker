// ===== DATEN & STATE =====
let habits = JSON.parse(localStorage.getItem("habits")) || [];
let history = JSON.parse(localStorage.getItem("history")) || {};
let currentTab = 'today';
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

    // Perfect Day Check
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
    if(confirm("Wirklich löschen?")) {
        habits = habits.filter(h => h.id !== habitId);
        localStorage.setItem("habits", JSON.stringify(habits));
        updateHeader();
        renderView();
    }
}

// ===== VIEWS (Ansichten) =====
function switchTab(tab) {
    currentTab = tab;
    // UI Update für Tabs
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
        
        // Simulierter Streak (Später können wir hier echte Logik einbauen)
        const streak = calculateStreak(habit.id);

        const div = document.createElement("div");
        div.className = "habit-item";
        div.innerHTML = `
            <div class="habit-info" onclick="toggleHabit(${habit.id})">
                <span class="habit-name">${habit.name}</span>
                <span class="habit-streak"><i class="fas fa-fire"></i> ${streak} Tage Streak</span>
            </div>
            <div class="checkbox ${isDone ? 'checked' : ''}" onclick="toggleHabit(${habit.id})"></div>
            <button class="delete-btn" onclick="deleteHabit(${habit.id})"><i class="fas fa-trash"></i></button>
        `;
        appContent.appendChild(div);
    });
}

function renderWeek() {
    const dates = getPastDates(7);
    
    let html = `<div class="week-grid">`;
    
    habits.forEach(habit => {
        html += `<div class="week-row">
                    <div class="week-name">${habit.name}</div>
                    <div class="week-days">`;
        
        dates.forEach(date => {
            const isDone = history[date]?.[habit.id] || false;
            // Zeigt den Wochentag als Buchstaben an (z.B. M, D, M)
            const dayChar = new Date(date).toLocaleDateString('de-DE', {weekday: 'short'}).charAt(0);
            html += `<div class="day-circle ${isDone ? 'done' : ''}">${dayChar}</div>`;
        });
        
        html += `</div></div>`;
    });
    
    html += `</div>`;
    appContent.innerHTML = html;
}

function renderProgress() {
    const dates = getPastDates(7);
    const percentages = dates.map(date => {
        const dayHist = history[date] || {};
        if (habits.length === 0) return 0;
        let done = 0;
        habits.forEach(h => { if (dayHist[h.id]) done++; });
        return Math.round((done / habits.length) * 100);
    });

    const displayDates = dates.map(d => new Date(d).toLocaleDateString('de-DE', {weekday: 'short'}));

    appContent.innerHTML = `
        <h3 style="margin-bottom: 10px;">Letzte 7 Tage</h3>
        <div class="chart-container">
            <canvas id="progressChart"></canvas>
        </div>
    `;

    const ctx = document.getElementById('progressChart').getContext('2d');
    
    if (progressChart) progressChart.destroy();

    // LINIENDIAGRAMM MIT HELLBLAUER FLÄCHE (Genau wie gewünscht)
    progressChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: displayDates,
            datasets: [{
                label: 'Erledigt (%)',
                data: percentages,
                borderColor: '#0ea5e9', /* Hellblau */
                backgroundColor: 'rgba(14, 165, 233, 0.2)', /* Transparente Füllung */
                borderWidth: 3,
                fill: true,
                tension: 0.4, /* Macht die Linie geschmeidig */
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
            // Wenn heute noch nicht gemacht, prüfe gestern
            d.setDate(d.getDate() - 1);
        } else {
            break;
        }
    }
    return streak;
}

// ===== MODAL (Gewohnheit hinzufügen) =====
function openModal() {
    document.getElementById("addModal").classList.remove("hidden");
    document.getElementById("habitName").focus();
}

function closeModal() {
    document.getElementById("addModal").classList.add("hidden");
    document.getElementById("habitName").value = "";
}

function saveNewHabit() {
    const name = document.getElementById("habitName").value.trim();
    const freq = document.getElementById("habitFreq").value;

    if (!name) return alert("Bitte einen Namen eingeben!");

    const habit = {
        id: Date.now(),
        name: name,
        perWeek: parseInt(freq)
    };

    habits.push(habit);
    localStorage.setItem("habits", JSON.stringify(habits));
    closeModal();
    init();
}

// ===== START =====
init();
