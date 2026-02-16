// ===== DATEN LADEN =====

let habits = JSON.parse(localStorage.getItem("habits")) || [];
let history = JSON.parse(localStorage.getItem("history")) || {};

const habitsContainer = document.getElementById("habits");
const progressBtn = document.getElementById("progressBtn");
const progressScreen = document.getElementById("progressScreen");
const backBtn = document.getElementById("backBtn");

// ===== HEUTIGES DATUM =====

function todayKey() {
  return new Date().toISOString().split("T")[0];
}

// ===== GEWOHNHEIT HINZUFÜGEN =====

function addHabit() {
  const name = prompt("Name der Gewohnheit:");
  if (!name) return;

  const perWeek = parseInt(prompt("Wie oft pro Woche?"), 10) || 7;

  const habit = {
    id: Date.now(),
    name,
    perWeek
  };

  habits.push(habit);
  saveHabits();
  renderHabits();
}

function saveHabits() {
  localStorage.setItem("habits", JSON.stringify(habits));
}

// ===== ABHAKEN =====

function toggleHabit(habitId) {
  const today = todayKey();

  if (!history[today]) history[today] = {};

  history[today][habitId] = !history[today][habitId];

  localStorage.setItem("history", JSON.stringify(history));
  renderHabits();
}

// ===== GEWOHNHEITEN ANZEIGEN =====

function renderHabits() {
  habitsContainer.innerHTML = "";

  habits.forEach(habit => {
    const habitDiv = document.createElement("div");
    habitDiv.className = "habit";

    const name = document.createElement("span");
    name.textContent = habit.name;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";

    const today = todayKey();
    checkbox.checked = history[today]?.[habit.id] || false;

    checkbox.onclick = () => toggleHabit(habit.id);

    habitDiv.appendChild(name);
    habitDiv.appendChild(checkbox);

    // ===== LONG PRESS FÜR LÖSCHEN =====

    let pressTimer;

    habitDiv.addEventListener("mousedown", startPress);
    habitDiv.addEventListener("touchstart", startPress);

    habitDiv.addEventListener("mouseup", cancelPress);
    habitDiv.addEventListener("mouseleave", cancelPress);
    habitDiv.addEventListener("touchend", cancelPress);

    function startPress() {
      pressTimer = setTimeout(() => {
        enterDeleteMode(habitDiv, habit.id);
      }, 600);
    }

    function cancelPress() {
      clearTimeout(pressTimer);
    }

    habitsContainer.appendChild(habitDiv);
  });
}

// ===== DELETE MODE =====

function enterDeleteMode(habitDiv, habitId) {
  habitDiv.classList.add("delete-mode");

  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "🗑️";
  deleteBtn.className = "delete-btn";

  deleteBtn.onclick = () => {
    if (confirm("Gewohnheit wirklich löschen?")) {
      deleteHabit(habitId);
    }
  };

  habitDiv.appendChild(deleteBtn);
}

// ===== GEWOHNHEIT LÖSCHEN =====

function deleteHabit(habitId) {
  habits = habits.filter(h => h.id !== habitId);

  // Auch aus History entfernen
  Object.keys(history).forEach(date => {
    delete history[date][habitId];
  });

  localStorage.setItem("history", JSON.stringify(history));
  saveHabits();
  renderHabits();
}

// ===== FORTSCHRITT =====

function calculateProgress() {
  const days = Object.keys(history).slice(-7);

  let totalDone = 0;
  let totalTarget = 0;

  habits.forEach(habit => {
    const targetPerWeek = habit.perWeek;

    let done = 0;

    days.forEach(day => {
      if (history[day]?.[habit.id]) done++;
    });

    totalDone += Math.min(done, targetPerWeek);
    totalTarget += targetPerWeek;
  });

  const percent = totalTarget === 0
    ? 0
    : Math.round((totalDone / totalTarget) * 100);

  return percent;
}

// ===== PROGRESS SCREEN =====

progressBtn.onclick = () => {
  document.getElementById("mainScreen").style.display = "none";
  progressScreen.style.display = "block";

  document.getElementById("progressPercent").textContent =
    calculateProgress() + "%";

  drawChart();
};

backBtn.onclick = () => {
  progressScreen.style.display = "none";
  document.getElementById("mainScreen").style.display = "block";
};

// ===== LINIENDIAGRAMM =====

function drawChart() {
  const canvas = document.getElementById("chart");
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const days = Object.keys(history).slice(-7);

  const values = days.map(day => {
    let done = 0;

    habits.forEach(habit => {
      if (history[day]?.[habit.id]) done++;
    });

    return habits.length === 0
      ? 0
      : Math.round((done / habits.length) * 100);
  });

  const stepX = canvas.width / 7;

  ctx.beginPath();
  ctx.moveTo(0, canvas.height);

  values.forEach((v, i) => {
    const x = i * stepX;
    const y = canvas.height - (v / 100) * canvas.height;
    ctx.lineTo(x, y);
  });

  ctx.lineTo(canvas.width, canvas.height);
  ctx.closePath();

  ctx.fillStyle = "rgba(173,216,230,0.5)";
  ctx.fill();

  // Linie oben
  ctx.beginPath();

  values.forEach((v, i) => {
    const x = i * stepX;
    const y = canvas.height - (v / 100) * canvas.height;

    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.strokeStyle = "#007bff";
  ctx.lineWidth = 2;
  ctx.stroke();
}

// ===== START =====

renderHabits();
