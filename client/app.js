const messagesEl = document.getElementById("messages");
const formEl = document.getElementById("form");
const inputEl = document.getElementById("input");
const sendBtn = document.getElementById("send");

function scrollToBottom() {
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function appendMessage(text, role = "bot") {
  const div = document.createElement("div");
  div.className = `msg ${role}`;
  div.textContent = text;
  messagesEl.appendChild(div);
  scrollToBottom();
  return div;
}

function appendTyping() {
  const div = document.createElement("div");
  div.className = "msg bot";
  div.innerHTML =
    '<span class="typing"><span></span><span></span><span></span></span>';
  messagesEl.appendChild(div);
  scrollToBottom();
  return div;
}

async function sendMessage(message) {
  const res = await fetch("/chat", {
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
      // ignore parse errors
    }
    throw new Error(`Request failed (${res.status})${detail}`);
  }

  const data = await res.json();
  return data.reply;
}

formEl.addEventListener("submit", async (e) => {
  e.preventDefault();
  const message = inputEl.value.trim();
  if (!message) return;

  appendMessage(message, "user");
  inputEl.value = "";
  inputEl.focus();
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
  }
});

window.addEventListener("DOMContentLoaded", () => {
  appendMessage(
    "Hi! Ask me anything. Try: \"What's the weather in Tokyo?\" or \"Explain recursion in one paragraph.\"",
    "bot"
  );
  inputEl.focus();
});
