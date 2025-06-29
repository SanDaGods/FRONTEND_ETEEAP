const API_BASE_URL = "https://backendeteeap-production.up.railway.app";
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
            updateDocumentTables(currentApplicant.files);
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
    // Group files by category
    const filesByCategory = {
        'initial-submissions': files.filter(file => file.category === 'initial'),
        'resume-cv': files.filter(file => file.category === 'resume'),
        'training-certs': files.filter(file => file.category === 'training'),
        'awards': files.filter(file => file.category === 'awards'),
        'interview': files.filter(file => file.category === 'interview'),
        'others': files.filter(file => !file.category || !['initial', 'resume', 'training', 'awards', 'interview'].includes(file.category))
    };

    // Update each category table
    for (const [categoryId, categoryFiles] of Object.entries(filesByCategory)) {
        const tableBody = document.querySelector(`#${categoryId} tbody`);
        if (tableBody) {
            tableBody.innerHTML = '';
            
            categoryFiles.forEach(file => {
                const fileName = file.filename || file.path?.split('/').pop() || 'Unknown';
                const uploadDate = file.uploadDate || file.createdAt || 'N/A';
                const statusClass = getStatusClass(file.status || 'pending');
                
                // Create a new row element
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>
                        <i class="fas ${getFileIcon(fileName)}"></i>
                        ${fileName}
                    </td>
                    <td><span class="status-badge ${statusClass}">${file.status || 'Pending Review'}</span></td>
                    <td>${uploadDate}</td>
                    <td>
                        <button class="action-btn view-btn" title="View" data-filepath="${file.path || file.filename}">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="action-btn download-btn" title="Download" data-filepath="${file.path || file.filename}">
                            <i class="fas fa-download"></i>
                        </button>
                    </td>
                `;
                tableBody.appendChild(row);
            });

            // Update file count in category header
            const categoryHeader = document.querySelector(`.category-header[onclick*="${categoryId}"]`);
            if (categoryHeader) {
                const countElement = categoryHeader.querySelector('.file-count');
                if (countElement) {
                    countElement.textContent = `${categoryFiles.length} file${categoryFiles.length !== 1 ? 's' : ''}`;
                }
            }
        }
    }

    // Reattach event listeners
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const filePath = e.currentTarget.getAttribute('data-filepath');
            viewDocument(filePath);
        });
    });

    document.querySelectorAll('.download-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const filePath = e.currentTarget.getAttribute('data-filepath');
            downloadDocument(filePath);
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
window.viewDocument = viewDocument;
window.downloadDocument = downloadDocument;
window.closePdfModal = closePdfModal;
window.downloadCurrentPdf = downloadCurrentPdf;
window.handleLogout = handleLogout;