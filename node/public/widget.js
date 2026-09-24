(function () {
  var script = document.currentScript;
  if (!script || !script.src) return;
  if (document.getElementById("relay-chat")) return;

  var endpoint = script.dataset.endpoint || new URL("/agent", script.src).href;
  var title = script.dataset.title || "Support";
  var greeting = script.dataset.greeting || "Hi. How can we help?";
  var storageKey = "relay-chat:" + endpoint;

  var icons = {
    chat: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.2 18.2 4.8 20.5V7.4A2.4 2.4 0 0 1 7.2 5h9.6a2.4 2.4 0 0 1 2.4 2.4v8.4a2.4 2.4 0 0 1-2.4 2.4H7.2Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7 7 17" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    send: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h12M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    fresh: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6v12M6 12h12" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    agent: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 13v-1a7.5 7.5 0 0 1 15 0v1" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><rect x="3.2" y="12.5" width="3.8" height="5.6" rx="1.4" fill="none" stroke="currentColor" stroke-width="1.7"/><rect x="17" y="12.5" width="3.8" height="5.6" rx="1.4" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>',
    user: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M5.8 19c1.2-2.5 3.4-3.8 6.2-3.8s5 1.3 6.2 3.8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    error: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7.5" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M12 8.2v4.6M12 16.2h.01" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  };

  var convo = load();
  var generation = 0;

  var host = document.createElement("div");
  host.id = "relay-chat";
  host.style.cssText = "all:initial;position:fixed;z-index:2147483647;right:20px;bottom:20px;font-family:\"DM Sans\",ui-sans-serif,system-ui,sans-serif;";
  var root = host.attachShadow({ mode: "open" });

  root.innerHTML =
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap">' +
    "<style>" +
    ":host{font-family:\"DM Sans\",ui-sans-serif,system-ui,sans-serif;color:#1c1c1e;}" +
    "button,textarea,input{font:inherit;}" +
    "svg{display:block;width:16px;height:16px;}" +
    ".launcher{width:56px;height:56px;border:0;border-radius:50%;background:#1c1c1e;color:#fff;cursor:pointer;display:grid;place-items:center;box-shadow:0 10px 28px rgba(28,28,30,.22);}" +
    ".launcher svg{width:24px;height:24px;}" +
    ".launcher:focus-visible,.send:focus-visible,.close:focus-visible,.fresh:focus-visible,textarea:focus-visible,input:focus-visible,.confirm button:focus-visible{outline:2px solid #3b6cff;outline-offset:2px;}" +
    ".panel{display:none;flex-direction:column;width:min(380px,calc(100vw - 32px));height:min(560px,calc(100vh - 96px));margin-bottom:12px;background:#fff;border:1px solid #ececee;border-radius:20px;box-shadow:0 18px 50px rgba(28,28,30,.14);overflow:hidden;}" +
    ".panel.open{display:flex;}" +
    ".head{display:flex;align-items:center;gap:10px;padding:14px 8px 14px 16px;border-bottom:1px solid #ececee;}" +
    ".brand{width:32px;height:32px;border-radius:10px;background:#1c1c1e;color:#fff;display:grid;place-items:center;flex:none;}" +
    ".titles{min-width:0;}" +
    ".head h2{margin:0;font-size:15px;font-weight:600;letter-spacing:-.01em;}" +
    ".who{margin:2px 0 0;font-size:12px;color:#6b6b70;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}" +
    ".who:empty{display:none;}" +
    ".icon{width:32px;height:32px;border:0;border-radius:10px;background:transparent;color:#1c1c1e;cursor:pointer;display:grid;place-items:center;flex:none;}" +
    ".icon:hover{background:#f4f4f5;}" +
    ".actions{margin-left:auto;display:flex;}" +
    ".log{flex:1;overflow:auto;padding:16px;display:flex;flex-direction:column;gap:12px;background:#f7f7f8;}" +
    ".msg{display:flex;}" +
    ".msg.user{justify-content:flex-end;}" +
    ".bubble{display:flex;gap:8px;align-items:flex-start;max-width:86%;padding:10px 12px;border-radius:16px;font-size:14px;line-height:1.45;}" +
    ".agent .bubble{background:#fff;border:1px solid #ececee;border-bottom-left-radius:6px;color:#1c1c1e;}" +
    ".user .bubble{background:#1c1c1e;color:#fff;border-bottom-right-radius:6px;}" +
    ".error .bubble{background:#fff;border:1px solid #f3d0d0;color:#8f1d1d;border-bottom-left-radius:6px;}" +
    ".mark{flex:none;margin-top:2px;opacity:.8;}" +
    ".text{margin:0;white-space:pre-wrap;word-break:break-word;}" +
    ".gate{padding:16px;border-top:1px solid #ececee;background:#fff;}" +
    ".gate p{margin:0 0 10px;font-size:14px;line-height:1.4;}" +
    ".gate form,.composer{display:flex;gap:8px;align-items:flex-end;}" +
    ".composer{padding:12px;border-top:1px solid #ececee;background:#fff;}" +
    "textarea,input[type=email]{flex:1;min-width:0;resize:none;min-height:42px;max-height:96px;padding:10px 12px;border:1px solid #e4e4e7;border-radius:14px;background:#fafafa;color:#1c1c1e;box-sizing:border-box;}" +
    "textarea::placeholder,input::placeholder{color:#8e8e93;}" +
    ".send,.continue{height:42px;border:0;border-radius:14px;background:#1c1c1e;color:#fff;cursor:pointer;flex:none;}" +
    ".send{width:42px;display:grid;place-items:center;}" +
    ".continue{padding:0 14px;}" +
    ".send:disabled,.continue:disabled{opacity:.45;cursor:default;}" +
    ".confirm{display:flex;gap:8px;align-items:center;padding:10px 12px;border-top:1px solid #ececee;background:#fff;font-size:13px;line-height:1.35;}" +
    ".confirm p{margin:0;flex:1;}" +
    ".confirm button{border:0;border-radius:10px;padding:8px 10px;cursor:pointer;}" +
    ".cancel{background:#f4f4f5;color:#1c1c1e;}" +
    ".reset{background:#1c1c1e;color:#fff;}" +
    "[hidden]{display:none !important;}" +
    "</style>" +
    '<div class="panel" role="dialog" aria-label="' + escapeAttr(title) + '">' +
    '<div class="head"><span class="brand">' + icons.agent + '</span><div class="titles"><h2></h2><p class="who"></p></div>' +
    '<div class="actions"><button class="icon fresh" type="button" aria-label="New conversation">' + icons.fresh + "</button>" +
    '<button class="icon close" type="button" aria-label="Close chat">' + icons.close + "</button></div></div>" +
    '<div class="log"></div>' +
    '<div class="confirm" hidden><p>Start fresh? This clears the chat and email on this device.</p>' +
    '<button class="cancel" type="button">Cancel</button><button class="reset" type="button">Reset</button></div>' +
    '<div class="gate"><p>Add your email for this conversation.</p>' +
    '<form><input type="email" name="email" required autocomplete="email" aria-label="Email" placeholder="you@email.com">' +
    '<button class="continue" type="submit">Continue</button></form></div>' +
    '<form class="composer"><textarea rows="1" aria-label="Message" placeholder="Type a message"></textarea>' +
    '<button class="send" type="submit" aria-label="Send">' + icons.send + "</button></form></div>" +
    '<button class="launcher" type="button" aria-expanded="false" aria-label="Open chat">' + icons.chat + "</button>";

  var panel = root.querySelector(".panel");
  var launcher = root.querySelector(".launcher");
  var log = root.querySelector(".log");
  var composer = root.querySelector(".composer");
  var gate = root.querySelector(".gate");
  var emailForm = gate.querySelector("form");
  var emailInput = emailForm.querySelector("input");
  var input = composer.querySelector("textarea");
  var send = composer.querySelector(".send");
  var confirmBar = root.querySelector(".confirm");
  var who = root.querySelector(".who");
  root.querySelector(".head h2").textContent = title;

  launcher.addEventListener("click", toggle);
  root.querySelector(".close").addEventListener("click", toggle);
  root.querySelector(".fresh").addEventListener("click", function () {
    confirmBar.hidden = false;
  });
  confirmBar.querySelector(".cancel").addEventListener("click", function () {
    confirmBar.hidden = true;
  });
  confirmBar.querySelector(".reset").addEventListener("click", reset);
  emailForm.addEventListener("submit", onEmail);
  composer.addEventListener("submit", onSubmit);
  input.addEventListener("keydown", function (event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      composer.requestSubmit();
    }
  });

  render();
  document.body.appendChild(host);

  function toggle() {
    var open = panel.classList.toggle("open");
    launcher.setAttribute("aria-expanded", open ? "true" : "false");
    launcher.setAttribute("aria-label", open ? "Close chat" : "Open chat");
    launcher.innerHTML = open ? icons.close : icons.chat;
    if (open) focusEntry();
  }

  function onEmail(event) {
    event.preventDefault();
    var email = emailInput.value.trim();
    if (!email || !emailInput.checkValidity()) return;
    convo.email = email;
    save();
    emailInput.value = "";
    render();
    input.focus();
  }

  function onSubmit(event) {
    event.preventDefault();
    var text = input.value.trim();
    if (!text || !convo.email || send.disabled) return;
    input.value = "";
    convo.messages.push({ kind: "user", text: text });
    save();
    addBubble(text, "user");
    send.disabled = true;
    var pending = addBubble("…", "agent");
    var gen = generation;

    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state: { customer: convo.email, message: text } }),
    })
      .then(function (res) {
        return res.json().then(function (body) {
          return { ok: res.ok, body: body };
        });
      })
      .then(function (result) {
        if (gen !== generation) return;
        console.log("agent", result.body);
        var reply =
          result.ok && result.body && result.body.reply
            ? result.body.reply
            : (result.body && result.body.error) || "Something went wrong.";
        var kind = result.ok ? "agent" : "error";
        convo.messages.push({ kind: kind, text: reply });
        save();
        setBubble(pending, reply, kind);
      })
      .catch(function () {
        if (gen !== generation) return;
        var reply = "Couldn't reach support. Try again.";
        convo.messages.push({ kind: "error", text: reply });
        save();
        setBubble(pending, reply, "error");
      })
      .finally(function () {
        if (gen !== generation) return;
        send.disabled = false;
        input.focus();
      });
  }

  function reset() {
    generation += 1;
    convo = { email: "", messages: [] };
    try {
      localStorage.removeItem(storageKey);
    } catch (err) {
      /* private mode keeps the in-memory reset */
    }
    confirmBar.hidden = true;
    send.disabled = false;
    input.value = "";
    emailInput.value = "";
    render();
    emailInput.focus();
  }

  function render() {
    log.replaceChildren();
    addBubble(greeting, "agent");
    convo.messages.forEach(function (message) {
      addBubble(message.text, message.kind);
    });
    var hasEmail = Boolean(convo.email);
    gate.hidden = hasEmail;
    composer.hidden = !hasEmail;
    who.textContent = hasEmail ? convo.email : "";
  }

  function focusEntry() {
    if (convo.email) input.focus();
    else emailInput.focus();
  }

  function addBubble(text, kind) {
    var msg = document.createElement("div");
    msg.className = "msg " + kind;
    var bubble = document.createElement("div");
    bubble.className = "bubble";
    var mark = document.createElement("span");
    mark.className = "mark";
    mark.innerHTML = icons[kind] || icons.agent;
    var body = document.createElement("p");
    body.className = "text";
    body.textContent = text;
    bubble.appendChild(mark);
    bubble.appendChild(body);
    msg.appendChild(bubble);
    log.appendChild(msg);
    log.scrollTop = log.scrollHeight;
    return { msg: msg, mark: mark, body: body };
  }

  function setBubble(entry, text, kind) {
    entry.msg.className = "msg " + kind;
    entry.mark.innerHTML = icons[kind] || icons.agent;
    entry.body.textContent = text;
    log.scrollTop = log.scrollHeight;
  }

  function load() {
    try {
      var raw = localStorage.getItem(storageKey);
      if (!raw) return { email: "", messages: [] };
      var data = JSON.parse(raw);
      var email = typeof data.email === "string" ? data.email : "";
      var messages = Array.isArray(data.messages)
        ? data.messages.filter(function (message) {
            return message && typeof message.text === "string" && (message.kind === "user" || message.kind === "agent" || message.kind === "error");
          })
        : [];
      return { email: email, messages: messages };
    } catch (err) {
      return { email: "", messages: [] };
    }
  }

  function save() {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ email: convo.email, messages: convo.messages }));
    } catch (err) {
      /* keep the conversation in memory when storage is blocked */
    }
  }

  function escapeAttr(value) {
    return String(value).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }
})();
