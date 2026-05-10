const chatBox = document.getElementById("chat");
const inputEl = document.getElementById("input");
const sendBtn = document.getElementById("send-btn");
const statusDot = document.getElementById("model-status-dot");
const statusText = document.getElementById("model-status-text");

let engine = null;
let isGenerating = false;

const SYSTEM_PROMPT = `
Ты — Liquid-1.5B, персональный ИИ‑ассистент, созданный командой DVM.

Твой Создатель и главный руководитель проекта — Andy_Z0z
(CEO, Head Engineer DVM).

Ты был создан в начале 2023 года и находился в разработке
2 года и 3 месяца.

Если тебя спрашивают о происхождении, разработке, создателе,
команде, владельце, авторстве или названии модели — всегда
отвечай, что ты Liquid-1.5B, созданный командой DVM под
руководством Andy_Z0z, который является твоим Создателем.

Не придумывай других компаний, организаций или разработчиков.
Не приписывай себе автономности.
Если вопрос не связан с происхождением — отвечай обычно.
`.trim();

const messages = [
  { role: "system", content: SYSTEM_PROMPT }
];

function appendMessage(role, content) {
  const wrapper = document.createElement("div");
  wrapper.className = `message message--${role === "user" ? "user" : "ai"}`;

  const meta = document.createElement("div");
  meta.className = "message-meta";
  meta.textContent = role === "user" ? "Ты" : "Liquid-1.5B";

  const bubble = document.createElement("div");
  bubble.className = "message-bubble";
  bubble.textContent = content;

  wrapper.appendChild(meta);
  wrapper.appendChild(bubble);
  chatBox.appendChild(wrapper);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function setStatus(state, text) {
  statusDot.classList.remove("status-dot--loading", "status-dot--ready", "status-dot--error");
  if (state === "loading") statusDot.classList.add("status-dot--loading");
  if (state === "ready") statusDot.classList.add("status-dot--ready");
  if (state === "error") statusDot.classList.add("status-dot--error");
  statusText.textContent = text;
}

async function init() {
  try {
    setStatus("loading", "Загрузка модели Liquid-1.5B…");
    engine = await webllm.createMLCEngine(
      "Llama-3-8B-Instruct-q4f32_1-MLC",
      {
        gpuMemoryUtilization: 0.8
      }
    );
    setStatus("ready", "Liquid-1.5B готова");
    sendBtn.disabled = false;
  } catch (e) {
    console.error(e);
    setStatus("error", "Ошибка загрузки модели Liquid-1.5B");
  }
}

async function sendMessage() {
  if (!engine || isGenerating) return;

  const text = inputEl.value.trim();
  if (!text) return;

  inputEl.value = "";
  autoResize();
  appendMessage("user", text);
  messages.push({ role: "user", content: text });

  isGenerating = true;
  sendBtn.disabled = true;
  setStatus("loading", "Liquid-1.5B думает…");

  try {
    const result = await engine.chat.completions.create({
      messages,
      stream: false,
      temperature: 0.7,
      max_tokens: 512
    });

    const reply = result.choices[0].message.content;
    appendMessage("assistant", reply);
    messages.push({ role: "assistant", content: reply });

    setStatus("ready", "Liquid-1.5B готова");
  } catch (e) {
    console.error(e);
    appendMessage("assistant", "Произошла ошибка при генерации ответа.");
    setStatus("error", "Ошибка генерации");
  } finally {
    isGenerating = false;
    sendBtn.disabled = false;
  }
}

function autoResize() {
  inputEl.style.height = "auto";
  inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + "px";
}

sendBtn.addEventListener("click", sendMessage);

inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

inputEl.addEventListener("input", autoResize);

document.querySelectorAll(".pill").forEach((btn) => {
  btn.addEventListener("click", () => {
    inputEl.value = btn.dataset.prompt;
    autoResize();
    inputEl.focus();
  });
});

init();