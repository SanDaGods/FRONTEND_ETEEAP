const API_BASE_URL = "https://backendeteeap-production.up.railway.app";

let students = [];
let courses = [];
let currentSection = "dashboard";
let editingId = null;
let editingCourseId = null;
let deleteType = ""; // 'student' or 'course'
let deleteId = null;

// DOM Elements
const studentTableBody = document.getElementById("studentTableBody");
const allStudentsTableBody = document.getElementById("allStudentsTableBody");
const courseTableBody = document.getElementById("courseTableBody");
const searchInput = document.getElementById("searchInput");
const loadingSpinner = document.getElementById("loadingSpinner");
const navItems = document.querySelectorAll(".nav-item");


function updateUserDisplay(user) {
    const usernameElement = document.querySelector('.username');
    if (usernameElement && user) {
        usernameElement.textContent = user.fullName || 'Assessor';
        
        // Update avatar with first initial
        const avatarElement = document.querySelector('.user-avatar');
        if (avatarElement) {
            avatarElement.textContent = user.fullName ? 
                user.fullName.charAt(0).toUpperCase() : 'A';
        }
    }
}

// Initialize the dashboard
document.addEventListener("DOMContentLoaded", async () => {
    initializeEventListeners();
    await checkAndLoadData();
    await loadAssessorInfo(); // Add this line
});

function initializeEventListeners() {
    // Navigation
    navItems.forEach(item => {
        item.addEventListener("click", () => {
            const section = item.dataset.section;
            navigateToSection(section);
        });
    });

    // Search functionality
    searchInput.addEventListener("input", handleSearch);

    // Profile Dropdown and Logout
    const profileDropdown = document.querySelector('.profile-dropdown');
    const dropdownMenu = document.querySelector('.dropdown-menu');
    const logoutLink = document.getElementById('logoutLink');
    
    if (profileDropdown && dropdownMenu) {
        // Toggle dropdown on click
        profileDropdown.addEventListener('click', function(e) {
            e.stopPropagation();
            const isVisible = dropdownMenu.style.opacity === '1';
            
            // Close all other dropdowns first
            document.querySelectorAll('.dropdown-menu').forEach(menu => {
                if (menu !== dropdownMenu) {
                    menu.style.opacity = '0';
                    menu.style.visibility = 'hidden';
                    menu.style.transform = 'translateY(10px)';
                }
            });
            
            // Toggle current dropdown
            if (isVisible) {
                dropdownMenu.style.opacity = '0';
                dropdownMenu.style.visibility = 'hidden';
                dropdownMenu.style.transform = 'translateY(10px)';
            } else {
                dropdownMenu.style.opacity = '1';
                dropdownMenu.style.visibility = 'visible';
                dropdownMenu.style.transform = 'translateY(0)';
            }
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', function() {
            dropdownMenu.style.opacity = '0';
            dropdownMenu.style.visibility = 'hidden';
            dropdownMenu.style.transform = 'translateY(10px)';
        });
        
        // Prevent dropdown from closing when clicking inside it
        dropdownMenu.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }

    // Logout functionality
    if (logoutLink) {
        logoutLink.addEventListener('click', async function(e) {
            e.preventDefault();
            await handleLogout();
        });
    }
}

// Update the checkAndLoadData function
async function checkAndLoadData() {
    showLoading();
    try {
        await loadAssessorInfo();
        await loadAssignedApplicants(); // Changed from loadStudents
        await updateDashboardStats();
    } catch (error) {
        console.error("Error during initialization:", error);
        showNotification("Error initializing application", "error");
    } finally {
        hideLoading();
    }
}

function navigateToSection(section) {
    currentSection = section;

    // Update active nav item
    navItems.forEach(item => {
        item.classList.remove("active");
        if (item.dataset.section === section) {
            item.classList.add("active");
        }
    });

    // Hide all sections
    document.querySelectorAll(".section").forEach(section => {
        section.classList.remove("active");
    });

    // Show selected section
    document.getElementById(`${section}Section`).classList.add("active");

    // Refresh data when switching sections
    if (section === "courses") {
        loadCourses();
    } else if (section === "students" || section === "dashboard") {
        loadStudents();
        updateDashboardStats();
    }
}

async function updateDashboardStats() {
    try {
        // Get fresh data from server
        const response = await fetch(`${API_BASE_URL}/api/assessor/applicants`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch applicants data');
        }
        
        const data = await response.json();
        
        if (data.success) {
            students = data.data || [];
            
            // Update the dashboard stats
            document.getElementById("totalStudents").textContent = students.length;
            
            const inProgressCount = students.filter(s => 
                s.status.toLowerCase().includes("progress") || 
                s.status.toLowerCase().includes("assessment")
            ).length;
            document.getElementById("activeCourses").textContent = inProgressCount;
            
            const evaluatedCount = students.filter(s => 
                s.status.toLowerCase().includes("approved") || 
                s.status.toLowerCase().includes("completed")
            ).length;
            document.getElementById("totalGraduates").textContent = evaluatedCount;
            
            // Count both "Rejected" and "Failed" statuses for the Failed card
            const failedCount = students.filter(s => 
                s.status.toLowerCase().includes("rejected") || 
                s.status.toLowerCase().includes("failed")
            ).length;
            
            // Calculate failure rate percentage
            const failureRate = students.length > 0 
                ? Math.round((failedCount / students.length) * 100) 
                : 0;
            document.getElementById("successRate").textContent = `${failureRate}%`;
        }
    } catch (error) {
        console.error("Error updating dashboard stats:", error);
        showNotification("Error updating statistics", "error");
    }
}

// In ApplicantProfile.js
async function showAssignAssessorModal() {
    const modal = document.getElementById('assignAssessorModal');
    const assessorSelect = document.getElementById('assessorSelect');
    
    if (!modal || !assessorSelect) return;
    
    showLoading();
    try {
      // First approve the application
      const approveResponse = await fetch(`${API_BASE_URL}/api/admin/applicants/${applicantId}/approve`, {
        method: 'POST',
        credentials: 'include'
      });
      
      const approveData = await approveResponse.json();
      
      if (!approveData.success) {
        throw new Error(approveData.error || 'Failed to approve application');
      }
  
      // Then fetch available assessors
      const assessorsResponse = await fetch(`${API_BASE_URL}/api/admin/available-assessors`, {
        credentials: 'include'
      });
      
      if (!assessorsResponse.ok) {
        throw new Error('Failed to fetch assessors');
      }
      
      const assessorsData = await assessorsResponse.json();
      
      if (!assessorsData.success || !assessorsData.data) {
        throw new Error(assessorsData.error || 'No assessors available');
      }
      
      // Populate assessor dropdown
      assessorSelect.innerHTML = '<option value="" disabled selected>Select an assessor</option>';
      assessorsData.data.forEach(assessor => {
        const option = document.createElement('option');
        option.value = assessor._id;
        option.textContent = `${assessor.fullName} (${assessor.assessorId}) - ${formatExpertise(assessor.expertise)}`;
        assessorSelect.appendChild(option);
      });
      
      // Show modal
      modal.style.display = 'flex';
      
    } catch (error) {
      console.error('Error loading assessors:', error);
      showNotification(error.message, 'error');
      closeModal();
    } finally {
      hideLoading();
    }
  }
  
  function setupAssessorAssignment() {
    const confirmAssignBtn = document.getElementById('confirmAssignBtn');
    const assessorSelect = document.getElementById('assessorSelect');
    
    if (!confirmAssignBtn || !assessorSelect) return;
    
    confirmAssignBtn.addEventListener('click', async function() {
      const assessorId = assessorSelect.value;
      if (!assessorId) {
        showNotification('Please select an assessor', 'error');
        return;
      }
      
      showLoading();
      try {
        const response = await fetch(`${API_BASE_URL}/api/admin/applicants/${applicantId}/assign-assessor`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            applicantId,
            assessorId
          }),
          credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
          showNotification('Assessor assigned successfully!', 'success');
          updateStatusBadge('Under Assessment');
          if (currentApplicant) {
            currentApplicant.status = 'Under Assessment';
            if (!currentApplicant.assignedAssessors) {
              currentApplicant.assignedAssessors = [];
            }
            currentApplicant.assignedAssessors.push(assessorId);
          }
          closeModal();
        } else {
          throw new Error(data.error || 'Failed to assign assessor');
        }
      } catch (error) {
        console.error('Error assigning assessor:', error);
        showNotification(error.message, 'error');
      } finally {
        hideLoading();
      }
    });
  }

function renderCourseTable(coursesToRender) {
    courseTableBody.innerHTML = "";

    if (coursesToRender.length === 0) {
        courseTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-state">
                    <i class="fas fa-book"></i>
                    <h3>No Courses Found</h3>
                </td>
            </tr>
        `;
        return;
    }

    coursesToRender.forEach(course => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${course._id}</td>
            <td>${escapeHtml(course.name)}</td>
            <td>${escapeHtml(course.description)}</td>
            <td>${course.duration}</td>
            <td>
                <span class="status-badge status-${course.status}">
                    ${capitalizeFirstLetter(course.status)}
                </span>
            </td>
            <td class="action-buttons">
                <button class="action-btn edit-btn" onclick="editCourse('${course._id}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="action-btn delete-btn" onclick="deleteCourse('${course._id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </td>
        `;
        courseTableBody.appendChild(row);
    });
}

// Search Functionality
let searchTimeout;
function handleSearch(e) {
    clearTimeout(searchTimeout);
    const searchTerm = e.target.value.trim().toLowerCase();

    searchTimeout = setTimeout(() => {
        if (searchTerm.length === 0) {
            renderStudentTables(students);
            return;
        }

        const filteredStudents = students.filter(student => 
            student.name.toLowerCase().includes(searchTerm) || 
            student.email.toLowerCase().includes(searchTerm) ||
            (student.courseName || student.course).toLowerCase().includes(searchTerm)
        );
        
        renderStudentTables(filteredStudents);
    }, 300);
}

// Utility Functions
function formatDate(dateString) {
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

// Loading Spinner Functions
function showLoading() {
    loadingSpinner.classList.add("active");
}

function hideLoading() {
    loadingSpinner.classList.remove("active");
}

// Notification System
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

// Enhanced Logout Functionality
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

// Add this function to fetch and display user info
async function loadAssessorInfo() {
    try {
        const response = await fetch(`${API_BASE_URL}/assessor/auth-status`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch assessor info');
        }
        
        const data = await response.json();
        
        if (data.authenticated && data.user) {
            updateUserDisplay(data.user);
            // Store user data in sessionStorage for quick access
            sessionStorage.setItem('assessorData', JSON.stringify(data.user));
        } else {
            // If not authenticated, redirect to login
            window.location.href = '/frontend/client/applicant/login/login.html';
        }
    } catch (error) {
        console.error('Error loading assessor info:', error);
        // Fallback to sessionStorage if available
        const storedData = sessionStorage.getItem('assessorData');
        if (storedData) {
            updateUserDisplay(JSON.parse(storedData));
        } else {
            // If no stored data and can't fetch, redirect to login
            window.location.href = '/frontend/client/applicant/login/login.html';
        }
    }
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

// Set up logout link
const logoutLink = document.getElementById('logoutLink');
if (logoutLink) {
    logoutLink.addEventListener('click', function(e) {
        e.preventDefault();
        handleLogout();
    });
}



// Update the rejectStudent function to prevent default behavior
async function rejectStudent(applicantId, event) {
    if (event) event.preventDefault(); // Prevent any default behavior
    
    if (!confirm('Are you sure you want to reject this applicant? This action cannot be undone.')) {
        return;
    }

    showLoading();
    try {
        const response = await fetch(`${API_BASE_URL}/api/assessor/applicants/${applicantId}/reject`, {
            method: 'POST',
            credentials: 'include'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Applicant rejected successfully', 'success');
            await loadAssignedApplicants();
        } else {
            throw new Error(data.error || 'Failed to reject applicant');
        }
    } catch (error) {
        console.error('Error rejecting applicant:', error);
        showNotification(error.message, 'error');
    } finally {
        hideLoading();
    }
}

// Update the formatDate function to handle missing dates better
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    } catch {
        return 'N/A';
    }
}

// Add this function to fetch assigned applicants
async function loadAssignedApplicants() {
    showLoading();
    try {
        const response = await fetch(`${API_BASE_URL}/api/assessor/applicants`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch assigned applicants');
        }
        
        const data = await response.json();
        
        if (data.success) {
            students = data.data || [];
            renderStudentTables(students);
            updateDashboardStats();
        } else {
            throw new Error(data.error || 'No applicants assigned');
        }
    } catch (error) {
        console.error('Error loading assigned applicants:', error);
        showNotification(error.message, 'error');
        students = [];
        renderStudentTables([]);
    } finally {
        hideLoading();
    }
}

// Update the renderStudentTables function //
function renderStudentTables(studentsToRender) {
    const table = studentTableBody;
    table.innerHTML = "";

    if (studentsToRender.length === 0) {
        table.innerHTML = `
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

    studentsToRender.forEach(student => {
        const statusClass = student.status.toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-]/g, '');
        
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${student.applicantId || student._id}</td>
            <td>${escapeHtml(formatName(student.name))}</td>
            <td>${escapeHtml(student.course)}</td>
            <td>${formatDate(student.applicationDate)}</td>
            <td>
                <span class="status-badge status-${statusClass}">
                    ${formatStatus(student.status)}
                </span>
            </td>
            <td class="score-cell">${student.score || student.score === 0 ? student.score : '0'}</td>
            <td class="action-buttons">
                <button class="action-btn view-btn" onclick="viewStudent('${student._id}')">
                    <i class="fas fa-eye"></i> View
                </button>
              <button class="action-btn reject-btn" onclick="rejectStudent('${student._id}', event)"
                    ${student.status.toLowerCase().includes("rejected") ? "disabled" : ""}>
                    <i class="fas fa-times"></i> Reject
                </button>
                <button class="action-btn remove-btn" onclick="unassignApplicant('${student._id}', event)">
                    <i class="fas fa-user-minus"></i> Remove
                </button>
            </td>
        `;
        table.appendChild(row);
    });
}

// Helper function to format names as "Last, First"
function formatName(name) {
    if (!name) return '';
    const parts = name.split(' ');
    if (parts.length === 1) return name;
    const lastName = parts.pop();
    return `${lastName}, ${parts.join(' ')}`;
}

// Add this helper function
function formatStatus(status) {
    return status.split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

// First, add this function to your script
function viewStudent(applicantId) {
    // Find the student in our local data to get the applicantId
    const student = students.find(s => s._id === applicantId);
    const url = `/frontend/client/assessor/evaluation/evaluation.html?id=${applicantId}`;
    
    if (student && student.applicantId) {
        // If we have the formatted ID, we can add it to the URL
        window.location.href = `${url}&applicantId=${student.applicantId}`;
    } else {
        window.location.href = url;
    }
}
// Then in renderStudentTables:
row.innerHTML = `
    <td class="action-buttons">
        <button class="action-btn view-btn" onclick="viewStudent('${student._id}')">
            <i class="fas fa-eye"></i> View
        </button>
        <button class="action-btn reject-btn" onclick="rejectStudent('${student._id}', event)">
            <i class="fas fa-times"></i> Reject
        </button>
    </td>
`;


// Add this function to both dashboard.js and applicants.js
async function deleteApplicant(applicantId, event) {
  if (event) event.preventDefault();
  
  if (!confirm('Are you sure you want to permanently delete this applicant? This action cannot be undone.')) {
    return;
  }

  showLoading();
  try {
    const response = await fetch(`${API_BASE_URL}/api/assessor/applicants/${applicantId}`, {
      method: 'DELETE',
      credentials: 'include'
    });

    const data = await response.json();
    
    if (data.success) {
      showNotification('Applicant deleted successfully', 'success');
      await loadAssignedApplicants(); // Refresh the table
      await updateDashboardStats(); // Update dashboard counts
    } else {
      throw new Error(data.error || 'Failed to delete applicant');
    }
  } catch (error) {
    console.error('Error deleting applicant:', error);
    showNotification(error.message, 'error');
  } finally {
    hideLoading();
  }
}

// Add this function to dashboard.js
async function unassignApplicant(applicantId, event) {
  if (event) event.preventDefault();
  
  if (!confirm('Are you sure you want to unassign this applicant? They will be removed from your list but their account will remain.')) {
    return;
  }

  showLoading();
  try {
    console.log(`Attempting to unassign applicant: ${applicantId}`);
    
    const response = await fetch(`${API_BASE_URL}/api/assessor/applicants/${applicantId}/unassign`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || 'Failed to unassign applicant';
      console.error('Unassign failed:', errorMessage);
      throw new Error(errorMessage);
    }

    const data = await response.json();
    
    if (data.success) {
      showNotification('Applicant unassigned successfully', 'success');
      await loadAssignedApplicants();
      await updateDashboardStats();
    } else {
      throw new Error(data.error || 'Failed to unassign applicant');
    }
  } catch (error) {
    console.error('Error unassigning applicant:', error);
    
    let userMessage = error.message;
    if (error.message.includes('not found')) {
      userMessage = "The applicant was not found in our records or is no longer assigned to you.";
    } else if (error.message.includes('Failed to fetch')) {
      userMessage = "Network error. Please check your connection and try again.";
    }
    
    showNotification(userMessage, 'error');
  } finally {
    hideLoading();
  }
}


// Add to global scope
window.unassignApplicant = unassignApplicant;
window.viewStudent = viewStudent;
window.rejectStudent = rejectStudent;
window.deleteApplicant = deleteApplicant;
window.handleLogout = handleLogout;