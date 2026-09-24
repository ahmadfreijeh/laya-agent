const filesEl = document.getElementById("files");
const editorEl = document.getElementById("editor");
const saveEl = document.getElementById("save");
const statusEl = document.getElementById("status");
const tryMessageEl = document.getElementById("try-message");
const tryResultEl = document.getElementById("try-result");
const TYPE_NAMES = { choice: "Choice", score: "Score", noul: "Yes / no" };
const TYPE_NOTES = {
  choice: "Picks one label. Each label needs a short description of when it fits.",
  score: "A point on a scale. Put the steps in order, from low to high.",
  noul: "Yes or no. This one has no labels.",
};
let files = [];
let draft = blankDraft();
let loadedKey = "";
let baseline = fingerprint();
let openKeys = defaultOpen();

editorEl.addEventListener("input", onInput);
editorEl.addEventListener("change", onChange);
editorEl.addEventListener("click", onClick);
editorEl.addEventListener("submit", (event) => {
  event.preventDefault();
  save();
});
document.getElementById("new-set").addEventListener("click", async () => {
  if (!(await leave())) return;
  draft = blankDraft();
  loadedKey = "";
  baseline = fingerprint();
  openKeys = defaultOpen();
  tryResultEl.replaceChildren();
  render();
});
document.getElementById("test-open").addEventListener("click", () => openTest(loadedKey));
document.getElementById("json-open").addEventListener("click", openJson);
document.getElementById("copy-open").addEventListener("click", saveCopy);
document.getElementById("discard").addEventListener("click", async () => {
  if (!isDirty() || !(await askConfirm("Discard your unsaved changes?", "Discard", true))) return;
  draft = JSON.parse(baseline);
  setStatus("");
  renderEditor();
});
document.getElementById("try-run").addEventListener("click", runTry);
tryMessageEl.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) runTry();
});
const jsonDialog = document.getElementById("json-dialog");
document.getElementById("json-close").addEventListener("click", () => jsonDialog.close());
jsonDialog.addEventListener("click", (event) => {
  if (event.target === jsonDialog) jsonDialog.close();
});
document.getElementById("confirm-input").addEventListener("input", (event) => underscoreSpaces(event.target));
const confirmDialog = document.getElementById("confirm-dialog");
confirmDialog.addEventListener("click", (event) => {
  if (event.target === confirmDialog) confirmDialog.close();
});
window.addEventListener("beforeunload", (event) => {
  if (isDirty()) event.preventDefault();
});

loadFiles();

function defaultOpen() {
  return new Set(["always"]);
}

function askConfirm(message, okLabel, danger, initial) {
  const ok = document.getElementById("confirm-ok");
  const field = document.getElementById("confirm-field");
  const input = document.getElementById("confirm-input");
  document.getElementById("confirm-text").textContent = message;
  ok.textContent = okLabel;
  ok.classList.toggle("danger", Boolean(danger));
  field.hidden = initial == null;
  input.value = initial ?? "";
  if (confirmDialog.open) confirmDialog.close();
  return new Promise((resolve) => {
    confirmDialog.addEventListener(
      "close",
      () => {
        const accepted = confirmDialog.returnValue === "ok";
        resolve(initial == null ? accepted : accepted ? input.value.trim() : null);
      },
      { once: true },
    );
    confirmDialog.showModal();
    if (initial != null) input.select();
  });
}

async function leave() {
  if (!isDirty()) return true;
  return askConfirm("Discard unsaved changes?", "Discard", true);
}

function openTest(key) {
  const script = document.querySelector('script[src="/widget.js"]');
  if (!script || !key) return;
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
    renderEditor();
    setStatus(body.error || "Could not load brains", true);
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
    setStatus(body.error || "Could not open that brain", true);
    return;
  }
  if (key !== loadedKey) tryResultEl.replaceChildren();
  draft = fromFile(body.key, body.questions);
  loadedKey = body.key;
  baseline = fingerprint();
  openKeys = defaultOpen();
  render();
}

function render() {
  renderFiles();
  renderEditor();
}

function renderFiles() {
  filesEl.replaceChildren(
    ...files.map((file) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "file";
      button.textContent = file.key;
      if (file.key === loadedKey) button.setAttribute("aria-current", "true");
      button.addEventListener("click", async () => {
        if (file.key === loadedKey || !(await leave())) return;
        openFile(file.key);
      });
      return button;
    }),
  );
}

function openJson() {
  const body = document.getElementById("json-body");
  document.getElementById("json-title").textContent = `${loadedKey || draft.key.trim() || "new brain"}.json`;
  syncFromForm();
  try {
    body.textContent = JSON.stringify(buildQuestions(draft), null, 2);
  } catch (err) {
    body.textContent = err.message;
  }
  jsonDialog.showModal();
}

function renderEditor() {
  const need = needQuestion();
  const shared = draft.shared
    .map((question, index) => askBlock(question, "shared." + index, { locked: need === question, index }))
    .join("");
  const name = loadedKey
    ? ""
    : `<label class="name">Name<input data-path="key" value="${esc(draft.key)}" placeholder="support" /></label>`;
  editorEl.innerHTML = `
    ${name}
    <details data-open="always" ${isOpen("always")}>
      <summary><span class="grow">Always read</span><span class="count">${draft.shared.length}</span></summary>
      <p class="hint section-hint">Read on every message.</p>
      ${shared}
      <button class="text" type="button" data-action="add-shared">Add ask</button>
    </details>
    <details data-open="routing" ${isOpen("routing")}>
      <summary><span class="grow">Routing</span><span class="count" id="routing-count">${routingSummary()}</span></summary>
      <div class="sliders">
        ${slider("Need probability", "min_need_prob", 0, 1, 0.05, "How likely the chosen need label must be before follow-ups run.")}
        ${slider("Need confidence", "min_need_conf", 0, 1, 0.05, "How sure the model must be overall before follow-ups run.")}
        ${slider("Shortlist", "shortlist_k", 1, 100, 1, "Most choice labels per ask sent to the model. Asks with fewer labels send them all.")}
      </div>
    </details>
    <hr class="divider" />
    <details data-open="followups" ${isOpen("followups")}>
      <summary><span class="grow">Follow-ups</span><span class="count" id="followups-count"></span></summary>
      <p class="hint section-hint">Read only when need picks that label and clears the routing bars.</p>
      <div id="followups-body"></div>
    </details>
    ${deleteHtml()}`;
  watchDetails(editorEl);
  renderFollowups();
  refreshBar();
}

function deleteHtml() {
  if (!loadedKey) return "";
  if (files.length <= 1) return `<p class="hint delete-note">This is the only brain, so it can't be deleted.</p>`;
  return `<button class="delete" type="button" data-action="delete">Delete this brain</button>`;
}

function renderFollowups() {
  const body = document.getElementById("followups-body");
  if (!body) return;
  const labels = needLabels();
  const known = new Set(labels);
  const groups = [];
  for (const label of labels) {
    const index = draft.scenarios.findIndex((s) => s.trigger.trim() === label);
    if (label !== "other" || index !== -1) groups.push(routeBlock(label, index));
  }
  draft.scenarios.forEach((scenario, index) => {
    if (!known.has(scenario.trigger.trim())) groups.push(routeBlock(scenario.trigger.trim(), index, true));
  });
  const intro = needQuestion()
    ? labels.length
      ? ""
      : `<p class="hint">Add labels to need first.</p>`
    : `<p class="hint">Add a choice ask with the id <code>need</code> to route follow-ups.</p>`;
  body.innerHTML = intro + groups.join("");
  watchDetails(body);
  document.getElementById("followups-count").textContent = String(
    draft.scenarios.reduce((sum, scenario) => sum + scenario.questions.length, 0),
  );
}

function routeBlock(label, scenarioIndex, orphan) {
  const scenario = draft.scenarios[scenarioIndex];
  const asks = scenario
    ? scenario.questions
        .map((question, questionIndex) =>
          askBlock(question, `scenarios.${scenarioIndex}.questions.${questionIndex}`, {
            scenario: scenarioIndex,
            index: questionIndex,
          }),
        )
        .join("")
    : "";
  const count = scenario ? `${scenario.questions.length} ${scenario.questions.length === 1 ? "ask" : "asks"}` : "none";
  if (orphan) {
    return `<div class="route orphan">
      <div class="route-head"><span class="route-label">${esc(label || "(no label)")}</span><span class="count">${count}</span></div>
      <p class="warn">Not a need label any more. Add it back to need, or remove these asks.</p>
      ${asks}
      <button class="text danger" type="button" data-action="remove-scenario" data-index="${scenarioIndex}">Remove these asks</button>
    </div>`;
  }
  return `<div class="route${scenario ? "" : " empty"}">
    <div class="route-head"><span class="route-label">${esc(label)}</span><span class="count">${count}</span></div>
    ${asks}
    <button class="text" type="button" data-action="add-followup" data-label="${esc(label)}">Add ask</button>
  </div>`;
}

function watchDetails(root) {
  for (const details of root.querySelectorAll("details")) {
    details.addEventListener("toggle", () => {
      if (details.open) openKeys.add(details.dataset.open);
      else openKeys.delete(details.dataset.open);
    });
  }
}

function routingSummary() {
  return `probability ${formatSlider("min_need_prob", draft.min_need_prob)} · confidence ${formatSlider("min_need_conf", draft.min_need_conf)}`;
}

function slider(label, path, min, max, step, help) {
  const value = draft[path];
  return `<label class="slider"><span>${label}<output>${formatSlider(path, value)}</output></span>
    <input data-path="${path}" type="range" min="${min}" max="${max}" step="${step}" value="${esc(value)}" />
    <small>${help}</small></label>`;
}

function summaryHtml(question, locked) {
  const preview = question.instructions.trim().split("\n")[0];
  return `<span class="ask-id">${esc(question.id.trim() || "New ask")}</span>
    <span class="badge">${TYPE_NAMES[question.type]}</span>
    ${locked ? `<span class="badge routes">Routes follow-ups</span>` : ""}
    <span class="preview">${esc(preview)}</span>`;
}

function askBlock(question, path, opts) {
  const locked = Boolean(opts.locked);
  let remove = "";
  if (!locked && opts.scenario == null) {
    remove = `<button class="text danger" type="button" data-action="remove-shared" data-index="${opts.index}">Remove ask</button>`;
  } else if (!locked) {
    remove = `<button class="text danger" type="button" data-action="remove-scenario-question" data-scenario="${opts.scenario}" data-index="${opts.index}">Remove ask</button>`;
  }
  const criteria =
    question.type === "noul"
      ? ""
      : `<div>${question.criteria.map((row, rowIndex) => criterionRow(question, path, row, rowIndex)).join("")}
        <button class="text" type="button" data-action="add-criterion" data-path="${path}">Add ${question.type === "score" ? "step" : "label"}</button></div>`;
  const lockNote = locked ? `<p class="note">Id and type are fixed because follow-ups are keyed by need's labels.</p>` : "";
  return `<details class="ask" data-open="${path}" ${isOpen(path)}>
    <summary data-locked="${locked}">${summaryHtml(question, locked)}</summary>
    <div class="body">
      <div class="pair">
        <label>Id<input data-path="${path}.id" value="${esc(question.id)}" placeholder="refund_reason" ${locked ? "readonly" : ""} /></label>
        <label>Type<select data-path="${path}.type" ${locked ? "disabled" : ""}>
          ${["choice", "score", "noul"].map((type) => `<option value="${type}"${type === question.type ? " selected" : ""}>${TYPE_NAMES[type]}</option>`).join("")}
        </select></label>
      </div>
      ${lockNote || `<p class="note">${TYPE_NOTES[question.type]}</p>`}
      <label>Instructions<textarea data-path="${path}.instructions">${esc(question.instructions)}</textarea></label>
      ${criteria}
      ${remove}
    </div>
  </details>`;
}

function criterionRow(question, path, row, rowIndex) {
  const remove = `<button class="icon" type="button" aria-label="Remove" data-action="remove-criterion" data-path="${path}" data-index="${rowIndex}">×</button>`;
  if (question.type === "score") {
    return `<div class="criterion score">
      <label>Step ${rowIndex + 1}<input data-path="${path}.criteria.${rowIndex}.label" value="${esc(row.label)}" /></label>
      ${remove}
    </div>`;
  }
  return `<div class="criterion">
    <label>Label<input data-path="${path}.criteria.${rowIndex}.label" value="${esc(row.label)}" /></label>
    <label>When it fits<input data-path="${path}.criteria.${rowIndex}.description" value="${esc(row.description)}" /></label>
    ${remove}
  </div>`;
}

function isOpen(key) {
  return openKeys.has(key) ? "open" : "";
}

function onInput(event) {
  const el = event.target;
  if (!el.dataset || !el.dataset.path || el.tagName === "SELECT") return;
  const path = el.dataset.path;
  if (path === "key" || path.endsWith(".id") || (/\.criteria\.\d+\.label$/.test(path) && lookup(draft, path.replace(/\.criteria\.\d+\.label$/, "")).type === "choice")) {
    underscoreSpaces(el);
  }
  const needLabel = needQuestion() && /^shared\.0\.criteria\.\d+\.label$/.test(path);
  if (needLabel) renameTrigger(lookup(draft, path.slice(0, -6)).label.trim(), el.value.trim());
  assign(draft, path, readControl(el));
  const output = el.parentElement && el.parentElement.querySelector("output");
  if (output) {
    output.textContent = formatSlider(path, draft[path]);
    document.getElementById("routing-count").textContent = routingSummary();
  }
  const ask = el.closest("details.ask");
  if (ask && /\.(id|instructions)$/.test(path)) {
    const summary = ask.querySelector(":scope > summary");
    summary.innerHTML = summaryHtml(lookup(draft, path.replace(/\.(id|instructions)$/, "")), summary.dataset.locked === "true");
  }
  if (needLabel) renderFollowups();
  refreshBar();
}

function underscoreSpaces(el) {
  if (!/\s/.test(el.value)) return;
  const caret = el.selectionStart;
  el.value = el.value.replace(/\s/g, "_");
  el.setSelectionRange(caret, caret);
}

function renameTrigger(from, to) {
  if (!from || from === to) return;
  const scenario = draft.scenarios.find((s) => s.trigger.trim() === from);
  if (!scenario || !to || draft.scenarios.some((s) => s.trigger.trim() === to)) return;
  scenario.trigger = to;
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
  if (action === "add-followup") {
    let index = draft.scenarios.findIndex((s) => s.trigger.trim() === button.dataset.label);
    if (index === -1) {
      draft.scenarios.push({ trigger: button.dataset.label, questions: [] });
      index = draft.scenarios.length - 1;
    }
    draft.scenarios[index].questions.push(blankQuestion());
    openKeys.add("followups").add(`scenarios.${index}.questions.${draft.scenarios[index].questions.length - 1}`);
  }
  if (action === "remove-scenario") draft.scenarios.splice(Number(button.dataset.index), 1);
  if (action === "remove-scenario-question") {
    const index = Number(button.dataset.scenario);
    draft.scenarios[index].questions.splice(Number(button.dataset.index), 1);
    if (draft.scenarios[index].questions.length === 0) draft.scenarios.splice(index, 1);
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

function fingerprint() {
  return JSON.stringify(draft);
}

function isDirty() {
  return fingerprint() !== baseline;
}

function refreshBar() {
  const dirty = isDirty();
  document.getElementById("bar-name").textContent = loadedKey || draft.key.trim() || "New brain";
  document.getElementById("bar-dirty").hidden = !dirty;
  saveEl.disabled = !dirty;
  document.getElementById("discard").disabled = !dirty;
  for (const id of ["test-open", "copy-open"]) document.getElementById(id).disabled = !loadedKey;
  if (dirty) setStatus("");
}

function setStatus(text, error) {
  statusEl.hidden = !text;
  statusEl.textContent = text || "";
  statusEl.classList.toggle("error", Boolean(error));
}

function needQuestion() {
  const first = draft.shared[0];
  return first && first.id.trim() === "need" && first.type === "choice" ? first : null;
}

function needLabels() {
  const need = needQuestion();
  return need ? [...new Set(need.criteria.map((row) => row.label.trim()).filter(Boolean))] : [];
}

function syncFromForm() {
  for (const el of editorEl.querySelectorAll(":is(input, textarea, select)[data-path]")) {
    assign(draft, el.dataset.path, readControl(el));
  }
}

async function save() {
  syncFromForm();
  const key = loadedKey || draft.key;
  let built;
  try {
    built = toFile(draft, key);
  } catch (err) {
    setStatus(err.message, true);
    return;
  }
  if (!loadedKey && files.some((file) => file.key === built.key)) {
    if (!(await askConfirm(`${built.key} already exists. Replace it?`, "Replace", true))) return;
  }
  await put(built, "Saved");
}

async function saveCopy() {
  if (!loadedKey) return;
  syncFromForm();
  const name = await askConfirm("Save a copy of this brain as", "Save copy", false, `${loadedKey}-copy`);
  if (!name) return;
  let built;
  try {
    built = toFile(draft, name);
  } catch (err) {
    setStatus(err.message, true);
    return;
  }
  if (files.some((file) => file.key === built.key)) {
    if (!(await askConfirm(`${built.key} already exists. Replace it?`, "Replace", true))) return;
  }
  await put(built, "Copy saved");
}

async function put(built, done) {
  const res = await fetch("/questions/" + encodeURIComponent(built.key), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(built.questions),
  });
  const body = await res.json();
  if (!res.ok) {
    setStatus(body.error || "Save failed", true);
    return;
  }
  await loadFiles(body.key);
  setStatus(`${done}. Predict with key "${body.key}".`);
}

async function removeFile() {
  if (!loadedKey || files.length <= 1) return;
  if (!(await askConfirm(`Delete ${loadedKey}? This removes the file.`, "Delete", true))) return;
  const res = await fetch("/questions/" + encodeURIComponent(loadedKey), { method: "DELETE" });
  const body = await res.json();
  if (!res.ok) {
    setStatus(body.error || "Delete failed", true);
    return;
  }
  draft = blankDraft();
  loadedKey = "";
  baseline = fingerprint();
  tryResultEl.replaceChildren();
  await loadFiles();
}

async function runTry() {
  const message = tryMessageEl.value.trim();
  if (!message) {
    tryMessageEl.focus();
    return;
  }
  syncFromForm();
  let questions;
  try {
    questions = buildQuestions(draft);
  } catch (err) {
    tryResultEl.innerHTML = `<p class="warn">${esc(err.message)}</p>`;
    return;
  }
  const button = document.getElementById("try-run");
  button.disabled = true;
  tryResultEl.innerHTML = `<p class="hint">Reading…</p>`;
  try {
    const res = await fetch("/questions/try", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, questions }),
    });
    const body = await res.json();
    tryResultEl.innerHTML = res.ok ? tryHtml(body, questions) : `<p class="warn">${esc(body.error || "Could not run")}</p>`;
  } catch {
    tryResultEl.innerHTML = `<p class="warn">Could not reach the server.</p>`;
  } finally {
    button.disabled = false;
  }
}

function tryHtml(result, questions) {
  const answers = result.answers || {};
  const followups = new Set(result.followups || []);
  const rows = Object.entries(answers)
    .map(([id, answer]) => {
      const value = answerText(answer, findQuestion(questions, id));
      const tag = followups.has(id) ? `<span class="badge">Follow-up</span>` : "";
      return `<li><span class="ask-id">${esc(id)}</span>${tag}<span class="value">${esc(value)}</span>
        <span class="conf" title="How likely this answer is">${percent(answer.answer_confidence ?? answer.confidence)}</span></li>`;
    })
    .join("");
  return `<p class="verdict">${verdict(answers.need, result, questions)}</p><ul class="answers">${rows}</ul>`;
}

function verdict(need, result, questions) {
  if (!need || need.type !== "choice") return "There is no need ask, so follow-ups never run.";
  const choice = `<strong>${esc(need.choice)}</strong>`;
  const probability = need.probabilities ? need.probabilities[need.choice] : null;
  if (result.need_clear) {
    const ran = result.followups || [];
    return ran.length
      ? `Need is ${choice} and cleared the bars, so it also asked ${ran.map((id) => `<code>${esc(id)}</code>`).join(", ")}.`
      : `Need is ${choice} and cleared the bars. There are no follow-ups for ${choice}.`;
  }
  if (need.choice === "other") return `Need is ${choice}, which never runs follow-ups.`;
  const misses = [];
  if (probability != null && probability < questions.min_need_prob) {
    misses.push(`probability ${percent(probability)} is under ${percent(questions.min_need_prob)}`);
  }
  if (need.confidence < questions.min_need_conf) {
    misses.push(`confidence ${percent(need.confidence)} is under ${percent(questions.min_need_conf)}`);
  }
  return `Need is ${choice}, but ${misses.join(" and ") || "it did not clear the bars"}, so no follow-ups ran.`;
}

function findQuestion(questions, id) {
  if (questions.shared[id]) return questions.shared[id];
  for (const group of Object.values(questions.scenarios)) if (group[id]) return group[id];
  return null;
}

function answerText(answer, question) {
  if (answer.type === "choice") return answer.choice;
  if (answer.type === "noul") return answer.noul >= 0.5 ? "yes" : "no";
  if (answer.type === "score") {
    const index = Math.round(Number(answer.score));
    const steps = question && Array.isArray(question.criteria) ? question.criteria : [];
    const step = (answer.legend && answer.legend[index]) || steps[index];
    return step ? `${step} (${Number(answer.score).toFixed(2)})` : Number(answer.score).toFixed(2);
  }
  return JSON.stringify(answer);
}

function percent(value) {
  return value == null ? "" : `${Math.round(Number(value) * 100)}%`;
}

function fromFile(key, file) {
  const shared = Object.entries(file.shared).map(([id, question]) => fromQuestion(id, question));
  const needIndex = shared.findIndex((question) => question.id === "need" && question.type === "choice");
  if (needIndex > 0) shared.unshift(...shared.splice(needIndex, 1));
  return {
    key,
    shortlist_k: file.shortlist_k,
    min_need_prob: file.min_need_prob,
    min_need_conf: file.min_need_conf,
    shared,
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

function toFile(source, name) {
  const key = String(name || "").trim().replace(/\.json$/i, "");
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(key)) {
    throw new Error("Name must use letters, numbers, hyphens, or underscores.");
  }
  return { key, questions: buildQuestions(source) };
}

function buildQuestions(source) {
  const seen = new Set();
  const shared = {};
  for (const question of source.shared) Object.assign(shared, oneQuestion(question, seen));
  if (Object.keys(shared).length === 0) throw new Error("Add at least one ask under Always read.");
  const labels = shared.need && shared.need.type === "choice" ? new Set(Object.keys(shared.need.criteria)) : null;
  const scenarios = {};
  for (const scenario of source.scenarios) {
    const trigger = scenario.trigger.trim();
    if (!trigger) throw new Error("Each follow-up needs the need label it follows.");
    if (labels && !labels.has(trigger)) throw new Error(`Follow-ups for ${trigger} don't match a need label.`);
    const questions = {};
    for (const question of scenario.questions) Object.assign(questions, oneQuestion(question, seen));
    if (Object.keys(questions).length === 0) continue;
    scenarios[trigger] = questions;
  }
  return {
    shortlist_k: Number(source.shortlist_k),
    min_need_prob: Number(source.min_need_prob),
    min_need_conf: Number(source.min_need_conf),
    shared,
    scenarios,
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
