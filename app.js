// ===== DATEN LADEN =====

let habits = JSON.parse(localStorage.getItem("habits")) || [];
let history = JSON.parse(localStorage.getItem("history")) || {};

const habitsContainer = document.getElementById("habits");
const addBtn = document.getElementById("addBtn");

// 👉 PLUS BUTTON VERBINDEN
addBtn.onclick = addHabit;

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

  Object.keys(history).forEach(date => {
    delete history[date][habitId];
  });

  localStorage.setItem("history", JSON.stringify(history));
  saveHabits();
  renderHabits();
}

// ===== START =====

renderHabits();
