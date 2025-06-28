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
let currentApplicant = null;
let applicantId = null;

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
    const downloadBtn = document.getElementById("downloadCurrentFile");
    const fallbackDownload = document.getElementById("downloadFallback");
    const fallbackDiv = document.getElementById("fileFallback");

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

    // Hide all viewers first
    fileViewer.style.display = "none";
    imageViewer.style.display = "none";
    fallbackDiv.style.display = "none";

    // Set download URLs
    downloadBtn.href = url;
    downloadBtn.download = file.filename;
    fallbackDownload.href = url;
    fallbackDownload.download = file.filename;

    // Show appropriate viewer based on file type
    if (contentType.startsWith("image/")) {
      imageViewer.onload = () => {
        imageViewer.style.display = "block";
        fileName.textContent = file.filename;
      };
      imageViewer.onerror = () => {
        fallbackDiv.style.display = "block";
        fileName.textContent = file.filename;
      };
      imageViewer.src = url;
    } else if (contentType === "application/pdf") {
      fileViewer.onload = () => {
        fileViewer.style.display = "block";
        fileName.textContent = file.filename;
      };
      fileViewer.onerror = () => {
        fallbackDiv.style.display = "block";
        fileName.textContent = file.filename;
      };
      fileViewer.src = url;
    } else {
      // For other file types, show download option
      fallbackDiv.style.display = "block";
      fileName.textContent = file.filename;
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
    modal.style.display = "block";
    
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

    const response = await fetch(`${API_BASE_URL}/api/assessor/applicant-documents/${applicantId}`, {
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
          <div class="file-icon">
            <i class="${getFileIcon(file.contentType)}"></i>
          </div>
          <div class="file-info">
            <p class="file-name" title="${file.filename}">${truncateFileName(file.filename)}</p>
            <div class="file-actions">
              <button class="btn view-btn" data-file-id="${file._id}">
                <i class="fas fa-eye"></i> View
              </button>
              <a href="${API_BASE_URL}/api/fetch-documents/${file._id}" download="${file.filename}" class="btn download-btn">
                <i class="fas fa-download"></i> Download
              </a>
            </div>
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

    // Show appropriate state
    document.getElementById('documents-loading').style.display = 'none';
    if (allFiles.length > 0) {
      documentsContainer.style.display = 'grid';
      document.querySelector('.count-number').textContent = allFiles.length;
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

// Utility Functions
function showLoading() {
  const spinner = document.getElementById('loadingSpinner');
  if (spinner) spinner.style.display = 'flex';
}

function hideLoading() {
  const spinner = document.getElementById('loadingSpinner');
  if (spinner) spinner.style.display = 'none';
}

// Get applicant ID from URL
function getApplicantIdFromUrl() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const idFromParams = urlParams.get('id');
    
    if (idFromParams) return idFromParams;
    
    const pathParts = window.location.pathname.split('/').filter(part => part.trim() !== '');
    if (pathParts.length > 0) {
      return pathParts[pathParts.length - 1];
    }
    
    return null;
  } catch (error) {
    console.error('Error getting applicant ID from URL:', error);
    return null;
  }
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
  const badge = document.querySelector('.status-badge');
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
    // Verify assessor is authenticated first
    const authResponse = await fetch(`${API_BASE_URL}/assessor/auth-status`, {
      credentials: 'include'
    });
    
    if (!authResponse.ok) {
      window.location.href = '/frontend/client/applicant/login/login.html';
      return;
    }
    
    // Fetch applicant data
    const response = await fetch(`${API_BASE_URL}/api/assessor/applicants/${applicantId}`, {
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
    displayApplicantData(data.data);
    
  } catch (error) {
    console.error('Error loading applicant data:', error);
    showNotification(error.message, 'error');
    setTimeout(() => {
      window.location.href = '/frontend/client/assessor/applicants/applicants.html';
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
  
  // Personal info section
  if (applicant.personalInfo) {
    const info = applicant.personalInfo;
    
    // Profile header
    const nameElement = document.querySelector('.profile-details p:first-child');
    if (nameElement) {
      nameElement.innerHTML = `<strong>Name:</strong> ${info.firstname || ''} ${info.middlename || ''} ${info.lastname || ''} ${info.suffix || ''}`.trim() || 'N/A';
    }
    
    // Contact Information
    setTextContent('profile-email', info.emailAddress || applicant.email);
    setTextContent('profile-phone', info.mobileNumber);
    
    // Course Priorities
    const courseElement = document.querySelector('.course-applied');
    if (courseElement) {
      courseElement.innerHTML = `
        <h2>Course applied to:</h2>
        <p>1st choice: ${info.firstPriorityCourse || 'Not specified'}</p>
        <p>2nd choice: ${info.secondPriorityCourse || 'Not specified'}</p>
        <p>3rd choice: ${info.thirdPriorityCourse || 'Not specified'}</p>
      `;
    }
  }
  
  // Fetch and display documents
  fetchAndDisplayFiles();
}

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
  // Get applicant ID
  applicantId = getApplicantIdFromUrl();
  if (!applicantId) {
    showNotification('No applicant ID provided. Redirecting...', 'error');
    setTimeout(() => {
      window.location.href = '/frontend/client/assessor/applicants/applicants.html';
    }, 2000);
    return;
  }

  // Initialize file viewer
  initializeFileViewer();
  
  // Load applicant data
  loadApplicantData();
  
  // Set up event listeners
  document.getElementById('logoutLink')?.addEventListener('click', function(e) {
    e.preventDefault();
    fetch(`${API_BASE_URL}/assessor/logout`, {
      method: 'POST',
      credentials: 'include'
    }).then(() => {
      window.location.href = '/frontend/client/applicant/login/login.html';
    });
  });

  // Reject button handler
  document.getElementById('rejectBtn')?.addEventListener('click', async () => {
    if (!confirm('Are you sure you want to reject this application?')) return;
    
    showLoading();
    try {
      const response = await fetch(`${API_BASE_URL}/api/assessor/applicants/${applicantId}/reject`, {
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
});

// Toggle category visibility
function toggleCategory(categoryId) {
  const content = document.getElementById(categoryId);
  const header = content.previousElementSibling;
  const icon = header.querySelector('.fa-chevron-down');
  content.classList.toggle('active');
  icon.style.transform = content.classList.contains('active') ? 'rotate(180deg)' : 'rotate(0)';
}

// Make functions available globally
window.toggleCategory = toggleCategory;