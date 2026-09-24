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
let saved = null;
let defaults = null;
let draft = null;

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
    saved = body.theme;
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
  saveEl.disabled = !dirty;
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
  box.style.background = draft.logo ? "" : draft.primary;
  box.style.color = draft.logo ? "" : draft.primaryText;
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
  const issue = problem();
  if (issue) {
    setStatus(issue, true);
    return;
  }
  const ok = await askConfirm(
    "Replace the current widget theme? Every site using the widget gets the new look the next time it loads.",
  );
  if (!ok) return;
  saveEl.disabled = true;
  try {
    const res = await fetch("/widget/theme", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...draft, title: draft.title.trim(), greeting: draft.greeting.trim() }),
    });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error || "Save failed");
    saved = body.theme;
    draft = { ...saved };
    fill();
    setStatus("Saved. Sites pick up the new look the next time the widget loads.");
  } catch (err) {
    setStatus(err.message, true);
    refresh();
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
