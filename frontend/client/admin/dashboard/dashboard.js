const API_BASE_URL = "https://backendeteeap-production.up.railway.app";

let applicants = [];

// DOM Elements
const studentTableBody = document.getElementById("studentTableBody");
const searchInput = document.getElementById("searchInput");
const loadingSpinner = document.getElementById("loadingSpinner");
const logoutLink = document.getElementById("logoutLink");
const totalApplicantsElement = document.getElementById("totalApplicants");

// Initialize the dashboard
document.addEventListener("DOMContentLoaded", async () => {
  try {
    await loadAdminInfo();
    initializeEventListeners();
    await fetchApplicants();
  } catch (error) {
    console.error("Initialization error:", error);
    showNotification("Failed to initialize dashboard", "error");
  }
});

// In applicant dashboard.js, update the fetchApplicants function:
async function fetchApplicants() {
  showLoading();
  try {
    // Fetch all applicants without limit
    const response = await fetch(`${API_BASE_URL}/api/admin/applicants`, {
      credentials: "include",
    });

    if (!response.ok) throw new Error("Failed to fetch applicants");

    const data = await response.json();

    if (data.success && data.data) {
      // Store ALL applicants for statistics
      applicants = data.data;

      // Update counters with all applicants
      updateDashboardStats();

      // Then render only recent applicants (limit to 5)
      const recentApplicants = applicants.slice(0, 5);
      renderApplicantsTable(recentApplicants);

      // Store the total count in sessionStorage for cross-page consistency
      sessionStorage.setItem("totalApplicants", applicants.length);
    } else {
      applicants = []; // Clear applicants array if no data
      renderEmptyState();
      updateDashboardStats(); // This will set all counters to 0
      sessionStorage.setItem("totalApplicants", "0");
    }
  } catch (error) {
    console.error("Error:", error);
    showNotification(error.message, "error");
    applicants = []; // Clear applicants array on error
    renderEmptyState();
    updateDashboardStats(); // This will set all counters to 0
    sessionStorage.setItem("totalApplicants", "0");
  } finally {
    hideLoading();
  }
}

// Update the updateDashboardStats function:
// Update the updateDashboardStats function:
function updateDashboardStats() {
  // Update the total applicants counter directly
  if (totalApplicantsElement) {
    totalApplicantsElement.textContent = applicants.length;
  }

  // Calculate other statistics
  const newApplicantsCount = applicants.filter(
    (a) => a.status && a.status.toLowerCase() === "pending"
  ).length;
  const withoutAssessorCount = applicants.filter(
    (a) => !a.assessorId || a.assessorId === ""
  ).length;
  const rejectedCount = applicants.filter(
    (a) => a.status && a.status.toLowerCase() === "rejected"
  ).length;

  // Update other counters by their position in the DOM
  const cardValues = document.querySelectorAll(".card-value");
  if (cardValues.length >= 4) {
    cardValues[1].textContent = newApplicantsCount; // New Applicants
    cardValues[2].textContent = withoutAssessorCount; // Applicants w/o Assessor
    cardValues[3].textContent = rejectedCount; // Rejected Applicants
  }
}
// Helper function to update counters by class and index
function updateCounterByClass(className, index, value) {
  const elements = document.getElementsByClassName(className);
  if (elements && elements.length > index) {
    elements[index].textContent = value;
  }
}

// Remove the old updateCounter function and replace it with this:
function updateCounter(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  }
}

// Render applicants table
function renderApplicantsTable(applicantsToRender) {
  if (!studentTableBody) return;

  studentTableBody.innerHTML = "";

  if (!applicantsToRender || applicantsToRender.length === 0) {
    renderEmptyState();
    return;
  }

  applicantsToRender.forEach((applicant) => {
    const row = document.createElement("tr");
    const statusClass = applicant.status.toLowerCase().replace(" ", "-");

    // Format date
    const appDate = new Date(
      applicant.applicationDate || applicant.dateAssigned || new Date()
    );
    const formattedDate = appDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

    row.innerHTML = `
      <td>${applicant.applicantId || applicant._id || "N/A"}</td>
      <td>${escapeHtml(applicant.name || "No name")}</td>
      <td>${escapeHtml(applicant.course || "Not specified")}</td>
      <td>
        <span class="status-badge status-${statusClass}">
          ${formatStatus(applicant.status)}
        </span>
      </td>
      <td>${applicant.score || applicant.currentScore || 0}</td>
      <td>${formattedDate}</td>
      <td class="action-buttons">
        <a href="/client/admin/applicantprofile/applicantprofile.html?id=${
          applicant._id
        }" class="action-btn view-btn">
          <i class="fas fa-eye"></i> View
        </a>
        <button class="action-btn reject-btn" data-id="${applicant._id}" 
          ${applicant.status.toLowerCase() === "rejected" ? "disabled" : ""}>
          <i class="fas fa-times"></i> Reject
        </button>
      </td>
    `;
    studentTableBody.appendChild(row);
  });

  // Add event listeners to action buttons
  addActionButtonListeners();
}

// In Applicant Dashboard.js, update the fetchApplicants function:
async function fetchApplicants() {
  showLoading();
  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/applicants`, {
      credentials: "include",
    });

    if (!response.ok) throw new Error("Failed to fetch applicants");

    const data = await response.json();

    if (data.success && data.data) {
      applicants = data.data;
      updateDashboardStats(); // This will update all counters

      // Render only recent applicants (limit to 5)
      const recentApplicants = applicants.slice(0, 5);
      renderApplicantsTable(recentApplicants);

      sessionStorage.setItem("totalApplicants", applicants.length);
    } else {
      applicants = [];
      renderEmptyState();
      updateDashboardStats(); // This will reset all counters to 0
      sessionStorage.setItem("totalApplicants", "0");
    }
  } catch (error) {
    console.error("Error:", error);
    showNotification(error.message, "error");
    applicants = [];
    renderEmptyState();
    updateDashboardStats();
    sessionStorage.setItem("totalApplicants", "0");
  } finally {
    hideLoading();
  }
}

// Add event listeners to action buttons
function addActionButtonListeners() {
  document.querySelectorAll(".reject-btn").forEach((button) => {
    button.addEventListener("click", (e) => {
      const applicantId = e.currentTarget.getAttribute("data-id");
      rejectApplicant(applicantId);
    });
  });
}

// Reject applicant function
async function rejectApplicant(applicantId) {
  if (!confirm("Are you sure you want to reject this applicant?")) return;

  showLoading();
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/admin/applicants/${applicantId}/reject`,
      {
        method: "POST",
        credentials: "include",
      }
    );

    const data = await response.json();

    if (data.success) {
      showNotification("Applicant rejected successfully", "success");
      await fetchApplicants(); // Refresh data
    } else {
      throw new Error(data.error || "Failed to reject applicant");
    }
  } catch (error) {
    console.error("Error:", error);
    showNotification(error.message, "error");
  } finally {
    hideLoading();
  }
}

// View applicant details
function viewApplicantDetails(applicantId) {
  window.location.href = `/client/admin/applicantprofile/applicantprofile.html?id=${applicantId}`;
}

// Utility functions
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
  if (!status) return "N/A";
  return status
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
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

function renderEmptyState() {
  if (!studentTableBody) return;

  studentTableBody.innerHTML = `
    <tr>
      <td colspan="7" class="empty-state">
        <i class="fas fa-users"></i>
        <h3>No Applicants Found</h3>
        <p>Applicants will appear here when available</p>
      </td>
    </tr>
  `;
}

// Handle search functionality
async function handleSearch(e) {
  const searchTerm = e.target.value.trim().toLowerCase();

  if (!searchTerm) {
    // If search is empty, show recent applicants again
    const recentApplicants = [...applicants].slice(0, 5);
    renderApplicantsTable(recentApplicants);
    return;
  }

  // Filter locally from the full applicants list
  const filtered = applicants.filter((applicant) => {
    return (
      (applicant.name && applicant.name.toLowerCase().includes(searchTerm)) ||
      (applicant.applicantId &&
        applicant.applicantId.toLowerCase().includes(searchTerm)) ||
      (applicant.course && applicant.course.toLowerCase().includes(searchTerm))
    );
  });

  renderApplicantsTable(filtered.slice(0, 5)); // Still show max 5 results
}

// Debounce function for search input
function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// Initialize all event listeners
function initializeEventListeners() {
  // Search input
  if (searchInput) {
    searchInput.addEventListener("input", debounce(handleSearch, 300));
  }

  // Logout link
  if (logoutLink) {
    logoutLink.addEventListener("click", async (e) => {
      e.preventDefault();
      await handleLogout();
    });
  }
}

// Load admin info
async function loadAdminInfo() {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/auth-status`, {
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Failed to fetch admin info");
    }

    const data = await response.json();

    if (data.authenticated && data.user) {
      updateUserDisplay(data.user);
      sessionStorage.setItem("adminData", JSON.stringify(data.user));
    } else {
      redirectToLogin();
    }
  } catch (error) {
    console.error("Error loading admin info:", error);
    const storedData = sessionStorage.getItem("adminData");
    if (storedData) {
      updateUserDisplay(JSON.parse(storedData));
    } else {
      redirectToLogin();
    }
  }
}

function updateUserDisplay(user) {
  const usernameElement = document.querySelector(".username");
  const avatarElement = document.querySelector(".user-avatar");

  if (usernameElement && user) {
    usernameElement.textContent = user.fullName || user.email || "Admin";
  }

  if (avatarElement) {
    const displayName = user?.fullName || user?.email || "A";
    avatarElement.textContent = displayName.charAt(0).toUpperCase();
  }
}

async function handleLogout() {
  showLoading();
  try {
    const authCheck = await fetch(`${API_BASE_URL}/admin/auth-status`, {
      credentials: "include",
    });

    if (!authCheck.ok) {
      clearAuthData();
      redirectToLogin();
      return;
    }

    const response = await fetch(`${API_BASE_URL}/admin/logout`, {
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

function redirectToLogin() {
  window.location.href = '/frontend/client/applicant/login/login.html';
}

function clearAuthData() {
  sessionStorage.removeItem("adminData");
}

// Utility Functions
function showLoading() {
  if (loadingSpinner) loadingSpinner.classList.add("active");
}

function hideLoading() {
  if (loadingSpinner) loadingSpinner.classList.remove("active");
}

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

// Make functions available globally
window.handleLogout = handleLogout;
window.rejectApplicant = rejectApplicant;
window.viewApplicantDetails = viewApplicantDetails;
