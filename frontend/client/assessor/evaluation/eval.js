const API_BASE_URL = "https://backendeteeap-production.up.railway.app";
let currentPdfUrl = '';
let currentUser = null;
let currentApplicant = null;

// Add this at the top with other constants
const ALLOWED_FILE_TYPES = [
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

  // Event listeners
  closeBtn.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => e.target === modal && closeModal());

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

    // Fetch the file using assessor endpoint
    const response = await fetch(
      `${API_BASE_URL}/assessor/api/applicants/${currentApplicant._id}/files/${file._id}`,
      { credentials: 'include' }
    );
    
    if (!response.ok) throw new Error(`Failed to load file: ${response.status}`);

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const contentType = response.headers.get('content-type') || file.contentType;

    // Hide both viewers first
    fileViewer.style.display = "none";
    imageViewer.style.display = "none";

    // Show appropriate viewer
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

    // Set download link
    const downloadBtn = document.getElementById("downloadCurrentFile");
    downloadBtn.href = url;
    downloadBtn.download = file.filename;

    // Clean up URL when modal closes
    modal.addEventListener("click", () => URL.revokeObjectURL(url), { once: true });

  } catch (error) {
    console.error("Error showing file:", error);
    showNotification(`Error: Could not display file (${error.message})`, "error");
    document.getElementById("fileModal").style.display = "none";
  }
}

// View a specific file
async function viewFile(fileId, sectionFiles) {
  try {
    currentFiles = sectionFiles;
    currentFileIndex = currentFiles.findIndex(file => file._id === fileId);
    
    if (currentFileIndex === -1) throw new Error("File not found");
    
    document.getElementById("fileModal").style.display = "block";
    await showFile(currentFileIndex);
  } catch (error) {
    console.error("Error viewing file:", error);
    showNotification(`Error viewing file: ${error.message}`, "error");
  }
}

// Helper function to map section titles to labels
function getSectionLabel(sectionTitle) {
  const labelMap = {
    "Initial Submissions": "initial-submission",
    "Updated Resume / CV": "resume",
    "Certificate of Training": "training",
    "Awards": "awards",
    "Interview Form": "interview",
    "Others": "others"
  };
  return labelMap[sectionTitle] || "others";
}

// ========================
// APPLICANT DATA FUNCTIONS
// ========================

async function fetchApplicantData(applicantId) {
  try {
    showLoading();
    const response = await fetch(
      `${API_BASE_URL}/assessor/api/applicants/${applicantId}`,
      { credentials: 'include' }
    );
    
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const data = await response.json();
    
    if (data.success && data.data) {
      currentApplicant = data.data;
      
      // Ensure we use the real applicantId
      if (!currentApplicant.applicantId) {
        currentApplicant.applicantId = `APP${currentApplicant._id.toString().substring(0, 8).toUpperCase()}`;
      }
      
      updateApplicantProfile(currentApplicant);
      
      // Fetch files using assessor endpoint
      const filesResponse = await fetch(
        `${API_BASE_URL}/assessor/api/applicants/${currentApplicant._id}/files`,
        { credentials: 'include' }
      );
      
      if (filesResponse.ok) {
        const filesData = await filesResponse.json();
        if (filesData.success) {
          // Flatten grouped files into array
          const allFiles = Object.values(filesData.files).flat();
          updateDocumentTables(allFiles);
        }
      }
    } else {
      throw new Error(data.error || 'Failed to load applicant data');
    }
  } catch (error) {
    console.error('Error fetching applicant data:', error);
    showNotification(`Error loading applicant data: ${error.message}`, 'error');
  } finally {
    hideLoading();
  }
}

function updateApplicantProfile(applicant) {
    if (!applicant) {
        console.error('No applicant data provided to updateApplicantProfile');
        return;
    }

    const personalInfo = applicant.personalInfo || {};
    
    // Always use the real applicantId from the database
    const displayId = applicant.applicantId || `APP${applicant._id.toString().substring(0, 8).toUpperCase()}`;
    
    // Format the name
    let fullName = '';
    if (personalInfo.lastname) fullName += personalInfo.lastname;
    if (personalInfo.firstname) fullName += (fullName ? ', ' : '') + personalInfo.firstname;
    if (personalInfo.middlename) fullName += ' ' + personalInfo.middlename;
    if (personalInfo.suffix) fullName += ' ' + personalInfo.suffix;
    
    // Update profile details - using querySelector for more precise targeting
    const profileDetails = document.querySelector('.profile-details');
    if (profileDetails) {
        profileDetails.innerHTML = `
            <h2>Applicant Profile</h2>
            <hr>
            <p><strong>Name:</strong> ${fullName || 'Not provided'}</p>
            <p><strong>Applicant ID:</strong> ${displayId}</p>
            <p><strong>Mobile Number:</strong> ${personalInfo.mobileNumber || 'Not provided'}</p>
            <p><strong>Email Address:</strong> ${applicant.email || personalInfo.emailAddress || 'Not provided'}</p>
            <p><strong>Application Status:</strong> ${formatStatus(applicant.status || 'Pending')}</p>
            <hr><br>
            <div class="course-applied">
                <h2>Course applied to:</h2>
                <p>1st choice: ${personalInfo.firstPriorityCourse || 'Not specified'}</p>
                <p>2nd choice: ${personalInfo.secondPriorityCourse || 'Not specified'}</p>
                <p>3rd choice: ${personalInfo.thirdPriorityCourse || 'Not specified'}</p>
            </div>
            <hr>
            <div class="applied-on-container">
                <p><strong>Applied on: ${formatDate(applicant.createdAt)}</strong></p>
            </div>
        `;
    }
    
    // Update file count
    const fileCountElement = document.querySelector('.file-count .count-number');
    if (fileCountElement) {
        const fileCount = applicant.files ? applicant.files.length : 0;
        fileCountElement.textContent = fileCount;
    }
}


function formatStatus(status) {
    if (!status) return 'Pending';
    return status.split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } catch (e) {
        console.error('Error formatting date:', e);
        return 'N/A';
    }
}

// Update the updateDocumentTables function
function updateDocumentTables(files = []) {
  // Hide loading and show content
  document.getElementById("documents-loading").style.display = "none";
  const noDocuments = document.getElementById("no-documents");
  const documentsGrid = document.getElementById("documents-grid");

  if (files.length === 0) {
    noDocuments.style.display = "block";
    documentsGrid.style.display = "none";
    return;
  }

  noDocuments.style.display = "none";
  documentsGrid.style.display = "block";

  // Group files by category
  const filesByCategory = {
    'initial-submission': files.filter(f => f.label === 'initial-submission'),
    'resume': files.filter(f => f.label === 'resume'),
    'training': files.filter(f => f.label === 'training'),
    'awards': files.filter(f => f.label === 'awards'),
    'interview': files.filter(f => f.label === 'interview'),
    'others': files.filter(f => !f.label || f.label === 'others')
  };

  // Section titles
  const sectionTitles = {
    'initial-submission': 'Initial Submissions',
    'resume': 'Updated Resume / CV',
    'training': 'Certificate of Training',
    'awards': 'Awards',
    'interview': 'Interview Form',
    'others': 'Others'
  };

  // Clear existing sections
  documentsGrid.innerHTML = '';

  // Create sections for each category
  Object.entries(filesByCategory).forEach(([categoryId, categoryFiles]) => {
    if (categoryFiles.length === 0) return;

    const section = document.createElement('div');
    section.className = 'portfolio-category';
    section.innerHTML = `
      <div class="category-header" onclick="toggleCategory('${categoryId}')">
        <div class="category-title">
          <i class="fas ${getCategoryIcon(categoryId)}"></i>
          ${sectionTitles[categoryId]}
        </div>
        <div class="category-meta">
          <span class="file-count">${categoryFiles.length} file${categoryFiles.length !== 1 ? 's' : ''}</span>
          <i class="fas fa-chevron-down"></i>
        </div>
      </div>
      <div class="category-content" id="${categoryId}">
        <table class="document-table">
          <thead>
            <tr>
              <th>File Name</th>
              <th>Type</th>
              <th>Upload Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>
    `;

    documentsGrid.appendChild(section);

    // Populate table
    const tbody = section.querySelector('tbody');
    categoryFiles.forEach(file => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>
          <i class="fas ${getFileIcon(file.filename)}"></i>
          ${file.filename}
        </td>
        <td>${file.contentType}</td>
        <td>${new Date(file.uploadDate).toLocaleDateString()}</td>
        <td>
          <button class="action-btn view-btn" data-file-id="${file._id}">
            <i class="fas fa-eye"></i> View
          </button>
        </td>
      `;
      tbody.appendChild(row);
    });

    // Add event listeners to view buttons
    section.querySelectorAll('.view-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const fileId = e.currentTarget.getAttribute('data-file-id');
        viewFile(fileId, categoryFiles);
      });
    });
  });

  // Update total file count
  document.querySelector('.file-count .count-number').textContent = files.length;
}

function getFileIcon(filename) {
  const extension = filename.split('.').pop().toLowerCase();
  switch(extension) {
    case 'pdf': return 'fa-file-pdf';
    case 'doc': case 'docx': return 'fa-file-word';
    case 'xls': case 'xlsx': return 'fa-file-excel';
    case 'jpg': case 'jpeg': case 'png': case 'gif': return 'fa-file-image';
    default: return 'fa-file';
  }
}

function getFileIcon(filename) {
  const extension = filename.split('.').pop().toLowerCase();
  switch(extension) {
    case 'pdf': return 'fa-file-pdf';
    case 'doc': case 'docx': return 'fa-file-word';
    case 'xls': case 'xlsx': return 'fa-file-excel';
    case 'jpg': case 'jpeg': case 'png': case 'gif': return 'fa-file-image';
    default: return 'fa-file';
  }
}

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

// ========================
// AUTHENTICATION FUNCTIONS
// ========================

async function loadAssessorInfo() {
    try {
        const response = await fetch(`${API_BASE_URL}/assessor/auth-status`, {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.authenticated) {
            currentUser = data.user;
            updateUserDisplay(data.user);
            sessionStorage.setItem('assessorData', JSON.stringify(data.user));
        } else {
            redirectToLogin();
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        const storedData = sessionStorage.getItem('assessorData');
        if (storedData) {
            currentUser = JSON.parse(storedData);
            updateUserDisplay(currentUser);
        } else {
            redirectToLogin();
        }
    }
}

function updateUserDisplay(user) {
    const usernameElement = document.querySelector('.username');
    const avatarElement = document.querySelector('.user-avatar i') || document.querySelector('.user-avatar');
    
    if (usernameElement && user?.fullName) {
        usernameElement.textContent = user.fullName;
    }
    
    if (avatarElement) {
        if (avatarElement.tagName === 'I') {
            avatarElement.style.display = 'inline-block';
        } else {
            avatarElement.textContent = user?.fullName?.charAt(0)?.toUpperCase() || 'A';
        }
    }
}

function redirectToLogin() {
    window.location.href = '/frontend/client/applicant/login/login.html';
}

// ========================
// UI FUNCTIONS
// ========================

function toggleCategory(categoryId) {
    const content = document.getElementById(categoryId);
    const header = content.previousElementSibling;
    const icon = header.querySelector('.fa-chevron-down');
    content.classList.toggle('active');
    icon.style.transform = content.classList.contains('active') ? 'rotate(180deg)' : 'rotate(0)';
}

function initializeProfileDropdown() {
    const profileDropdown = document.querySelector('.profile-dropdown');
    const dropdownMenu = document.querySelector('.dropdown-menu');
    const logoutLink = document.getElementById('logoutLink');

    if (profileDropdown && dropdownMenu) {
        profileDropdown.addEventListener('click', function(e) {
            e.stopPropagation();
            const isVisible = dropdownMenu.style.opacity === '1';
            
            document.querySelectorAll('.dropdown-menu').forEach(menu => {
                if (menu !== dropdownMenu) {
                    menu.style.opacity = '0';
                    menu.style.visibility = 'hidden';
                    menu.style.transform = 'translateY(10px)';
                }
            });
            
            dropdownMenu.style.opacity = isVisible ? '0' : '1';
            dropdownMenu.style.visibility = isVisible ? 'hidden' : 'visible';
            dropdownMenu.style.transform = isVisible ? 'translateY(10px)' : 'translateY(0)';
        });

        document.addEventListener('click', function() {
            dropdownMenu.style.opacity = '0';
            dropdownMenu.style.visibility = 'hidden';
            dropdownMenu.style.transform = 'translateY(10px)';
        });

        dropdownMenu.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }

    if (logoutLink) {
        logoutLink.addEventListener('click', async function(e) {
            e.preventDefault();
            await handleLogout();
        });
    }
}

async function handleLogout() {
    showLoading();
    try {
        const response = await fetch(`${API_BASE_URL}/assessor/logout`, {
            method: 'POST',
            credentials: 'include'
        });
        
        const data = await response.json();
        if (data.success) {
            showNotification('Logout successful! Redirecting...', 'success');
            sessionStorage.removeItem('assessorData');
            setTimeout(() => {
                window.location.href = '/frontend/client/applicant/login/login.html';
            }, 1500);
        } else {
            showNotification('Logout failed. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Logout error:', error);
        showNotification('Logout failed. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}

function setupDocumentSearch() {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            const searchTerm = e.target.value.toLowerCase();
            const documentRows = document.querySelectorAll('.document-table tbody tr');
            
            documentRows.forEach(row => {
                const textContent = row.textContent.toLowerCase();
                row.style.display = textContent.includes(searchTerm) ? '' : 'none';
            });
        });
    }
}

// ========================
// UTILITY FUNCTIONS
// ========================

function showLoading() {
    document.getElementById('loadingSpinner').classList.add('active');
}

function hideLoading() {
    document.getElementById('loadingSpinner').classList.remove('active');
}

function showNotification(message, type = "info") {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// ========================
// INITIALIZATION
// ========================

document.addEventListener('DOMContentLoaded', function() {
    // Initialize components
    initializeFileViewer();
    initializeProfileDropdown();
    setupDocumentSearch();

    // Load user info and applicant data
    loadAssessorInfo().then(() => {
        const applicantId = getApplicantIdFromUrl();
        if (applicantId) {
            fetchApplicantData(applicantId);
            
            // Update the evaluate button to include both IDs
            const evaluateBtn = document.querySelector('.evaluate-button');
            if (evaluateBtn) {
                evaluateBtn.onclick = function(e) {
                    e.preventDefault();
                    fetchApplicantData(applicantId).then(() => {
                        if (currentApplicant) {
                            window.location.href = `/frontend/client/assessor/scoring/scoring.html?id=${applicantId}&applicantId=${currentApplicant.applicantId}`;
                        }
                    });
                };
            }
        } else {
            showNotification('No applicant ID found in URL', 'error');
        }
    });
});


// In eval.js - Add this to the initialization section
document.getElementById('rejectBtn')?.addEventListener('click', async () => {
    if (!currentApplicant?._id) {
        showNotification('No applicant selected', 'error');
        return;
    }

    const confirmReject = confirm(`Are you sure you want to reject applicant ${currentApplicant.applicantId}? This action cannot be undone.`);
    if (!confirmReject) return;

    try {
        showLoading();
        const response = await fetch(`${API_BASE_URL}/api/assessor/applicants/${currentApplicant._id}/reject`, {
            method: 'POST',
            credentials: 'include'
        });

        const data = await response.json();
        if (data.success) {
            showNotification(`Applicant ${currentApplicant.applicantId} rejected successfully`, 'success');
            // Refresh the applicant data
            fetchApplicantData(currentApplicant._id);
        } else {
            throw new Error(data.error || 'Failed to reject applicant');
        }
    } catch (error) {
        console.error('Error rejecting applicant:', error);
        showNotification(error.message, 'error');
    } finally {
        hideLoading();
    }
});


// Add this to eval.js (in the initialization section)
document.querySelector('.evaluate-button')?.addEventListener('click', function(e) {
    e.preventDefault();
    
    if (!currentApplicant) {
        showNotification('No applicant data loaded', 'error');
        return;
    }
    
    // Use the real applicantId from the currentApplicant object
    window.location.href = `/frontend/client/assessor/scoring/scoring.html?id=${currentApplicant._id}&applicantId=${currentApplicant.applicantId}`;
});


function goToScoring(applicantId) {
    sessionStorage.setItem('currentScoringApplicant', applicantId);
    window.location.href = `scoring.html?id=${applicantId}`;
  }
  
  // In Scoring.js:
  function getApplicantIdFromVariousSources() {
    // 1. URL params
    const urlParams = new URLSearchParams(window.location.search);
    let id = urlParams.get('id');
    
    // 2. Session storage
    if (!id) id = sessionStorage.getItem('currentScoringApplicant');
    
    // 3. Hash params
    if (!id && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      id = hashParams.get('applicantId');
    }
    
    return id;
  }

// Make functions available globally
window.toggleCategory = toggleCategory;
window.viewFile = viewFile;