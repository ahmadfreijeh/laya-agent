(function () {
  var script = document.currentScript;
  if (!script || !script.src) return;
  if (document.getElementById("relay-chat")) return;

  var endpoint = script.dataset.endpoint || new URL("/agent", script.src).href;
  var title = script.dataset.title || "Support";
  var greeting = script.dataset.greeting || "Hi. How can we help?";
  var themeUrl = script.dataset.theme || new URL("/widget/theme", script.src).href;
  var previewing = false;
  var brainsUrl = script.dataset.brains || new URL("/questions", script.src).href;
  var pickedName = "relay-chat-brain:" + endpoint;
  var brains = [];
  var picked = loadPicked();
  var storageKey = storageName();

  var icons = {
    chat: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.2 18.2 4.8 20.5V7.4A2.4 2.4 0 0 1 7.2 5h9.6a2.4 2.4 0 0 1 2.4 2.4v8.4a2.4 2.4 0 0 1-2.4 2.4H7.2Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>',
    close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 7 7 17" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    send: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h12M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    fresh: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6v12M6 12h12" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    agent: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4.5 13v-1a7.5 7.5 0 0 1 15 0v1" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/><rect x="3.2" y="12.5" width="3.8" height="5.6" rx="1.4" fill="none" stroke="currentColor" stroke-width="1.7"/><rect x="17" y="12.5" width="3.8" height="5.6" rx="1.4" fill="none" stroke="currentColor" stroke-width="1.7"/></svg>',
    user: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M5.8 19c1.2-2.5 3.4-3.8 6.2-3.8s5 1.3 6.2 3.8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
    error: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7.5" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M12 8.2v4.6M12 16.2h.01" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>',
  };

  var BUBBLE_ICONS = {
    headset: icons.agent,
    user: icons.user,
    chat: icons.chat,
    bot: outline('<rect x="5" y="8" width="14" height="11" rx="3"/><path d="M12 4.5V8M9.5 13h.01M14.5 13h.01"/>'),
    sparkle: outline('<path d="M12 4l1.8 4.9 4.9 1.8-4.9 1.8L12 17.4l-1.8-4.9-4.9-1.8 4.9-1.8Z"/>'),
    smile: outline('<circle cx="12" cy="12" r="7.5"/><path d="M9 14c.8 1 1.8 1.5 3 1.5s2.2-.5 3-1.5M9.5 10h.01M14.5 10h.01"/>'),
    heart: outline('<path d="M12 19s-6.5-3.9-6.5-8.6A3.6 3.6 0 0 1 12 8.3a3.6 3.6 0 0 1 6.5 2.1C18.5 15.1 12 19 12 19Z"/>'),
    star: outline('<path d="M12 4.5l2.3 4.7 5.2.8-3.8 3.6.9 5.1L12 16.3l-4.6 2.4.9-5.1-3.8-3.6 5.2-.8Z"/>'),
    bolt: outline('<path d="M13 3.5 6 13h5l-1 7.5L17 11h-5Z"/>'),
    none: "",
  };
  script.relayBubbleIcons = BUBBLE_ICONS;
  var bubbleIcons = { agent: "headset", user: "user" };

  var dockHidden = script.dataset.dock === "hidden";
  var preview = script.dataset.preview === "true";
  var convo = load();
  var generation = 0;

  var host = document.createElement("div");
  host.id = "relay-chat";
  host.style.cssText = "all:initial;position:fixed;z-index:2147483647;right:20px;bottom:20px;font-family:\"DM Sans\",ui-sans-serif,system-ui,sans-serif;";
  var root = host.attachShadow({ mode: "open" });

  root.innerHTML =
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap">' +
    "<style>" +
    ":host{--primary:#1c1c1e;--on-primary:#fff;--chat-bg:#f7f7f8;--agent-bg:#fff;--agent-text:#1c1c1e;font-family:\"DM Sans\",ui-sans-serif,system-ui,sans-serif;color:#1c1c1e;}" +
    "button,textarea,input{font:inherit;}" +
    "svg{display:block;width:16px;height:16px;}" +
    ".launcher{width:56px;height:56px;border:0;border-radius:50%;background:var(--primary);color:var(--on-primary);cursor:pointer;display:grid;place-items:center;box-shadow:0 10px 28px rgba(28,28,30,.22);}" +
    ".launcher svg{width:24px;height:24px;}" +
    ".launcher{margin-left:auto;}" +
    ":host([data-side=left]) .launcher{margin-left:0;}" +
    ".launcher:focus-visible,.send:focus-visible,.close:focus-visible,.fresh:focus-visible,textarea:focus-visible,input:focus-visible,.confirm button:focus-visible{outline:2px solid #3b6cff;outline-offset:2px;}" +
    ".panel{display:none;flex-direction:column;width:min(380px,calc(100vw - 32px));height:min(560px,calc(100vh - 96px));margin-bottom:12px;background:#fff;border:1px solid #ececee;border-radius:20px;box-shadow:0 18px 50px rgba(28,28,30,.14);overflow:hidden;}" +
    ".panel.open{display:flex;}" +
    ".head{display:flex;align-items:center;gap:10px;padding:14px 8px 14px 16px;border-bottom:1px solid #ececee;}" +
    ".brand{width:32px;height:32px;border-radius:10px;background:var(--primary);color:var(--on-primary);display:grid;place-items:center;flex:none;overflow:hidden;}" +
    ".brand.logo{background:transparent;}" +
    ".brand img{width:100%;height:100%;object-fit:contain;display:block;}" +
    ".titles{min-width:0;}" +
    ".head h2{margin:0;font-size:15px;font-weight:600;letter-spacing:-.01em;}" +
    ".who{margin:2px 0 0;font-size:12px;color:#6b6b70;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}" +
    ".who:empty,.brain:empty{display:none;}" +
    ".brain{margin:2px 0 0;font-size:12px;color:#6b6b70;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}" +
    ".picker{display:block;max-width:100%;margin:4px 0 0;padding:3px 22px 3px 8px;border:1px solid #e4e4e7;border-radius:8px;background:#fafafa url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M7 10l5 5 5-5' fill='none' stroke='%236b6b70' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\") no-repeat right 5px center/12px;font:inherit;font-size:12px;color:#1c1c1e;cursor:pointer;-webkit-appearance:none;appearance:none;}" +
    ".picker:focus-visible{outline:2px solid #3b6cff;outline-offset:2px;}" +
    ".icon{width:32px;height:32px;border:0;border-radius:10px;background:transparent;color:#1c1c1e;cursor:pointer;display:grid;place-items:center;flex:none;}" +
    ".icon:hover{background:#f4f4f5;}" +
    ".actions{margin-left:auto;display:flex;}" +
    ".log{flex:1;overflow:auto;padding:16px;display:flex;flex-direction:column;gap:12px;background:var(--chat-bg);}" +
    ".msg{display:flex;}" +
    ".msg.user{justify-content:flex-end;}" +
    ".bubble{display:flex;gap:8px;align-items:flex-start;max-width:86%;padding:10px 12px;border-radius:16px;font-size:14px;line-height:1.45;}" +
    ".agent .bubble{background:var(--agent-bg);border:1px solid #ececee;border-bottom-left-radius:6px;color:var(--agent-text);}" +
    ".user .bubble{background:var(--primary);color:var(--on-primary);border-bottom-right-radius:6px;}" +
    ".error .bubble{background:#fff;border:1px solid #f3d0d0;color:#8f1d1d;border-bottom-left-radius:6px;}" +
    ".mark{flex:none;margin-top:2px;opacity:.8;}" +
    ".text{margin:0;white-space:pre-wrap;word-break:break-word;}" +
    ".gate{padding:16px;border-top:1px solid #ececee;background:#fff;}" +
    ".gate p{margin:0 0 10px;font-size:14px;line-height:1.4;}" +
    ".gate form,.composer{display:flex;gap:8px;align-items:flex-end;}" +
    ".composer{padding:12px;border-top:1px solid #ececee;background:#fff;}" +
    "textarea,input[type=email]{flex:1;min-width:0;resize:none;min-height:42px;max-height:96px;padding:10px 12px;border:1px solid #e4e4e7;border-radius:14px;background:#fafafa;color:#1c1c1e;box-sizing:border-box;}" +
    "textarea::placeholder,input::placeholder{color:#8e8e93;}" +
    ".send,.continue{height:42px;border:0;border-radius:14px;background:var(--primary);color:var(--on-primary);cursor:pointer;flex:none;}" +
    ".send{width:42px;display:grid;place-items:center;}" +
    ".continue{padding:0 14px;}" +
    ".send:disabled,.continue:disabled{opacity:.45;cursor:default;}" +
    ".confirm{display:flex;gap:8px;align-items:center;padding:10px 12px;border-top:1px solid #ececee;background:#fff;font-size:13px;line-height:1.35;}" +
    ".confirm p{margin:0;flex:1;}" +
    ".confirm button{border:0;border-radius:10px;padding:8px 10px;cursor:pointer;}" +
    ".cancel{background:#f4f4f5;color:#1c1c1e;}" +
    ".reset{background:var(--primary);color:var(--on-primary);}" +
    "[hidden]{display:none !important;}" +
    "</style>" +
    '<div class="panel" role="dialog" aria-label="' + escapeAttr(title) + '">' +
    '<div class="head"><span class="brand">' + icons.agent + '</span><div class="titles"><h2></h2><p class="who"></p><p class="brain"></p><select class="picker" aria-label="Brain" hidden></select></div>' +
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
  var brain = root.querySelector(".brain");
  var picker = root.querySelector(".picker");
  root.querySelector(".head h2").textContent = title;
  showBrain();
  if (dockHidden) {
    host.style.display = "none";
    launcher.hidden = true;
    panel.style.marginBottom = "0";
  }

  launcher.addEventListener("click", toggle);
  root.querySelector(".close").addEventListener("click", function () {
    if (panel.classList.contains("open")) toggle();
    if (dockHidden) host.style.display = "none";
  });
  root.querySelector(".fresh").addEventListener("click", function () {
    confirmBar.hidden = false;
  });
  confirmBar.querySelector(".cancel").addEventListener("click", function () {
    confirmBar.hidden = true;
  });
  confirmBar.querySelector(".reset").addEventListener("click", reset);
  emailForm.addEventListener("submit", onEmail);
  composer.addEventListener("submit", onSubmit);
  script.addEventListener("relay-open", function () {
    reset();
    if (dockHidden) host.style.display = "";
    if (!panel.classList.contains("open")) toggle();
    else focusEntry();
  });
  new MutationObserver(switchBrain).observe(script, { attributes: true, attributeFilter: ["data-key"] });
  picker.addEventListener("change", function () {
    picked = picker.value === "default" ? "" : picker.value;
    savePicked();
    switchBrain();
    focusEntry();
  });
  loadBrains();
  script.addEventListener("relay-theme", function (event) {
    previewing = true;
    applyTheme(event.detail || {});
  });
  loadTheme();
  input.addEventListener("keydown", function (event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      composer.requestSubmit();
    }
  });

  render();
  document.body.appendChild(host);
  if (script.dataset.open === "true") toggle();

  function loadTheme() {
    fetch(themeUrl)
      .then(function (res) {
        return res.ok ? res.json() : null;
      })
      .then(function (body) {
        if (body && body.theme && !previewing) applyTheme(body.theme);
      })
      .catch(function () {
        /* the built-in look stays when the theme can't be loaded */
      });
  }

  function applyTheme(theme) {
    var colors = {
      "--primary": theme.primary,
      "--on-primary": theme.primaryText,
      "--chat-bg": theme.chatBackground,
      "--agent-bg": theme.agentBubble,
      "--agent-text": theme.agentText,
    };
    Object.keys(colors).forEach(function (name) {
      if (/^#[0-9a-f]{6}$/i.test(colors[name] || "")) host.style.setProperty(name, colors[name]);
    });
    if (theme.title && !script.dataset.title) {
      title = theme.title;
      root.querySelector(".head h2").textContent = title;
      panel.setAttribute("aria-label", title);
    }
    if (theme.greeting && !script.dataset.greeting) greeting = theme.greeting;
    if (Object.prototype.hasOwnProperty.call(BUBBLE_ICONS, theme.agentIcon)) bubbleIcons.agent = theme.agentIcon;
    if (Object.prototype.hasOwnProperty.call(BUBBLE_ICONS, theme.userIcon)) bubbleIcons.user = theme.userIcon;
    var brand = root.querySelector(".brand");
    if (theme.logo) {
      var img = document.createElement("img");
      img.src = theme.logo;
      img.alt = "";
      brand.replaceChildren(img);
      brand.classList.add("logo");
    } else {
      brand.innerHTML = BUBBLE_ICONS[bubbleIcons.agent] || icons.agent;
      brand.classList.remove("logo");
    }
    var left = theme.position === "left";
    host.style.left = left ? "20px" : "";
    host.style.right = left ? "" : "20px";
    host.dataset.side = left ? "left" : "right";
    render();
  }

  function fixedBrain() {
    return (script.dataset.key || "").trim().replace(/\.json$/i, "");
  }

  function brainName() {
    return fixedBrain() || picked;
  }

  function switchBrain() {
    showBrain();
    var next = storageName();
    if (next === storageKey) return;
    storageKey = next;
    generation += 1;
    convo = load();
    confirmBar.hidden = true;
    send.disabled = false;
    input.value = "";
    render();
  }

  function loadBrains() {
    fetch(brainsUrl)
      .then(function (res) {
        return res.ok ? res.json() : { files: [] };
      })
      .then(function (body) {
        brains = (body.files || []).map(function (file) {
          return file.key;
        });
        if (picked && brains.indexOf(picked) === -1) picked = "";
        if (!picked && brains.length && brains.indexOf("default") === -1) picked = brains[0];
        picker.replaceChildren();
        brains.forEach(function (key) {
          var option = document.createElement("option");
          option.value = key;
          option.textContent = key;
          picker.appendChild(option);
        });
        picker.value = picked || "default";
        switchBrain();
      })
      .catch(function () {
        /* without the list the widget uses data-key or the server's default brain */
      });
  }

  function loadPicked() {
    try {
      return localStorage.getItem(pickedName) || "";
    } catch (err) {
      return "";
    }
  }

  function savePicked() {
    try {
      if (picked) localStorage.setItem(pickedName, picked);
      else localStorage.removeItem(pickedName);
    } catch (err) {
      /* the choice lasts for this page when storage is blocked */
    }
  }

  function storageName() {
    var key = brainName();
    return "relay-chat:" + endpoint + (key ? ":" + key : "");
  }

  function showBrain() {
    var key = fixedBrain();
    brain.textContent = key ? "Testing " + key : "";
    picker.hidden = Boolean(key) || brains.length < 2;
  }

  function requestBody(text) {
    var payload = { state: { customer: convo.email, message: text } };
    var key = brainName();
    if (key) payload.key = key;
    return payload;
  }

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
      body: JSON.stringify(requestBody(text)),
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
    if (preview && !convo.messages.length) {
      addBubble("Where is my order? It was due yesterday.", "user");
      addBubble("It shipped on Monday and should arrive tomorrow.", "agent");
    }
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
    setMark(mark, kind);
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
    setMark(entry.mark, kind);
    entry.body.textContent = text;
    log.scrollTop = log.scrollHeight;
  }

  function setMark(mark, kind) {
    var html = kind === "error" ? icons.error : BUBBLE_ICONS[kind === "user" ? bubbleIcons.user : bubbleIcons.agent];
    mark.innerHTML = html || "";
    mark.hidden = !html;
  }

  function outline(paths) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + paths + "</svg>";
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
