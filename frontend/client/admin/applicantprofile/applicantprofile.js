const API_BASE_URL = "https://backendeteeap-production.up.railway.app";
let currentApplicant = null;
let applicantId = null;

// File viewer state
let currentFiles = [];
let currentFileIndex = 0;

// Utility Functions
function showLoading() {
  const spinner = document.getElementById('loadingSpinner');
  if (spinner) spinner.style.display = 'flex';
}

function hideLoading() {
  const spinner = document.getElementById('loadingSpinner');
  if (spinner) spinner.style.display = 'none';
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// Get applicant ID from URL or sessionStorage
function getApplicantId() {
  const urlParams = new URLSearchParams(window.location.search);
  let id = urlParams.get('id');

  if (!id) {
    id = sessionStorage.getItem('currentApplicantId');
  }

  if (!id) {
    showNotification('No applicant ID provided', 'error');
    return null;
  }

  return id;
}

// Format date for display
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  try {
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return 'N/A';
  }
}

// Update status badge appearance
function updateStatusBadge(status) {
  const badge = document.getElementById('statusBadge');
  if (!badge) return;
  
  badge.textContent = status || 'Pending Review';
  badge.className = 'status-badge ';
  
  if (status === 'Approved') {
    badge.classList.add('status-approved');
  } else if (status === 'Rejected') {
    badge.classList.add('status-rejected');
  } else {
    badge.classList.add('status-pending');
  }
}

// Safely set text content for an element
function setTextContent(elementId, text) {
  const element = document.getElementById(elementId);
  if (element) {
    element.textContent = text || 'N/A';
  }
}

// Initialize the file viewer modal
function initializeFileViewer() {
  const modal = document.getElementById("fileModal");
  if (!modal) return;

  const closeBtn = modal.querySelector(".close-modal");
  const prevBtn = modal.querySelector(".prev-btn");
  const nextBtn = modal.querySelector(".next-btn");

  function closeModal() {
    modal.style.display = "none";
    document.getElementById("fileViewer").style.display = "none";
    document.getElementById("imageViewer").style.display = "none";
    currentFiles = [];
    currentFileIndex = 0;
  }

  // Event listeners for modal controls
  closeBtn.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => e.target === modal && closeModal());

  // Navigation buttons
  prevBtn.addEventListener("click", () => {
    if (currentFileIndex > 0) showFile(currentFileIndex - 1);
  });

  nextBtn.addEventListener("click", () => {
    if (currentFileIndex < currentFiles.length - 1) showFile(currentFileIndex + 1);
  });

  // Keyboard navigation
  document.addEventListener("keydown", (e) => {
    if (modal.style.display === "flex") {
      if (e.key === "Escape") closeModal();
      if (e.key === "ArrowLeft" && currentFileIndex > 0) showFile(currentFileIndex - 1);
      if (e.key === "ArrowRight" && currentFileIndex < currentFiles.length - 1) showFile(currentFileIndex + 1);
    }
  });
}

// Show file in viewer
async function showFile(index) {
  try {
    const file = currentFiles[index];
    currentFileIndex = index;

    const modal = document.getElementById("fileModal");
    const fileViewer = document.getElementById("fileViewer");
    const imageViewer = document.getElementById("imageViewer");
    const currentFileText = document.getElementById("currentFileText");
    const fileName = document.getElementById("fileName");
    const prevBtn = modal.querySelector(".prev-btn");
    const nextBtn = modal.querySelector(".next-btn");

    // Update UI
    currentFileText.textContent = `File ${index + 1} of ${currentFiles.length}`;
    fileName.textContent = file.filename;
    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === currentFiles.length - 1;

    // Show loading state
    fileName.textContent = `Loading ${file.filename}...`;

    // Fetch the file
    const response = await fetch(`${API_BASE_URL}/api/admin/applicants/${applicantId}/files/${file._id}`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to load file: ${response.status} ${response.statusText}`);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);

    // Get content type from response headers if not available in file object
    const contentType = response.headers.get('content-type') || file.contentType;

    // Hide both viewers first
    fileViewer.style.display = "none";
    imageViewer.style.display = "none";

    // Show appropriate viewer based on file type
    if (contentType.startsWith("image/")) {
      imageViewer.onload = () => {
        imageViewer.style.display = "block";
        fileName.textContent = file.filename;
      };
      imageViewer.src = url;
    } else {
      fileViewer.onload = () => {
        fileViewer.style.display = "block";
        fileName.textContent = file.filename;
      };
      fileViewer.src = url;
    }

    // Clean up URL when modal closes
    const cleanup = () => {
      URL.revokeObjectURL(url);
      modal.removeEventListener("click", cleanup);
    };
    modal.addEventListener("click", cleanup, { once: true });

  } catch (error) {
    console.error("Error showing file:", error);
    showNotification(`Error: Could not display file (${error.message})`, "error");
    
    // Close modal on error
    const modal = document.getElementById("fileModal");
    if (modal) modal.style.display = "none";
  }
}

// View a specific file
async function viewFile(fileId, sectionFiles) {
  try {
    currentFiles = sectionFiles;
    currentFileIndex = currentFiles.findIndex(file => file._id === fileId);
    
    if (currentFileIndex === -1) {
      throw new Error("File not found in this section");
    }

    const modal = document.getElementById("fileModal");
    modal.style.display = "flex";
    
    await showFile(currentFileIndex);
  } catch (error) {
    console.error("Error viewing file:", error);
    showNotification(`Error viewing file: ${error.message}`, "error");
  }
}

// Display documents in the UI
function displayDocuments(documents) {
  const container = document.getElementById("documents-container");
  const loading = document.getElementById("documents-loading");
  const noDocs = document.getElementById("no-documents");
  const grid = document.getElementById("documents-grid");
  
  if (!container) return;
  
  // Hide loading
  if (loading) loading.style.display = "none";
  
  // Check if no documents
  if (!documents || Object.keys(documents).length === 0) {
    if (noDocs) noDocs.style.display = "flex";
    if (grid) grid.style.display = "none";
    return;
  }
  
  // Show grid
  if (noDocs) noDocs.style.display = "none";
  if (grid) {
    grid.style.display = "grid";
    grid.innerHTML = "";
    
    // Flatten all documents from all sections
    const allFiles = Object.values(documents).flat();
    
    allFiles.forEach(file => {
      const fileExt = file.filename.split('.').pop()?.toLowerCase() || '';
      let iconClass = 'fa-file';
      
      if (fileExt === 'pdf') iconClass = 'fa-file-pdf';
      else if (['jpg', 'jpeg', 'png', 'gif'].includes(fileExt)) iconClass = 'fa-file-image';
      else if (['doc', 'docx'].includes(fileExt)) iconClass = 'fa-file-word';
      
      const documentCard = document.createElement('div');
      documentCard.className = 'document-card';
      documentCard.innerHTML = `
        <div class="document-icon">
          <i class="fas ${iconClass}"></i>
        </div>
        <div class="document-info">
          <p class="document-name">${file.filename}</p>
          <div class="document-actions">
            <button class="btn view-btn" data-file-id="${file._id}">
              <i class="fas fa-eye"></i> View
            </button>
            <a href="${API_BASE_URL}/api/admin/applicants/${applicantId}/files/${file._id}" download="${file.filename}" class="btn download-btn">
              <i class="fas fa-download"></i> Download
            </a>
          </div>
        </div>
      `;
      
      grid.appendChild(documentCard);
    });
    
    // Add event listeners for view buttons
    grid.querySelectorAll('.view-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const fileId = btn.getAttribute('data-file-id');
        viewFile(fileId, allFiles);
      });
    });
  }
}

// Load applicant data from server
async function loadApplicantData() {
  showLoading();
  
  try {
    // Verify admin is authenticated first
    const authResponse = await fetch(`${API_BASE_URL}/admin/auth-status`, {
      credentials: 'include'
    });
    
    if (!authResponse.ok) {
      const errorData = await authResponse.json().catch(() => ({}));
      throw new Error(errorData.error || `Authentication failed: ${authResponse.status}`);
    }
    
    // Fetch both applicant data and documents in parallel
    const [applicantResponse, docsResponse] = await Promise.all([
      fetch(`${API_BASE_URL}/api/admin/applicants/${applicantId}`, {
        credentials: 'include'
      }),
      fetch(`${API_BASE_URL}/api/admin/applicants/${applicantId}/files`, {
        credentials: 'include'
      })
    ]);

    // Handle applicant data
    if (!applicantResponse.ok) {
      const errorData = await applicantResponse.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to fetch applicant: ${applicantResponse.status}`);
    }
    
    const applicantData = await applicantResponse.json();
    
    if (!applicantData.success || !applicantData.data) {
      throw new Error(applicantData.error || 'Failed to load applicant data');
    }

    // Handle documents
    let filesData = { files: {} };
    if (docsResponse.ok) {
      filesData = await docsResponse.json();
      if (!filesData.success) {
        console.warn('Files response was not successful:', filesData);
      }
    } else {
      const errorData = await docsResponse.json().catch(() => ({}));
      console.warn('Failed to fetch documents:', errorData);
    }

    // Combine data
    currentApplicant = {
      ...applicantData.data,
      files: filesData.files || {}
    };
    
    displayApplicantData(currentApplicant);
    
  } catch (error) {
    console.error("Error loading applicant data:", {
      error: error.message,
      stack: error.stack
    });
    showNotification(`Error: ${error.message}`, "error");
  } finally {
    hideLoading();
  }
}

// Display applicant data in the UI
function displayApplicantData(applicant) {
  if (!applicant) return;
  
  // Basic info
  setTextContent('applicantId', applicant.applicantId);
  setTextContent('email', applicant.email);
  updateStatusBadge(applicant.status);
  setTextContent('createdAt', formatDate(applicant.createdAt));
  
  // Personal info section
  if (applicant.personalInfo) {
    const info = applicant.personalInfo;
    
    // Profile header
    const nameElement = document.getElementById('profile-name');
    if (nameElement) {
      nameElement.textContent = 
        `${info.firstname || ''} ${info.middlename || ''} ${info.lastname || ''} ${info.suffix || ''}`.trim() || 'N/A';
    }
    
    const occupationElement = document.getElementById('profile-occupation');
    if (occupationElement) {
      occupationElement.textContent = info.occupation || 'Not specified';
    }
    
    // Contact Information
    setTextContent('profile-email', info.emailAddress || applicant.email);
    setTextContent('profile-phone', info.mobileNumber);
    setTextContent('profile-telephone', info.telephoneNumber);
    
    // Personal Details
    setTextContent('profile-gender', info.gender);
    setTextContent('profile-age', info.age);
    setTextContent('profile-nationality', info.nationality);
    setTextContent('profile-civil-status', info.civilstatus);
    setTextContent('profile-birthdate', formatDate(info.birthDate));
    setTextContent('profile-birthplace', info.birthplace);
    
    // Address Information
    setTextContent('profile-country', info.country);
    setTextContent('profile-province', info.province);
    setTextContent('profile-city', info.city);
    setTextContent('profile-street', info.street);
    setTextContent('profile-zip', info.zipCode);
    
    // Course Priorities
    setTextContent('profile-first-priority', info.firstPriorityCourse);
    setTextContent('profile-second-priority', info.secondPriorityCourse);
    setTextContent('profile-third-priority', info.thirdPriorityCourse);
  }
  
  // Display documents
  displayDocuments(applicant.files || {});
}

// Show modal for assigning assessor
async function showAssignAssessorModal() {
  const modal = document.getElementById('assignAssessorModal');
  const assessorSelect = document.getElementById('assessorSelect');
  
  if (!modal || !assessorSelect) return;
  
  showLoading();
  try {
    // First approve the application
    const approveResponse = await fetch(`${API_BASE_URL}/api/admin/applicants/${applicantId}/approve`, {
      method: "POST",
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

// Format expertise for display
function formatExpertise(expertise) {
  const expertiseMap = {
    "engineering": "Engineering",
    "education": "Education",
    "business": "Business",
    "information_technology": "IT",
    "health_sciences": "Health Sciences",
    "arts_sciences": "Arts & Sciences",
    "architecture": "Architecture",
    "industrial_technology": "Industrial Technology",
    "hospitality_management": "Hospitality Management",
    "other": "Other"
  };
  return expertiseMap[expertise] || expertise;
}

// Handle assessor selection
function setupAssessorSelection() {
  const assessorSelect = document.getElementById('assessorSelect');
  const assessorDetails = document.getElementById('assessorDetails');
  
  if (!assessorSelect || !assessorDetails) return;
  
  assessorSelect.addEventListener('change', async function() {
    const assessorId = this.value;
    if (!assessorId) {
      assessorDetails.style.display = 'none';
      return;
    }
    
    showLoading();
    try {
      const response = await fetch(`${API_BASE_URL}/assessor/${assessorId}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch assessor details');
      }
      
      const data = await response.json();
      
      if (data.success && data.data) {
        const assessor = data.data;
        document.getElementById('assessorIdDisplay').textContent = assessor.assessorId;
        document.getElementById('assessorTypeDisplay').textContent = assessor.assessorType === 'internal' ? 'Internal' : 'External';
        document.getElementById('assessorExpertiseDisplay').textContent = formatExpertise(assessor.expertise);
        assessorDetails.style.display = 'block';
      }
    } catch (error) {
      console.error('Error fetching assessor details:', error);
      assessorDetails.style.display = 'none';
    } finally {
      hideLoading();
    }
  });
}

// Handle assessor assignment
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
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assessorId: assessorId,
          applicantId: applicantId
        }),
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to assign assessor');
      }
      
      if (data.success) {
        showNotification('Assessor assigned successfully!', 'success');
        updateStatusBadge('Under Assessment');
        if (currentApplicant) {
          currentApplicant.status = 'Under Assessment';
          currentApplicant.assignedAssessor = assessorId;
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

// Modal control functions
function setupModalControls() {
  const modal = document.getElementById('assignAssessorModal');
  if (!modal) return;
  
  // Close modal when clicking X or cancel button
  document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', closeModal);
  });
  
  // Close modal when clicking outside content
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      closeModal();
    }
  });
}

function closeModal() {
  const modal = document.getElementById('assignAssessorModal');
  if (modal) modal.style.display = 'none';
}

// Main initialization when DOM loads
document.addEventListener('DOMContentLoaded', async function() {
  // Initialize file viewer
  initializeFileViewer();

  // Get applicant ID
  applicantId = getApplicantId();
  if (!applicantId) return;
  
  try {
    // Check authentication status
    const authResponse = await fetch(`${API_BASE_URL}/auth-status`, {
      credentials: 'include'
    });
    
    if (!authResponse.ok) {
      throw new Error(`HTTP error! status: ${authResponse.status}`);
    }
    
    const authData = await authResponse.json();

    if (!authData.authenticated) {
      throw new Error("Authentication failed");
    }

    setupEventListeners();
    await loadApplicantData();
    
  } catch (error) {
    console.error("Authentication Error:", error);
    showNotification(`Failed to load profile data: ${error.message}`, "error");
  }
});

// Setup all event listeners
function setupEventListeners() {
  // Logout button
  const logoutButton = document.querySelector("#logout");
  if (logoutButton) {
    logoutButton.addEventListener("click", (event) => {
      event.preventDefault();
      logoutUser();
    });
  }

  // Back button
  document.getElementById('backButton')?.addEventListener('click', () => {
    window.location.href = '/frontend/client/admin/applicants/applicants.html';
  });

  // Approve button
  document.getElementById('approveBtn')?.addEventListener('click', async () => {
    if (!confirm('Are you sure you want to approve this application?')) return;
    await showAssignAssessorModal();
  });

  // Reject button
  document.getElementById('rejectBtn')?.addEventListener('click', async () => {
    if (!confirm('Are you sure you want to reject this application?')) return;
    
    showLoading();
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/applicants/${applicantId}/reject`, {
        method: "POST",
        credentials: 'include'
      });
      
      const data = await response.json();
      
      if (data.success) {
        showNotification('Application rejected successfully!', 'success');
        updateStatusBadge('Rejected');
        if (currentApplicant) currentApplicant.status = 'Rejected';
      } else {
        throw new Error(data.error || 'Failed to reject application');
      }
    } catch (error) {
      console.error('Error rejecting application:', error);
      showNotification(error.message, 'error');
    } finally {
      hideLoading();
    }
  });

  // Setup assessor selection and assignment
  setupAssessorSelection();
  setupAssessorAssignment();
  setupModalControls();
}

// Logout function
async function logoutUser() {
  try {
    const response = await fetch(`${API_BASE_URL}/logout`, {
      method: "POST",
      credentials: "same-origin"
    });

    if (response.ok) {
      sessionStorage.clear();
      localStorage.clear();
      window.location.href = "/frontend/client/applicant/login/login.html";
    } else {
      throw new Error("Logout failed");
    }
  } catch (error) {
    console.error("Logout error:", error);
    showNotification("Failed to logout. Please try again.", "error");
  }
}