const API_BASE_URL = "https://backendeteeap-production.up.railway.app";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
];

// File viewer state
let currentFiles = [];
let currentFileIndex = 0;

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
    if (modal.style.display === "block") {
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
    const response = await fetch(`${API_BASE_URL}/api/fetch-documents/${file._id}`, {
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

    // Step 1: Set display to "block"
    modal.style.display = "block";

    // Step 2: Force reflow and ensure it becomes flex (centering kicks in)
    modal.offsetHeight; // Triggers reflow
    modal.style.display = "flex"; // Now apply flex for centering

    await showFile(currentFileIndex);
  } catch (error) {
    console.error("Error viewing file:", error);
    showNotification(`Error viewing file: ${error.message}`, "error");
  }
}

// Fetch and display user files
async function fetchAndDisplayFiles() {
  try {
    // Hide empty state and show loading
    document.getElementById('no-documents').style.display = 'none';
    document.getElementById('documents-grid').style.display = 'none';
    document.getElementById('documents-loading').style.display = 'flex';

    const response = await fetch(`${API_BASE_URL}/api/admin/applicants/${applicantId}/documents`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to fetch documents: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.success || !data.files) {
      throw new Error(data.error || 'Failed to fetch documents');
    }

    const documentsContainer = document.getElementById('documents-grid');
    documentsContainer.innerHTML = '';

    // Get all files as a flat array for the viewer
    const allFiles = Object.values(data.files).flat();

    // Create sections for each file group
    for (const [label, files] of Object.entries(data.files)) {
      const sectionTitle = getSectionTitle(label);
      const sectionDiv = document.createElement('div');
      sectionDiv.className = 'document-section';
      sectionDiv.innerHTML = `<h4>${sectionTitle}</h4>`;
      
      const filesGrid = document.createElement('div');
      filesGrid.className = 'files-grid';
      
      files.forEach(file => {
        const fileCard = document.createElement('div');
        fileCard.className = 'file-card';
        fileCard.innerHTML = `
        <div class="file-card-header">
          <div class="file-icon">
            <i class="${getFileIcon(file.contentType)}"></i>
          </div>
          <div class="file-info">
            <p class="file-name" title="${file.filename}">${truncateFileName(file.filename)}</p>
          </div>
        </div>
        <div class="file-actions">
          <button class="btn view-btn" data-file-id="${file._id}">
            <i class="fas fa-eye"></i> View
          </button>
          <button class="btn download-btn" data-file-id="${file._id}" data-file-name="${file.filename}">
            <i class="fas fa-download"></i> Download
          </button>
        </div>
      `;
        filesGrid.appendChild(fileCard);
      });
      
      sectionDiv.appendChild(filesGrid);
      documentsContainer.appendChild(sectionDiv);
    }

    // Set up event listeners for view buttons
    document.querySelectorAll('.view-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const fileId = e.currentTarget.getAttribute('data-file-id');
        viewFile(fileId, allFiles);
      });
    });

    // Set up event listeners for download buttons
    document.querySelectorAll('.download-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const fileId = e.currentTarget.getAttribute('data-file-id');
        const fileName = e.currentTarget.getAttribute('data-file-name');
        downloadFile(fileId, fileName);
      });
    });

    // Show appropriate state
    document.getElementById('documents-loading').style.display = 'none';
    if (allFiles.length > 0) {
      documentsContainer.style.display = 'grid';
    } else {
      document.getElementById('no-documents').style.display = 'flex';
    }

  } catch (error) {
    console.error("Error fetching files:", error);
    showNotification(`Failed to load documents: ${error.message}`, "error");
    document.getElementById('documents-loading').style.display = 'none';
    document.getElementById('no-documents').style.display = 'flex';
  }
}

// Helper function to truncate long file names
function truncateFileName(filename, maxLength = 30) {
  if (filename.length <= maxLength) return filename;
  return filename.substring(0, maxLength) + '...';
}

async function downloadFile(fileId, fileName) {
  try {
    showNotification(`Preparing download for ${fileName}...`, 'info');
    
    const response = await fetch(`${API_BASE_URL}/api/fetch-documents/${fileId}`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    
    // Create a temporary anchor element to trigger the download
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'document';
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
    
  } catch (error) {
    console.error("Error downloading file:", error);
    showNotification(`Failed to download file: ${error.message}`, 'error');
  }
}

// Helper function to map label to section title
function getSectionTitle(label) {
  const labelMap = {
    "initial-submission": "Initial Submissions",
    "resume": "Updated Resume / CV",
    "training": "Certificate of Training",
    "awards": "Awards",
    "interview": "Interview Form",
    "others": "Other Documents"
  };
  return labelMap[label] || label;
}

// Helper function to get appropriate file icon
function getFileIcon(contentType) {
  if (contentType.startsWith('image/')) return 'fas fa-file-image';
  if (contentType === 'application/pdf') return 'fas fa-file-pdf';
  if (contentType.includes('word') || contentType.includes('msword')) return 'fas fa-file-word';
  return 'fas fa-file';
}

// Notification system
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


let currentApplicant = null;
let applicantId = null;

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
  // First try to get from URL
  const urlParams = new URLSearchParams(window.location.search);
  let id = urlParams.get('id');

  // If not in URL, try sessionStorage
  if (!id) {
    id = sessionStorage.getItem('currentApplicantId');
  }

  if (!id) {
    showNotification('No applicant ID provided. Redirecting...', 'error');
    setTimeout(() => {
      window.location.href = '/frontend/client/admin/applicants/applicants.html';
    }, 2000);
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

// Load applicant data from server
async function loadApplicantData() {
  showLoading();
  
  try {
    // Verify admin is authenticated first
    const authResponse = await fetch(`${API_BASE_URL}/admin/auth-status`, {
      credentials: 'include'
    });
    
    if (!authResponse.ok) {
      window.location.href = '/frontend/client/applicant/login/login.html';
      return;
    }
    
    // Fetch applicant data
    const response = await fetch(`${API_BASE_URL}/api/admin/applicants/${applicantId}`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch applicant: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.success || !data.data) {
      throw new Error(data.error || 'Failed to load applicant data');
    }
    
    currentApplicant = data.data;
    await displayApplicantData(data.data); // Make this await
    
  } catch (error) {
    console.error('Error loading applicant data:', error);
    showNotification(error.message, 'error');
    setTimeout(() => {
      window.location.href = '/frontend/client/admin/applicants/applicants.html';
    }, 2000);
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
  
  // Load profile picture
  loadApplicantProfilePic(applicant._id);
  
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
  
  // Documents
  displayDocuments(applicant.files || []);
}

// Display uploaded documents
function displayDocuments(documents) {
  const container = document.getElementById('documents-container');
  if (!container) return;
  
  container.innerHTML = '';
  
  if (!documents || documents.length === 0) {
    container.innerHTML = `
      <div class="no-documents">
        <i class="fas fa-folder-open"></i>
        <p>No documents submitted yet</p>
      </div>
    `;
    return;
  }
  
  const documentsGrid = document.createElement('div');
  documentsGrid.className = 'documents-grid';
  
  documents.forEach(doc => {
    const fileName = doc.split('/').pop() || 'Document';
    const fileExt = fileName.split('.').pop()?.toLowerCase() || '';
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
        <p class="document-name">${fileName}</p>
        <div class="document-actions">
          <a href="${API_BASE_URL}/${doc}" target="_blank" class="btn view-btn">
            <i class="fas fa-eye"></i> View
          </a>
          <a href="${API_BASE_URL}/${doc}" download class="btn download-btn">
            <i class="fas fa-download"></i> Download
          </a>
        </div>
      </div>
    `;
    
    documentsGrid.appendChild(documentCard);
  });
  
  container.appendChild(documentsGrid);
}

// Initialize the page
// Update the DOMContentLoaded event listener in ApplicantProfile.js
document.addEventListener('DOMContentLoaded', function() {
  // Get applicant ID
  applicantId = getApplicantId();
  if (!applicantId) return;
  
  // Initialize file viewer
  initializeFileViewer();
  
  // Load applicant data
  loadApplicantData();
  
  // Set up event listeners
  setupModalControls();
  setupAssessorSelection();
  setupAssessorAssignment();
  
  document.getElementById('backButton')?.addEventListener('click', () => {
    window.location.href = '/frontend/client/admin/applicants/applicants.html';
  });
  
  // Admin logout
  document.getElementById('logoutLink')?.addEventListener('click', function(e) {
    e.preventDefault();
    fetch(`${API_BASE_URL}/admin/logout`, {
      method: 'POST',
      credentials: 'include'
    }).then(() => {
      window.location.href = '/frontend/client/applicant/login/login.html';
    });
  });
});

// Update the displayApplicantData function to include file fetching
async function displayApplicantData(applicant) {
  if (!applicant) return;
  
  // Basic info
  setTextContent('applicantId', applicant.applicantId);
  setTextContent('email', applicant.email);
  updateStatusBadge(applicant.status);
  setTextContent('createdAt', formatDate(applicant.createdAt));
  
  // Load and display profile picture
  const profilePicUrl = await loadApplicantProfilePic(applicant._id);
  const profilePic = document.querySelector(".profile-pic");
  if (profilePic) {
    profilePic.src = profilePicUrl || "/frontend/client/applicant/img/default.png";
  }
  
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
  
  // Fetch and display documents
  fetchAndDisplayFiles();
}

// Add these functions to ApplicantProfile.js

// Show modal for assigning assessor
async function showAssignAssessorModal() {
  const modal = document.getElementById('assignAssessorModal');
  const assessorSelect = document.getElementById('assessorSelect');
  
  if (!modal || !assessorSelect) return;
  
  showLoading();
  try {
    // Fetch available assessors
    const response = await fetch(`${API_BASE_URL}/api/admin/available-assessors`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch assessors');
    }
    
    const data = await response.json();
    
    if (!data.success || !data.data) {
      throw new Error(data.error || 'No assessors available');
    }
    
    // Populate assessor dropdown
    assessorSelect.innerHTML = '<option value="" disabled selected>Select an assessor</option>';
    data.data.forEach(assessor => {
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
        
        // Refresh the assessor dashboard data
        if (typeof refreshAssessorDashboard === 'function') {
          refreshAssessorDashboard();
        }
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

// Show modal for assigning assessor
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

// Add this to the DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', function() {
  // Get applicant ID
  applicantId = getApplicantId();
  if (!applicantId) return;
  
  // Load applicant data
  loadApplicantData();
  
  // Set up event listeners
  document.getElementById('backButton')?.addEventListener('click', () => {
    window.location.href = '/frontend/client/admin/applicants/applicants.html';
  });
  
  document.getElementById('approveBtn')?.addEventListener('click', async () => {
    if (!confirm('Are you sure you want to approve this application?')) return;
    await showAssignAssessorModal();
});

// Update the showAssignAssessorModal function
async function showAssignAssessorModal() {
    const modal = document.getElementById('assignAssessorModal');
    const assessorSelect = document.getElementById('assessorSelect');
    
    if (!modal || !assessorSelect) {
        showNotification('Modal elements not found', 'error');
        return;
    }
    
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
        
        // Clear and populate assessor dropdown
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
    } finally {
        hideLoading();
    }
}
  
  document.getElementById('rejectBtn')?.addEventListener('click', async () => {
    if (!confirm('Are you sure you want to reject this application?')) return;
    
    showLoading();
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/applicants/${applicantId}/reject`, {
        method: 'POST',
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
  
  // Admin logout
  document.getElementById('logoutLink')?.addEventListener('click', function(e) {
    e.preventDefault();
    fetch(`${API_BASE_URL}/admin/logout`, {
      method: 'POST',
      credentials: 'include'
    }).then(() => {
      window.location.href = '/frontend/client/applicant/login/login.html';
    });
  });
});


function updateStatus() {
  const status = document.getElementById("status").value;
  fetch(`${API_BASE_URL}/api/progress`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  }).then(res => res.json())
    .then(data => alert('Status updated to ' + data.status));
}

async function loadApplicantProfilePic(userId) {
  if (!userId) return;

  try {
    const response = await fetch(`${API_BASE_URL}/api/profile-pic/${userId}`, {
      credentials: 'include'
    });
    
    if (response.ok) {
      const blob = await response.blob();
      return URL.createObjectURL(blob);
    }
    return null;
  } catch (error) {
    console.error("Error loading profile picture:", error);
    return null;
  }
}