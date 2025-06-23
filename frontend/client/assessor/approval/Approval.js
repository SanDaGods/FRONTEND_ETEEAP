// JavaScript for Document Viewing and Assessor Functions
const DOCUMENTS_BASE_PATH = "/documents/";
const API_BASE_URL = "https://backendeteeap-production.up.railway.app";
let currentPdfUrl = '';
let currentUser = null;

// ========================
// DOCUMENT VIEWING FUNCTIONS (PDF)
// ========================

function viewDocument(filePath) {
    if (!validatePdfFile(filePath)) return;
    
    currentPdfUrl = `${DOCUMENTS_BASE_PATH}${encodeURIComponent(filePath)}`;
    const modal = document.getElementById('pdfViewerModal');
    const frame = document.getElementById('pdfViewerFrame');
    const titleElement = document.getElementById('pdfModalTitle');
    
    showLoading();
    titleElement.textContent = filePath.split('/').pop();
    
    // Reset the iframe and display it
    frame.style.display = 'block';
    frame.src = ''; // Clear previous content
    
    // Set the new PDF source with cache busting
    frame.src = currentPdfUrl + `?t=${Date.now()}`;
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    
    // Set up event listeners
    frame.onload = function() {
        // Check if the PDF loaded successfully
        try {
            // This is a hack to detect if the PDF actually loaded
            // Some browsers don't properly trigger onerror for PDFs
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
    if (!validatePdfFile(filePath)) return;

    showLoading();
    
    // Method 1: Create temporary link (works in most browsers)
    const link = document.createElement('a');
    link.href = `${DOCUMENTS_BASE_PATH}${encodeURIComponent(filePath)}`;
    link.download = filePath.split('/').pop();
    link.target = '_blank';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Fallback: Window open if link method fails
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
    
    frame.src = '';
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

function downloadCurrentPdf() {
    if (currentPdfUrl) {
        downloadDocument(currentPdfUrl.split('/').pop());
    }
}

// ========================
// ASSESSOR FUNCTIONS
// ========================

async function loadAssessorInfo() {
    try {
        const response = await fetch(`${API_BASE_URL}/assessor/auth-status`, {
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.authenticated && data.user) {
            currentUser = data.user;
            updateUserDisplay(data.user);
            sessionStorage.setItem('assessorData', JSON.stringify(data.user));
            return true;
        } else {
            redirectToLogin();
            return false;
        }
    } catch (error) {
        console.error('Failed to load assessor info:', error);
        
        // Fallback to session storage
        const storedData = sessionStorage.getItem('assessorData');
        if (storedData) {
            currentUser = JSON.parse(storedData);
            updateUserDisplay(currentUser);
            return true;
        }
        return false;
    }
}

function updateUserDisplay(user) {
    const usernameElement = document.querySelector('.username');
    const avatarElement = document.querySelector('.user-avatar i') || document.querySelector('.user-avatar');
    
    if (usernameElement) {
        usernameElement.textContent = user?.fullName || 'Assessor';
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
    window.location.href = '/frontend/assessor/login/login.html';
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
            window.location.href = '/frontend/assessor/login/login.html';
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
                window.location.href = data.redirectTo || '/frontend/assessor/login/login.html';
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

// ========================
// PORTFOLIO FUNCTIONS
// ========================

function toggleCategory(categoryId) {
    const content = document.getElementById(categoryId);
    const header = content.previousElementSibling;
    const icon = header.querySelector('.fa-chevron-down');
    
    content.classList.toggle('active');
    icon.style.transform = content.classList.contains('active') ? 'rotate(180deg)' : 'rotate(0)';
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
    // Set up document buttons
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

    // Open first category by default
    toggleCategory('initial-submissions');

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === document.getElementById('pdfViewerModal')) {
            closePdfModal();
        }
    });

    // Load user info and initialize components
    loadAssessorInfo();
    setupDocumentSearch();

    // Set up logout link
    document.getElementById('logoutLink')?.addEventListener('click', function(e) {
        e.preventDefault();
        handleLogout();
    });

    // Profile dropdown functionality
    const profileDropdown = document.querySelector('.profile-dropdown');
    if (profileDropdown) {
        profileDropdown.addEventListener('click', function(e) {
            e.stopPropagation();
            const menu = this.querySelector('.dropdown-menu');
            if (menu) {
                const isOpen = menu.style.opacity === '1';
                menu.style.opacity = isOpen ? '0' : '1';
                menu.style.visibility = isOpen ? 'hidden' : 'visible';
                menu.style.transform = isOpen ? 'translateY(10px)' : 'translateY(0)';
            }
        });
    }
});

// Make functions available globally
window.toggleCategory = toggleCategory;
window.viewDocument = viewDocument;
window.downloadDocument = downloadDocument;
window.closePdfModal = closePdfModal;
window.downloadCurrentPdf = downloadCurrentPdf;
window.handleLogout = handleLogout;
