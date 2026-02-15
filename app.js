const habits = [];

const dateEl = document.getElementById("date");
const goalEl = document.getElementById("dailyGoal");
const listEl = document.getElementById("habitList");

dateEl.textContent = new Date().toLocaleDateString();

document.getElementById("addBtn").onclick = () => {
    const name = prompt("Name der Gewohnheit:");
    if (!name) return;

    habits.push({ name, done: false });
    render();
};

function toggleHabit(index) {
    habits[index].done = !habits[index].done;
    render();
}

function render() {
    listEl.innerHTML = "";

    let doneCount = 0;

    habits.forEach((h, i) => {
        if (h.done) doneCount++;

        const div = document.createElement("div");
        div.className = "habit";

        div.innerHTML = `
            <span>${h.name}</span>
            <input type="checkbox" ${h.done ? "checked" : ""} onclick="toggleHabit(${i})">
        `;

        listEl.appendChild(div);
    });

    goalEl.textContent = `Heute erledigt: ${doneCount} / ${habits.length}`;
}
