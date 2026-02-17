// ===== DATEN & STATE =====
let habits = JSON.parse(localStorage.getItem("habits")) || [];
let history = JSON.parse(localStorage.getItem("history")) || {};
let notes = JSON.parse(localStorage.getItem("notes")) || {}; 
let dayStatusList = JSON.parse(localStorage.getItem("dayStatusList")) || {}; 

// NEU: App Einstellungen speichern
let appStartDate = localStorage.getItem("appStartDate");
if (!appStartDate) { appStartDate = new Date().toISOString().split("T")[0]; localStorage.setItem("appStartDate", appStartDate); }

let savedTheme = localStorage.getItem("appTheme") || "dark";
let lastReviewedMonth = localStorage.getItem("lastReviewedMonth") || "";

let currentTab = 'today';
let currentChartFilter = 'week'; 
let currentStatFilter = 'week'; 
let progressChart = null;
let currentCalendarDate = new Date(); 
let tempDayStatus = 'normal'; 
let selectedDateStr = new Date().toISOString().split("T")[0]; 

const appContent = document.getElementById("appContent");
const dateDisplay = document.getElementById("dateDisplay");
const progressBar = document.getElementById("progressBar");
const dailyGoalText = document.getElementById("dailyGoalText");
const dailyGoalPercent = document.getElementById("dailyGoalPercent");
const perfectDayBadge = document.getElementById("perfectDayBadge");
const btnNextDay = document.getElementById("btnNextDay");
const notificationDot = document.getElementById("notificationDot");

// ===== HILFSFUNKTIONEN =====
function getToday() { return new Date().toISOString().split("T")[0]; }
function formatDate(dateString) { return new Date(dateString).toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'short' }); }
function getPastDates(days) { const dates = []; for (let i = days - 1; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); dates.push(d.toISOString().split("T")[0]); } return dates; }
function getStartOfWeek(dateStr) { const d = new Date(dateStr); const day = d.getDay() || 7; d.setDate(d.getDate() - day + 1); return d.toISOString().split("T")[0]; }
function getStartOfMonth(dateStr) { const d = new Date(dateStr); d.setDate(1); return d.toISOString().split("T")[0]; }
function getStartOfYear(dateStr) { const d = new Date(dateStr); d.setMonth(0, 1); return d.toISOString().split("T")[0]; }
function toggleText(element, event) { if(event) event.stopPropagation(); element.classList.toggle('expanded'); }

// ===== INIT & THEMING =====
function init() { 
    applyTheme(savedTheme);
    checkThemeUnlock();
    checkNotificationBell();
    updateHeader(); 
    renderView(); 
}

function applyTheme(themeName) {
    document.body.classList.remove("light-mode", "elite-mode");
    if (themeName === "light") document.body.classList.add("light-mode");
    if (themeName === "elite") document.body.classList.add("elite-mode");
    savedTheme = themeName;
    localStorage.setItem("appTheme", themeName);
    document.getElementById("themeSelect").value = themeName;
    if (progressChart) renderChart(); // Diagramm Farben anpassen
}

function changeTheme(newTheme) { applyTheme(newTheme); }

function checkThemeUnlock() {
    // Phase 4: Zum Testen schalten wir Elite schon ab einer 1-Tage Streak frei!
    let bestStreak = 0;
    habits.forEach(h => { let s = calculateStreak(h.id, getToday()); if (s > bestStreak) bestStreak = s; });
    
    const eliteOption = document.getElementById("eliteOption");
    if (bestStreak >= 1) {
        document.getElementById("eliteThemeOption").disabled = false;
        document.getElementById("eliteThemeOption").textContent = "👑 Elite Black & Gold";
    }
}

// ===== GLOCKE & MONATS-RÜCKBLICK =====
function checkNotificationBell() {
    let todayObj = new Date(getToday());
    let currentMonthStr = `${todayObj.getFullYear()}-${todayObj.getMonth()}`;
    
    // Wenn heute der 1. ist UND wir diesen Monat noch nicht angesehen haben -> Leuchten!
    if (todayObj.getDate() === 1 && lastReviewedMonth !== currentMonthStr) {
        notificationDot.classList.remove("hidden");
    } else {
        notificationDot.classList.add("hidden");
    }
}

function openMonthlyReview(isTest = false) {
    let todayObj = new Date(getToday());
    let reviewYear = todayObj.getFullYear();
    let reviewMonth = todayObj.getMonth() - 1; // Wir schauen uns den LETZTEN Monat an

    if (isTest) {
        // Im Test-Modus schauen wir uns den AKTUELLEN Monat an, damit wir jetzt schon was sehen!
        reviewMonth = todayObj.getMonth();
    } else if (reviewMonth < 0) {
        reviewMonth = 11; reviewYear--;
    }

    const monthNames = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
    document.getElementById("reviewMonthTitle").textContent = `${monthNames[reviewMonth]} ${reviewYear}`;

    // Stats berechnen für diesen Monat
    const firstDay = new Date(reviewYear, reviewMonth, 1);
    const lastDay = new Date(reviewYear, reviewMonth + 1, 0);
    const daysInMonth = lastDay.getDate();

    let perfectDays = 0; let flexGoalsMet = 0; let sickVacationDays = 0; let clownDays = 0;
    const dailyHabits = habits.filter(h => h.type === 'daily');
    const flexHabits = habits.filter(h => h.type !== 'daily');

    for(let i = 1; i <= daysInMonth; i++) {
        let dateStr = `${reviewYear}-${String(reviewMonth+1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        if (dateStr > getToday()) continue; // Zukunft ignorieren

        let dStatus = dayStatusList[dateStr];
        if (dStatus === 'sick' || dStatus === 'vacation') { sickVacationDays++; continue; }

        let dayHist = history[dateStr] || {};
        
        let dailyDone = 0; dailyHabits.forEach(h => { if(dayHist[h.id]) dailyDone++; });
        if (dailyHabits.length > 0 && dailyDone === dailyHabits.length) perfectDays++;

        let totalDone = 0; habits.forEach(h => { if(dayHist[h.id]) totalDone++; });
        if (dateStr >= appStartDate && totalDone === 0 && habits.length > 0) clownDays++;

        flexHabits.forEach(h => {
            if (dayHist[h.id]) {
                let count = getCountForPeriodUpToDate(h, dateStr);
                if (count === h.target) flexGoalsMet++; // Kronen gezählt
            }
        });
    }

    let primeDay = getBestWeekday();

    let statsHtml = `
        <div style="margin-bottom: 8px;">⭐ <strong>Perfect Days:</strong> ${perfectDays}</div>
        <div style="margin-bottom: 8px;">👑 <strong>Ziele geknackt:</strong> ${flexGoalsMet}</div>
        <div style="margin-bottom: 8px;">📊 <strong>Bester Wochentag:</strong> ${primeDay}</div>
        <div style="margin-bottom: 8px;">🏝️/🤒 <strong>Pausiert:</strong> ${sickVacationDays} Tage</div>
        <div style="margin-bottom: 8px;">🤡 <strong>Off-Tage:</strong> ${clownDays}</div>
    `;

    document.getElementById("reviewStats").innerHTML = statsHtml;
    
    // Glocke zurücksetzen, wenn es kein Test war
    if (!isTest) {
        let currentMonthStr = `${todayObj.getFullYear()}-${todayObj.getMonth()}`;
        localStorage.setItem("lastReviewedMonth", currentMonthStr);
        lastReviewedMonth = currentMonthStr;
        checkNotificationBell();
    }

    document.getElementById("settingsModal").classList.add("hidden");
    document.getElementById("reviewModal").classList.remove("hidden");
}

function closeMonthlyReview() { document.getElementById("reviewModal").classList.add("hidden"); }

// ===== DEEP INSIGHTS LOGIK =====
function getBestWeekday() {
    if (habits.length === 0) return "-";
    let counts = [0,0,0,0,0,0,0]; // So, Mo, Di...
    let daysName = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
    
    Object.keys(history).forEach(dateStr => {
        if(dayStatusList[dateStr] === 'sick' || dayStatusList[dateStr] === 'vacation') return;
        let dayHist = history[dateStr];
        let done = 0; habits.forEach(h => { if(dayHist[h.id]) done++; });
        if (done > 0) {
            let wDay = new Date(dateStr).getDay();
            counts[wDay] += done;
        }
    });

    let maxCount = 0; let bestDayIndex = -1;
    for(let i=0; i<7; i++) { if(counts[i] > maxCount) { maxCount = counts[i]; bestDayIndex = i; } }
    return bestDayIndex === -1 ? "-" : daysName[bestDayIndex];
}

// ===== NAVIGATION =====
function changeMainDate(offset) {
    let d = new Date(selectedDateStr); d.setDate(d.getDate() + offset);
    selectedDateStr = d.toISOString().split("T")[0];
    if (selectedDateStr > getToday()) selectedDateStr = getToday();
    updateHeader(); renderView();
}

function updateHeader() {
    if (selectedDateStr === getToday()) { dateDisplay.textContent = "Heute"; btnNextDay.disabled = true; } 
    else { dateDisplay.textContent = formatDate(selectedDateStr); btnNextDay.disabled = false; }
    const dailyHabits = habits.filter(h => h.type === 'daily');
    if (dailyHabits.length === 0) { dailyGoalText.textContent = "Keine täglichen Routinen"; dailyGoalPercent.textContent = "0%"; progressBar.style.width = "0%"; perfectDayBadge.classList.add("hidden"); return; }
    
    const todayHistory = history[selectedDateStr] || {}; let completed = 0;
    dailyHabits.forEach(h => { if (todayHistory[h.id]) completed++; });

    const percent = Math.round((completed / dailyHabits.length) * 100);
    dailyGoalText.textContent = `${completed} / ${dailyHabits.length} erledigt`; dailyGoalPercent.textContent = `${percent}%`; progressBar.style.width = `${percent}%`;
    if (percent === 100 && dailyHabits.length > 0) perfectDayBadge.classList.remove("hidden"); else perfectDayBadge.classList.add("hidden");
}

function toggleHabit(habitId) {
    if (!history[selectedDateStr]) history[selectedDateStr] = {};
    history[selectedDateStr][habitId] = !history[selectedDateStr][habitId];
    localStorage.setItem("history", JSON.stringify(history));
    checkThemeUnlock(); // Prüft direkt nach Klick ob Elite freigeschaltet wird!
    updateHeader(); renderView();
}

function deleteHabit(habitId) { if(confirm("Wirklich löschen?")) { habits = habits.filter(h => h.id !== habitId); localStorage.setItem("habits", JSON.stringify(habits)); updateHeader(); renderView(); } }
function getCurrentPeriodCount(habit) { return getCountForPeriodUpToDate(habit, selectedDateStr); }

function getCountForPeriodUpToDate(habit, dateStr) {
    let startStr = dateStr;
    if (habit.type === 'weekly') startStr = getStartOfWeek(dateStr);
    if (habit.type === 'monthly') startStr = getStartOfMonth(dateStr);
    if (habit.type === 'yearly') startStr = getStartOfYear(dateStr);
    let count = 0; Object.keys(history).forEach(date => { if (date >= startStr && date <= dateStr && history[date][habit.id]) count++; }); return count;
}

function switchTab(tab) { 
    currentTab = tab; document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active')); event.target.classList.add('active'); 
    if(tab === 'today') selectedDateStr = getToday();
    updateHeader(); renderView(); 
}

function renderView() { appContent.innerHTML = ""; if (currentTab === 'today') renderToday(); else if (currentTab === 'week') renderWeek(); else if (currentTab === 'progress') renderProgress(); }

function generateCoachMessage() {
    if (habits.length === 0) return { icon: "👋", text: "Willkommen! Füge deine erste Gewohnheit über das + hinzu." };
    if (dayStatusList[selectedDateStr] === 'sick') return { icon: "🤒", text: "Gute Besserung! Erhole dich gut, deine Streaks sind sicher." };
    if (dayStatusList[selectedDateStr] === 'vacation') return { icon: "🏝️", text: "Genieße deinen Urlaub! Entspann dich." };

    let d = new Date(selectedDateStr); d.setDate(d.getDate() - 1);
    let yesterdayStr = d.toISOString().split("T")[0];
    let yesterdayHistory = history[yesterdayStr] || {};
    let doneYesterday = 0; habits.forEach(h => { if (yesterdayHistory[h.id]) doneYesterday++; });
    
    if (yesterdayStr >= appStartDate && doneYesterday === 0 && dayStatusList[yesterdayStr] !== 'sick' && dayStatusList[yesterdayStr] !== 'vacation') {
        return { icon: "😤", text: "Gestern war ein Off-Tag 🤡. Heute greifen wir wieder richtig an!" };
    }

    const dailyHabits = habits.filter(h => h.type === 'daily');
    let completedToday = 0;
    dailyHabits.forEach(h => { if (history[selectedDateStr]?.[h.id]) completedToday++; });
    if (dailyHabits.length > 0 && completedToday === dailyHabits.length) return { icon: "⭐", text: "Perfect Day! Du hast heute alle täglichen Routinen gerockt." };

    let bestStreak = 0;
    dailyHabits.forEach(h => { let s = calculateStreak(h.id, selectedDateStr); if (s > bestStreak) bestStreak = s; });
    if (bestStreak >= 5) return { icon: "🔥", text: `Maschine! Du bist bei einer Gewohnheit auf einer ${bestStreak}-Tage Streak. Zieh durch!` };

    return { icon: "🧠", text: "Jeder Tag zählt. Lass uns die Liste abhaken!" };
}

function renderToday() {
    if (habits.length === 0) { appContent.innerHTML = `<p style="text-align:center; color:#94a3b8; margin-top:20px;">Klicke auf das + um zu starten!</p>`; return; }
    
    const coachData = generateCoachMessage();
    appContent.innerHTML += `<div class="coach-banner"><div class="coach-icon">${coachData.icon}</div><div class="coach-text">${coachData.text}</div></div>`;

    const daily = habits.filter(h => h.type === 'daily'); const weekly = habits.filter(h => h.type === 'weekly'); const monthly = habits.filter(h => h.type === 'monthly'); const yearly = habits.filter(h => h.type === 'yearly');
    if(daily.length > 0) { appContent.innerHTML += `<div class="section-title">🎯 Tägliche Routinen</div>`; daily.forEach(h => appContent.appendChild(createHabitElement(h))); }
    if(weekly.length > 0) { appContent.innerHTML += `<div class="section-title">🗓️ Wöchentliche Ziele</div>`; weekly.forEach(h => appContent.appendChild(createHabitElement(h))); }
    if(monthly.length > 0) { appContent.innerHTML += `<div class="section-title">📅 Monatsziele</div>`; monthly.forEach(h => appContent.appendChild(createHabitElement(h))); }
    if(yearly.length > 0) { appContent.innerHTML += `<div class="section-title">🌍 Jahresziele</div>`; yearly.forEach(h => appContent.appendChild(createHabitElement(h))); }
}

function createHabitElement(habit) {
    const isDoneToday = history[selectedDateStr]?.[habit.id] || false;
    const div = document.createElement("div"); div.className = "habit-item"; let actionHTML = "";
    if (habit.type === 'daily') {
        const streak = calculateStreak(habit.id, selectedDateStr); actionHTML = `<div class="checkbox ${isDoneToday ? 'checked' : ''}" onclick="toggleHabit(${habit.id})"></div>`;
        div.innerHTML = `<div class="habit-info" onclick="toggleHabit(${habit.id})"><span class="habit-name truncate" onclick="toggleText(this, event)">${habit.name}</span><span class="habit-streak"><i class="fas fa-fire"></i> ${streak} Tage Streak</span></div>${actionHTML}<div class="action-btns"><button class="icon-btn edit-btn" onclick="openModal(${habit.id})"><i class="fas fa-pen"></i></button><button class="icon-btn delete-btn" onclick="deleteHabit(${habit.id})"><i class="fas fa-trash"></i></button></div>`;
    } else {
        const count = getCurrentPeriodCount(habit); let badgeClass = ""; let icon = "📈";
        if (count > habit.target) { badgeClass = "overachiever"; icon = "🔥"; } else if (count === habit.target) { badgeClass = "done"; icon = "✅"; }  
        actionHTML = `<div class="counter-badge ${badgeClass}" onclick="toggleHabit(${habit.id})">${count} / ${habit.target} ${icon}</div>`;
        div.innerHTML = `<div class="habit-info" onclick="toggleHabit(${habit.id})"><span class="habit-name truncate" onclick="toggleText(this, event)">${habit.name}</span><span class="habit-streak" style="color: ${isDoneToday ? 'var(--accent)' : 'var(--text-muted)'};">${isDoneToday ? 'Erledigt! 🙌' : 'Noch offen'}</span></div>${actionHTML}<div class="action-btns"><button class="icon-btn edit-btn" onclick="openModal(${habit.id})"><i class="fas fa-pen"></i></button><button class="icon-btn delete-btn" onclick="deleteHabit(${habit.id})"><i class="fas fa-trash"></i></button></div>`;
    }
    return div;
}

function renderWeek() {
    const dates = getPastDates(7); let html = `<div class="week-grid">`;
    habits.forEach(habit => {
        html += `<div class="week-row"><div class="week-name truncate" onclick="toggleText(this, event)">${habit.name}</div><div class="week-days">`;
        dates.forEach(date => { const isDone = history[date]?.[habit.id] || false; const dayChar = new Date(date).toLocaleDateString('de-DE', {weekday: 'short'}).charAt(0); html += `<div class="day-circle ${isDone ? 'done' : ''}">${dayChar}</div>`; });
        html += `</div></div>`;
    }); html += `</div>`; appContent.innerHTML = html;
}

// ===== PROGRESS & CHART =====
function renderProgress() {
    if (progressChart) { progressChart.destroy(); progressChart = null; }
    
    // 🔥 NEU: Die KI Analyse (Insights) dauerhaft im Fortschritt-Tab!
    let primeDay = getBestWeekday();
    
    let html = `
        <div class="section-title" style="margin-top:0;">🧠 Deep Insights</div>
        <div class="coach-banner" style="margin-bottom: 20px;">
            <div class="coach-icon">📊</div>
            <div class="coach-text">Dein stärkster Wochentag ist aktuell der <strong>${primeDay}</strong>. Da lieferst du richtig ab!</div>
        </div>

        <div class="section-title">📊 Gesamt-Trend</div>
        <div class="stat-filters"><button class="stat-filter-btn ${currentChartFilter === 'week' ? 'active' : ''}" onclick="setChartFilter('week', event)">Woche</button><button class="stat-filter-btn ${currentChartFilter === 'month' ? 'active' : ''}" onclick="setChartFilter('month', event)">Monat</button><button class="stat-filter-btn ${currentChartFilter === 'year' ? 'active' : ''}" onclick="setChartFilter('year', event)">Jahr</button><button class="stat-filter-btn ${currentChartFilter === 'all' ? 'active' : ''}" onclick="setChartFilter('all', event)">Alles</button></div>
        <div class="chart-container"><canvas id="progressChart"></canvas></div>
        <div class="section-title">📅 Aktivitäts-Historie & Tagebuch</div><div id="calendarContainer" class="calendar-container"></div>
        <div class="section-title">📈 Detaillierter Fortschritt</div>
        <div class="stat-filters"><button class="stat-filter-btn ${currentStatFilter === 'week' ? 'active' : ''}" onclick="setStatFilter('week', event)">Woche</button><button class="stat-filter-btn ${currentStatFilter === 'month' ? 'active' : ''}" onclick="setStatFilter('month', event)">Monat</button><button class="stat-filter-btn ${currentStatFilter === 'year' ? 'active' : ''}" onclick="setStatFilter('year', event)">Jahr</button><button class="stat-filter-btn ${currentStatFilter === 'all' ? 'active' : ''}" onclick="setStatFilter('all', event)">Alles</button></div>
        <div id="indivStatsList"></div>
    `;
    appContent.innerHTML = html; renderChart(); renderCalendarHeatmap(); renderIndivStats();
}

function setChartFilter(filter, event) {
    currentChartFilter = filter; const buttons = event.target.parentElement.querySelectorAll('.stat-filter-btn'); buttons.forEach(btn => btn.classList.remove('active')); event.target.classList.add('active'); renderChart();
}

function renderChart() {
    let days = 7; let isLongTerm = false;
    if (currentChartFilter === 'month') days = 30; 
    if (currentChartFilter === 'year') { days = 365; isLongTerm = true; }
    if (currentChartFilter === 'all') { 
        const diffTime = Math.abs(new Date() - new Date(appStartDate)); 
        days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; 
        if (days < 7) days = 7; 
        if (days > 90) isLongTerm = true; 
    }

    const dates = getPastDates(days); const dailyHabits = habits.filter(h => h.type === 'daily');
    const dailyPercentages = dates.map(date => {
        if (dayStatusList[date] === 'sick' || dayStatusList[date] === 'vacation') return null; 
        const dayHist = history[date] || {}; if (dailyHabits.length === 0) return 0;
        let done = 0; dailyHabits.forEach(h => { if (dayHist[h.id]) done++; }); 
        return Math.round((done / dailyHabits.length) * 100);
    });

    let finalLabels = []; let finalData = [];
    if (isLongTerm) {
        for (let i = 0; i < dates.length; i += 7) {
            let chunkData = dailyPercentages.slice(i, i + 7).filter(val => val !== null);
            if (chunkData.length === 0) finalData.push(null);
            else { let sum = chunkData.reduce((a, b) => a + b, 0); finalData.push(Math.round(sum / chunkData.length)); }
            let dObj = new Date(dates[i]); finalLabels.push(dObj.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' }));
        }
    } else {
        finalData = dailyPercentages;
        finalLabels = dates.map(d => { let dateObj = new Date(d); if (days <= 7) return dateObj.toLocaleDateString('de-DE', {weekday: 'short'}); return dateObj.toLocaleDateString('de-DE', {day: '2-digit', month: 'short'}); });
    }

    const ctx = document.getElementById('progressChart').getContext('2d');
    if (progressChart) { progressChart.destroy(); }
    
    // Holt sich dynamisch die Farbe vom gewählten Theme für das Diagramm!
    let accentColor = getComputedStyle(document.body).getPropertyValue('--accent').trim() || '#0ea5e9';
    let pRadius = isLongTerm ? 0 : 4; let pBorder = isLongTerm ? 0 : 2;

    progressChart = new Chart(ctx, { 
        type: 'line', data: { labels: finalLabels, datasets: [{ label: 'Erledigt (%)', data: finalData, borderColor: accentColor, backgroundColor: accentColor.replace('rgb', 'rgba').replace(')', ', 0.2)'), borderWidth: 3, fill: true, tension: 0.4, spanGaps: true, pointBackgroundColor: '#0f172a', pointBorderColor: accentColor, pointBorderWidth: pBorder, pointRadius: pRadius, pointHoverRadius: isLongTerm ? 4 : 6 }] }, 
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: 100, ticks: { color: '#94a3b8' } }, x: { ticks: { color: '#94a3b8', maxTicksLimit: isLongTerm ? 6 : 7, maxRotation: 0 } } }, plugins: { legend: { display: false } } } 
    });
}

function changeCalendarMonth(offset) { currentCalendarDate.setMonth(currentCalendarDate.getMonth() + offset); renderCalendarHeatmap(); }

function renderCalendarHeatmap() {
    const container = document.getElementById("calendarContainer"); if (!container) return;
    const year = currentCalendarDate.getFullYear(); const month = currentCalendarDate.getMonth();
    const monthNames = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
    const firstDay = new Date(year, month, 1); const lastDay = new Date(year, month + 1, 0); const daysInMonth = lastDay.getDate();
    let startDayOfWeek = (firstDay.getDay() - 1 + 7) % 7; 

    let gridHtml = '';
    for(let i = 0; i < startDayOfWeek; i++) { gridHtml += `<div class="heatmap-box empty"></div>`; }

    const dailyHabits = habits.filter(h => h.type === 'daily'); const flexHabits = habits.filter(h => h.type !== 'daily');

    for(let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${year}-${String(month+1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const dayHist = history[dateStr] || {};
        let totalDoneToday = 0; habits.forEach(h => { if (dayHist[h.id]) totalDoneToday++; });

        let innerText = i; let boxClasses = ""; let crownHtml = "";
        let dotsHtml = notes[dateStr] ? `<div class="note-dots">...</div>` : '';
        
        if (dayStatusList[dateStr] === 'sick') { innerText = "🤒"; boxClasses = "lvl-0"; } 
        else if (dayStatusList[dateStr] === 'vacation') { innerText = "🏝️"; boxClasses = "lvl-0"; } 
        else {
            if (dateStr < getToday() && dateStr >= appStartDate && totalDoneToday === 0 && habits.length > 0) {
                innerText = "🤡"; boxClasses = "lvl-0";
            } else {
                let dailyDone = 0; dailyHabits.forEach(h => { if (dayHist[h.id]) dailyDone++; });
                let percent = dailyHabits.length === 0 ? 0 : (dailyDone / dailyHabits.length) * 100;
                let lvl = 0; 
                if (percent >= 100 && dailyHabits.length > 0) lvl = 4;
                else if (percent >= 75) lvl = 3; else if (percent >= 40) lvl = 2; else if (percent > 0) lvl = 1;

                boxClasses = `lvl-${lvl}`;

                let getsCrown = false; let getsDogEar = false;
                flexHabits.forEach(h => {
                    if (dayHist[h.id]) { let count = getCountForPeriodUpToDate(h, dateStr); if (count >= h.target) getsCrown = true; else getsDogEar = true; }
                });
                if (getsCrown) crownHtml = `<div class="crown-icon">👑</div>`;
                if (getsDogEar && !getsCrown) boxClasses += " dog-ear"; 
            }
        }
        gridHtml += `<div class="heatmap-box ${boxClasses}" onclick="openDiaryModal('${dateStr}')">${innerText}${crownHtml}${dotsHtml}</div>`;
    }
    container.innerHTML = `<div class="calendar-header"><button class="icon-btn" onclick="changeCalendarMonth(-1)"><i class="fas fa-chevron-left"></i></button><h3>${monthNames[month]} ${year}</h3><button class="icon-btn" onclick="changeCalendarMonth(1)"><i class="fas fa-chevron-right"></i></button></div><div class="calendar-weekdays"><span>Mo</span><span>Di</span><span>Mi</span><span>Do</span><span>Fr</span><span>Sa</span><span>So</span></div><div class="heatmap-grid">${gridHtml}</div>`;
}

// ===== MODALS =====
function openDiaryModal(dateStr) {
    const modal = document.getElementById("diaryModal"); document.getElementById("diaryDateTitle").textContent = formatDate(dateStr); document.getElementById("diaryDateHidden").value = dateStr; document.getElementById("diaryNoteInput").value = notes[dateStr] || "";
    tempDayStatus = dayStatusList[dateStr] || 'normal'; updateStatusUI();
    const dayHist = history[dateStr] || {}; let completedNames = []; habits.forEach(h => { if (dayHist[h.id]) completedNames.push(h.name); });
    const listEl = document.getElementById("diaryCompletedList");
    if (completedNames.length > 0) listEl.innerHTML = `<strong>Erledigt:</strong> ${completedNames.join(', ')} ✅`; else listEl.innerHTML = `<em>Nichts erledigt an diesem Tag.</em>`;
    modal.classList.remove("hidden");
}

function updateStatusUI() {
    document.getElementById("btnStatusNormal").classList.remove("active"); document.getElementById("btnStatusSick").classList.remove("active"); document.getElementById("btnStatusVacation").classList.remove("active");
    if (tempDayStatus === 'sick') document.getElementById("btnStatusSick").classList.add("active"); else if (tempDayStatus === 'vacation') document.getElementById("btnStatusVacation").classList.add("active"); else document.getElementById("btnStatusNormal").classList.add("active");
}

function closeDiaryModal() { document.getElementById("diaryModal").classList.add("hidden"); }

function saveDiaryNote() {
    const dateStr = document.getElementById("diaryDateHidden").value; const noteText = document.getElementById("diaryNoteInput").value.trim();
    if (noteText) notes[dateStr] = noteText; else delete notes[dateStr];
    if (tempDayStatus !== 'normal') dayStatusList[dateStr] = tempDayStatus; else delete dayStatusList[dateStr];
    localStorage.setItem("notes", JSON.stringify(notes)); localStorage.setItem("dayStatusList", JSON.stringify(dayStatusList));
    closeDiaryModal(); renderCalendarHeatmap(); renderToday(); if(progressChart) renderChart();
}

function setStatFilter(filter, event) { currentStatFilter = filter; document.querySelectorAll('.stat-filter-btn').forEach(btn => btn.classList.remove('active')); event.target.classList.add('active'); renderIndivStats(); }
function renderIndivStats() {
    const container = document.getElementById("indivStatsList"); if (!container) return;
    if (habits.length === 0) { container.innerHTML = `<p style="color:var(--text-muted); font-size:14px;">Keine Daten.</p>`; return; }
    let html = '';
    habits.forEach(habit => {
        const stats = getProgressStats(habit, currentStatFilter); let fillClass = ""; let textStyle = "color: var(--accent);";
        if (stats.percent > 100) { fillClass = "overachiever"; textStyle = "color: var(--gold); font-weight: 800;"; }
        else if (stats.percent === 100) { fillClass = "perfect"; textStyle = "color: var(--success);"; }
        html += `<div class="stat-item"><div class="stat-header"><span class="truncate" style="max-width: 60%;" onclick="toggleText(this, event)">${habit.name}</span><span>${stats.done} / ${stats.target} <span style="${textStyle}">(${stats.percent}%)</span></span></div><div class="stat-bar-bg"><div class="stat-bar-fill ${fillClass}" style="width: ${Math.min(stats.percent, 100)}%;"></div></div></div>`;
    });
    container.innerHTML = html;
}
function getProgressStats(habit, timeframe) {
    let days = 7; if (timeframe === 'month') days = 30; if (timeframe === 'year') days = 365;
    if (timeframe === 'all') { const allDates = Object.keys(history).sort(); if (allDates.length > 0) { days = Math.ceil(Math.abs(new Date() - new Date(allDates[0])) / (1000 * 60 * 60 * 24)) + 1; } else { days = 1; } }
    const datesToScan = getPastDates(days); let doneCount = 0; datesToScan.forEach(d => { if (history[d] && history[d][habit.id]) doneCount++; });
    let targetTotal = 1; if (habit.type === 'daily') targetTotal = days; else if (habit.type === 'weekly') targetTotal = Math.ceil((days / 7) * habit.target); else if (habit.type === 'monthly') targetTotal = Math.ceil((days / 30) * habit.target); else if (habit.type === 'yearly') targetTotal = Math.ceil((days / 365) * habit.target);
    const cappedTarget = targetTotal === 0 ? 1 : targetTotal; let percent = Math.round((doneCount / cappedTarget) * 100);
    return { done: doneCount, target: cappedTarget, percent };
}

function calculateStreak(habitId, fromDateStr) {
    let streak = 0; let d = new Date(fromDateStr); 
    while (true) {
        const dateStr = d.toISOString().split("T")[0];
        if (dayStatusList[dateStr] === 'sick' || dayStatusList[dateStr] === 'vacation') { d.setDate(d.getDate() - 1); continue; }
        if (history[dateStr] && history[dateStr][habitId]) { streak++; d.setDate(d.getDate() - 1); } 
        else if (dateStr === fromDateStr) { d.setDate(d.getDate() - 1); } 
        else { break; }
    }
    return streak;
}

function openModal(editId = null) {
    const modal = document.getElementById("addModal"); const title = document.getElementById("modalTitle"); const nameInput = document.getElementById("habitName"); const typeSelect = document.getElementById("habitType"); const targetInput = document.getElementById("habitTarget"); const idInput = document.getElementById("editHabitId");
    if (editId) { const habit = habits.find(h => h.id === editId); title.textContent = "Gewohnheit bearbeiten"; nameInput.value = habit.name; typeSelect.value = habit.type || 'daily'; targetInput.value = habit.target || 1; idInput.value = habit.id; } 
    else { title.textContent = "Neue Gewohnheit"; nameInput.value = ""; typeSelect.value = "daily"; targetInput.value = 3; idInput.value = ""; }
    toggleTargetInput(); modal.classList.remove("hidden"); nameInput.focus();
}
function toggleTargetInput() { const type = document.getElementById("habitType").value; const wrapper = document.getElementById("targetWrapper"); if (type === 'daily') wrapper.classList.add("hidden"); else wrapper.classList.remove("hidden"); }
function closeModal() { document.getElementById("addModal").classList.add("hidden"); }
function saveNewHabit() {
    const name = document.getElementById("habitName").value.trim(); const type = document.getElementById("habitType").value; const target = parseInt(document.getElementById("habitTarget").value) || 1; const editId = document.getElementById("editHabitId").value;
    if (!name) return alert("Bitte einen Namen eingeben!");
    if (editId) { const habit = habits.find(h => h.id == editId); if (habit) { habit.name = name; habit.type = type; habit.target = target; } } 
    else { habits.push({ id: Date.now(), name: name, type: type, target: target }); }
    localStorage.setItem("habits", JSON.stringify(habits)); closeModal(); init();
}

function openSettingsModal() { document.getElementById("settingsModal").classList.remove("hidden"); }
function closeSettingsModal() { document.getElementById("settingsModal").classList.add("hidden"); }

function exportData() {
    const dataObj = { habits, history, notes, dayStatusList, appStartDate };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataObj));
    const downloadAnchorNode = document.createElement('a'); downloadAnchorNode.setAttribute("href", dataStr); downloadAnchorNode.setAttribute("download", "habit-tracker-backup.json");
    document.body.appendChild(downloadAnchorNode); downloadAnchorNode.click(); downloadAnchorNode.remove();
}
function importData(event) {
    const file = event.target.files[0]; if (!file) return; const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            if(importedData.habits && importedData.history) {
                localStorage.setItem("habits", JSON.stringify(importedData.habits)); localStorage.setItem("history", JSON.stringify(importedData.history));
                if(importedData.notes) localStorage.setItem("notes", JSON.stringify(importedData.notes));
                if(importedData.dayStatusList) localStorage.setItem("dayStatusList", JSON.stringify(importedData.dayStatusList));
                if(importedData.appStartDate) localStorage.setItem("appStartDate", importedData.appStartDate);
                alert("Backup erfolgreich geladen! 🎉"); location.reload();
            } else { alert("Fehler: Ungültige Backup-Datei."); }
        } catch(error) { alert("Fehler beim Lesen der Datei."); }
    }; reader.readAsText(file);
}

init();
