import { API_BASE_URL } from './common/config.js';
/**
 * Checks authentication status and redirects to login if not authenticated
 * Call this on any protected page
 */
async function protectPage() {
  try {
    const response = await fetch(`${API_BASE_URL}/auth-status`, {
      credentials: "include",
    });

    if (!response.ok) throw new Error("Not authenticated");

    const data = await response.json();

    if (!data.authenticated) {
      redirectToLogin();
    }
  } catch (error) {
    console.error("Error checking auth status", error);
    redirectToLogin();
  }
}

/***
 * Handles logout functionality
 */
async function handleLogout() {
  showLoading();
  try {
    const authCheck = await fetch(`${API_BASE_URL}/auth-status`, {
      credentials: "include",
    });

    if (!authCheck.ok) {
      clearAuthData();
      redirectToLogin();
      return;
    }

    const response = await fetch(`${API_BASE_URL}/logout`, {
      method: "POST",
      credentials: "include",
    });

    const data = await response.json();
    if (data.success) {
      showNotification("Logout successful! Redirecting...", "success");
      clearAuthData();
      setTimeout(redirectToLogin, 1500);
    } else {
      showNotification("Logout failed. Please try again.", "error");
      hideLoading();
    }
  } catch (error) {
    console.error("Logout error:", error);
    showNotification("Logout failed. Please try again.", "error");
    hideLoading();
  }
}

/**
 * Redirects to login page
 */
function redirectToLogin() {
  if (!window.location.pathname.includes("login.html")) {
    window.location.href = "/client/applicant/login/login.html";
  }
}

function clearAuthData() {
  sessionStorage.removeItem("authData");
  localStorage.removeItem("authData");
}

function showLoading() {
  const spinner = document.getElementById("loadingSpinner");
  if (spinner) spinner.classList.add("active");
}

function hideLoading() {
  const spinner = document.getElementById("loadingSpinner");
  if (spinner) spinner.classList.remove("active");
}

function showNotification(message, type = "info") {
  const existingNotifications = document.querySelectorAll(".notification");
  existingNotifications.forEach((n) => n.remove());

  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.textContent = message;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.opacity = "0";
    setTimeout(() => notification.remove(), 500);
  }, 3000);
}

function initializeLogout() {
  const logoutLink = document.getElementById("logoutLink");
  if (logoutLink) {
    logoutLink.addEventListener("click", async function (e) {
      e.preventDefault();
      await handleLogout();
    });
  }
}

document.addEventListener("DOMContentLoaded", function () {
  initializeLogout();
});

// Optional: Module export
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    protectPage,
    handleLogout,
    showNotification,
    initializeLogout,
  };
}
