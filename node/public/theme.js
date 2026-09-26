const COLORS = [
  { field: "primary", label: "Main color", help: "Launcher, header icon, the visitor's messages, buttons" },
  { field: "primaryText", label: "Text on main color", help: "Icons and text drawn on the main color" },
  { field: "chatBackground", label: "Chat background", help: "Behind the messages" },
  { field: "agentBubble", label: "Reply bubble", help: "Background of support replies" },
  { field: "agentText", label: "Reply text", help: "Text of support replies" },
];
const HEX = /^#[0-9a-f]{6}$/i;
const MAX_UPLOAD = 300 * 1024;
const formEl = document.getElementById("theme-form");
const saveEl = document.getElementById("save");
const statusEl = document.getElementById("status");
const widgetScript = document.querySelector('script[src="/widget.js"]');
const embedResult = document.getElementById("embed-result");
const embedCode = document.getElementById("embed-code");
const copyStatus = document.getElementById("copy-status");
let saved = null;
let defaults = null;
let draft = null;
let isSaving = false;

document.getElementById("colors").innerHTML = COLORS.map(
  (color) => `<div class="color">
    <input type="color" data-color="${color.field}" aria-label="${color.label}" />
    <div class="color-text">
      <span>${color.label}</span>
      <small>${color.help}</small>
    </div>
    <input class="hex" data-hex="${color.field}" maxlength="7" spellcheck="false" aria-label="${color.label} hex" />
  </div>`,
).join("");

const ICON_NAMES = {
  headset: "Headset",
  user: "Person",
  chat: "Chat",
  bot: "Bot",
  sparkle: "Sparkle",
  smile: "Smile",
  heart: "Heart",
  star: "Star",
  bolt: "Bolt",
  none: "None",
};
const bubbleIcons = (widgetScript && widgetScript.relayBubbleIcons) || {};
for (const set of document.querySelectorAll("[data-icons]")) {
  set.innerHTML = Object.keys(bubbleIcons)
    .map(
      (id) => `<label class="icon-choice" title="${ICON_NAMES[id] || id}">
        <input type="radio" name="${set.dataset.icons}" value="${id}" aria-label="${ICON_NAMES[id] || id}" />
        ${bubbleIcons[id] || '<span class="none">None</span>'}
      </label>`,
    )
    .join("");
}

formEl.addEventListener("input", onInput);
formEl.addEventListener("submit", (event) => {
  event.preventDefault();
  save();
});
document.getElementById("discard").addEventListener("click", () => {
  draft = { ...saved };
  fill();
});
document.getElementById("defaults").addEventListener("click", () => {
  draft = { ...defaults };
  fill();
});
document.getElementById("logo-remove").addEventListener("click", () => {
  draft.logo = "";
  fill();
});
document.getElementById("logo-file").addEventListener("change", onLogoFile);
document.getElementById("copy-embed").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(embedCode.textContent);
    copyStatus.textContent = "Script copied.";
  } catch {
    copyStatus.textContent = "Could not copy the script. Select and copy it from the box.";
  }
});
document.getElementById("close-embed").addEventListener("click", () => embedResult.close());
document.getElementById("view-embed").addEventListener("click", () => {
  copyStatus.textContent = "";
  embedResult.showModal();
});
const confirmDialog = document.getElementById("confirm-dialog");
confirmDialog.addEventListener("click", (event) => {
  if (event.target === confirmDialog) confirmDialog.close();
});
window.addEventListener("beforeunload", (event) => {
  if (isDirty()) event.preventDefault();
});

load();

async function load() {
  try {
    const res = await fetch("/widget/theme");
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || "Could not load the theme");
    saved = body.defaults;
    defaults = body.defaults;
    draft = { ...saved };
    fill();
  } catch (err) {
    setStatus(err.message, true);
  }
}

function fill() {
  for (const el of formEl.querySelectorAll("[data-field]")) {
    const field = el.dataset.field;
    el.value = field === "logoUrl" ? (draft.logo.startsWith("data:") ? "" : draft.logo) : draft[field];
  }
  for (const color of COLORS) {
    formEl.querySelector(`[data-color="${color.field}"]`).value = draft[color.field];
    const hex = formEl.querySelector(`[data-hex="${color.field}"]`);
    hex.value = draft[color.field];
    hex.classList.remove("invalid");
  }
  for (const name of ["position", "agentIcon", "userIcon"]) {
    for (const radio of formEl.querySelectorAll(`[name="${name}"]`)) radio.checked = radio.value === draft[name];
  }
  document.getElementById("logo-file").value = "";
  refresh();
}

function onInput(event) {
  const el = event.target;
  if (el.dataset.field === "logoUrl") draft.logo = el.value.trim();
  else if (el.dataset.field) draft[el.dataset.field] = el.value;
  else if (el.dataset.color) {
    draft[el.dataset.color] = el.value;
    formEl.querySelector(`[data-hex="${el.dataset.color}"]`).value = el.value;
  } else if (el.dataset.hex) {
    const value = el.value.trim().startsWith("#") ? el.value.trim() : `#${el.value.trim()}`;
    const valid = HEX.test(value);
    el.classList.toggle("invalid", !valid);
    if (!valid) return;
    draft[el.dataset.hex] = value.toLowerCase();
    formEl.querySelector(`[data-color="${el.dataset.hex}"]`).value = value;
  } else if (["position", "agentIcon", "userIcon"].includes(el.name)) draft[el.name] = el.value;
  else return;
  refresh();
}

function onLogoFile(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  if (file.size > MAX_UPLOAD) {
    setStatus("That image is over 300 KB. Pick a smaller one or use an image URL.", true);
    event.target.value = "";
    return;
  }
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    draft.logo = String(reader.result);
    fill();
  });
  reader.readAsDataURL(file);
}

function refresh() {
  const dirty = isDirty();
  document.getElementById("dirty").hidden = !dirty;
  document.getElementById("discard").disabled = !dirty;
  saveEl.disabled = !draft || isSaving;
  if (dirty) setStatus("");
  const box = document.getElementById("logo-box");
  box.replaceChildren();
  if (draft.logo) {
    const img = document.createElement("img");
    img.src = draft.logo;
    img.alt = "Logo preview";
    box.append(img);
  } else {
    box.textContent = "No logo";
  }
  box.classList.toggle("empty", !draft.logo);
  document.getElementById("logo-remove").disabled = !draft.logo;
  document.body.classList.toggle("side-left", draft.position === "left");
  if (widgetScript) widgetScript.dispatchEvent(new CustomEvent("relay-theme", { detail: draft }));
}

function isDirty() {
  return Boolean(saved && draft) && JSON.stringify(saved) !== JSON.stringify(draft);
}

function problem() {
  if (!draft.title.trim()) return "Add a title.";
  if (!draft.greeting.trim()) return "Add a greeting.";
  if (draft.logo && !/^(https?:\/\/|data:image\/)/i.test(draft.logo)) return "The logo URL must start with http:// or https://.";
  for (const color of COLORS) if (!HEX.test(draft[color.field])) return `${color.label} must be a hex color like #1c1c1e.`;
  return "";
}

async function save() {
  if (isSaving) return;
  const issue = problem();
  if (issue) {
    setStatus(issue, true);
    return;
  }
  const ok = await askConfirm(
    "Create a separate theme and script? Earlier scripts will keep their saved looks. You can reset the form or change it again to create another theme.",
  );
  if (!ok) return;
  isSaving = true;
  saveEl.disabled = true;
  saveEl.classList.add("loading");
  saveEl.textContent = "Saving…";
  saveEl.setAttribute("aria-busy", "true");
  try {
    const res = await fetch("/widget/themes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...draft, title: draft.title.trim(), greeting: draft.greeting.trim() }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || "Save failed");
    saved = body.theme;
    draft = { ...saved };
    fill();
    const widgetUrl = new URL("/widget.js", window.location.origin).href;
    const themeUrl = new URL(body.themePath, window.location.origin).href;
    embedCode.textContent = `<script src="${widgetUrl}" data-theme="${themeUrl}" defer></script>`;
    document.getElementById("view-embed").hidden = false;
    copyStatus.textContent = "";
    embedResult.showModal();
    setStatus("Theme saved. Open the script again with View saved script.");
  } catch (err) {
    refresh();
    setStatus(err.message, true);
  } finally {
    isSaving = false;
    saveEl.disabled = !draft;
    saveEl.classList.remove("loading");
    saveEl.textContent = "Save new theme";
    saveEl.removeAttribute("aria-busy");
  }
}

function askConfirm(message) {
  document.getElementById("confirm-text").textContent = message;
  return new Promise((resolve) => {
    confirmDialog.addEventListener("close", () => resolve(confirmDialog.returnValue === "ok"), { once: true });
    confirmDialog.showModal();
  });
}

function setStatus(text, error) {
  statusEl.hidden = !text;
  statusEl.textContent = text || "";
  statusEl.classList.toggle("error", Boolean(error));
}
