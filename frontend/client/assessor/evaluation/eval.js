const DOCUMENTS_BASE_PATH = "/documents/";
const API_BASE_URL = "https://backendeteeap-production.up.railway.app";

let currentPdfUrl = '';
let currentUser = null;
let currentApplicant = null;

// ========================
// DOCUMENT FUNCTIONS
// ========================

function updateDocumentTables(files) {
    if (!files || files.length === 0) {
        document.getElementById('no-documents').style.display = 'block';
        document.getElementById('documents-grid').style.display = 'none';
        return;
    }

    document.getElementById('no-documents').style.display = 'none';
    const documentsGrid = document.getElementById('documents-grid');
    documentsGrid.innerHTML = '';
    documentsGrid.style.display = 'block';

    // Group files by category/label
    const filesByCategory = {};
    files.forEach(file => {
        const category = file.label || 'Other Documents';
        if (!filesByCategory[category]) {
            filesByCategory[category] = [];
        }
        filesByCategory[category].push(file);
    });

    // Create a category section for each group
    Object.keys(filesByCategory).forEach(category => {
        const categoryId = category.toLowerCase().replace(/\s+/g, '-');
        
        // Create category header
        const categoryHeader = document.createElement('div');
        categoryHeader.className = 'category-header';
        categoryHeader.innerHTML = `
            <div class="category-title">
                <i class="fas fa-folder"></i>
                <span>${category}</span>
            </div>
            <div class="category-meta">
                <span>${filesByCategory[category].length} files</span>
                <i class="fas fa-chevron-down"></i>
            </div>
        `;
        categoryHeader.onclick = () => toggleCategory(categoryId);

        // Create category content
        const categoryContent = document.createElement('div');
        categoryContent.className = 'category-content';
        categoryContent.id = categoryId;
        
        // Create table for documents
        const table = document.createElement('table');
        table.className = 'document-table';
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Document Name</th>
                    <th>Type</th>
                    <th>Date Uploaded</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${filesByCategory[category].map(file => `
                    <tr>
                        <td>
                            <i class="${getFileIcon(file.filename)}"></i>
                            ${file.originalName || file.filename}
                        </td>
                        <td>${getFileType(file.filename)}</td>
                        <td>${formatDate(file.uploadDate)}</td>
                        <td>
                            <button class="action-btn view-btn" onclick="viewDocument('${file._id}', '${file.filename}')">
                                <i class="fas fa-eye"></i> View
                            </button>
                            <button class="action-btn download-btn" onclick="downloadDocument('${file._id}', '${file.filename}')">
                                <i class="fas fa-download"></i> Download
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        `;

        categoryContent.appendChild(table);
        
        // Create category container
        const categoryContainer = document.createElement('div');
        categoryContainer.className = 'portfolio-category';
        categoryContainer.appendChild(categoryHeader);
        categoryContainer.appendChild(categoryContent);
        
        documentsGrid.appendChild(categoryContainer);
    });
}

function getFileIcon(filename) {
    const extension = filename.split('.').pop().toLowerCase();
    switch(extension) {
        case 'pdf':
            return 'fas fa-file-pdf';
        case 'doc':
        case 'docx':
            return 'fas fa-file-word';
        case 'xls':
        case 'xlsx':
            return 'fas fa-file-excel';
        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'gif':
            return 'fas fa-file-image';
        default:
            return 'fas fa-file';
    }
}

function getFileType(filename) {
    const extension = filename.split('.').pop().toUpperCase();
    return `${extension} File`;
}

async function viewDocument(fileId, filename) {
    try {
        showLoading();
        const fileUrl = `${API_BASE_URL}/api/assessor/documents/${fileId}`;
        
        // Set the current PDF URL for download
        currentPdfUrl = fileUrl;
        
        // Check if it's a PDF or image
        const extension = filename.split('.').pop().toLowerCase();
        const isPdf = extension === 'pdf';
        const isImage = ['jpg', 'jpeg', 'png', 'gif'].includes(extension);
        
        const modal = document.getElementById('fileModal');
        const iframe = document.getElementById('fileViewer');
        const imageViewer = document.getElementById('imageViewer');
        const fallbackViewer = document.getElementById('fileFallback');
        const downloadFallback = document.getElementById('downloadFallback');
        const fileNameDisplay = document.getElementById('fileName');
        
        // Reset all viewers
        iframe.style.display = 'none';
        imageViewer.style.display = 'none';
        fallbackViewer.style.display = 'none';
        
        fileNameDisplay.textContent = filename;
        
        if (isPdf) {
            // Display PDF
            iframe.src = fileUrl;
            iframe.style.display = 'block';
        } else if (isImage) {
            // Display image
            imageViewer.src = fileUrl;
            imageViewer.style.display = 'block';
        } else {
            // Fallback for other file types
            fallbackViewer.style.display = 'block';
            downloadFallback.href = fileUrl;
            downloadFallback.download = filename;
        }
        
        // Show the modal
        modal.style.display = 'flex';
        
        // Set up modal close button
        document.querySelector('.close-modal').onclick = () => closePdfModal();
    } catch (error) {
        console.error('Error viewing document:', error);
        showNotification(`Error viewing document: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

async function downloadDocument(fileId, filename) {
    try {
        showLoading();
        const fileUrl = `${API_BASE_URL}/api/assessor/documents/${fileId}`;
        
        // Create a temporary anchor element to trigger download
        const a = document.createElement('a');
        a.href = fileUrl;
        a.download = filename || 'document';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        showNotification('Download started', 'success');
    } catch (error) {
        console.error('Error downloading document:', error);
        showNotification(`Error downloading document: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

function closePdfModal() {
    const modal = document.getElementById('fileModal');
    modal.style.display = 'none';
    
    // Reset the iframe source to release memory
    const iframe = document.getElementById('fileViewer');
    iframe.src = '';
}

function downloadCurrentPdf() {
    if (currentPdfUrl) {
        const a = document.createElement('a');
        a.href = currentPdfUrl;
        a.download = 'document.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
}


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
                currentApplicant.applicantId = `APP${currentApplicant._id.toString().substring(0, 8).toUpperCase()}`;
            }
            
            updateApplicantProfile(currentApplicant);
            
            // First check if files exist
            if (currentApplicant.files && currentApplicant.files.length > 0) {
                // If files are just references, we might need to fetch the actual file data
                // For now, we'll assume files array contains the complete file info
                updateDocumentTables(currentApplicant.files);
            } else {
                // If no files, show empty state
                document.getElementById('no-documents').style.display = 'block';
                document.getElementById('documents-grid').style.display = 'none';
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
window.downloadDocument = downloadDocument;
window.closePdfModal = closePdfModal;
window.downloadCurrentPdf = downloadCurrentPdf;
window.handleLogout = handleLogout;