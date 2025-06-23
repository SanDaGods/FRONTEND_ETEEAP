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
const assessorModal = document.getElementById("assessorModal");
const courseModal = document.getElementById("courseModal");
const studentForm = document.getElementById("studentForm");
const courseForm = document.getElementById("courseForm");
const searchInput = document.querySelector(".search-bar input");
const loadingSpinner = document.querySelector(".loading-spinner");
const logoutLink = document.getElementById('logoutLink');

// Initialize the dashboard
document.addEventListener("DOMContentLoaded", async () => {
  initializeEventListeners();
  await loadAdminInfo();
  await checkAndLoadData();
});

// Initialize all event listeners
function initializeEventListeners() {
  // Form submissions
  if (studentForm) studentForm.addEventListener("submit", handleFormSubmit);
  if (courseForm) courseForm.addEventListener("submit", handleCourseFormSubmit);

  // Search functionality
  if (searchInput) searchInput.addEventListener("input", handleSearch);

  // Modal outside click handlers
  window.onclick = (event) => {
    if (event.target === assessorModal) closeAssessorModal();
    if (event.target === courseModal) closeCourseModal();
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
  window.location.href = '/login/login.html';
}

function clearAuthData() {
  sessionStorage.removeItem('adminData');
}

// ======================
// CORE APPLICATION FUNCTIONS
// ======================

async function checkAndLoadData() {
  showLoading();
  try {
    await loadCourses();
    await Promise.all([loadStudents(), updateDashboardStats()]);
  } catch (error) {
    console.error("Error during initialization:", error);
    showNotification("Error initializing application", "error");
  } finally {
    hideLoading();
  }
}

async function updateDashboardStats() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/dashboard/stats`);
    if (!response.ok) throw new Error("Failed to fetch dashboard stats");

    const stats = await response.json();

    // Update dashboard cards
    const cards = document.querySelectorAll('.card');
    if (cards.length >= 4) {
      cards[0].querySelector('.card-value').textContent = stats.totalStudents || 0;
      cards[1].querySelector('.card-value').textContent = stats.newApplicants || 0;
      cards[2].querySelector('.card-value').textContent = stats.withoutAssessor || 0;
      cards[3].querySelector('.card-value').textContent = stats.rejected || 0;
    }
  } catch (error) {
    console.error("Error updating dashboard stats:", error);
    showNotification("Error updating statistics", "error");
  }
}

async function loadStudents() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/students`);
    if (!response.ok) throw new Error("Failed to fetch students");

    students = await response.json();
    renderStudentTables(students);
  } catch (error) {
    console.error("Error loading students:", error);
    showNotification("Error loading students", "error");
    students = [];
    renderStudentTables([]);
  }
}

async function loadCourses() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/courses`);
    if (!response.ok) throw new Error("Failed to fetch courses");

    courses = await response.json();
    updateCourseDropdown(courses);
    renderCourseTable(courses);
    return courses;
  } catch (error) {
    console.error("Error loading courses:", error);
    showNotification("Error loading courses", "error");
    courses = [];
    renderCourseTable([]);
  }
}

// CRUD Operations
async function createStudent(studentData) {
  const response = await fetch(`${API_BASE_URL}/api/students`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(studentData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to create student");
  }
  return response.json();
}

async function updateStudent(id, studentData) {
  const response = await fetch(`${API_BASE_URL}/api/students/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(studentData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to update student");
  }
  return response.json();
}

async function deleteStudent(id) {
  deleteType = "student";
  deleteId = id;
  document.getElementById("deleteConfirmationModal").style.display = "flex";
}

async function createCourse(courseData) {
  const response = await fetch(`${API_BASE_URL}/api/courses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(courseData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to create course");
  }
  return response.json();
}

async function updateCourse(id, courseData) {
  const response = await fetch(`${API_BASE_URL}/api/courses/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(courseData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to update course");
  }
  return response.json();
}

async function deleteCourse(id) {
  deleteType = "course";
  deleteId = id;
  document.getElementById("deleteConfirmationModal").style.display = "flex";
}

function closeDeleteModal() {
  document.getElementById("deleteConfirmationModal").style.display = "none";
  deleteType = "";
  deleteId = null;
}

async function confirmDelete() {
  showLoading();
  try {
    let response;
    if (deleteType === "student") {
      response = await fetch(`${API_BASE_URL}/api/students/${deleteId}`, {
        method: "DELETE",
      });
    } else if (deleteType === "course") {
      response = await fetch(`${API_BASE_URL}/api/courses/${deleteId}`, {
        method: "DELETE",
      });
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to delete");
    }

    showNotification(`${deleteType} deleted successfully`, "success");
    
    if (deleteType === "student") {
      await loadStudents();
    } else if (deleteType === "course") {
      await loadCourses();
    }
    await updateDashboardStats();
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

  const studentData = {
    name: document.getElementById("studentName").value.trim(),
    email: document.getElementById("studentEmail").value.trim(),
    course: document.getElementById("studentCourse").value,
    enrollmentDate: document.getElementById("enrollmentDate").value,
    status: "active",
  };

  try {
    if (editingId) {
      await updateStudent(editingId, studentData);
      showNotification("Student updated successfully", "success");
    } else {
      await createStudent(studentData);
      showNotification("Student created successfully", "success");
    }
    closeAssessorModal();
    await loadStudents();
    await updateDashboardStats();
  } catch (error) {
    console.error("Error:", error);
    showNotification("Error saving student data", "error");
  } finally {
    hideLoading();
  }
}

async function handleCourseFormSubmit(e) {
  e.preventDefault();
  showLoading();

  const courseData = {
    name: document.getElementById("courseName").value.trim(),
    description: document.getElementById("courseDescription").value.trim(),
    duration: parseInt(document.getElementById("courseDuration").value),
    status: document.getElementById("courseStatus").value,
  };

  try {
    if (editingCourseId) {
      await updateCourse(editingCourseId, courseData);
      showNotification("Course updated successfully", "success");
    } else {
      await createCourse(courseData);
      showNotification("Course created successfully", "success");
    }
    closeCourseModal();
    await loadCourses();
    await updateDashboardStats();
  } catch (error) {
    console.error("Error:", error);
    showNotification("Error saving course data", "error");
  } finally {
    hideLoading();
  }
}

// UI Rendering
function renderStudentTables(studentsToRender) {
  const tables = [studentTableBody, allStudentsTableBody].filter(Boolean);

  tables.forEach((table) => {
    table.innerHTML = "";

    if (studentsToRender.length === 0) {
      const colSpan = table.closest("table").querySelectorAll("th").length;
      table.innerHTML = `
        <tr>
          <td colspan="${colSpan}" class="empty-state">
            <i class="fas fa-users"></i>
            <h3>No Applicants Found</h3>
          </td>
        </tr>
      `;
      return;
    }

    studentsToRender.forEach((student) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${student._id}</td>
        <td>${escapeHtml(student.name)}</td>
        <td>${escapeHtml(student.courseName || student.course)}</td>
        <td>${formatDate(student.enrollmentDate)}</td>
        <td>
          <span class="status-badge status-${student.status}">
            ${capitalizeFirstLetter(student.status)}
          </span>
        </td>
        <td class="action-buttons">
          <button class="action-btn edit-btn" onclick="editStudent('${student._id}')">
            <i class="fas fa-edit"></i> Edit
          </button>
          <button class="action-btn delete-btn" onclick="deleteStudent('${student._id}')">
            <i class="fas fa-trash"></i> Delete
          </button>
        </td>
      `;
      table.appendChild(row);
    });
  });
}

function updateCourseDropdown(courses) {
  const courseSelect = document.getElementById("studentCourse");
  if (!courseSelect) return;

  courseSelect.innerHTML = '<option value="">Select Course</option>';

  courses
    .filter((course) => course.status === "active")
    .forEach((course) => {
      const option = document.createElement("option");
      option.value = course._id;
      option.textContent = course.name;
      courseSelect.appendChild(option);
    });
}

function renderCourseTable(coursesToRender) {
  if (!courseTableBody) return;

  courseTableBody.innerHTML = "";

  if (coursesToRender.length === 0) {
    courseTableBody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state">
          <i class="fas fa-book"></i>
          <h3>No Courses Found</h3>
          <p>Click "Add Course" to add your first course</p>
        </td>
      </tr>
    `;
    return;
  }

  coursesToRender.forEach((course) => {
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

// Modal Operations
function openAssessorModal() {
  if (!assessorModal) return;
  
  assessorModal.style.display = "flex";
  editingId = null;
  studentForm?.reset();
  document.getElementById("modalTitle").textContent = "Add New Assessor";
}

function closeAssessorModal() {
  if (!assessorModal) return;
  
  assessorModal.style.display = "none";
  editingId = null;
  studentForm?.reset();
}

function openCourseModal() {
  if (!courseModal) return;
  
  courseModal.style.display = "flex";
  editingCourseId = null;
  courseForm?.reset();
  document.getElementById("courseModalTitle").textContent = "Add New Course";
}

function closeCourseModal() {
  if (!courseModal) return;
  
  courseModal.style.display = "none";
  editingCourseId = null;
  courseForm?.reset();
}

// Edit Functions
async function editStudent(id) {
  showLoading();
  try {
    const response = await fetch(`${API_BASE_URL}/api/students/${id}`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch student");
    }

    const student = await response.json();
    editingId = id;
    
    document.getElementById("modalTitle").textContent = "Edit Student";
    document.getElementById("studentName").value = student.name;
    document.getElementById("studentEmail").value = student.email;
    document.getElementById("studentCourse").value = student.course;
    document.getElementById("enrollmentDate").value = formatDateForInput(student.enrollmentDate);

    assessorModal.style.display = "flex";
  } catch (error) {
    console.error("Error loading student for edit:", error);
    showNotification(error.message || "Error loading student data", "error");
  } finally {
    hideLoading();
  }
}

async function editCourse(id) {
  showLoading();
  try {
    const response = await fetch(`${API_BASE_URL}/api/courses/${id}`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch course");
    }

    const course = await response.json();
    editingCourseId = id;
    
    document.getElementById("courseModalTitle").textContent = "Edit Course";
    document.getElementById("courseName").value = course.name;
    document.getElementById("courseDescription").value = course.description;
    document.getElementById("courseDuration").value = course.duration;
    document.getElementById("courseStatus").value = course.status;

    courseModal.style.display = "flex";
  } catch (error) {
    console.error("Error loading course for edit:", error);
    showNotification(error.message || "Error loading course data", "error");
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
      renderStudentTables(students);
      return;
    }

    const filteredStudents = students.filter(student => 
      student.name.toLowerCase().includes(searchTerm) || 
      student.email.toLowerCase().includes(searchTerm) ||
      student.course.toLowerCase().includes(searchTerm)
    );
    
    renderStudentTables(filteredStudents);
  }, 300);
}

// Utility Functions
function formatDate(dateString) {
  const options = { year: "numeric", month: "short", day: "numeric" };
  return new Date(dateString).toLocaleDateString(undefined, options);
}

function formatDateForInput(dateString) {
  return new Date(dateString).toISOString().split("T")[0];
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

// Make functions available globally
window.editStudent = editStudent;
window.editCourse = editCourse;
window.deleteStudent = deleteStudent;
window.deleteCourse = deleteCourse;
window.confirmDelete = confirmDelete;
window.closeAssessorModal = closeAssessorModal;
window.closeCourseModal = closeCourseModal;
window.closeDeleteModal = closeDeleteModal;
window.handleLogout = handleLogout;
