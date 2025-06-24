// DOM Elements
const loadingSpinner = document.getElementById("loadingSpinner");

// Initialize the dashboard
document.addEventListener("DOMContentLoaded", async () => {
  initializeEventListeners();
  await loadAdminInfo();
});

// Initialize all event listeners
function initializeEventListeners() {
  // Initialize dropdown and logout
  initializeDropdown();
  initializeLogout();
}

// ======================
// DROPDOWN & LOGOUT SYSTEM
// ======================

function initializeDropdown() {
  const profileDropdown = document.querySelector('.profile-dropdown');
  const dropdownMenu = document.querySelector('.dropdown-menu');
  
  if (!profileDropdown || !dropdownMenu) return;

  // Toggle dropdown
  profileDropdown.addEventListener('click', function(e) {
    e.stopPropagation();
    const isOpen = dropdownMenu.style.opacity === '1';
    
    // Close all other dropdowns first
    document.querySelectorAll('.dropdown-menu').forEach(menu => {
      if (menu !== dropdownMenu) {
        menu.style.opacity = '0';
        menu.style.visibility = 'hidden';
        menu.style.transform = 'translateY(10px)';
      }
    });
    
    // Toggle current dropdown
    dropdownMenu.style.opacity = isOpen ? '0' : '1';
    dropdownMenu.style.visibility = isOpen ? 'hidden' : 'visible';
    dropdownMenu.style.transform = isOpen ? 'translateY(10px)' : 'translateY(0)';
  });

  // Close when clicking outside
  document.addEventListener('click', function() {
    dropdownMenu.style.opacity = '0';
    dropdownMenu.style.visibility = 'hidden';
    dropdownMenu.style.transform = 'translateY(10px)';
  });

  // Prevent closing when clicking inside dropdown
  dropdownMenu.addEventListener('click', function(e) {
    e.stopPropagation();
  });
}

function initializeLogout() {
  const logoutLink = document.getElementById('logoutLink');
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
  const usernameElement = document.querySelector('.username');
  const avatarElement = document.querySelector('.user-avatar');
  
  if (usernameElement && user) {
    usernameElement.textContent = user.fullName || user.email || 'Admin';
  }
  
  if (avatarElement) {
    const displayName = user?.fullName || user?.email || 'A';
    avatarElement.textContent = displayName.charAt(0).toUpperCase();
    avatarElement.style.fontFamily = 'Arial, sans-serif';
  }
}

async function handleLogout() {
  showLoading();
  try {
    const authCheck = await fetch(`${API_BASE_URL}/admin/auth-status`, {
      credentials: 'include'
    });
    
    if (!authCheck.ok) {
      clearAuthData();
      redirectToLogin();
      return;
    }

    const response = await fetch(`${API_BASE_URL}/admin/logout`, {
      method: 'POST',
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
  window.location.href = '/frontend/client/applicant/login/login.html';
}

function clearAuthData() {
  sessionStorage.removeItem('adminData');
}

// Utility Functions
function showLoading() {
  if (loadingSpinner) loadingSpinner.classList.add("active");
  document.body.style.overflow = "hidden";
}

function hideLoading() {
  if (loadingSpinner) loadingSpinner.classList.remove("active");
  document.body.style.overflow = "";
}

function showNotification(message, type = "info") {
  const existingNotifications = document.querySelectorAll(".notification");
  existingNotifications.forEach(notification => notification.remove());

  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.opacity = "0";
    setTimeout(() => notification.remove(), 500);
  }, 3000);
}

// Make logout function available globally
window.handleLogout = handleLogout;