let habits = JSON.parse(localStorage.getItem("habits")) || [];

const dateEl = document.getElementById("date");
const goalEl = document.getElementById("dailyGoal");
const listEl = document.getElementById("habitList");

let view = "day";

const today = new Date().toISOString().split("T")[0];
dateEl.textContent = new Date().toLocaleDateString();

function setView(v) {
    view = v;
    render();
}

document.getElementById("addBtn").onclick = () => {
    const name = prompt("Name der Gewohnheit:");
    if (!name) return;

    habits.push({
        name,
        history: {}
    });

    save();
    render();
};

function toggleHabit(index, date = today) {
    const h = habits[index];
    h.history[date] = !h.history[date];

    save();
    render();
}

function save() {
    localStorage.setItem("habits", JSON.stringify(habits));
}

function render() {
    listEl.innerHTML = "";

    if (view === "day") renderDay();
    if (view === "week") renderWeek();
    if (view === "progress") renderProgress();
}

function renderDay() {
    let doneCount = 0;

    habits.forEach((h, i) => {
        const done = h.history[today];
        if (done) doneCount++;

        const div = document.createElement("div");
        div.className = "habit";

        div.innerHTML = `
            <span onclick="toggleHabit(${i})">${h.name}</span>
            <input type="checkbox" ${done ? "checked" : ""} onclick="toggleHabit(${i})">
        `;

        listEl.appendChild(div);
    });

    goalEl.textContent = `Heute erledigt: ${doneCount} / ${habits.length}`;
}

function renderWeek() {
    goalEl.textContent = "Letzte 7 Tage";

    const days = [];

    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(d.toISOString().split("T")[0]);
    }

    habits.forEach((h, i) => {
        const div = document.createElement("div");
        div.className = "habit";

        let row = `<span>${h.name}</span>`;

        days.forEach(d => {
            const done = h.history[d];
            row += `
                <input type="checkbox"
                ${done ? "checked" : ""}
                onclick="toggleHabit(${i}, '${d}')">
            `;
        });

        div.innerHTML = row;
        listEl.appendChild(div);
    });
}

function renderProgress() {
    goalEl.textContent = "Fortschritt";

    habits.forEach(h => {
        const div = document.createElement("div");
        div.className = "habit";

        const percent = calculatePercent(h);
        const streak = calculateStreak(h);

        div.innerHTML = `
            <span>${h.name}</span>
            <span>${percent}% | 🔥 ${streak}</span>
        `;

        listEl.appendChild(div);
    });

    const total = calculateTotal();
    const totalDiv = document.createElement("div");
    totalDiv.className = "habit";
    totalDiv.innerHTML = `<b>Gesamt</b> <b>${total}%</b>`;
    listEl.appendChild(totalDiv);
}

function calculatePercent(h) {
    const dates = Object.keys(h.history);
    if (dates.length === 0) return 0;

    const done = dates.filter(d => h.history[d]).length;
    return Math.round((done / dates.length) * 100);
}

function calculateStreak(h) {
    let streak = 0;
    let d = new Date();

    while (true) {
        const key = d.toISOString().split("T")[0];
        if (h.history[key]) {
            streak++;
            d.setDate(d.getDate() - 1);
        } else break;
    }

    return streak;
}

function calculateTotal() {
    let sum = 0;
    habits.forEach(h => sum += calculatePercent(h));
    return habits.length ? Math.round(sum / habits.length) : 0;
}

render();
