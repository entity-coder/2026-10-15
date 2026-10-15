// SGPA Calc — semester result calculator + target-SGPA planner.
// Plain JS, no dependencies. State is persisted to localStorage.
//
// Assumptions (clearly labeled in the UI):
// - Standard Indian 10-point grading scale. Universities differ, so two
//   common marks->grade presets are provided and each row also accepts a
//   grade letter directly.
// - Marks are on a 0-100 scale.

"use strict";

// ---- Grade scales ----------------------------------------------------------
// Ordered from best to worst. `minMarks` is the lower bound (inclusive).
const SCALES = {
  standard40: [
    { grade: "O",  points: 10, minMarks: 90 },
    { grade: "A+", points: 9,  minMarks: 80 },
    { grade: "A",  points: 8,  minMarks: 70 },
    { grade: "B+", points: 7,  minMarks: 60 },
    { grade: "B",  points: 6,  minMarks: 50 },
    { grade: "C",  points: 5,  minMarks: 45 },
    { grade: "P",  points: 4,  minMarks: 40 },
    { grade: "F",  points: 0,  minMarks: 0 },
  ],
  standard35: [
    { grade: "O",  points: 10, minMarks: 90 },
    { grade: "A+", points: 9,  minMarks: 80 },
    { grade: "A",  points: 8,  minMarks: 70 },
    { grade: "B+", points: 7,  minMarks: 60 },
    { grade: "B",  points: 6,  minMarks: 50 },
    { grade: "C",  points: 5,  minMarks: 40 },
    { grade: "P",  points: 4,  minMarks: 35 },
    { grade: "F",  points: 0,  minMarks: 0 },
  ],
};

const GRADE_OPTIONS = ["O", "A+", "A", "B+", "B", "C", "P", "F"];
const STORAGE_KEY = "sgpaCalc.v1";

function marksToScale(marks, preset) {
  const scale = SCALES[preset] || SCALES.standard40;
  const m = Math.max(0, Math.min(100, Number(marks)));
  if (Number.isNaN(m)) return null;
  for (const band of scale) {
    if (m >= band.minMarks) return band;
  }
  return scale[scale.length - 1];
}

function gradeToPoints(grade, preset) {
  const scale = SCALES[preset] || SCALES.standard40;
  const hit = scale.find((b) => b.grade === grade);
  return hit ? hit.points : null;
}

// ---- State -----------------------------------------------------------------
let state = {
  inputMode: "marks",        // "marks" | "grade"
  scalePreset: "standard40",
  subjects: [],              // { name, credits, value }
};

function sampleSubjects() {
  return [
    { name: "Data Structures",      credits: 4, value: "82" },
    { name: "DBMS",                 credits: 4, value: "74" },
    { name: "Operating Systems",    credits: 3, value: "B+" },
    { name: "Web Lab",              credits: 2, value: "91" },
    { name: "Maths IV",             credits: 4, value: "58" },
  ];
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      inputMode: state.inputMode,
      scalePreset: state.scalePreset,
      subjects: state.subjects,
      targetSgpa: document.getElementById("targetSgpa").value,
      remainingCredits: document.getElementById("remainingCredits").value,
    }));
  } catch (e) { /* storage full/blocked — app still works this session */ }
}

function loadState() {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch (e) { /* ignore */ }
  if (saved && Array.isArray(saved.subjects)) {
    state.inputMode = saved.inputMode === "grade" ? "grade" : "marks";
    state.scalePreset = SCALES[saved.scalePreset] ? saved.scalePreset : "standard40";
    state.subjects = saved.subjects;
    if (saved.targetSgpa) document.getElementById("targetSgpa").value = saved.targetSgpa;
    if (saved.remainingCredits) document.getElementById("remainingCredits").value = saved.remainingCredits;
  } else {
    state.subjects = sampleSubjects();
  }
  document.getElementById("inputMode").value = state.inputMode;
  document.getElementById("scalePreset").value = state.scalePreset;
}

// ---- Rendering -------------------------------------------------------------
const listEl = document.getElementById("subjectList");

function gradePointFor(subject) {
  if (state.inputMode === "grade") {
    return gradeToPoints(String(subject.value).trim().toUpperCase(), state.scalePreset);
  }
  const band = marksToScale(subject.value, state.scalePreset);
  return band ? band.points : null;
}

function gradeLetterFor(subject) {
  if (state.inputMode === "grade") {
    return String(subject.value).trim().toUpperCase() || "–";
  }
  const band = marksToScale(subject.value, state.scalePreset);
  return band ? band.grade : "–";
}

function renderRows() {
  listEl.innerHTML = "";
  if (state.subjects.length === 0) {
    const p = document.createElement("p");
    p.className = "empty-note";
    p.textContent = "No subjects yet — add one to start calculating.";
    listEl.appendChild(p);
    return;
  }

  state.subjects.forEach((subject, idx) => {
    const row = document.createElement("div");
    row.className = "subject-row";

    // Name
    const nameWrap = document.createElement("div");
    nameWrap.className = "field name";
    const nameLabel = document.createElement("label");
    nameLabel.textContent = "Subject";
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.placeholder = "e.g. DBMS";
    nameInput.value = subject.name;
    nameInput.addEventListener("input", () => { subject.name = nameInput.value; saveState(); });
    nameWrap.append(nameLabel, nameInput);

    // Credits
    const creditWrap = document.createElement("div");
    creditWrap.className = "field credits";
    const creditLabel = document.createElement("label");
    creditLabel.textContent = "Credits";
    const creditInput = document.createElement("input");
    creditInput.type = "number";
    creditInput.min = "0";
    creditInput.step = "0.5";
    creditInput.value = subject.credits;
    creditInput.addEventListener("input", () => {
      subject.credits = creditInput.value;
      recalc(); saveState();
    });
    creditWrap.append(creditLabel, creditInput);

    // Score (marks input or grade select, depending on global mode)
    const scoreWrap = document.createElement("div");
    scoreWrap.className = "field score";
    const scoreLabel = document.createElement("label");
    scoreLabel.textContent = state.inputMode === "grade" ? "Grade" : "Marks";
    let scoreInput;
    if (state.inputMode === "grade") {
      scoreInput = document.createElement("select");
      const blank = document.createElement("option");
      blank.value = "";
      blank.textContent = "—";
      scoreInput.appendChild(blank);
      GRADE_OPTIONS.forEach((g) => {
        const opt = document.createElement("option");
        opt.value = g; opt.textContent = g;
        if (subject.value === g) opt.selected = true;
        scoreInput.appendChild(opt);
      });
    } else {
      scoreInput = document.createElement("input");
      scoreInput.type = "number";
      scoreInput.min = "0";
      scoreInput.max = "100";
      scoreInput.step = "0.5";
      scoreInput.placeholder = "0–100";
      scoreInput.value = subject.value;
    }
    scoreInput.addEventListener("input", () => { subject.value = scoreInput.value; recalc(); saveState(); });
    scoreInput.addEventListener("change", () => { subject.value = scoreInput.value; recalc(); saveState(); });
    scoreWrap.append(scoreLabel, scoreInput);

    // Computed grade-point badge
    const gpWrap = document.createElement("div");
    gpWrap.className = "gp-wrap";
    const gpLabel = document.createElement("label");
    gpLabel.className = "field";
    gpLabel.textContent = "GP";
    const gp = document.createElement("span");
    gp.className = "gp-badge";
    const points = gradePointFor(subject);
    if (points === null) {
      gp.textContent = "–";
    } else {
      gp.textContent = points;
      gp.classList.add(points > 0 ? "pass" : "fail");
    }
    gpWrap.append(gpLabel, gp);

    // Remove button
    const removeWrap = document.createElement("div");
    removeWrap.className = "remove-wrap";
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "danger-btn";
    removeBtn.textContent = "✕";
    removeBtn.title = "Remove subject";
    removeBtn.addEventListener("click", () => {
      state.subjects.splice(idx, 1);
      renderRows(); recalc(); saveState();
    });
    removeWrap.appendChild(removeBtn);

    row.append(nameWrap, creditWrap, scoreWrap, gpWrap, removeWrap);
    listEl.appendChild(row);
  });
}

// ---- SGPA ------------------------------------------------------------------
function totals() {
  let points = 0;
  let credits = 0;
  for (const s of state.subjects) {
    const gp = gradePointFor(s);
    const c = Number(s.credits);
    if (gp === null || Number.isNaN(c) || c <= 0) continue;
    points += c * gp;
    credits += c;
  }
  return { points, credits };
}

function recalc() {
  // Re-render only the badges + result, not the whole list, so typing isn't interrupted.
  const badges = listEl.querySelectorAll(".gp-badge");
  state.subjects.forEach((s, i) => {
    const points = gradePointFor(s);
    const badge = badges[i];
    if (!badge) return;
    badge.className = "gp-badge";
    if (points === null) {
      badge.textContent = "–";
    } else {
      badge.textContent = points;
      badge.classList.add(points > 0 ? "pass" : "fail");
    }
  });

  const { points, credits } = totals();
  const valueEl = document.getElementById("sgpaValue");
  const detailEl = document.getElementById("sgpaDetail");
  if (credits === 0) {
    valueEl.textContent = "—";
    detailEl.textContent = "Enter credits and scores to see your SGPA.";
  } else {
    valueEl.textContent = (points / credits).toFixed(2);
    detailEl.textContent =
      `${points.toFixed(1)} grade points ÷ ${credits} credits` +
      (state.subjects.some((s) => gradePointFor(s) === 0)
        ? " — one or more subjects are failing (F), clear them to improve SGPA."
        : "");
  }
  // Any change to the table invalidates the planner answer.
  document.getElementById("planResult").hidden = true;
}

// ---- Scale table ------------------------------------------------------------
function renderScaleTable() {
  const el = document.getElementById("scaleTable");
  const scale = SCALES[state.scalePreset];
  el.textContent = "Marks → grade: " +
    scale.map((b) => `${b.grade} (${b.points}): ${b.minMarks}+`).join("  •  ");
}

// ---- Planner ----------------------------------------------------------------
function plan() {
  const target = Number(document.getElementById("targetSgpa").value);
  const remaining = Number(document.getElementById("remainingCredits").value);
  const { points, credits } = totals();
  const box = document.getElementById("planResult");
  box.hidden = false;
  box.classList.remove("impossible");

  if (Number.isNaN(target) || target < 0 || target > 10) {
    box.classList.add("impossible");
    box.textContent = "Enter a target SGPA between 0 and 10.";
    return;
  }
  if (Number.isNaN(remaining) || remaining <= 0) {
    box.classList.add("impossible");
    box.textContent = "Enter how many credits are still remaining.";
    return;
  }
  if (credits === 0 && state.subjects.length === 0) {
    box.textContent = "Add your completed subjects first — the planner needs your current total.";
    return;
  }

  const totalCredits = credits + remaining;
  // Average grade point needed across the remaining credits:
  // target = (points + needed * remaining) / totalCredits
  const needed = (target * totalCredits - points) / remaining;

  if (needed > 10) {
    box.classList.add("impossible");
    box.innerHTML =
      `Even a perfect 10 in every remaining subject only reaches ` +
      `<strong>${((points + 10 * remaining) / totalCredits).toFixed(2)}</strong>. ` +
      `That target isn't possible this semester — aim a little lower.`;
  } else if (needed <= 0) {
    box.innerHTML =
      `Good news — your current <strong>${(points / credits).toFixed(2)}</strong> already secures ` +
      `the target. You just need to not fail anything.`;
  } else {
    // Map the needed average to the closest grade letter on the current scale.
    const scale = SCALES[state.scalePreset];
    const letter = scale.find((b) => needed <= b.points)?.grade ?? "F";
    box.innerHTML =
      `You need an average of <strong>${needed.toFixed(2)}</strong> grade points ` +
      `across the remaining ${remaining} credits — roughly a <strong>${letter}</strong> ` +
      `in every subject, on average.`;
  }
  saveState();
}

// ---- Events -----------------------------------------------------------------
document.getElementById("addSubjectBtn").addEventListener("click", () => {
  state.subjects.push({ name: "", credits: 3, value: "" });
  renderRows(); recalc(); saveState();
});

document.getElementById("clearBtn").addEventListener("click", () => {
  state.subjects = [];
  renderRows(); recalc(); saveState();
});

document.getElementById("loadSampleBtn").addEventListener("click", () => {
  state.subjects = sampleSubjects();
  renderRows(); recalc(); saveState();
});

document.getElementById("inputMode").addEventListener("change", (e) => {
  // Switching mode resets per-row values since marks and grades aren't comparable.
  state.inputMode = e.target.value;
  state.subjects.forEach((s) => { s.value = ""; });
  renderRows(); recalc(); saveState();
});

document.getElementById("scalePreset").addEventListener("change", (e) => {
  state.scalePreset = e.target.value;
  renderRows(); recalc(); renderScaleTable(); saveState();
});

document.getElementById("showScaleBtn").addEventListener("click", () => {
  const el = document.getElementById("scaleTable");
  el.hidden = !el.hidden;
});

document.getElementById("planBtn").addEventListener("click", plan);
document.getElementById("targetSgpa").addEventListener("input", saveState);
document.getElementById("remainingCredits").addEventListener("input", saveState);

// ---- Init -------------------------------------------------------------------
loadState();
renderScaleTable();
renderRows();
recalc();
