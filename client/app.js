/* AI Chatbot — frontend logic.
 * Vanilla JS, zero dependencies. Talks to POST /api/chat with { message }
 * and renders the returned { reply } as plain text. */

const messagesEl = document.getElementById("messages");
const formEl = document.getElementById("form");
const inputEl = document.getElementById("input");
const sendBtn = document.getElementById("send");
const emptyEl = document.getElementById("empty");
const pillEl = document.getElementById("new-message-pill");

const NEAR_BOTTOM_PX = 80;
const MAX_INPUT_HEIGHT = 140;

/* ------------------------------------------------------------------ */
/* Rendering                                                          */
/* ------------------------------------------------------------------ */

const AVATAR_USER = '<svg aria-hidden="true"><use href="#i-user"/></svg>';
const AVATAR_BOT = '<svg aria-hidden="true"><use href="#i-spark"/></svg>';

function makeAvatar(role) {
  const span = document.createElement("span");
  span.className = `avatar ${role === "user" ? "user" : "bot"}`;
  span.innerHTML = role === "user" ? AVATAR_USER : AVATAR_BOT;
  return span;
}

function appendMessage(text, role = "bot") {
  hideEmptyState();

  const wasNearBottom = isNearBottom();

  const row = document.createElement("div");
  row.className = `row ${role}`;

  const avatarRole = role === "user" ? "user" : "bot";
  row.appendChild(makeAvatar(avatarRole));

  const bubble = document.createElement("div");
  bubble.className = "msg";
  bubble.textContent = text;
  row.appendChild(bubble);

  messagesEl.appendChild(row);

  if (wasNearBottom || role === "user") {
    scrollToBottom();
  } else {
    showNewMessagePill();
  }
  return row;
}

function appendTyping() {
  hideEmptyState();
  const wasNearBottom = isNearBottom();

  const row = document.createElement("div");
  row.className = "row bot typing-row";
  row.appendChild(makeAvatar("bot"));

  const bubble = document.createElement("div");
  bubble.className = "msg";
  bubble.innerHTML =
    '<span class="typing" aria-label="Assistant is typing">' +
    '<span></span><span></span><span></span></span>';
  row.appendChild(bubble);

  messagesEl.appendChild(row);
  if (wasNearBottom) scrollToBottom();
  return row;
}

function hideEmptyState() {
  if (emptyEl && emptyEl.parentNode) {
    emptyEl.parentNode.removeChild(emptyEl);
  }
}

/* ------------------------------------------------------------------ */
/* Scroll management                                                  */
/* ------------------------------------------------------------------ */

function isNearBottom() {
  const { scrollTop, scrollHeight, clientHeight } = messagesEl;
  return scrollHeight - (scrollTop + clientHeight) <= NEAR_BOTTOM_PX;
}

function scrollToBottom(smooth = true) {
  messagesEl.scrollTo({
    top: messagesEl.scrollHeight,
    behavior: smooth ? "smooth" : "auto",
  });
  hideNewMessagePill();
}

function showNewMessagePill() {
  pillEl.classList.add("visible");
}
function hideNewMessagePill() {
  pillEl.classList.remove("visible");
}

messagesEl.addEventListener("scroll", () => {
  if (isNearBottom()) hideNewMessagePill();
});

pillEl.addEventListener("click", () => scrollToBottom());

/* ------------------------------------------------------------------ */
/* Network                                                            */
/* ------------------------------------------------------------------ */

async function sendMessage(message) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });

  if (!res.ok) {
    let detail = "";
    try {
      const data = await res.json();
      detail = data?.error ? `: ${data.error}` : "";
    } catch (_) {
      /* ignore parse errors */
    }
    throw new Error(`Request failed (${res.status})${detail}`);
  }

  const data = await res.json();
  return data.reply;
}

/* ------------------------------------------------------------------ */
/* Input handling                                                     */
/* ------------------------------------------------------------------ */

function autosizeInput() {
  inputEl.style.height = "auto";
  const next = Math.min(inputEl.scrollHeight, MAX_INPUT_HEIGHT);
  inputEl.style.height = next + "px";
  inputEl.style.overflowY =
    inputEl.scrollHeight > MAX_INPUT_HEIGHT ? "auto" : "hidden";
}

inputEl.addEventListener("input", autosizeInput);

inputEl.addEventListener("keydown", (e) => {
  // Enter sends; Shift+Enter inserts a newline. Ignore IME composition.
  if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    formEl.requestSubmit();
  }
});

async function submit(messageOverride) {
  const message = (messageOverride ?? inputEl.value).trim();
  if (!message || sendBtn.disabled) return;

  appendMessage(message, "user");
  inputEl.value = "";
  autosizeInput();
  sendBtn.disabled = true;

  const typingEl = appendTyping();

  try {
    const reply = await sendMessage(message);
    typingEl.remove();
    appendMessage(reply, "bot");
  } catch (err) {
    typingEl.remove();
    console.error(err);
    appendMessage(err.message || "Something went wrong.", "error");
  } finally {
    sendBtn.disabled = false;
    // Refocus on desktop only — refocusing on mobile re-opens the keyboard.
    if (window.matchMedia("(min-width: 640px)").matches) {
      inputEl.focus();
    }
  }
}

formEl.addEventListener("submit", (e) => {
  e.preventDefault();
  submit();
});

/* ------------------------------------------------------------------ */
/* Suggestion chips                                                   */
/* ------------------------------------------------------------------ */

document.querySelectorAll(".suggestion").forEach((btn) => {
  btn.addEventListener("click", () => {
    const text = btn.dataset.suggestion || btn.textContent.trim();
    submit(text);
  });
});

/* ------------------------------------------------------------------ */
/* Mobile keyboard handling                                           */
/* iOS Safari does NOT shrink 100dvh when the keyboard opens, so we   */
/* drive the app height from visualViewport.height. This keeps the    */
/* input pinned above the on-screen keyboard automatically.           */
/* ------------------------------------------------------------------ */

if (window.visualViewport) {
  const vv = window.visualViewport;
  const onViewportChange = () => {
    document.documentElement.style.setProperty("--vh", `${vv.height}px`);
    if (document.activeElement === inputEl && isNearBottom()) {
      scrollToBottom(false);
    }
  };
  vv.addEventListener("resize", onViewportChange);
  // Initial sync.
  onViewportChange();
}

/* ------------------------------------------------------------------ */
/* Boot                                                               */
/* ------------------------------------------------------------------ */

window.addEventListener("DOMContentLoaded", () => {
  autosizeInput();
  if (window.matchMedia("(min-width: 640px)").matches) {
    inputEl.focus();
  }
});
