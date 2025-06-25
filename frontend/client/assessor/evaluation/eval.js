const DOCUMENTS_BASE_PATH = "/documents/";
const API_BASE_URL = "https://backendeteeap-production.up.railway.app";
let currentPdfUrl = '';
let currentUser = null;
let currentApplicant = null;

// ========================
// DOCUMENT VIEWING FUNCTIONS
// ========================

function viewDocument(filePath) {
    if (!filePath || !validatePdfFile(filePath)) return;
    
    currentPdfUrl = `${DOCUMENTS_BASE_PATH}${encodeURIComponent(filePath)}`;
    const modal = document.getElementById('pdfViewerModal');
    const frame = document.getElementById('pdfViewerFrame');
    const titleElement = document.getElementById('pdfModalTitle');
    
    showLoading();
    titleElement.textContent = typeof filePath === 'string' ? filePath.split('/').pop() : 'Document';
    
    frame.onload = function() {
        try {
            if (frame.contentDocument && frame.contentDocument.body && 
                frame.contentDocument.body.innerHTML.includes('Failed to load PDF document')) {
                throw new Error('PDF failed to load');
            }
            hideLoading();
        } catch (e) {
            showPreviewError('Failed to load PDF preview');
            hideLoading();
        }
    };
    
    frame.onerror = function() {
        showPreviewError('Failed to load PDF preview');
        hideLoading();
    };
}

function downloadDocument(filePath) {
    if (!filePath || !validatePdfFile(filePath)) return;

    showLoading();
    const link = document.createElement('a');
    link.href = `${DOCUMENTS_BASE_PATH}${encodeURIComponent(filePath)}`;
    link.download = typeof filePath === 'string' ? filePath.split('/').pop() : 'document.pdf';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setTimeout(() => {
        hideLoading();
    }, 500);
}

function validatePdfFile(filePath) {
    if (!filePath.toLowerCase().endsWith('.pdf')) {
        showNotification('Only PDF files are supported', 'error');
        return false;
    }
    return true;
}

function showPreviewError(message) {
    const fallbackDiv = document.getElementById('pdfFallback');
    if (fallbackDiv) {
        fallbackDiv.querySelector('p').textContent = message;
        fallbackDiv.style.display = 'block';
        document.getElementById('pdfViewerFrame').style.display = 'none';
    }
}

function closePdfModal() {
    const modal = document.getElementById('pdfViewerModal');
    const frame = document.getElementById('pdfViewerFrame');
    
    // Clean up the URL object
    if (currentPdfUrl) {
        URL.revokeObjectURL(currentPdfUrl);
        currentPdfUrl = '';
    }
    
    frame.src = '';
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
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
        const endpoint = `${API_BASE_URL}/api/assessor/applicants/${applicantId}/documents`;
        
        const response = await fetch(endpoint, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
        }
        
        const data = await response.json();
        
        if (data.success && data.documents) {
            currentApplicant = data.applicant || {};
            currentApplicant.files = data.documents;
            
            updateApplicantProfile(currentApplicant);
            updateDocumentTables(currentApplicant.files);
            updateTotalFileCount(currentApplicant.files);
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

function updateTotalFileCount(files = []) {
    const fileCountElement = document.querySelector('.file-count .count-number');
    if (fileCountElement) {
        fileCountElement.textContent = files.length;
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
    // Group files by category
    const filesByCategory = {
        'initial-submissions': files.filter(file => file.label === 'initial-submission'),
        'resume-cv': files.filter(file => file.label === 'resume'),
        'training-certs': files.filter(file => file.label === 'training'),
        'awards': files.filter(file => file.label === 'awards'),
        'interview': files.filter(file => file.label === 'interview'),
        'others': files.filter(file => !file.label || !['initial-submission', 'resume', 'training', 'awards', 'interview'].includes(file.label))
    };

    // Update each category table
    for (const [categoryId, categoryFiles] of Object.entries(filesByCategory)) {
        const tableBody = document.querySelector(`#${categoryId} tbody`);
        const categoryHeader = document.querySelector(`.category-header[onclick*="${categoryId}"]`);
        
        if (tableBody) {
            tableBody.innerHTML = categoryFiles.length > 0 ? '' : '<tr><td colspan="4">No documents found</td></tr>';
            
            categoryFiles.forEach(file => {
                const row = document.createElement('tr');
                const fileName = file.filename || 'Untitled Document';
                const uploadDate = file.uploadDate ? new Date(file.uploadDate).toLocaleDateString() : 'N/A';
                const status = file.status || 'pending';
                
                row.innerHTML = `
                    <td>
                        <i class="fas ${getFileIcon(fileName)}"></i>
                        ${fileName}
                    </td>
                    <td><span class="status-badge ${getStatusClass(status)}">${formatStatus(status)}</span></td>
                    <td>${uploadDate}</td>
                    <td>
                        <button class="action-btn view-btn" title="View" data-file-id="${file._id}">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn download-btn" title="Download" data-file-id="${file._id}">
                            <i class="fas fa-download"></i>
                        </button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        }

        // Update file count in category header
        if (categoryHeader) {
            const countElement = categoryHeader.querySelector('.file-count');
            if (countElement) {
                countElement.textContent = `${categoryFiles.length} file${categoryFiles.length !== 1 ? 's' : ''}`;
            }
        }
    }

    // Attach event listeners to view/download buttons
    attachDocumentActionListeners();
}

function attachDocumentActionListeners() {
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const fileId = e.currentTarget.getAttribute('data-file-id');
            await viewDocumentById(fileId);
        });
    });

    document.querySelectorAll('.download-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const fileId = e.currentTarget.getAttribute('data-file-id');
            await downloadDocumentById(fileId);
        });
    });
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

function getStatusClass(status) {
    const statusMap = {
        'approved': 'status-approved',
        'rejected': 'status-rejected',
        'reviewed': 'status-viewed',
        'pending': 'status-pending'
    };
    return statusMap[status.toLowerCase()] || 'status-pending';
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
    initializeProfileDropdown();
    setupDocumentSearch();
    initializePdfViewer();

    // Load user info and applicant data
    loadAssessorInfo().then(() => {
        const applicantId = getApplicantIdFromUrl();
        if (applicantId) {
            fetchApplicantData(applicantId);
        } else {
            showNotification('No applicant ID found in URL', 'error');
        }
    });
});

function initializePdfViewer() {
    const modal = document.getElementById('pdfViewerModal');
    if (modal) {
        const closeBtn = modal.querySelector('.pdf-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', closePdfModal);
        }
        
        const downloadBtn = modal.querySelector('.pdf-download-btn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', downloadCurrentPdf);
        }
        
        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closePdfModal();
            }
        });
    }
}


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

  async function viewDocumentById(fileId) {
    try {
        showLoading();
        const response = await fetch(`${API_BASE_URL}/api/fetch-documents/${fileId}`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch document: ${response.statusText}`);
        }
        
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const contentType = response.headers.get('content-type') || 'application/octet-stream';
        
        // Open the document in a new tab or viewer
        if (contentType.includes('pdf')) {
            // For PDFs, use the modal viewer
            currentPdfUrl = url;
            const modal = document.getElementById('pdfViewerModal');
            const frame = document.getElementById('pdfViewerFrame');
            frame.src = url;
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        } else if (contentType.includes('image')) {
            // For images, open in a new tab
            window.open(url, '_blank');
        } else {
            // For other types, force download
            const a = document.createElement('a');
            a.href = url;
            a.target = '_blank';
            a.click();
        }
    } catch (error) {
        console.error('Error viewing document:', error);
        showNotification(`Failed to view document: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

async function downloadDocumentById(fileId) {
    try {
        showLoading();
        const response = await fetch(`${API_BASE_URL}/api/fetch-documents/${fileId}`, {
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`Failed to fetch document: ${response.statusText}`);
        }
        
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const contentDisposition = response.headers.get('content-disposition');
        let filename = 'document';
        
        // Extract filename from content-disposition header if available
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename="?(.+?)"?(;|$)/);
            if (filenameMatch && filenameMatch[1]) {
                filename = filenameMatch[1];
            }
        }
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        // Clean up
        setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (error) {
        console.error('Error downloading document:', error);
        showNotification(`Failed to download document: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

function formatStatus(status) {
    if (!status) return 'Pending Review';
    return status.split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

function getStatusClass(status) {
    const statusMap = {
        'approved': 'status-approved',
        'rejected': 'status-rejected',
        'reviewed': 'status-viewed',
        'pending-review': 'status-pending',
        'pending': 'status-pending'
    };
    return statusMap[status.toLowerCase()] || 'status-pending';
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

// Make functions available globally
window.toggleCategory = toggleCategory;
window.viewDocument = viewDocument;
window.downloadDocument = downloadDocument;
window.closePdfModal = closePdfModal;
window.downloadCurrentPdf = downloadCurrentPdf;
window.handleLogout = handleLogout;
