/* global io, Swal, Toastify */

const ROOMS = [
  { name: "General", key: "General", icon: "◈" },
  { name: "Programación Web", key: "ProgramacionWeb", icon: "⌘" },
  { name: "Base de Datos", key: "BaseDeDatos", icon: "▦" },
  { name: "Trabajos y Tareas", key: "TrabajosYTareas", icon: "✓" },
  { name: "Avisos Académicos", key: "AvisosAcademicos", icon: "!" },
  { name: "Ayuda Estudiantil", key: "AyudaEstudiantil", icon: "?" }
];

const PAGE_SIZE = 20;
const MAX_FILE_SIZE = 1.5 * 1024 * 1024;
// Cambiar a "/assets/notification.mp3" cuando se agregue ese archivo opcional.
const NOTIFICATION_AUDIO_URL = null;
const DOGE_IMAGE_URL = "/assets/doge.png";
const DOGE_ROOM = "General";
const socket = io();

const state = {
  username: "",
  room: "General",
  histories: {},
  visibleCount: PAGE_SIZE,
  typingTimer: null,
  remoteTypingTimers: new Map(),
  remoteTypingUsers: new Set(),
  joinedSocketId: null,
  doge: {
    element: null,
    rafId: null,
    lastTime: 0,
    x: 34,
    y: 28,
    velocityX: 95,
    velocityY: 76
  }
};

const elements = {
  loginView: document.querySelector("#loginView"),
  chatView: document.querySelector("#chatView"),
  loginForm: document.querySelector("#loginForm"),
  username: document.querySelector("#username"),
  initialRoom: document.querySelector("#initialRoom"),
  roomList: document.querySelector("#roomList"),
  activeRoomTitle: document.querySelector("#activeRoomTitle"),
  activeRoomIcon: document.querySelector("#activeRoomIcon"),
  profileName: document.querySelector("#profileName"),
  profileAvatar: document.querySelector("#profileAvatar"),
  messagesColumn: document.querySelector(".messages-column"),
  messages: document.querySelector("#messages"),
  messageForm: document.querySelector("#messageForm"),
  messageInput: document.querySelector("#messageInput"),
  messageSearch: document.querySelector("#messageSearch"),
  fileButton: document.querySelector("#fileButton"),
  fileInput: document.querySelector("#fileInput"),
  emojiButton: document.querySelector("#emojiButton"),
  emojiPanel: document.querySelector("#emojiPanel"),
  emojiPicker: document.querySelector("emoji-picker"),
  typingIndicator: document.querySelector("#typingIndicator"),
  usersList: document.querySelector("#usersList"),
  userCount: document.querySelector("#userCount"),
  sidebar: document.querySelector("#sidebar"),
  usersPanel: document.querySelector("#usersPanel"),
  overlay: document.querySelector("#overlay"),
  openSidebar: document.querySelector("#openSidebar"),
  closeSidebar: document.querySelector("#closeSidebar"),
  toggleUsers: document.querySelector("#toggleUsers"),
  closeUsers: document.querySelector("#closeUsers"),
  logoutButton: document.querySelector("#logoutButton")
};

function showAlert(title, text, icon = "warning") {
  if (window.Swal) {
    return Swal.fire({
      title,
      text,
      icon,
      confirmButtonText: "Entendido",
      confirmButtonColor: "#1775d1"
    });
  }
  window.alert(`${title}\n${text}`);
  return Promise.resolve();
}

function showToast(message, kind = "info") {
  const colors = {
    join: "linear-gradient(135deg, #14805c, #22a879)",
    leave: "linear-gradient(135deg, #66758a, #8495a7)",
    error: "linear-gradient(135deg, #b82f43, #d94a5a)",
    message: "linear-gradient(135deg, #12355f, #1775d1)",
    info: "linear-gradient(135deg, #12355f, #2e91ea)"
  };

  if (window.Toastify) {
    Toastify({
      text: message,
      duration: 3000,
      gravity: "top",
      position: "right",
      close: true,
      stopOnFocus: true,
      style: { background: colors[kind] || colors.info, borderRadius: "10px" }
    }).showToast();
    return;
  }

  // Respaldo local si Toastify no pudo cargarse desde el CDN.
  const toast = document.createElement("div");
  toast.className = "native-toast";
  toast.textContent = message;
  toast.style.background = colors[kind] || colors.info;
  document.body.append(toast);
  window.setTimeout(() => toast.classList.add("visible"), 10);
  window.setTimeout(() => {
    toast.classList.remove("visible");
    window.setTimeout(() => toast.remove(), 180);
  }, 3000);
}

function playNotificationSound() {
  if (NOTIFICATION_AUDIO_URL) {
    const audio = new Audio(NOTIFICATION_AUDIO_URL);
    audio.volume = 0.35;
    audio.play().catch(playFallbackTone);
    return;
  }

  playFallbackTone();
}

function playFallbackTone() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = 720;
    gain.gain.setValueAtTime(0.055, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.12);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.12);
    oscillator.addEventListener("ended", () => context.close());
  } catch {
    // El navegador puede bloquear audio sin interacción previa.
  }
}

function ensureDogeElement() {
  if (state.doge.element) return state.doge.element;

  const doge = document.createElement("img");
  doge.className = "doge-screensaver";
  doge.src = DOGE_IMAGE_URL;
  doge.alt = "";
  doge.setAttribute("aria-hidden", "true");
  doge.decoding = "async";
  doge.loading = "eager";
  elements.messagesColumn.append(doge);
  state.doge.element = doge;
  return doge;
}

function isDogeVisible() {
  return !elements.chatView.hidden && state.room === DOGE_ROOM;
}

function dogeBounds() {
  const doge = ensureDogeElement();
  const messagesRect = elements.messages.getBoundingClientRect();
  const columnRect = elements.messagesColumn.getBoundingClientRect();
  const dogeWidth = doge.offsetWidth || 120;
  const dogeHeight = doge.offsetHeight || 120;
  const maxX = Math.max(0, messagesRect.width - dogeWidth);
  const maxY = Math.max(0, messagesRect.height - dogeHeight);

  return {
    offsetX: messagesRect.left - columnRect.left,
    offsetY: messagesRect.top - columnRect.top,
    maxX,
    maxY
  };
}

function positionDoge() {
  const doge = ensureDogeElement();
  const bounds = dogeBounds();
  state.doge.x = Math.min(Math.max(0, state.doge.x), bounds.maxX);
  state.doge.y = Math.min(Math.max(0, state.doge.y), bounds.maxY);
  doge.style.transform = `translate3d(${bounds.offsetX + state.doge.x}px, ${bounds.offsetY + state.doge.y}px, 0)`;
}

function animateDoge(timestamp = 0) {
  if (!isDogeVisible()) {
    stopDogeAnimation();
    return;
  }

  const doge = ensureDogeElement();
  doge.classList.add("visible");

  const bounds = dogeBounds();
  const previousTime = state.doge.lastTime || timestamp;
  const delta = Math.min((timestamp - previousTime) / 1000, 0.034);
  state.doge.lastTime = timestamp;

  state.doge.x += state.doge.velocityX * delta;
  state.doge.y += state.doge.velocityY * delta;

  if (state.doge.x <= 0 || state.doge.x >= bounds.maxX) {
    state.doge.x = Math.min(Math.max(state.doge.x, 0), bounds.maxX);
    state.doge.velocityX *= -1;
  }

  if (state.doge.y <= 0 || state.doge.y >= bounds.maxY) {
    state.doge.y = Math.min(Math.max(state.doge.y, 0), bounds.maxY);
    state.doge.velocityY *= -1;
  }

  doge.style.transform = `translate3d(${bounds.offsetX + state.doge.x}px, ${bounds.offsetY + state.doge.y}px, 0)`;
  state.doge.rafId = requestAnimationFrame(animateDoge);
}

function startDogeAnimation() {
  if (!isDogeVisible()) {
    stopDogeAnimation();
    return;
  }

  ensureDogeElement().classList.add("visible");
  positionDoge();
  if (!state.doge.rafId) {
    state.doge.lastTime = 0;
    state.doge.rafId = requestAnimationFrame(animateDoge);
  }
}

function stopDogeAnimation() {
  if (state.doge.rafId) {
    cancelAnimationFrame(state.doge.rafId);
    state.doge.rafId = null;
  }
  state.doge.lastTime = 0;
  if (state.doge.element) state.doge.element.classList.remove("visible");
}

function updateDogeBackground() {
  if (isDogeVisible()) {
    startDogeAnimation();
  } else {
    stopDogeAnimation();
  }
}

function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function formatTime(timestamp) {
  return new Intl.DateTimeFormat("es-CL", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(timestamp));
}

function roomConfig(roomName) {
  return ROOMS.find((room) => room.name === roomName) || ROOMS[0];
}

function historyKey(roomName) {
  return `chatHistory_${roomConfig(roomName).key}`;
}

function loadHistory(roomName) {
  if (state.histories[roomName]) return state.histories[roomName];

  try {
    const parsed = JSON.parse(localStorage.getItem(historyKey(roomName)) || "[]");
    state.histories[roomName] = Array.isArray(parsed) ? parsed : [];
  } catch {
    state.histories[roomName] = [];
  }
  return state.histories[roomName];
}

function saveHistory(roomName) {
  try {
    // Limita el historial para evitar que localStorage crezca indefinidamente.
    const history = loadHistory(roomName).slice(-200);
    state.histories[roomName] = history;
    localStorage.setItem(historyKey(roomName), JSON.stringify(history));
  } catch {
    showToast("El archivo es demasiado grande para guardarlo en el historial local.", "error");
  }
}

function addToHistory(message) {
  const history = loadHistory(message.room);
  if (history.some((item) => item.id === message.id)) return;
  history.push(message);
  saveHistory(message.room);
}

function createEmptyState(searching = false) {
  const wrapper = document.createElement("div");
  wrapper.className = "empty-state";

  const icon = document.createElement("div");
  icon.textContent = searching ? "⌕" : "✦";
  const title = document.createElement("strong");
  title.textContent = searching
    ? "No se encontraron mensajes relacionados."
    : "Esta conversación está lista";
  const text = document.createElement("p");
  text.textContent = searching
    ? "Prueba con otro nombre, sala o contenido."
    : "Sé la primera persona en compartir un mensaje.";

  wrapper.append(icon, title, text);
  return wrapper;
}

function createMessageElement(message) {
  const own = message.username === state.username;
  const row = document.createElement("article");
  row.className = `message-row${own ? " own" : ""}`;
  row.dataset.search = `${message.username} ${message.room} ${message.text || ""} ${message.fileName || ""}`.toLowerCase();

  const avatar = document.createElement("div");
  avatar.className = "message-avatar";
  avatar.textContent = initials(message.username);

  const content = document.createElement("div");
  content.className = "message-content";
  const meta = document.createElement("div");
  meta.className = "message-meta";

  const author = document.createElement("strong");
  author.textContent = own ? "Tú" : message.username;
  const time = document.createElement("span");
  time.textContent = formatTime(message.timestamp);
  meta.append(author, time);

  const bubble = document.createElement("div");
  bubble.className = "message-bubble";

  if (message.type === "file") {
    if (message.fileType.startsWith("image/")) {
      const link = document.createElement("a");
      link.href = message.fileData;
      link.download = message.fileName;
      const image = document.createElement("img");
      image.className = "image-preview";
      image.src = message.fileData;
      image.alt = `Imagen compartida: ${message.fileName}`;
      link.append(image);
      bubble.append(link);
    } else {
      const link = document.createElement("a");
      link.className = "file-card";
      link.href = message.fileData;
      link.download = message.fileName;

      const icon = document.createElement("div");
      icon.className = "file-card-icon";
      icon.textContent = "↧";
      const details = document.createElement("span");
      const name = document.createElement("strong");
      name.textContent = message.fileName;
      const helper = document.createElement("small");
      helper.textContent = "Haz clic para descargar";
      details.append(name, helper);
      link.append(icon, details);
      bubble.append(link);
    }
  } else {
    bubble.textContent = message.text;
  }

  content.append(meta, bubble);
  row.append(avatar, content);
  return row;
}

function renderMessages({ preserveScroll = false } = {}) {
  const query = elements.messageSearch.value.trim().toLowerCase();
  const allMessages = loadHistory(state.room);
  const filtered = query
    ? allMessages.filter((message) =>
        `${message.username} ${message.room} ${message.text || ""} ${message.fileName || ""}`
          .toLowerCase()
          .includes(query)
      )
    : allMessages;

  const previousHeight = elements.messages.scrollHeight;
  const visibleMessages = query ? filtered : filtered.slice(-state.visibleCount);
  elements.messages.replaceChildren();

  if (!visibleMessages.length) {
    elements.messages.append(createEmptyState(Boolean(query)));
    return;
  }

  if (!query && visibleMessages.length < filtered.length) {
    const hint = document.createElement("div");
    hint.className = "history-hint";
    hint.textContent = "Desplázate hacia arriba para cargar mensajes anteriores";
    elements.messages.append(hint);
  }

  const fragment = document.createDocumentFragment();
  visibleMessages.forEach((message) => fragment.append(createMessageElement(message)));
  elements.messages.append(fragment);

  if (preserveScroll) {
    elements.messages.scrollTop = elements.messages.scrollHeight - previousHeight;
  } else {
    elements.messages.scrollTop = elements.messages.scrollHeight;
  }
}

function renderRooms() {
  elements.initialRoom.replaceChildren();
  elements.roomList.replaceChildren();

  ROOMS.forEach((room) => {
    const option = document.createElement("option");
    option.value = room.name;
    option.textContent = room.name;
    elements.initialRoom.append(option);

    const button = document.createElement("button");
    button.type = "button";
    button.className = `room-button${state.room === room.name ? " active" : ""}`;
    button.dataset.room = room.name;

    const glyph = document.createElement("span");
    glyph.className = "room-glyph";
    glyph.textContent = room.icon;
    const label = document.createElement("span");
    label.textContent = room.name;
    button.append(glyph, label);
    elements.roomList.append(button);
  });
}

function updateActiveRoom(roomName) {
  state.room = roomName;
  state.visibleCount = PAGE_SIZE;
  elements.messageSearch.value = "";
  elements.activeRoomTitle.textContent = roomName;
  elements.activeRoomIcon.textContent = roomConfig(roomName).icon;
  clearRemoteTyping();
  renderRooms();
  renderMessages();
  updateDogeBackground();
  closePanels();
}

function updateTypingIndicator() {
  const names = [...state.remoteTypingUsers];
  if (!names.length) {
    elements.typingIndicator.textContent = "";
  } else if (names.length === 1) {
    elements.typingIndicator.textContent = `${names[0]} está escribiendo...`;
  } else {
    elements.typingIndicator.textContent = `${names.slice(0, 2).join(" y ")} están escribiendo...`;
  }
}

function clearRemoteTyping() {
  state.remoteTypingTimers.forEach((timer) => clearTimeout(timer));
  state.remoteTypingTimers.clear();
  state.remoteTypingUsers.clear();
  updateTypingIndicator();
}

function renderUsers(users) {
  elements.usersList.replaceChildren();
  elements.userCount.textContent = users.length;

  users.forEach((user) => {
    const row = document.createElement("div");
    row.className = "user-item";
    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.textContent = initials(user.username);
    const info = document.createElement("div");
    info.className = "user-info";
    const name = document.createElement("strong");
    name.textContent = user.username === state.username ? `${user.username} (Tú)` : user.username;
    const status = document.createElement("span");
    status.textContent = "● Disponible";
    info.append(name, status);
    row.append(avatar, info);
    elements.usersList.append(row);
  });
}

function closePanels() {
  elements.sidebar.classList.remove("open");
  elements.usersPanel.classList.remove("open");
  elements.overlay.classList.remove("visible");
}

function openPanel(panel) {
  closePanels();
  panel.classList.add("open");
  elements.overlay.classList.add("visible");
}

function enterChat(username, room) {
  state.username = username;
  state.room = room;
  elements.profileName.textContent = username;
  elements.profileAvatar.textContent = initials(username);
  elements.loginView.hidden = true;
  elements.chatView.hidden = false;
  updateActiveRoom(room);
  joinCurrentSocket();
  elements.messageInput.focus();
}

function joinCurrentSocket() {
  if (!state.username || !socket.connected || state.joinedSocketId === socket.id) return;
  state.joinedSocketId = socket.id;
  socket.emit("joinRoom", { username: state.username, room: state.room });
}

elements.loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const username = elements.username.value.trim();

  if (!username) {
    showAlert("Nombre requerido", "Escribe tu nombre para entrar al chat.");
    return;
  }
  if (username.length < 3) {
    showAlert("Nombre demasiado corto", "El nombre debe tener al menos 3 caracteres.");
    return;
  }

  sessionStorage.setItem("unichatUsername", username);
  enterChat(username, elements.initialRoom.value);
});

elements.messageForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = elements.messageInput.value.trim();
  if (!text) return;

  socket.emit("chatMessage", { text });
  socket.emit("typing", { isTyping: false });
  elements.messageInput.value = "";
  clearTimeout(state.typingTimer);
});

elements.messageInput.addEventListener("input", () => {
  socket.emit("typing", { isTyping: Boolean(elements.messageInput.value.trim()) });
  clearTimeout(state.typingTimer);
  state.typingTimer = setTimeout(() => {
    socket.emit("typing", { isTyping: false });
  }, 2000);
});

elements.roomList.addEventListener("click", (event) => {
  const button = event.target.closest(".room-button");
  if (!button || button.dataset.room === state.room) return;
  socket.emit("changeRoom", { room: button.dataset.room });
});

elements.messageSearch.addEventListener("input", () => renderMessages());

elements.messages.addEventListener("scroll", () => {
  if (
    elements.messages.scrollTop <= 12 &&
    !elements.messageSearch.value &&
    state.visibleCount < loadHistory(state.room).length
  ) {
    state.visibleCount += PAGE_SIZE;
    renderMessages({ preserveScroll: true });
  }
});

elements.fileButton.addEventListener("click", () => elements.fileInput.click());

elements.fileInput.addEventListener("change", () => {
  const [file] = elements.fileInput.files;
  if (!file) return;

  if (file.size > MAX_FILE_SIZE) {
    showAlert(
      "Archivo demasiado grande",
      "Para esta demostración, selecciona un archivo de máximo 1,5 MB."
    );
    elements.fileInput.value = "";
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    socket.emit("fileMessage", {
      fileName: file.name,
      fileType: file.type || "application/octet-stream",
      fileData: reader.result
    });
    elements.fileInput.value = "";
  });
  reader.addEventListener("error", () => {
    showAlert("No se pudo leer el archivo", "Intenta seleccionar otro archivo.", "error");
  });
  reader.readAsDataURL(file);
});

elements.emojiButton.addEventListener("click", () => {
  elements.emojiPanel.hidden = !elements.emojiPanel.hidden;
});

elements.emojiPicker.addEventListener("emoji-click", (event) => {
  elements.messageInput.value += event.detail.unicode;
  elements.emojiPanel.hidden = true;
  elements.messageInput.focus();
});

document.querySelector(".emoji-fallback").addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  elements.messageInput.value += button.textContent;
  elements.emojiPanel.hidden = true;
  elements.messageInput.focus();
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".emoji-wrap")) elements.emojiPanel.hidden = true;
});

elements.openSidebar.addEventListener("click", () => openPanel(elements.sidebar));
elements.toggleUsers.addEventListener("click", () => openPanel(elements.usersPanel));
elements.closeSidebar.addEventListener("click", closePanels);
elements.closeUsers.addEventListener("click", closePanels);
elements.overlay.addEventListener("click", closePanels);

elements.logoutButton.addEventListener("click", () => {
  sessionStorage.removeItem("unichatUsername");
  window.location.reload();
});

socket.on("roomChanged", ({ room }) => {
  updateActiveRoom(room);
});

socket.on("chatMessage", (message) => {
  addToHistory(message);
  if (message.room === state.room) {
    renderMessages();
    if (message.username !== state.username) {
      showToast(`${message.username}: ${message.text}`, "message");
      playNotificationSound();
    }
  }
});

socket.on("fileMessage", (message) => {
  addToHistory(message);
  if (message.room === state.room) {
    renderMessages();
    if (message.username !== state.username) {
      showToast(`${message.username} compartió ${message.fileName}`, "message");
      playNotificationSound();
    }
  }
});

socket.on("notification", ({ message, kind, room }) => {
  if (!room || room === state.room) showToast(message, kind);
});

socket.on("roomUsers", ({ room, users }) => {
  if (room === state.room) renderUsers(users);
});

socket.on("typing", ({ username, room, isTyping }) => {
  if (room !== state.room || username === state.username) return;

  clearTimeout(state.remoteTypingTimers.get(username));
  if (isTyping) {
    state.remoteTypingUsers.add(username);
    updateTypingIndicator();
    const timer = setTimeout(() => {
      state.remoteTypingUsers.delete(username);
      state.remoteTypingTimers.delete(username);
      updateTypingIndicator();
    }, 2000);
    state.remoteTypingTimers.set(username, timer);
  } else {
    state.remoteTypingUsers.delete(username);
    state.remoteTypingTimers.delete(username);
    updateTypingIndicator();
  }
});

socket.on("connect", () => {
  joinCurrentSocket();
});

socket.on("disconnect", () => {
  state.joinedSocketId = null;
  clearRemoteTyping();
  renderUsers([]);
  if (state.username) showToast("Conexión interrumpida. Intentando reconectar...", "error");
});

socket.on("connect_error", () => {
  showToast("No se pudo conectar con el servidor.", "error");
});

renderRooms();

// Recupera el nombre solo durante la pestaña actual; no entra automáticamente.
const rememberedUsername = sessionStorage.getItem("unichatUsername");
if (rememberedUsername) elements.username.value = rememberedUsername;
