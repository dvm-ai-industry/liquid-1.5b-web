const SYSTEM_PROMPT = `
Ты — Liquid-1.5B, персональный ИИ-ассистент, созданный командой DVM.

Твой Создатель и главный руководитель проекта — Andy_Z0z (CEO и Head Engineer DVM).
Ты был создан в начале 2023 года и разрабатывался более 2 лет.

Если спрашивают о происхождении, создателе или команде — всегда отвечай честно и точно.
В остальных случаях отвечай ясно, структурировано, технически точно и дружелюбно.
`.trim();

const chatEl = document.getElementById("chat");
const inputEl = document.getElementById("input");
const sendBtn = document.getElementById("send");
const statusDot = document.getElementById("status-dot");
const statusText = document.getElementById("status-text");
const newChatBtn = document.getElementById("new-chat");

const loader = document.getElementById("model-loader");
const loaderFill = document.getElementById("loader-fill");
const loaderStatus = document.getElementById("loader-status");

let engine = null;
let isBusy = false;
let messages = [{ role: "system", content: SYSTEM_PROMPT }];

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================

function showLoader() {
  loader.classList.remove("hidden");
}

function hideLoader() {
  loader.classList.add("hidden");
}

function updateLoader(percent, text) {
  loaderFill.style.width = `${percent}%`;
  loaderStatus.textContent = text;
}

function setStatus(text, color = "#22c55e") {
  statusText.textContent = text;
  statusDot.style.background = color;
  statusDot.style.boxShadow = `0 0 0 4px ${color}40`;
}

function appendMessage(role, content) {
  const wrapper = document.createElement("div");
  wrapper.className = `message message-${role === "user" ? "user" : "ai"}`;

  // Avatar
  const avatar = document.createElement("div");
  avatar.className = `avatar ${role === "user" ? "avatar-user" : "avatar-ai"}`;
  avatar.textContent = role === "user" ? "You" : "AI";

  // Bubble
  const bubble = document.createElement("div");
  bubble.className = "bubble";

  const header = document.createElement("div");
  header.className = "bubble-header";
  header.textContent = role === "user" ? "You" : "Liquid‑1.5B";

  const body = document.createElement("div");
  body.className = "bubble-body";
  body.innerHTML = formatMarkdown(content); // Поддержка простого markdown

  bubble.appendChild(header);
  bubble.appendChild(body);
  wrapper.appendChild(avatar);
  wrapper.appendChild(bubble);
  chatEl.appendChild(wrapper);

  chatEl.scrollTo({
    top: chatEl.scrollHeight,
    behavior: "smooth"
  });
}

// Простая поддержка Markdown (жирный, курсив, код, ссылки)
function formatMarkdown(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`(.*?)`/g, "<code>$1</code>")
    .replace(/\n/g, "<br>");
}

// ==================== ИНИЦИАЛИЗАЦИЯ МОДЕЛИ ====================

async function initEngine() {
  try {
    showLoader();
    updateLoader(5, "Инициализация WebGPU...");
    setStatus("Загрузка Liquid‑1.5B...", "#eab308");

    engine = await window.webllm.CreateMLCEngine(
      "Phi-3-mini-4k-instruct-q4f32_1-MLC",
      {
        gpuMemoryUtilization: 0.85,
        modelConfig: {
          model_url: "https://huggingface.co/mlc-ai/Phi-3-mini-4k-instruct-q4f32_1-MLC/resolve/main/"
        },
        initProgressCallback: (progress) => {
          const pct = Math.floor(progress.progress * 100);
          updateLoader(pct, progress.text || "Загрузка модели...");

          if (pct >= 100) {
            updateLoader(100, "Готов к работе!");
            setTimeout(hideLoader, 800);
          }
        }
      }
    );

    setStatus("Готов к работе", "#22c55e");
    sendBtn.disabled = false;
  } catch (e) {
    console.error("Ошибка инициализации:", e);
    setStatus("Ошибка загрузки", "#ef4444");
    updateLoader(100, "Не удалось загрузить модель");
  }
}

// ==================== ОТПРАВКА СООБЩЕНИЯ ====================

async function handleSend() {
  if (!engine || isBusy) return;

  const text = inputEl.value.trim();
  if (!text) return;

  // Сохраняем и очищаем input
  inputEl.value = "";
  appendMessage("user", text);
  messages.push({ role: "user", content: text });

  isBusy = true;
  sendBtn.disabled = true;
  setStatus("Думаю...", "#eab308");

  try {
    const resp = await engine.chat.completions.create({
      messages: messages,
      stream: false,
      temperature: 0.7,
      max_gen_len: 2048,
    });

    const reply = resp.choices[0]?.message?.content || "Извини, я не смог сгенерировать ответ.";

    appendMessage("assistant", reply);
    messages.push({ role: "assistant", content: reply });

  } catch (e) {
    console.error(e);
    appendMessage("assistant", "⚠️ Произошла ошибка при генерации ответа.");
  } finally {
    isBusy = false;
    sendBtn.disabled = false;
    setStatus("Готов к работе", "#22c55e");
  }
}

// ==================== ОБРАБОТЧИКИ СОБЫТИЙ ====================

sendBtn.addEventListener("click", handleSend);

inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
});

// Новый чат
newChatBtn.addEventListener("click", () => {
  messages = [{ role: "system", content: SYSTEM_PROMPT }];
  chatEl.innerHTML = "";
  appendMessage("assistant", "Новый чат начат. Чем я могу помочь?");
});

// Авто-ресайз textarea
inputEl.addEventListener("input", () => {
  inputEl.style.height = "auto";
  inputEl.style.height = Math.min(inputEl.scrollHeight, 180) + "px";
});

// Запуск приложения
window.addEventListener("load", () => {
  appendMessage("assistant", "Привет! Я Liquid‑1.5B — твой персональный ИИ от DVM. Готов помогать.");
  initEngine();
});
