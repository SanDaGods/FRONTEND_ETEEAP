// JavaScript for Assessor Profile Page
const API_BASE_URL = "https://backendeteeap-production.up.railway.app";
let currentUser = null;

// Document dropdown functionality
function toggleDropdown(button) {
    const documentItem = button.closest('.document-item');
    const dropdownTable = documentItem.nextElementSibling;
    
    if (dropdownTable.style.display === 'table') {
        dropdownTable.style.display = 'none';
        button.innerHTML = '<i class="fas fa-eye"></i> View Details';
    } else {
        // Close any other open dropdowns
        document.querySelectorAll('.dropdown-table').forEach(table => {
            table.style.display = 'none';
            const prevButton = table.previousElementSibling.querySelector('.message-button');
            if (prevButton) {
                prevButton.innerHTML = '<i class="fas fa-eye"></i> View Details';
            }
        });
        
        dropdownTable.style.display = 'table';
        button.innerHTML = '<i class="fas fa-eye-slash"></i> Hide Details';
    }
}

// Format date to readable string
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

// Format expertise to readable string
function formatExpertise(expertise) {
    if (!expertise) return 'N/A';
    return expertise
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Update profile display with assessor data
function updateProfileDisplay(assessor) {
    if (!assessor) return;
    
    // Update profile details
    if (document.getElementById('assessorId')) {
        document.getElementById('assessorId').textContent = assessor.assessorId || 'N/A';
    }
    if (document.getElementById('fullName')) {
        document.getElementById('fullName').textContent = assessor.fullName || 'N/A';
    }
    if (document.getElementById('email')) {
        document.getElementById('email').textContent = assessor.email || 'N/A';
    }
    if (document.getElementById('expertise')) {
        document.getElementById('expertise').textContent = formatExpertise(assessor.expertise);
    }
    if (document.getElementById('assessorType')) {
        document.getElementById('assessorType').textContent = assessor.assessorType ? 
            assessor.assessorType.charAt(0).toUpperCase() + assessor.assessorType.slice(1) : 'N/A';
    }
    
    // Status with badge
    if (document.getElementById('status')) {
        const statusElement = document.getElementById('status');
        statusElement.textContent = '';
        const statusBadge = document.createElement('span');
        statusBadge.className = `status-badge status-${assessor.isApproved ? 'active' : 'pending'}`;
        statusBadge.textContent = assessor.isApproved ? 'Active' : 'Pending Approval';
        statusElement.appendChild(statusBadge);
    }
    
    if (document.getElementById('createdAt')) {
        document.getElementById('createdAt').textContent = formatDate(assessor.createdAt);
    }
}

// Fetch assessor profile data
async function fetchAssessorProfile() {
    showLoading();
    try {
        const response = await fetch(`${API_BASE_URL}/assessor/profile`, {
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        if (data.success && data.assessor) {
            currentUser = data.assessor;
            updateProfileDisplay(data.assessor);
            updateUserDisplay(data.assessor);
            sessionStorage.setItem('assessorData', JSON.stringify(data.assessor));
            return true;
        } else {
            throw new Error('Failed to load assessor profile');
        }
    } catch (error) {
        console.error('Error fetching assessor profile:', error);
        
        // Try to use cached data if available
        const storedData = sessionStorage.getItem('assessorData');
        if (storedData) {
            currentUser = JSON.parse(storedData);
            updateProfileDisplay(currentUser);
            updateUserDisplay(currentUser);
            return true;
        }
        showNotification('Failed to load profile data. Please try again.', 'error');
        return false;
    } finally {
        hideLoading();
    }
}

// Assessor Name Functions
async function loadAssessorInfo() {
    console.log("Starting loadAssessorInfo");
    try {
        console.log("Making auth-status request");
        const response = await fetch(`${API_BASE_URL}/assessor/auth-status`, {
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        console.log("Received response", response.status);
        
        if (!response.ok) {
            console.log("Response not OK");
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log("Parsed JSON data", data);
        
        if (data.authenticated && data.user) {
            console.log("User authenticated", data.user);
            currentUser = data.user;
            updateUserDisplay(data.user);
            updateProfileDisplay(data.user);
            sessionStorage.setItem('assessorData', JSON.stringify(data.user));
            return true;
        } else {
            console.log("Not authenticated, redirecting");
            redirectToLogin();
            return false;
        }
    } catch (error) {
        console.error('Error in loadAssessorInfo:', error);
        
        const storedData = sessionStorage.getItem('assessorData');
        console.log("Checking sessionStorage", storedData);
        if (storedData) {
            currentUser = JSON.parse(storedData);
            updateUserDisplay(currentUser);
            updateProfileDisplay(currentUser);
            return true;
        }
        return false;
    }
}

function updateUserDisplay(user) {
    console.log("Updating display with user:", user);
    const usernameElement = document.querySelector('.username');
    console.log("Found username element:", usernameElement);
    
    if (usernameElement) {
        console.log("Setting username to:", user?.fullName);
        usernameElement.textContent = user?.fullName || 'Assessor';
    }
}

function redirectToLogin() {
    window.location.href = '/frontend/client/applicant/login/login.html';
}

// Logout functionality
async function handleLogout() {
    showLoading();
    try {
        // First check if we're actually logged in
        const authCheck = await fetch(`${API_BASE_URL}/assessor/auth-status`, {
            credentials: 'include'
        });
        
        if (!authCheck.ok) {
            // If not authenticated, just redirect
            sessionStorage.removeItem('assessorData');
            window.location.href = '/frontend/client/applicant/login/login.html';
            return;
        }

        // If authenticated, proceed with logout
        const response = await fetch(`${API_BASE_URL}/assessor/logout`, {
            method: 'POST',
            credentials: 'include'
        });
        
        const data = await response.json();
        if (data.success) {
            // Show success notification before redirecting
            showNotification('Logout successful! Redirecting to login page...', 'success');
            
            // Clear any stored data
            sessionStorage.removeItem('assessorData');
            
            // Wait a moment so user can see the notification
            setTimeout(() => {
                window.location.href = data.redirectTo || '/frontend/client/applicant/login/login.html';
            }, 1500);
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

// Utility Functions
function showLoading() {
    const loadingSpinner = document.getElementById('loadingSpinner');
    if (loadingSpinner) loadingSpinner.classList.add("active");
}

function hideLoading() {
    const loadingSpinner = document.getElementById('loadingSpinner');
    if (loadingSpinner) loadingSpinner.classList.remove("active");
}

function showNotification(message, type = "info") {
    // Remove any existing notifications
    const existingNotifications = document.querySelectorAll(".notification");
    existingNotifications.forEach(notification => notification.remove());

    // Create new notification
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    notification.textContent = message;

    // Add notification to the document
    document.body.appendChild(notification);

    // Remove notification after delay
    setTimeout(() => {
        notification.style.opacity = "0";
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", function() {
    // Load assessor info and profile
    showLoading();
    loadAssessorInfo().then((authenticated) => {
        if (authenticated) {
            fetchAssessorProfile();
        }
    }).finally(() => {
        hideLoading();
    });

    // Set up logout link
    const logoutLink = document.getElementById('logoutLink');
    if (logoutLink) {
        logoutLink.addEventListener('click', function(e) {
            e.preventDefault();
            handleLogout();
        });
    }

    // Profile dropdown functionality
    const profileDropdown = document.querySelector('.profile-dropdown');
    if (profileDropdown) {
        profileDropdown.addEventListener('click', function(e) {
            e.stopPropagation();
            const menu = this.querySelector('.dropdown-menu');
            if (menu) {
                const isOpen = menu.style.opacity === '1';
                menu.style.opacity = isOpen ? '0' : '1';
                menu.style.visibility = isOpen ? 'hidden' : 'visible';
                menu.style.transform = isOpen ? 'translateY(10px)' : 'translateY(0)';
            }
        });
    }

    // Close dropdowns when clicking outside
    document.addEventListener('click', function(event) {
        if (!event.target.closest('.document-item') && !event.target.closest('.dropdown-table')) {
            document.querySelectorAll('.dropdown-table').forEach(table => {
                table.style.display = 'none';
                const prevButton = table.previousElementSibling.querySelector('.message-button');
                if (prevButton) {
                    prevButton.innerHTML = '<i class="fas fa-eye"></i> View Details';
                }
            });
        }

        // Close profile dropdown when clicking outside
        if (!event.target.closest('.profile-dropdown')) {
            const menu = document.querySelector('.dropdown-menu');
            if (menu) {
                menu.style.opacity = '0';
                menu.style.visibility = 'hidden';
                menu.style.transform = 'translateY(10px)';
            }
        }
    });
});

// Test endpoint - add this to your server code
app.get('/test-docx', (req, res) => {
    res.sendFile(path.join(__dirname, 'path/to/your.docx'), {
        headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        }
    });
});

// Make functions available globally
window.toggleDropdown = toggleDropdown;
window.handleLogout = handleLogout;
