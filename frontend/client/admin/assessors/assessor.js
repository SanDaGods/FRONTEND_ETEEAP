const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://updated-backend-production-ff82.up.railway.app";
let assessors = [];
let currentSection = "assessor";
let editingId = null;
let deleteType = "";
let deleteId = null;

// DOM Elements
const assessorTableBody = document.getElementById("assessorTableBody");
const assessorModal = document.getElementById("assessorModal");
const assessorForm = document.getElementById("assessorForm");
const searchInput = document.querySelector(".search-bar input");
const loadingSpinner = document.getElementById("loadingSpinner");
const profileDropdown = document.querySelector('.profile-dropdown');
const dropdownMenu = document.querySelector('.dropdown-menu');
const logoutLink = document.getElementById('logoutLink');
const usernameElement = document.querySelector('.username');
const userAvatar = document.querySelector('.user-avatar');

// Initialize the dashboard
document.addEventListener("DOMContentLoaded", async () => {
  initializeEventListeners();
  await loadAdminInfo();
  await checkAndLoadData();
});

// Initialize all event listeners
function initializeEventListeners() {
  // Form submissions
  if (assessorForm) assessorForm.addEventListener("submit", handleFormSubmit);

  // Search functionality
  if (searchInput) searchInput.addEventListener("input", handleSearch);

  // Modal outside click handlers
  window.onclick = (event) => {
    if (assessorModal && event.target === assessorModal) closeAssessorModal();
    if (event.target === document.getElementById("deleteConfirmationModal")) {
      closeDeleteModal();
    }
  };

  // Initialize dropdown and logout
  initializeDropdown();
  initializeLogout();
}

// ======================
// DROPDOWN & LOGOUT SYSTEM
// ======================

function initializeDropdown() {
  if (!profileDropdown || !dropdownMenu) return;

  profileDropdown.addEventListener('click', function(e) {
    e.stopPropagation();
    toggleDropdown();
  });

  document.addEventListener('click', function() {
    if (dropdownMenu.style.opacity === '1') {
      hideDropdown();
    }
  });

  dropdownMenu.addEventListener('click', function(e) {
    e.stopPropagation();
  });
}

function toggleDropdown() {
  const isVisible = dropdownMenu.style.opacity === '1';
  if (isVisible) {
    hideDropdown();
  } else {
    showDropdown();
  }
}

function showDropdown() {
  dropdownMenu.style.opacity = '1';
  dropdownMenu.style.visibility = 'visible';
  dropdownMenu.style.transform = 'translateY(0)';
}

function hideDropdown() {
  dropdownMenu.style.opacity = '0';
  dropdownMenu.style.visibility = 'hidden';
  dropdownMenu.style.transform = 'translateY(10px)';
}

function initializeLogout() {
  if (!logoutLink) return;

  logoutLink.addEventListener('click', async function(e) {
    e.preventDefault();
    await handleLogout();
  });
}

async function loadAdminInfo() {
  try {
    const response = await fetch(`${API_BASE_URL}/admin/auth-status`, {
      credentials: 'include'
    });
    
    if (!response.ok) throw new Error('Failed to fetch admin info');
    
    const data = await response.json();
    
    if (data.authenticated && data.user) {
      updateUserDisplay(data.user);
      sessionStorage.setItem('adminData', JSON.stringify(data.user));
    } else {
      redirectToLogin();
    }
  } catch (error) {
    console.error('Error loading admin info:', error);
    const storedData = sessionStorage.getItem('adminData');
    if (storedData) {
      updateUserDisplay(JSON.parse(storedData));
    } else {
      redirectToLogin();
    }
  }
}

function updateUserDisplay(user) {
  if (usernameElement && user) {
    usernameElement.textContent = user.fullName || user.email || 'Admin';
  }
  
  if (userAvatar) {
    const displayName = user?.fullName || user?.email || 'A';
    userAvatar.textContent = displayName.charAt(0).toUpperCase();
    userAvatar.style.fontFamily = 'Arial, sans-serif';
  }
}

async function handleLogout() {
  showLoading();
  try {
    const response = await fetch(`${API_BASE_URL}/admin/logout`, {
      method: "POST",
      credentials: 'include'
    });
    
    const data = await response.json();
    if (data.success) {
      showNotification('Logout successful! Redirecting...', 'success');
      clearAuthData();
      setTimeout(redirectToLogin, 1500);
    } else {
      showNotification('Logout failed. Please try again.', 'error');
      hideLoading();
    }
  } catch (error) {
    console.error('Logout error:', error);
    showNotification('Logout failed. Please try again.', 'error');
    hideLoading();
  }
}

function redirectToLogin() {
  window.location.href = '/login/login.html';
}

function clearAuthData() {
  sessionStorage.removeItem('adminData');
}

// ======================
// LOADING SPINNER SYSTEM
// ======================

function showLoading() {
  if (loadingSpinner) {
    loadingSpinner.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function hideLoading() {
  if (loadingSpinner) {
    loadingSpinner.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// ======================
// CORE ASSESSOR FUNCTIONS
// ======================

async function checkAndLoadData() {
  showLoading();
  try {
    await loadAssessors();
  } catch (error) {
    console.error("Error loading assessors", error);
    showNotification("Error loading assessors", "error");
  } finally {
    hideLoading();
  }
}

async function loadAssessors() {
  try {
    const response = await fetch(`${API_BASE_URL}/assessor/all`, {
      method: 'POST',
      credentials: 'include'
    });
    
    if (!response.ok) throw new Error("Failed to fetch assessors");

    const data = await response.json();
    assessors = data.data || [];
    renderAssessorTable(assessors);
  } catch (error) {
    console.error("Error loading assessors:", error);
    showNotification("Error loading assessors", "error");
    assessors = [];
    renderAssessorTable([]);
  }
}

// CRUD Operations
async function createAssessor(assessorData) {
  const response = await fetch(`${API_BASE_URL}/assessor/register`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
    },
    credentials: 'include',
    body: JSON.stringify(assessorData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create assessor");
  }
  return response.json();
}

async function updateAssessor(id, assessorData) {
  const response = await fetch(`${API_BASE_URL}/assessor/${id}`, {
    method: "PUT",
    headers: { 
      "Content-Type": "application/json",
    },
    credentials: 'include',
    body: JSON.stringify(assessorData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update assessor");
  }
  return response.json();
}

async function deleteAssessor(id) {
  deleteType = "assessor";
  deleteId = id;
  document.getElementById("deleteConfirmationModal").style.display = "flex";
}

async function confirmDelete() {
  showLoading();
  try {
    const response = await fetch(`${API_BASE_URL}/assessor/${deleteId}`, {
      method: "DELETE",
      credentials: 'include'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to delete assessor");
    }

    showNotification("Assessor deleted successfully", "success");
    await loadAssessors();
  } catch (error) {
    console.error("Error during deletion:", error);
    showNotification(error.message || "Error during deletion", "error");
  } finally {
    hideLoading();
    closeDeleteModal();
  }
}

// Form Handling
async function handleFormSubmit(e) {
  e.preventDefault();
  showLoading();

  const assessorData = {
    fullName: document.getElementById("assessorName").value.trim(),
    email: document.getElementById("email").value.trim(),
    password: document.getElementById("password").value,
    assessorType: document.getElementById("assessorType").value,
    expertise: document.getElementById("expertise").value
  };

  try {
    if (editingId) {
      await updateAssessor(editingId, assessorData);
      showNotification("Assessor updated successfully", "success");
    } else {
      await createAssessor(assessorData);
      showNotification("Assessor created successfully", "success");
    }
    closeAssessorModal();
    await loadAssessors();
  } catch (error) {
    console.error("Error:", error);
    showNotification(error.message || "Error saving assessor data", "error");
  } finally {
    hideLoading();
  }
}

// UI Rendering
// Update the renderAssessorTable function to show more detailed information
function renderAssessorTable(assessorsToRender) {
  if (!assessorTableBody) return;

  assessorTableBody.innerHTML = "";

  if (assessorsToRender.length === 0) {
    const colSpan = assessorTableBody.closest("table").querySelectorAll("th").length;
    assessorTableBody.innerHTML = `
      <tr>
        <td colspan="${colSpan}" class="empty-state">
          <i class="fas fa-users"></i>
          <h3>No Assessors Found</h3>
        </td>
      </tr>
    `;
    return;
  }

assessorsToRender.forEach((assessor) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${assessor.assessorId || 'N/A'}</td>
      <td>${escapeHtml(assessor.fullName)}</td>
      <td>${assessor.email || 'N/A'}</td>
      <td>${formatExpertise(assessor.expertise)}</td>
      <td>${capitalizeFirstLetter(assessor.assessorType)}</td>
      <td>${assessor.applicantsCount || 0}</td>
      <td class="action-buttons">
        <button class="action-btn view-btn" onclick="window.location.href='/client/admin/assessors/assessorprofile.html?id=${assessor._id}'">
          <i class="fas fa-eye"></i> View
        </button>
        <button class="action-btn edit-btn" onclick="editAssessor('${assessor._id}')">
          <i class="fas fa-edit"></i> Edit
        </button>
        <button class="action-btn delete-btn" onclick="deleteAssessor('${assessor._id}')">
          <i class="fas fa-trash"></i> Delete
        </button>
      </td>
    `;
    assessorTableBody.appendChild(row);
});
}

// Add this new function to format expertise
function formatExpertise(expertise) {
  if (!expertise) return "N/A";
  return expertise.split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Add this new function to view assessor details
async function viewAssessor(id) {
  showLoading();
  try {
    const response = await fetch(`${API_BASE_URL}/assessor/${id}`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to fetch assessor details");
    }

    const { data: assessor } = await response.json();
    
    // Open a modal or show details in a side panel
    showAssessorDetails(assessor);
  } catch (error) {
    console.error("Error viewing assessor:", error);
    showNotification(error.message || "Error loading assessor details", "error");
  } finally {
    hideLoading();
  }
}

// Add this function to show assessor details
function showAssessorDetails(assessor) {
  const modal = document.createElement("div");
  modal.className = "custom-modal";
  modal.innerHTML = `
    <div class="modal-content">
      <span class="close-btn" onclick="this.parentElement.parentElement.remove()">&times;</span>
      <h2>Assessor Details</h2>
      <div class="detail-grid">
        <div class="detail-item">
          <span class="detail-label">Assessor ID:</span>
          <span class="detail-value">${assessor.assessorId || 'N/A'}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Full Name:</span>
          <span class="detail-value">${escapeHtml(assessor.fullName)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Email:</span>
          <span class="detail-value">${assessor.email || 'N/A'}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Expertise:</span>
          <span class="detail-value">${formatExpertise(assessor.expertise)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Type:</span>
          <span class="detail-value">${capitalizeFirstLetter(assessor.assessorType)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Status:</span>
          <span class="detail-value ${assessor.isApproved ? 'approved' : 'pending'}">
            ${assessor.isApproved ? 'Approved' : 'Pending Approval'}
          </span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Registered:</span>
          <span class="detail-value">${formatDate(assessor.createdAt)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Last Login:</span>
          <span class="detail-value">${assessor.lastLogin ? formatDate(assessor.lastLogin) : 'Never'}</span>
        </div>
        <div class="detail-item full-width">
          <span class="detail-label">Current Applicants:</span>
          <span class="detail-value">${assessor.applicantsCount || 0}</span>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

// Modal Operations
function openAssessorModal() {
  if (!assessorModal) return;
  
  assessorModal.style.display = "flex";
  editingId = null;
  assessorForm?.reset();
  document.getElementById("modalTitle").textContent = "Add New Assessor";
}

function closeAssessorModal() {
  if (!assessorModal) return;
  
  assessorModal.style.display = "none";
  editingId = null;
  assessorForm?.reset();
}

// Edit Functions
async function editAssessor(id) {
  showLoading();
  try {
    const response = await fetch(`${API_BASE_URL}/assessor/${id}`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to fetch assessor");
    }

    const assessor = await response.json();
    editingId = id;
    
    document.getElementById("modalTitle").textContent = "Edit Assessor";
    document.getElementById("assessorName").value = assessor.data.fullName;
    document.getElementById("email").value = assessor.data.email;
    document.getElementById("assessorType").value = assessor.data.assessorType;
    document.getElementById("expertise").value = assessor.data.expertise;
    document.getElementById("password").value = "";

    assessorModal.style.display = "flex";
  } catch (error) {
    console.error("Error loading assessor for edit:", error);
    showNotification(error.message || "Error loading assessor data", "error");
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
      renderAssessorTable(assessors);
      return;
    }

    const filteredAssessors = assessors.filter(assessor => 
      (assessor.fullName && assessor.fullName.toLowerCase().includes(searchTerm)) || 
      (assessor.email && assessor.email.toLowerCase().includes(searchTerm)) ||
      (assessor.assessorType && assessor.assessorType.toLowerCase().includes(searchTerm)) ||
      (assessor.expertise && assessor.expertise.toLowerCase().includes(searchTerm)) ||
      (assessor.assessorId && assessor.assessorId.toLowerCase().includes(searchTerm))
    );
    
    renderAssessorTable(filteredAssessors);
  }, 300);
}

// Utility Functions
function formatDate(dateString) {
  if (!dateString) return "N/A";
  const options = { year: "numeric", month: "short", day: "numeric" };
  return new Date(dateString).toLocaleDateString(undefined, options);
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

function showNotification(message, type = "info") {
  const notification = document.getElementById("notification");
  if (!notification) return;

  notification.textContent = message;
  notification.className = `notification ${type}`;
  notification.style.display = "block";

  setTimeout(() => {
    notification.style.opacity = "0";
    setTimeout(() => {
      notification.style.display = "none";
      notification.style.opacity = "1";
    }, 500);
  }, 3000);
}

// Export to XLSX functionality
document.getElementById('export-btn').addEventListener('click', exportToExcel);

function exportToExcel() {
  // Show loading spinner
  const loadingSpinner = document.getElementById('loadingSpinner');
  loadingSpinner.style.display = 'flex';
  
  try {
    // Get the table element
    const table = document.querySelector('#assessorsSection table');
    
    // Clone the table to avoid modifying the original
    const clonedTable = table.cloneNode(true);
    
    // Remove the "Actions" column (last column) from the cloned table
    const rows = clonedTable.querySelectorAll('tr');
    rows.forEach((row) => {
      if (row.lastElementChild) {
        row.removeChild(row.lastElementChild);
      }
    });
    
    // Convert the table to a worksheet
    const ws = XLSX.utils.table_to_sheet(clonedTable);
    
    // Create a new workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Assessors");
    
    // Export the workbook
    XLSX.writeFile(wb, "assessors.xlsx");
    
    // Show success notification
    showNotification('Export successful!', 'success');
  } catch (error) {
    console.error('Export error:', error);
    showNotification('Export failed!', 'error');
  } finally {
    // Hide loading spinner
    loadingSpinner.style.display = 'none';
  }
}

// Helper function to show notifications
function showNotification(message, type) {
  const notification = document.getElementById('notification');
  notification.textContent = message;
  notification.style.display = 'block';
  notification.style.backgroundColor = type === 'success' ? '#4CAF50' : '#f44336';
  
  setTimeout(() => {
    notification.style.display = 'none';
  }, 3000);
}

// Make functions available globally
window.editAssessor = editAssessor;
window.deleteAssessor = deleteAssessor;
window.confirmDelete = confirmDelete;
window.closeAssessorModal = closeAssessorModal;
window.closeDeleteModal = closeDeleteModal;
window.openAssessorModal = openAssessorModal;
window.handleLogout = handleLogout;
window.viewAssessor = viewAssessor;

