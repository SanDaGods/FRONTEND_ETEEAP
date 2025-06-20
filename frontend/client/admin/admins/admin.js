const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://updated-backend-production-ff82.up.railway.app";
let admins = [];
let currentSection = "admin";
let editingId = null;
let deleteType = "";
let deleteId = null;

// DOM Elements
const adminTableBody = document.getElementById("adminTableBody");
const adminModal = document.getElementById("adminModal");
const adminForm = document.getElementById("adminForm");
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
  if (adminForm) adminForm.addEventListener("submit", handleFormSubmit);

  // Search functionality
  if (searchInput) searchInput.addEventListener("input", handleSearch);

  // Modal outside click handlers
  window.onclick = (event) => {
    if (adminModal && event.target === adminModal) closeadminModal();
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
  window.location.href = '/frontend/admin/login/login.html';
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
// CORE Admin FUNCTIONS
// ======================

async function checkAndLoadData() {
  showLoading();
  try {
    await loadadmins();
  } catch (error) {
    console.error("Error loading Admins", error);
    showNotification("Error loading Admins", "error");
  } finally {
    hideLoading();
  }
}


// UI Rendering
// Update the renderadminTable function to show more detailed information
// Add this new function to format expertise
function formatExpertise(expertise) {
  if (!expertise) return "N/A";
  return expertise.split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// Add this new function to view admin details
async function viewadmin(id) {
  showLoading();
  try {
    const response = await fetch(`/api/admin/admins/:id`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to fetch Admin details");
    }

    const { data: admin } = await response.json();
    
    // Open a modal or show details in a side panel
    showadminDetails(admin);
  } catch (error) {
    console.error("Error viewing Admin:", error);
    showNotification(error.message || "Error loading Admin details", "error");
  } finally {
    hideLoading();
  }
}

// Add this function to show admin details
function showadminDetails(admin) {
  const modal = document.createElement("div");
  modal.className = "custom-modal";
  modal.innerHTML = `
    <div class="modal-content">
      <span class="close-btn" onclick="this.parentElement.parentElement.remove()">&times;</span>
      <h2>admin Details</h2>
      <div class="detail-grid">
        <div class="detail-item">
          <span class="detail-label">admin ID:</span>
          <span class="detail-value">${admin.adminId || 'N/A'}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Full Name:</span>
          <span class="detail-value">${escapeHtml(admin.fullName)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Email:</span>
          <span class="detail-value">${admin.email || 'N/A'}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Type:</span>
          <span class="detail-value">${capitalizeFirstLetter(admin.adminType)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Registered:</span>
          <span class="detail-value">${formatDate(admin.createdAt)}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Last Login:</span>
          <span class="detail-value">${admin.lastLogin ? formatDate(admin.lastLogin) : 'Never'}</span>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
}

function renderadminTable(adminsToRender) {
  if (!adminTableBody) return;

  adminTableBody.innerHTML = "";

  if (adminsToRender.length === 0) {
    const colSpan = adminTableBody.closest("table").querySelectorAll("th").length;
    adminTableBody.innerHTML = `
      <tr>
        <td colspan="${colSpan}" class="empty-state">
          <i class="fas fa-users"></i>
          <h3>No Admins Found</h3>
        </td>
      </tr>
    `;
    return;
  }
  adminsToRender.forEach((admin) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${admin.adminId || 'N/A'}</td>
      <td>${escapeHtml(admin.fullName)}</td>
      <td>${admin.email || 'N/A'}</td>
      <td>${admin.createdAt || 'N/A'}</td>
      <td>${"" || 'N/A'}</td>
      <td class="action-buttons">
        <button class="action-btn view-btn" onclick="viewadmin('${admin._id}')">
          <i class="fas fa-eye"></i> View
        </button>
        <button class="action-btn edit-btn" onclick="editadmin('${admin._id}')">
          <i class="fas fa-edit"></i> Edit
        </button>
        <button class="action-btn delete-btn" onclick="deleteadmin('${admin._id}')">
          <i class="fas fa-trash"></i> Delete
        </button>
      </td>
    `;
    adminTableBody.appendChild(row);
  });
}

async function loadadmins() {
  try {
      const response = await fetch(`/api/admin/admins`, {
      credentials: 'include'
    });
    
    if (!response.ok) throw new Error("Failed to fetch Admins");

    const data = await response.json();
    admins = data.data || [];
    renderadminTable(admins);
  } catch (error) {
    console.error("Error loading :", error);
    showNotification("Error loading Admins", "error");
    admins = [];
    renderadminTable([]);
  }
}


// CRUD Operations
async function createadmin(adminData) {
  const response = await fetch(`/admin/register`, {
    method: "POST",
    headers: { 
      "Content-Type": "application/json",
    },
    credentials: 'include',
    body: JSON.stringify(adminData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create Admin");
  }
  return response.json();
}

async function updateadmin(id, adminData) {
  const response = await fetch(`${API_BASE_URL}/admin/${id}`, {
    method: "PUT",
    headers: { 
      "Content-Type": "application/json",
    },
    credentials: 'include',
    body: JSON.stringify(adminData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to update Admin");
  }
  return response.json();
}

async function deleteadmin(id) {
  deleteType = "admin";
  deleteId = id;
  document.getElementById("deleteConfirmationModal").style.display = "flex";
}

async function confirmDelete() {
  showLoading();
  try {
    const response = await fetch(`/api/admin/admins/:id`, {
      method: "DELETE",
      credentials: 'include'
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to delete Admin");
    }

    showNotification("admin deleted successfully", "success");
    await loadadmins();
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

  const adminData = {
    fullName: document.getElementById("adminName").value.trim(),
    email: document.getElementById("email").value.trim(),
    password: document.getElementById("password").value,
  };

  try {
    if (editingId) {
      await updateadmin(editingId, adminData);
      showNotification("Admin updated successfully", "success");
    } else {
      await createadmin(adminData);
      showNotification("Admin created successfully", "success");
    }
    closeadminModal();
    await loadadmins();
  } catch (error) {
    console.error("Error:", error);
    showNotification(error.message || "Error saving Admin data", "error");
  } finally {
    hideLoading();
  }
}

// Modal Operations
function openadminModal() {
  if (!adminModal) return;
  
  adminModal.style.display = "flex";
  editingId = null;
  adminForm?.reset();
  document.getElementById("modalTitle").textContent = "Add New Admin";
}

function closeadminModal() {
  if (!adminModal) return;
  
  adminModal.style.display = "none";
  editingId = null;
  adminForm?.reset();
}

// Edit Functions
async function editadmin(id) {
  showLoading();
  try {
    const response = await fetch(`${API_BASE_URL}/admin/${id}`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to fetch admin");
    }

    const admin = await response.json();
    editingId = id;
    
    document.getElementById("modalTitle").textContent = "Edit admin";
    document.getElementById("adminName").value = admin.data.fullName;
    document.getElementById("email").value = admin.data.email;
    document.getElementById("password").value = "";

    adminModal.style.display = "flex";
  } catch (error) {
    console.error("Error loading admin for edit:", error);
    showNotification(error.message || "Error loading Admin data", "error");
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
      renderadminTable(admins);
      return;
    }

    const filteredadmins = admins.filter(admin => 
      (admin.fullName && admin.fullName.toLowerCase().includes(searchTerm)) || 
      (admin.email && admin.email.toLowerCase().includes(searchTerm)) ||
      (admin.adminId && admin.adminId.toLowerCase().includes(searchTerm))
    );
    
    renderadminTable(filteredadmins);
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

    function closeDeleteModal() {
        document.getElementById("deleteConfirmationModal").style.display =
          "none";
        deleteType = "";
        deleteId = null;
      }

// Make functions available globally
window.editadmin = editadmin;
window.deleteadmin = deleteadmin;
window.confirmDelete = confirmDelete;
window.closeadminModal = closeadminModal;
window.closeDeleteModal = closeDeleteModal;
window.openadminModal = openadminModal;
window.handleLogout = handleLogout;
window.viewadmin = viewadmin;
