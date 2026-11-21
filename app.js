// ============================================
// PROJECT MANAGER — Plain JS version
// Data stored in localStorage (browser).
// ============================================

// ---------- Storage helpers ----------
const DB = {
  get users() { return JSON.parse(localStorage.getItem("pm_users") || "[]"); },
  set users(v) { localStorage.setItem("pm_users", JSON.stringify(v)); },

  get tasks() { return JSON.parse(localStorage.getItem("pm_tasks") || "[]"); },
  set tasks(v) { localStorage.setItem("pm_tasks", JSON.stringify(v)); },

  get currentUserId() { return localStorage.getItem("pm_current_user"); },
  set currentUserId(v) { localStorage.setItem("pm_current_user", v); },
};

// ---------- Simple hash (not secure, but hides plain password) ----------
function hashPassword(pw) {
  let hash = 0;
  for (let i = 0; i < pw.length; i++) {
    const chr = pw.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return "h_" + Math.abs(hash).toString(36);
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ---------- Session ----------
function getCurrentUser() {
  return DB.users.find((u) => u.id === DB.currentUserId) || null;
}
function isAdmin() {
  const u = getCurrentUser();
  return u && u.role === "admin";
}

// ---------- UI refs ----------
const authScreen = document.getElementById("auth-screen");
const appScreen = document.getElementById("app-screen");
const tabLogin = document.getElementById("tab-login");
const tabSignup = document.getElementById("tab-signup");
const loginForm = document.getElementById("login-form");
const signupForm = document.getElementById("signup-form");
const loginError = document.getElementById("login-error");
const signupError = document.getElementById("signup-error");
const logoutBtn = document.getElementById("logout-btn");
const navAdmin = document.getElementById("nav-admin");

// ---------- Auth tabs ----------
tabLogin.onclick = () => {
  tabLogin.classList.add("active");
  tabSignup.classList.remove("active");
  loginForm.classList.remove("hidden");
  signupForm.classList.add("hidden");
  loginError.textContent = "";
};
tabSignup.onclick = () => {
  tabSignup.classList.add("active");
  tabLogin.classList.remove("active");
  signupForm.classList.remove("hidden");
  loginForm.classList.add("hidden");
  signupError.textContent = "";
};

// ---------- Signup ----------
signupForm.onsubmit = (e) => {
  e.preventDefault();
  signupError.textContent = "";

  const name = document.getElementById("signup-name").value.trim();
  const email = document.getElementById("signup-email").value.trim().toLowerCase();
  const password = document.getElementById("signup-password").value;

  if (password.length < 6) {
    signupError.textContent = "Password must be at least 6 characters";
    return;
  }

  const users = DB.users;
  if (users.some((u) => u.email === email)) {
    signupError.textContent = "Email already registered";
    return;
  }

  const newUser = {
    id: uid(),
    name,
    email,
    passwordHash: hashPassword(password),
    role: users.length === 0 ? "admin" : "member",
    createdAt: new Date().toISOString(),
  };
  users.push(newUser);
  DB.users = users;
  DB.currentUserId = newUser.id;

  signupForm.reset();
  enterApp();
};

// ---------- Login ----------
loginForm.onsubmit = (e) => {
  e.preventDefault();
  loginError.textContent = "";

  const email = document.getElementById("login-email").value.trim().toLowerCase();
  const password = document.getElementById("login-password").value;

  const user = DB.users.find((u) => u.email === email);
  if (!user || user.passwordHash !== hashPassword(password)) {
    loginError.textContent = "Invalid email or password";
    return;
  }

  DB.currentUserId = user.id;
  loginForm.reset();
  enterApp();
};

// ---------- Logout ----------
logoutBtn.onclick = () => {
  DB.currentUserId = null;
  appScreen.classList.add("hidden");
  authScreen.classList.remove("hidden");
  tabLogin.click();
};

// ---------- Enter app ----------
function enterApp() {
  authScreen.classList.add("hidden");
  appScreen.classList.remove("hidden");

  const user = getCurrentUser();
  document.getElementById("current-user-name").textContent = user.name;
  document.getElementById("current-user-role").textContent = user.role;

  navAdmin.classList.toggle("hidden", !isAdmin());

  switchView("dashboard");
  refreshAll();
}

// ---------- Navigation ----------
document.querySelectorAll(".nav-btn").forEach((btn) => {
  btn.onclick = () => switchView(btn.dataset.view);
});

function switchView(view) {
  document.querySelectorAll(".view").forEach((v) => v.classList.add("hidden"));
  document.getElementById("view-" + view).classList.remove("hidden");

  document.querySelectorAll(".nav-btn").forEach((b) =>
    b.classList.toggle("active", b.dataset.view === view)
  );

  if (view === "admin" && !isAdmin()) {
    switchView("dashboard");
  }
}

// ---------- Tasks ----------
const taskForm = document.getElementById("task-form");
const taskList = document.getElementById("task-list");
const taskAssigneeSelect = document.getElementById("task-assignee");

taskForm.onsubmit = (e) => {
  e.preventDefault();
  const title = document.getElementById("task-title").value.trim();
  const description = document.getElementById("task-desc").value.trim();
  const assignedTo = taskAssigneeSelect.value || null;
  if (!title) return;

  const user = getCurrentUser();
  const tasks = DB.tasks;
  tasks.push({
    id: uid(),
    title,
    description,
    status: "todo",
    assignedTo,
    createdBy: user.id,
    createdAt: new Date().toISOString(),
  });
  DB.tasks = tasks;

  taskForm.reset();
  refreshAll();
};

function renderTasks() {
  const tasks = DB.tasks;
  const users = DB.users;

  taskList.innerHTML = "";
  if (tasks.length === 0) {
    taskList.innerHTML = '<p class="hint">No tasks yet. Add one above ☝️</p>';
    return;
  }

  tasks.forEach((t) => {
    const assignee = users.find((u) => u.id === t.assignedTo);
    const div = document.createElement("div");
    div.className = "task-item";
    div.innerHTML = `
      <div class="task-info">
        <div class="task-title">${escapeHtml(t.title)}</div>
        <div class="task-meta">
          ${escapeHtml(t.description || "No description")} •
          Assigned to: ${assignee ? escapeHtml(assignee.name) : "Unassigned"}
        </div>
      </div>
      <select data-id="${t.id}">
        <option value="todo" ${t.status === "todo" ? "selected" : ""}>To Do</option>
        <option value="inprogress" ${t.status === "inprogress" ? "selected" : ""}>In Progress</option>
        <option value="done" ${t.status === "done" ? "selected" : ""}>Done</option>
      </select>
      <button class="delete-btn" data-del="${t.id}" title="Delete">🗑</button>
    `;
    taskList.appendChild(div);
  });

  // Status change
  taskList.querySelectorAll("select[data-id]").forEach((sel) => {
    sel.onchange = () => {
      const tasks = DB.tasks;
      const t = tasks.find((x) => x.id === sel.dataset.id);
      if (t) { t.status = sel.value; DB.tasks = tasks; refreshAll(); }
    };
  });

  // Delete
  taskList.querySelectorAll("[data-del]").forEach((btn) => {
    btn.onclick = () => {
      DB.tasks = DB.tasks.filter((x) => x.id !== btn.dataset.del);
      refreshAll();
    };
  });
}

// ---------- Assignee dropdown ----------
function renderAssigneeOptions() {
  const current = taskAssigneeSelect.value;
  taskAssigneeSelect.innerHTML = '<option value="">Unassigned</option>';
  DB.users.forEach((u) => {
    const opt = document.createElement("option");
    opt.value = u.id;
    opt.textContent = u.name;
    taskAssigneeSelect.appendChild(opt);
  });
  taskAssigneeSelect.value = current;
}

// ---------- Team ----------
function renderTeam() {
  const teamList = document.getElementById("team-list");
  const users = DB.users;
  const tasks = DB.tasks;
  teamList.innerHTML = "";
  users.forEach((u) => {
    const assigned = tasks.filter((t) => t.assignedTo === u.id).length;
    const div = document.createElement("div");
    div.className = "team-item";
    div.innerHTML = `
      <div>
        <div class="name">${escapeHtml(u.name)}</div>
        <div class="email">${escapeHtml(u.email)}</div>
      </div>
      <div>
        <span class="role-badge">${u.role}</span>
        <span class="email">${assigned} task(s)</span>
      </div>
    `;
    teamList.appendChild(div);
  });
}

// ---------- Dashboard ----------
function renderDashboard() {
  const tasks = DB.tasks;
  document.getElementById("stat-total-tasks").textContent = tasks.length;
  document.getElementById("stat-inprogress").textContent = tasks.filter((t) => t.status === "inprogress").length;
  document.getElementById("stat-completed").textContent = tasks.filter((t) => t.status === "done").length;
  document.getElementById("stat-members").textContent = DB.users.length;
}

// ---------- Analytics ----------
function renderAnalytics() {
  const tasks = DB.tasks;
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "done").length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  document.getElementById("progress-fill").style.width = pct + "%";
  document.getElementById("progress-label").textContent = pct + "% complete";

  const breakdown = document.getElementById("analytics-breakdown");
  breakdown.innerHTML = "";
  [
    { label: "To Do", value: tasks.filter((t) => t.status === "todo").length },
    { label: "In Progress", value: tasks.filter((t) => t.status === "inprogress").length },
    { label: "Done", value: done },
    { label: "Total", value: total },
  ].forEach((item) => {
    const card = document.createElement("div");
    card.className = "analytics-card";
    card.innerHTML = `<div class="num">${item.value}</div><div class="label">${item.label}</div>`;
    breakdown.appendChild(card);
  });
}

// ---------- Admin ----------
function renderAdmin() {
  if (!isAdmin()) return;
  const adminUsers = document.getElementById("admin-users");
  const adminTasks = document.getElementById("admin-tasks");

  adminUsers.innerHTML = "";
  DB.users.forEach((u) => {
    const div = document.createElement("div");
    div.className = "team-item";
    div.innerHTML = `
      <div>
        <div class="name">${escapeHtml(u.name)}</div>
        <div class="email">${escapeHtml(u.email)}</div>
      </div>
      <span class="role-badge">${u.role}</span>
    `;
    adminUsers.appendChild(div);
  });

  adminTasks.innerHTML = "";
  DB.tasks.forEach((t) => {
    const assignee = DB.users.find((u) => u.id === t.assignedTo);
    const div = document.createElement("div");
    div.className = "task-item";
    div.innerHTML = `
      <div class="task-info">
        <div class="task-title">${escapeHtml(t.title)}</div>
        <div class="task-meta">Status: ${t.status} • Assigned: ${assignee ? escapeHtml(assignee.name) : "Unassigned"}</div>
      </div>
    `;
    adminTasks.appendChild(div);
  });
}

// ---------- Utilities ----------
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[m]));
}

function refreshAll() {
  renderAssigneeOptions();
  renderTasks();
  renderTeam();
  renderDashboard();
  renderAnalytics();
  renderAdmin();
}

// ---------- Initial boot ----------
(function boot() {
  const user = getCurrentUser();
  if (user) enterApp();
  else {
    authScreen.classList.remove("hidden");
    appScreen.classList.add("hidden");
  }
})();
