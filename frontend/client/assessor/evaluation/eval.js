const DOCUMENTS_BASE_PATH = "/documents/";
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
    modal.style.display = "block";
    
    await showFile(currentFileIndex);
  } catch (error) {
    console.error("Error viewing file:", error);
    showNotification(`Error viewing file: ${error.message}`, "error");
  }
}

// Fetch and display user files
async function fetchAndDisplayFiles(applicantId) {
  try {
    // Hide empty state and show loading
    document.getElementById('no-documents').style.display = 'none';
    document.getElementById('documents-grid').style.display = 'none';
    document.getElementById('documents-loading').style.display = 'flex';

    const response = await fetch(`${API_BASE_URL}/api/assessor/applicants/${applicantId}/documents`, {
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

    // Update file count
    const fileCountElement = document.querySelector('.file-count .count-number');
    if (fileCountElement) {
        fileCountElement.textContent = allFiles.length;
    }

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

let currentPdfUrl = '';
let currentUser = null;
let currentApplicant = null;



// ========================
// APPLICANT DATA FUNCTIONS
// ========================

async function fetchApplicantData(applicantId) {
    try {
        showLoading();
        const endpoint = `${API_BASE_URL}/api/assessor/applicants/${applicantId}`;
        
        const response = await fetch(endpoint, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.data) {
            currentApplicant = data.data;
            
            // Ensure we use the real applicantId from the server response
            if (!currentApplicant.applicantId) {
                // If for some reason it's missing, fall back to the formatted _id
                currentApplicant.applicantId = `APP${currentApplicant._id.toString().substring(0, 8).toUpperCase()}`;
            }
            
            updateApplicantProfile(currentApplicant);
            // Fetch and display documents instead of updateDocumentTables
            fetchAndDisplayFiles(applicantId);
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
            const fileCards = document.querySelectorAll('.file-card');
            
            fileCards.forEach(card => {
                const textContent = card.textContent.toLowerCase();
                card.style.display = textContent.includes(searchTerm) ? '' : 'none';
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
    initializeProfileDropdown();
    setupDocumentSearch();
    initializeFileViewer(); // Add this line to initialize the file viewer

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

  

  // Add this function to get applicant ID from URL
function getApplicantIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id') || urlParams.get('applicantId');
}

// Add these dummy functions to satisfy the global references
function viewDocument() {
    console.log("View document function called");
}

function downloadDocument() {
    console.log("Download document function called");
}

function closePdfModal() {
    const modal = document.getElementById("fileModal");
    if (modal) modal.style.display = "none";
}

function downloadCurrentPdf() {
    if (currentFiles.length > 0 && currentFileIndex >= 0) {
        const file = currentFiles[currentFileIndex];
        const downloadLink = document.createElement('a');
        downloadLink.href = `${API_BASE_URL}/api/fetch-documents/${file._id}`;
        downloadLink.download = file.filename;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    }
}

// Make functions available globally
window.toggleCategory = toggleCategory;
window.viewDocument = viewFile; // Use our actual viewFile function
window.downloadDocument = downloadCurrentPdf;
window.closePdfModal = closePdfModal;
window.downloadCurrentPdf = downloadCurrentPdf;
window.handleLogout = handleLogout;