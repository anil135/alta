const statusEl = document.getElementById("status");
const authCard = document.getElementById("authCard");
const searchCard = document.getElementById("searchCard");
const welcomeLabel = document.getElementById("welcomeLabel");
const resultsEl = document.getElementById("results");

const showLoginBtn = document.getElementById("showLoginBtn");
const showRegisterBtn = document.getElementById("showRegisterBtn");
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");

const locationSelect = document.getElementById("locationSelect");
const cameraSelect = document.getElementById("cameraSelect");
const daySelect = document.getElementById("daySelect");
const startHour = document.getElementById("startHour");
const endHour = document.getElementById("endHour");
const searchBtn = document.getElementById("searchBtn");
const logoutBtn = document.getElementById("logoutBtn");

const API_BASE_URL = window.location.origin;
let token = localStorage.getItem("s3_portal_token") || "";
let userName = localStorage.getItem("s3_portal_user") || "";

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? "#b91c1c" : "#065f46";
}

function switchAuthTab(tab) {
  const loginActive = tab === "login";
  loginForm.classList.toggle("hidden", !loginActive);
  registerForm.classList.toggle("hidden", loginActive);
  showLoginBtn.classList.toggle("active", loginActive);
  showRegisterBtn.classList.toggle("active", !loginActive);
}

function authHeaders() {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function apiFetch(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, options);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.detail || "Request failed");
  }
  return body;
}

function updateAuthUi() {
  const isLoggedIn = Boolean(token);
  authCard.classList.toggle("hidden", isLoggedIn);
  searchCard.classList.toggle("hidden", !isLoggedIn);
  if (isLoggedIn) {
    welcomeLabel.textContent = `Logged in as ${userName}`;
  }
}

function resetSelect(selectEl, firstOptionText) {
  selectEl.innerHTML = `<option value="">${firstOptionText}</option>`;
}

function fillSelect(selectEl, firstOptionText, values) {
  resetSelect(selectEl, firstOptionText);
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    selectEl.appendChild(option);
  });
}

async function loadLocations() {
  const data = await apiFetch("/s3/locations", { headers: authHeaders() });
  fillSelect(locationSelect, "Select location", data.locations || []);
}

async function loadCameras(location) {
  const query = new URLSearchParams({ location });
  const data = await apiFetch(`/s3/cameras?${query}`, { headers: authHeaders() });
  fillSelect(cameraSelect, "Select camera", data.cameras || []);
  cameraSelect.disabled = false;
  daySelect.disabled = true;
  resetSelect(daySelect, "Select day");
}

async function loadDays(location, camera) {
  const query = new URLSearchParams({ location, camera });
  const data = await apiFetch(`/s3/days?${query}`, { headers: authHeaders() });
  fillSelect(daySelect, "Select day", data.days || []);
  daySelect.disabled = false;
}

function renderResults(items) {
  if (!items.length) {
    resultsEl.innerHTML = "<p>No footage found for selected filters.</p>";
    return;
  }

  resultsEl.innerHTML = items
    .map((item) => {
      const sizeMb = (item.size_bytes / (1024 * 1024)).toFixed(2);
      const hourLabel = item.hour === null ? "Unknown hour" : `Hour ${item.hour}`;
      return `
        <div class="result-item">
          <strong>${item.key}</strong>
          <div>${hourLabel} | ${sizeMb} MB</div>
          <a href="${item.download_url}" target="_blank" rel="noopener noreferrer">Download</a>
        </div>
      `;
    })
    .join("");
}

showLoginBtn.addEventListener("click", () => switchAuthTab("login"));
showRegisterBtn.addEventListener("click", () => switchAuthTab("register"));

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const payload = {
      email: document.getElementById("loginEmail").value.trim(),
      password: document.getElementById("loginPassword").value,
    };
    const data = await apiFetch("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    token = data.access_token;
    userName = data.user_name;
    localStorage.setItem("s3_portal_token", token);
    localStorage.setItem("s3_portal_user", userName);
    updateAuthUi();
    await loadLocations();
    setStatus("Login successful.");
  } catch (error) {
    setStatus(error.message, true);
  }
});

registerForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const payload = {
      full_name: document.getElementById("registerName").value.trim(),
      email: document.getElementById("registerEmail").value.trim(),
      password: document.getElementById("registerPassword").value,
    };
    const data = await apiFetch("/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    token = data.access_token;
    userName = data.user_name;
    localStorage.setItem("s3_portal_token", token);
    localStorage.setItem("s3_portal_user", userName);
    updateAuthUi();
    await loadLocations();
    setStatus("Account created and logged in.");
  } catch (error) {
    setStatus(error.message, true);
  }
});

locationSelect.addEventListener("change", async () => {
  const location = locationSelect.value;
  resultsEl.innerHTML = "";
  cameraSelect.disabled = true;
  daySelect.disabled = true;
  resetSelect(cameraSelect, "Select camera");
  resetSelect(daySelect, "Select day");
  if (!location) return;
  try {
    await loadCameras(location);
  } catch (error) {
    setStatus(error.message, true);
  }
});

cameraSelect.addEventListener("change", async () => {
  const location = locationSelect.value;
  const camera = cameraSelect.value;
  resultsEl.innerHTML = "";
  daySelect.disabled = true;
  resetSelect(daySelect, "Select day");
  if (!location || !camera) return;
  try {
    await loadDays(location, camera);
  } catch (error) {
    setStatus(error.message, true);
  }
});

searchBtn.addEventListener("click", async () => {
  try {
    const location = locationSelect.value;
    const camera = cameraSelect.value;
    const day = daySelect.value;
    if (!location || !camera || !day) {
      setStatus("Please select location, camera and day.", true);
      return;
    }

    const params = new URLSearchParams({
      location,
      camera,
      day,
      start_hour: String(startHour.value || 0),
      end_hour: String(endHour.value || 23),
    });

    const data = await apiFetch(`/s3/search?${params}`, { headers: authHeaders() });
    renderResults(data);
    setStatus(`Found ${data.length} file(s).`);
  } catch (error) {
    setStatus(error.message, true);
  }
});

logoutBtn.addEventListener("click", () => {
  token = "";
  userName = "";
  localStorage.removeItem("s3_portal_token");
  localStorage.removeItem("s3_portal_user");
  updateAuthUi();
  setStatus("Logged out.");
});

updateAuthUi();
if (token) {
  loadLocations().catch((error) => setStatus(error.message, true));
}
