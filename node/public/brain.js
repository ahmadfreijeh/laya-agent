const filesEl = document.getElementById("files");
const editorEl = document.getElementById("editor");
const actionsEl = document.getElementById("actions");
const TYPE_NOTES = {
  choice: "Picks one label. Each label needs a short description of when it fits.",
  score: "A point on a scale. Put the steps in order, from low to high.",
  noul: "Yes or no. This one has no labels.",
};
let files = [];
let draft = blankDraft();
let loadedKey = "";
let baseline = fingerprint();
let openKeys = new Set(["always", "followups"]);

editorEl.addEventListener("input", onInput);
editorEl.addEventListener("change", onChange);
editorEl.addEventListener("click", onClick);
editorEl.addEventListener("submit", (event) => {
  event.preventDefault();
  save();
});
actionsEl.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (button && button.dataset.action === "delete" && !button.disabled) removeFile();
});
document.getElementById("new-set").addEventListener("click", () => {
  draft = blankDraft();
  loadedKey = "";
  baseline = fingerprint();
  openKeys = new Set(["always", "followups"]);
  render();
});
const jsonDialog = document.getElementById("json-dialog");
document.getElementById("json-close").addEventListener("click", () => jsonDialog.close());
jsonDialog.addEventListener("click", (event) => {
  if (event.target === jsonDialog) jsonDialog.close();
});
const confirmDialog = document.getElementById("confirm-dialog");
confirmDialog.addEventListener("click", (event) => {
  if (event.target === confirmDialog) confirmDialog.close();
});

loadFiles();

function askConfirm(message, okLabel, danger) {
  const ok = document.getElementById("confirm-ok");
  document.getElementById("confirm-text").textContent = message;
  ok.textContent = okLabel;
  ok.classList.toggle("danger", Boolean(danger));
  if (confirmDialog.open) confirmDialog.close();
  return new Promise((resolve) => {
    confirmDialog.addEventListener("close", () => resolve(confirmDialog.returnValue === "ok"), { once: true });
    confirmDialog.showModal();
  });
}

function widgetScript() {
  return document.querySelector('script[src="/widget.js"]');
}

function openTest(key) {
  const script = widgetScript();
  if (!script) return;
  script.dataset.key = key;
  script.dispatchEvent(new Event("relay-open"));
}

function blankQuestion() {
  return { id: "", type: "noul", instructions: "", criteria: [{ label: "", description: "" }] };
}

function blankDraft() {
  return {
    key: "",
    shortlist_k: 20,
    min_need_prob: 0.6,
    min_need_conf: 0.7,
    shared: [{ ...blankQuestion(), id: "need", type: "choice", instructions: "What is the customer asking support to do?" }],
    scenarios: [],
  };
}

async function loadFiles(selectKey) {
  const res = await fetch("/questions");
  const body = await res.json();
  if (!res.ok) {
    files = [];
    renderFiles();
    renderEditor(body.error || "Could not load brains");
    return;
  }
  files = body.files || [];
  renderFiles();
  if (selectKey) await openFile(selectKey);
  else if (!draft.key && files.some((file) => file.key === "default")) await openFile("default");
  else renderEditor();
}

async function openFile(key) {
  const res = await fetch("/questions/" + encodeURIComponent(key));
  const body = await res.json();
  if (!res.ok) {
    renderEditor(body.error || "Could not open that brain");
    return;
  }
  draft = fromFile(body.key, body.questions);
  loadedKey = body.key;
  baseline = fingerprint();
  openKeys = new Set(["always", "followups"]);
  render();
}

function render() {
  renderFiles();
  renderEditor();
}

function renderFiles() {
  filesEl.replaceChildren(
    ...files.map((file) => {
      const row = document.createElement("div");
      row.className = "file-row";
      const button = document.createElement("button");
      button.type = "button";
      button.className = "file";
      button.textContent = file.key;
      if (file.key === loadedKey) button.setAttribute("aria-current", "true");
      button.addEventListener("click", () => openFile(file.key));
      const json = document.createElement("button");
      json.type = "button";
      json.className = "json-open";
      json.textContent = "JSON";
      json.addEventListener("click", () => openJson(file.key));
      const test = document.createElement("button");
      test.type = "button";
      test.className = "test-open";
      test.setAttribute("aria-label", "Test this brain");
      test.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.2 18.2 4.8 20.5V7.4A2.4 2.4 0 0 1 7.2 5h9.6a2.4 2.4 0 0 1 2.4 2.4v8.4a2.4 2.4 0 0 1-2.4 2.4H7.2Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg><span class="tip">Test this brain</span>`;
      test.addEventListener("click", () => openTest(file.key));
      row.append(button, json, test);
      return row;
    }),
  );
}

async function openJson(key) {
  const title = document.getElementById("json-title");
  const body = document.getElementById("json-body");
  title.textContent = `${key}.json`;
  if (key === loadedKey) {
    try {
      body.textContent = JSON.stringify(toFile(draft).questions, null, 2);
    } catch (err) {
      body.textContent = err.message;
    }
  } else {
    const res = await fetch("/questions/" + encodeURIComponent(key));
    const payload = await res.json();
    body.textContent = res.ok ? JSON.stringify(payload.questions, null, 2) : payload.error || "Could not open that file";
  }
  document.getElementById("json-dialog").showModal();
}

function renderEditor(message) {
  const shared = draft.shared.map((question, index) => askBlock(question, "shared." + index, index)).join("");
  const scenarios = draft.scenarios
    .map((scenario, index) => {
      const asks = scenario.questions
        .map((question, questionIndex) =>
          askBlock(question, "scenarios." + index + ".questions." + questionIndex, questionIndex, index),
        )
        .join("");
      const title = scenario.trigger.trim() || "Follow-up";
      return `<details class="scenario" data-open="scenario.${index}" ${isOpen("scenario." + index)}>
        <summary><span class="grow">${esc(title)}</span></summary>
        <div class="body">
          <label>When need is<input data-path="scenarios.${index}.trigger" list="need-labels" value="${esc(scenario.trigger)}" /></label>
          ${asks}
          <button class="text" type="button" data-action="add-scenario-question" data-index="${index}">Add ask</button>
          <button class="danger" type="button" data-action="remove-scenario" data-index="${index}">Remove follow-up</button>
        </div>
      </details>`;
    })
    .join("");
  editorEl.innerHTML = `
    <label>Name<input data-path="key" value="${esc(draft.key)}" placeholder="support" /></label>
    <div class="sliders">
      ${slider("Shortlist", "shortlist_k", 1, 100, 1)}
      ${slider("Need probability", "min_need_prob", 0, 1, 0.05)}
      ${slider("Need confidence", "min_need_conf", 0, 1, 0.05)}
    </div>
    <p class="hint">Follow-ups run only when need clears both bars.</p>
    <details data-open="always" ${isOpen("always")}>
      <summary><span class="grow">Always</span><span class="count">${draft.shared.length}</span></summary>
      ${shared}
      <button class="text" type="button" data-action="add-shared">Add ask</button>
    </details>
    <details data-open="followups" ${isOpen("followups")}>
      <summary><span class="grow">Follow-ups</span><span class="count">${draft.scenarios.length}</span></summary>
      <datalist id="need-labels">${needLabels().map((label) => `<option value="${esc(label)}"></option>`).join("")}</datalist>
      ${scenarios}
      <button class="text" type="button" data-action="add-scenario">Add follow-up</button>
    </details>`;
  for (const details of editorEl.querySelectorAll("details")) {
    details.addEventListener("toggle", () => {
      if (details.open) openKeys.add(details.dataset.open);
      else openKeys.delete(details.dataset.open);
    });
  }
  refreshActions(message || "");
}

function slider(label, path, min, max, step) {
  const value = draft[path];
  return `<label class="slider"><span>${label}<output>${formatSlider(path, value)}</output></span>
    <input data-path="${path}" type="range" min="${min}" max="${max}" step="${step}" value="${esc(value)}" /></label>`;
}

function askBlock(question, path, index, scenarioIndex) {
  const remove =
    scenarioIndex == null
      ? `<button class="danger" type="button" data-action="remove-shared" data-index="${index}">Remove</button>`
      : `<button class="danger" type="button" data-action="remove-scenario-question" data-scenario="${scenarioIndex}" data-index="${index}">Remove</button>`;
  const title = question.id.trim() || "New ask";
  const criteria =
    question.type === "noul"
      ? ""
      : `<div>${question.criteria.map((row, rowIndex) => criterionRow(question, path, row, rowIndex)).join("")}
        <button class="text" type="button" data-action="add-criterion" data-path="${path}">Add ${question.type === "score" ? "step" : "label"}</button></div>`;
  return `<details class="ask" data-open="${path}" ${isOpen(path)}>
    <summary><span class="grow">${esc(title)} · ${esc(question.type)}</span></summary>
    <div class="body">
      <div class="pair">
        <label>Id<input data-path="${path}.id" value="${esc(question.id)}" placeholder="refund_reason" /></label>
        <label>Type<select data-path="${path}.type">
          ${["choice", "score", "noul"].map((type) => `<option value="${type}"${type === question.type ? " selected" : ""}>${type}</option>`).join("")}
        </select></label>
      </div>
      <p class="note">${TYPE_NOTES[question.type]}</p>
      <label>Instructions<textarea data-path="${path}.instructions">${esc(question.instructions)}</textarea></label>
      ${criteria}
      ${remove}
    </div>
  </details>`;
}

function criterionRow(question, path, row, rowIndex) {
  if (question.type === "score") {
    return `<div class="criterion">
      <label>Step<input data-path="${path}.criteria.${rowIndex}.label" value="${esc(row.label)}" /></label>
      <div></div>
      <button class="danger" type="button" data-action="remove-criterion" data-path="${path}" data-index="${rowIndex}">Remove</button>
    </div>`;
  }
  return `<div class="criterion">
    <label>Label<input data-path="${path}.criteria.${rowIndex}.label" value="${esc(row.label)}" /></label>
    <label>When it fits<input data-path="${path}.criteria.${rowIndex}.description" value="${esc(row.description)}" /></label>
    <button class="danger" type="button" data-action="remove-criterion" data-path="${path}" data-index="${rowIndex}">Remove</button>
  </div>`;
}

function isOpen(key) {
  return openKeys.has(key) ? "open" : "";
}

function onInput(event) {
  const el = event.target;
  if (!el.dataset || !el.dataset.path || el.tagName === "SELECT") return;
  assign(draft, el.dataset.path, readControl(el));
  const output = el.parentElement && el.parentElement.querySelector("output");
  if (output) output.textContent = formatSlider(el.dataset.path, draft[el.dataset.path]);
  refreshActions("");
  if (el.dataset.path.endsWith(".id") || el.dataset.path.endsWith(".trigger")) {
    const summary = el.closest("details") && el.closest("details").querySelector(".grow");
    if (summary && el.dataset.path.endsWith(".id")) summary.textContent = `${el.value.trim() || "New ask"} · ${lookup(draft, el.dataset.path.slice(0, -3)).type}`;
    if (summary && el.dataset.path.endsWith(".trigger")) summary.textContent = el.value.trim() || "Follow-up";
  }
  if (el.dataset.path.includes(".id") || el.dataset.path.includes(".label")) refreshNeedLabels();
}

function onChange(event) {
  const el = event.target;
  if (!el.dataset || !el.dataset.path || !el.dataset.path.endsWith(".type")) return;
  const path = el.dataset.path.slice(0, -5);
  lookup(draft, path).type = el.value;
  openKeys.add(path);
  renderEditor();
}

function onClick(event) {
  const button = event.target.closest("button");
  if (!button || button.type === "submit") return;
  event.preventDefault();
  event.stopPropagation();
  const action = button.dataset.action;
  if (action === "add-shared") {
    draft.shared.push(blankQuestion());
    openKeys.add("always").add("shared." + (draft.shared.length - 1));
  }
  if (action === "remove-shared") draft.shared.splice(Number(button.dataset.index), 1);
  if (action === "add-scenario") {
    draft.scenarios.push({ trigger: "", questions: [blankQuestion()] });
    const index = draft.scenarios.length - 1;
    openKeys.add("followups").add("scenario." + index).add("scenarios." + index + ".questions.0");
  }
  if (action === "remove-scenario") draft.scenarios.splice(Number(button.dataset.index), 1);
  if (action === "add-scenario-question") {
    const index = Number(button.dataset.index);
    draft.scenarios[index].questions.push(blankQuestion());
    openKeys.add("scenario." + index).add("scenarios." + index + ".questions." + (draft.scenarios[index].questions.length - 1));
  }
  if (action === "remove-scenario-question") {
    draft.scenarios[Number(button.dataset.scenario)].questions.splice(Number(button.dataset.index), 1);
  }
  if (action === "add-criterion") {
    lookup(draft, button.dataset.path).criteria.push({ label: "", description: "" });
    openKeys.add(button.dataset.path);
  }
  if (action === "remove-criterion") {
    lookup(draft, button.dataset.path).criteria.splice(Number(button.dataset.index), 1);
    openKeys.add(button.dataset.path);
  }
  if (action === "delete") {
    removeFile();
    return;
  }
  if (action) renderEditor();
}

function refreshNeedLabels() {
  const list = document.getElementById("need-labels");
  if (!list) return;
  list.innerHTML = needLabels().map((label) => `<option value="${esc(label)}"></option>`).join("");
}

function fingerprint() {
  return JSON.stringify(draft);
}

function refreshActions(message) {
  if (!actionsEl.querySelector("[type=submit]")) {
    actionsEl.className = "bar actions";
    actionsEl.innerHTML = `
      <button type="submit" form="editor">Save</button>
      <button class="secondary" type="button" data-action="delete">Delete</button>
      <p class="status" hidden></p>`;
  }
  actionsEl.querySelector("[type=submit]").disabled = fingerprint() === baseline;
  actionsEl.querySelector("[data-action=delete]").disabled = !loadedKey;
  if (message == null) return;
  const status = actionsEl.querySelector(".status");
  const text = message || "";
  status.hidden = !text;
  status.textContent = text;
  status.classList.toggle("error", Boolean(text) && !text.startsWith("Saved"));
}

function needLabels() {
  const need = draft.shared.find((question) => question.id.trim() === "need" && question.type === "choice");
  return need ? need.criteria.map((row) => row.label.trim()).filter(Boolean) : [];
}

function syncFromForm() {
  for (const el of editorEl.querySelectorAll("[data-path]")) assign(draft, el.dataset.path, readControl(el));
}

async function save() {
  syncFromForm();
  let built;
  try {
    built = toFile(draft);
  } catch (err) {
    renderEditor(err.message);
    return;
  }
  if (!(await askConfirm(`Save ${built.key}?`, "Save"))) return;
  const res = await fetch("/questions/" + encodeURIComponent(built.key), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(built.questions),
  });
  const body = await res.json();
  if (!res.ok) {
    renderEditor(body.error || "Save failed");
    return;
  }
  await loadFiles(body.key);
  refreshActions(`Saved. Predict with key "${body.key}".`);
}

async function removeFile() {
  if (!loadedKey) return;
  if (!(await askConfirm(`Delete ${loadedKey}?`, "Delete", true))) return;
  const res = await fetch("/questions/" + encodeURIComponent(loadedKey), { method: "DELETE" });
  const body = await res.json();
  if (!res.ok) {
    renderEditor(body.error || "Delete failed");
    return;
  }
  draft = blankDraft();
  loadedKey = "";
  await loadFiles();
}

function fromFile(key, file) {
  return {
    key,
    shortlist_k: file.shortlist_k,
    min_need_prob: file.min_need_prob,
    min_need_conf: file.min_need_conf,
    shared: Object.entries(file.shared).map(([id, question]) => fromQuestion(id, question)),
    scenarios: Object.entries(file.scenarios || {}).map(([trigger, questions]) => ({
      trigger,
      questions: Object.entries(questions).map(([id, question]) => fromQuestion(id, question)),
    })),
  };
}

function fromQuestion(id, question) {
  const criteria = [];
  if (Array.isArray(question.criteria)) {
    for (const point of question.criteria) criteria.push({ label: point, description: "" });
  } else if (question.criteria) {
    for (const [label, description] of Object.entries(question.criteria)) criteria.push({ label, description });
  }
  if (criteria.length === 0) criteria.push({ label: "", description: "" });
  return { id, type: question.type, instructions: question.instructions || "", criteria };
}

function toFile(source) {
  const key = String(source.key || "").trim().replace(/\.json$/i, "");
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(key)) {
    throw new Error("Name must use letters, numbers, hyphens, or underscores.");
  }
  const seen = new Set();
  const shared = {};
  for (const question of source.shared) Object.assign(shared, oneQuestion(question, seen));
  if (Object.keys(shared).length === 0) throw new Error("Add at least one ask under Always.");
  const labels = shared.need && shared.need.type === "choice" ? new Set(Object.keys(shared.need.criteria)) : null;
  const scenarios = {};
  for (const scenario of source.scenarios) {
    const trigger = scenario.trigger.trim();
    if (!trigger) throw new Error("Each follow-up needs the need it follows.");
    if (labels && !labels.has(trigger)) throw new Error(`${trigger} is not one of the need labels.`);
    const questions = {};
    for (const question of scenario.questions) Object.assign(questions, oneQuestion(question, seen));
    if (Object.keys(questions).length === 0) throw new Error(`${trigger} needs an ask.`);
    scenarios[trigger] = questions;
  }
  return {
    key,
    questions: {
      shortlist_k: Number(source.shortlist_k),
      min_need_prob: Number(source.min_need_prob),
      min_need_conf: Number(source.min_need_conf),
      shared,
      scenarios,
    },
  };
}

function oneQuestion(question, seen) {
  const id = question.id.trim();
  if (!/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(id)) {
    throw new Error("Each id must start with a letter and use letters, numbers, or underscores.");
  }
  if (seen.has(id)) throw new Error(`${id} is used more than once.`);
  seen.add(id);
  const instructions = question.instructions.trim();
  if (!instructions) throw new Error(`${id} needs instructions.`);
  const out = { type: question.type, instructions };
  if (question.type === "score") {
    out.criteria = question.criteria.map((row) => row.label.trim()).filter(Boolean);
    if (out.criteria.length < 2) throw new Error(`${id} needs at least two steps.`);
  } else if (question.type === "choice") {
    out.criteria = {};
    for (const row of question.criteria) {
      const label = row.label.trim();
      const description = row.description.trim();
      if (!label && !description) continue;
      if (!label || !description) throw new Error(`${id} needs a label and a description for each choice.`);
      out.criteria[label] = description;
    }
    if (Object.keys(out.criteria).length === 0) throw new Error(`${id} needs at least one label.`);
  }
  return { [id]: out };
}

function readControl(el) {
  if (el.type !== "range" && el.type !== "number") return el.value;
  const value = Number(el.value);
  if (el.dataset.path === "shortlist_k") return Math.round(value);
  if (el.dataset.path === "min_need_prob" || el.dataset.path === "min_need_conf") return Math.round(value * 100) / 100;
  return value;
}

function formatSlider(path, value) {
  return path === "shortlist_k" ? String(Math.round(Number(value))) : Number(value).toFixed(2);
}

function assign(root, path, value) {
  const parts = path.split(".");
  let cursor = root;
  for (let i = 0; i < parts.length - 1; i++) cursor = step(cursor, parts[i]);
  const last = parts[parts.length - 1];
  if (Array.isArray(cursor) && /^\d+$/.test(last)) cursor[Number(last)] = value;
  else cursor[last] = value;
}

function lookup(root, path) {
  return path.split(".").reduce((cursor, part) => step(cursor, part), root);
}

function step(cursor, part) {
  return /^\d+$/.test(part) ? cursor[Number(part)] : cursor[part];
}

function esc(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
