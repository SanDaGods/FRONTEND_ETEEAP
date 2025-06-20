// ApplicantList.js - Updated to match AssessorDashboard functionality

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://updated-backend-production-ff82.up.railway.app";
let applicants = [];
let currentSection = "applicants";

// DOM Elements
const applicantTableBody = document.getElementById("applicantTableBody");
const searchInput = document.getElementById("searchInput");
const loadingSpinner = document.getElementById("loadingSpinner");
const navItems = document.querySelectorAll(".nav-item");

function updateUserDisplay(user) {
  const usernameElement = document.querySelector(".username");
  if (usernameElement && user) {
    usernameElement.textContent = user.fullName || "Assessor";

    // Update avatar with first initial
    const avatarElement = document.querySelector(".user-avatar");
    if (avatarElement) {
      avatarElement.textContent = user.fullName
        ? user.fullName.charAt(0).toUpperCase()
        : "A";
    }
  }
}

// Initialize the page
document.addEventListener("DOMContentLoaded", async () => {
  initializeEventListeners();
  await checkAndLoadData();
  await loadAssessorInfo();
});

function initializeEventListeners() {
  // Navigation
  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      const section = item.dataset.section;
      navigateToSection(section);
    });
  });

  // Search functionality
  searchInput.addEventListener("input", handleSearch);

  // Profile Dropdown and Logout
  const profileDropdown = document.querySelector(".profile-dropdown");
  const dropdownMenu = document.querySelector(".dropdown-menu");
  const logoutLink = document.getElementById("logoutLink");

  if (profileDropdown && dropdownMenu) {
    profileDropdown.addEventListener("click", function (e) {
      e.stopPropagation();
      const isVisible = dropdownMenu.style.opacity === "1";

      document.querySelectorAll(".dropdown-menu").forEach((menu) => {
        if (menu !== dropdownMenu) {
          menu.style.opacity = "0";
          menu.style.visibility = "hidden";
          menu.style.transform = "translateY(10px)";
        }
      });

      if (isVisible) {
        dropdownMenu.style.opacity = "0";
        dropdownMenu.style.visibility = "hidden";
        dropdownMenu.style.transform = "translateY(10px)";
      } else {
        dropdownMenu.style.opacity = "1";
        dropdownMenu.style.visibility = "visible";
        dropdownMenu.style.transform = "translateY(0)";
      }
    });

    document.addEventListener("click", function () {
      dropdownMenu.style.opacity = "0";
      dropdownMenu.style.visibility = "hidden";
      dropdownMenu.style.transform = "translateY(10px)";
    });

    dropdownMenu.addEventListener("click", function (e) {
      e.stopPropagation();
    });
  }

  // Logout functionality
  if (logoutLink) {
    logoutLink.addEventListener("click", async function (e) {
      e.preventDefault();
      await handleLogout();
    });
  }
}

async function checkAndLoadData() {
  showLoading();
  try {
    await loadAssessorInfo();
    await loadAssignedApplicants();
  } catch (error) {
    console.error("Error during initialization:", error);
    showNotification("Error initializing application", "error");
  } finally {
    hideLoading();
  }
}

function navigateToSection(section) {
  currentSection = section;

  navItems.forEach((item) => {
    item.classList.remove("active");
    if (item.dataset.section === section) {
      item.classList.add("active");
    }
  });

  document.querySelectorAll(".section").forEach((section) => {
    section.classList.remove("active");
  });

  document.getElementById(`${section}Section`).classList.add("active");
}

// Add this function to fetch assigned applicants
async function loadAssignedApplicants() {
  showLoading();
  try {
    const response = await fetch(`${API_BASE_URL}/api/assessor/applicants`, {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Failed to fetch assigned applicants");
    }

    const data = await response.json();

    if (data.success) {
      applicants = data.data || [];
      renderApplicantTable(applicants);
    } else {
      throw new Error(data.error || "No applicants assigned");
    }
  } catch (error) {
    console.error("Error loading assigned applicants:", error);
    showNotification(error.message, "error");
    applicants = [];
    renderApplicantTable([]);
  } finally {
    hideLoading();
  }
}

function renderApplicantTable(applicantsToRender) {
  applicantTableBody.innerHTML = "";

  if (applicantsToRender.length === 0) {
    applicantTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-state">
                    <i class="fas fa-users"></i>
                    <h3>No Applicants Assigned to You</h3>
                    <p>Applicants assigned to you will appear here</p>
                </td>
            </tr>
        `;
    return;
  }

  applicantsToRender.forEach((applicant) => {
    const statusClass = applicant.status.toLowerCase().replace(" ", "-");

    const row = document.createElement("tr");
    row.innerHTML = `
            <td>${applicant.applicantId || applicant._id}</td>
            <td>${escapeHtml(applicant.name)}</td>
            <td>${escapeHtml(applicant.course)}</td>
            <td>${formatDate(applicant.applicationDate)}</td>
            <td>
                <span class="status-badge status-${statusClass}">
                    ${formatStatus(applicant.status)}
                </span>
            </td>
            <td>${
              applicant.score || applicant.score === 0 ? applicant.score : "0"
            }</td>
            <td class="action-buttons">
                <button class="action-btn view-btn" onclick="viewApplicant('${
                  applicant._id
                }')">
                    <i class="fas fa-eye"></i> View
                </button>
                <button class="action-btn reject-btn" onclick="rejectApplicant('${
                  applicant._id
                }', event)" 
                    ${
                      applicant.status.toLowerCase().includes("rejected")
                        ? "disabled"
                        : ""
                    }>
                    <i class="fas fa-times"></i> Reject
                </button>
            </td>
        `;
    applicantTableBody.appendChild(row);
  });
}

function viewApplicant(applicantId) {
  const applicant = applicants.find((a) => a._id === applicantId);
  const url = `/client/assessor/evaluation/evaluation.html?id=${applicantId}`;

  if (applicant && applicant.applicantId) {
    window.location.href = `${url}&applicantId=${applicant.applicantId}`;
  } else {
    window.location.href = url;
  }
}

async function rejectApplicant(applicantId, event) {
  if (event) event.preventDefault();

  if (
    !confirm(
      "Are you sure you want to reject this applicant? This action cannot be undone."
    )
  ) {
    return;
  }

  showLoading();
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/assessor/applicants/${applicantId}/reject`,
      {
        method: "POST",
        credentials: "include",
      }
    );

    const data = await response.json();

    if (data.success) {
      showNotification("Applicant rejected successfully", "success");
      await loadAssignedApplicants();
    } else {
      throw new Error(data.error || "Failed to reject applicant");
    }
  } catch (error) {
    console.error("Error rejecting applicant:", error);
    showNotification(error.message, "error");
  } finally {
    hideLoading();
  }
}

// Search Functionality
let searchTimeout;
function handleSearch(e) {
  clearTimeout(searchTimeout);
  const searchTerm = e.target.value.trim().toLowerCase();

  searchTimeout = setTimeout(() => {
    if (searchTerm.length === 0) {
      renderApplicantTable(applicants);
      return;
    }

    const filteredApplicants = applicants.filter(
      (applicant) =>
        applicant.name.toLowerCase().includes(searchTerm) ||
        (applicant.email &&
          applicant.email.toLowerCase().includes(searchTerm)) ||
        applicant.course.toLowerCase().includes(searchTerm)
    );

    renderApplicantTable(filteredApplicants);
  }, 300);
}

// Utility Functions
function formatDate(dateString) {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    return isNaN(date.getTime())
      ? "N/A"
      : date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
  } catch {
    return "N/A";
  }
}

function formatStatus(status) {
  return status
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function capitalizeFirstLetter(string) {
  if (!string) return "";
  return string.charAt(0).toUpperCase() + string.slice(1);
}

function escapeHtml(unsafe) {
  if (!unsafe) return "";
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Loading Spinner Functions
function showLoading() {
  loadingSpinner.classList.add("active");
}

function hideLoading() {
  loadingSpinner.classList.remove("active");
}

// Notification System
function showNotification(message, type = "info") {
  const existingNotifications = document.querySelectorAll(".notification");
  existingNotifications.forEach((notification) => notification.remove());

  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.textContent = message;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.opacity = "0";
    setTimeout(() => notification.remove(), 500);
  }, 3000);
}

// Add this function to fetch and display user info
async function loadAssessorInfo() {
  try {
    const response = await fetch(`${API_BASE_URL}/assessor/auth-status`, {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Failed to fetch assessor info");
    }

    const data = await response.json();

    if (data.authenticated && data.user) {
      updateUserDisplay(data.user);
      sessionStorage.setItem("assessorData", JSON.stringify(data.user));
    } else {
      window.location.href = "assessor/login/login.html";
    }
  } catch (error) {
    console.error("Error loading assessor info:", error);
    const storedData = sessionStorage.getItem("assessorData");
    if (storedData) {
      updateUserDisplay(JSON.parse(storedData));
    } else {
      window.location.href = "login/login.html";
    }
  }
}

async function handleLogout() {
  showLoading();
  try {
    const authCheck = await fetch(`${API_BASE_URL}/assessor/auth-status`, {
      credentials: "include",
    });

    if (!authCheck.ok) {
      sessionStorage.removeItem("assessorData");
      window.location.href = "login/login.html";
      return;
    }

    const response = await fetch(`${API_BASE_URL}/assessor/logout`, {
      method: "POST",
      credentials: "include",
    });

    const data = await response.json();
    if (data.success) {
      showNotification(
        "Logout successful! Redirecting to login page...",
        "success"
      );
      sessionStorage.removeItem("assessorData");
      setTimeout(() => {
        window.location.href =
          data.redirectTo || "login/login.html";
      }, 1500);
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

// Make functions available globally
window.viewApplicant = viewApplicant;
window.rejectApplicant = rejectApplicant;
window.handleLogout = handleLogout;
