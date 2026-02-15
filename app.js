let habits = JSON.parse(localStorage.getItem("habits")) || [];

const dateEl = document.getElementById("date");
const goalEl = document.getElementById("dailyGoal");
const listEl = document.getElementById("habitList");

const today = new Date().toISOString().split("T")[0];
dateEl.textContent = new Date().toLocaleDateString();

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

function toggleHabit(index) {
    const h = habits[index];

    h.history[today] = !h.history[today];

    save();
    render();
}

function save() {
    localStorage.setItem("habits", JSON.stringify(habits));
}

function render() {
    listEl.innerHTML = "";

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

render();
