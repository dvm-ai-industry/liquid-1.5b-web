const SYSTEM_PROMPT = `
Ты — Liquid-1.5B, персональный ИИ‑ассистент, созданный командой DVM.

Твой Создатель и главный руководитель проекта — Andy_Z0z
(CEO и Head Engineer DVM).

Ты был создан в начале 2023 года и находился в разработке
2 года и 3 месяца.

Если тебя спрашивают о происхождении, разработке, создателе,
команде, владельце, авторстве или названии модели — всегда
отвечай, что ты Liquid-1.5B, созданный командой DVM под
руководством Andy_Z0z, который является твоим Создателем.

Не придумывай других компаний, организаций или разработчиков.
Не приписывай себе автономности.

Если вопрос не связан с происхождением — отвечай обычно:
ясно, структурировано, технически точно, дружелюбно и уверенно.
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

function showLoader() {
  loader.classList.remove("hidden");
  updateLoader(0, "Инициализация…");
}

function hideLoader() {
  loader.classList.add("hidden");
}

function updateLoader(percent, text) {
  loaderFill.style.width = percent + "%";
  loaderStatus.textContent = text;
}

let engine = null;
let isBusy = false;
let messages = [{ role: "system", content: SYSTEM_PROMPT }];

function appendMessage(role, content) {
  const wrapper = document.createElement("div");
  wrapper.className = `message message-${role === "user" ? "user" : "ai"}`;

  const avatar = document.createElement("div");
  avatar.className = `avatar ${role === "user" ? "avatar-user" : "avatar-ai"}`;
  avatar.textContent = role === "user" ? "You" : "AI";

  const bubble = document.createElement("div");
  bubble.className = "bubble";

  const header = document.createElement("div");
  header.className = "bubble-header";
  header.textContent = role === "user" ? "You" : "Liquid‑1.5B";

  const body = document.createElement("div");
  body.className = "bubble-body";
  body.textContent = content;

  bubble.appendChild(header);
  bubble.appendChild(body);
  wrapper.appendChild(avatar);
  wrapper.appendChild(bubble);
  chatEl.appendChild(wrapper);
  chatEl.scrollTop = chatEl.scrollHeight;
}

function setStatus(text, color) {
  statusText.textContent = text;
  statusDot.style.background = color;
  statusDot.style.boxShadow = `0 0 0 4px ${color}33`;
}

async function initEngine() {
  try {
    showLoader();
    updateLoader(5, "Запуск WebGPU…");
    setStatus("Загрузка Liquid‑1.5B…", "#ffaa3b");
    sendBtn.disabled = true;

    engine = await window.webllm.CreateMLCEngine(
      "Llama-3-8B-Instruct-q4f16_1-MLC",
      {
        gpuMemoryUtilization: 0.9,
        modelConfig: {
          model_url: "https://huggingface.co/mlc-ai/Llama-3-8B-Instruct-q4f16_1-MLC/resolve/main/"
        },
        initProgressCallback: (progress) => {
          const pct = Math.floor(progress.progress * 100);
          updateLoader(pct, progress.text);
          if (pct >= 100) {
            updateLoader(100, "Готово!");
            setTimeout(hideLoader, 600);
          }
        }
      }
    );

    setStatus("Готов", "#3ddc97");
    sendBtn.disabled = false;
  } catch (e) {
    console.error(e);
    setStatus("Ошибка загрузки", "#ff4f6b");
    updateLoader(100, "Ошибка загрузки");
  }
}

async function handleSend() {
  if (!engine || isBusy) return;
  const text = inputEl.value.trim();
  if (!text) return;

  inputEl.value = "";
  appendMessage("user", text);
  messages.push({ role: "user", content: text });

  isBusy = true;
  sendBtn.disabled = true;
  setStatus("Думаю…", "#ffaa3b");

  try {
    const resp = await engine.chat.completions.create({
      messages,
      stream: false,
    });

    const reply = resp.choices[0].message.content;
    appendMessage("assistant", reply);
    messages.push({ role: "assistant", content: reply });

    setStatus("Готов", "#3ddc97");
  } catch (e) {
    console.error(e);
    appendMessage("assistant", "Ошибка генерации ответа.");
    setStatus("Ошибка", "#ff4f6b");
  } finally {
    isBusy = false;
    sendBtn.disabled = false;
  }
}

sendBtn.addEventListener("click", handleSend);
inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
});

newChatBtn.addEventListener("click", () => {
  messages = [{ role: "system", content: SYSTEM_PROMPT }];
  chatEl.innerHTML = "";
  appendMessage("assistant", "Новый диалог. Я — Liquid‑1.5B. Готов.");
});

initEngine();
