// Admin Assessor Profile Controller - Complete Fixed Version with Working Export Feature
const API_BASE_URL = "https://backendeteeap-production.up.railway.app";
let currentAssessor = null;

// Store applicants data globally for sorting
let assignedApplicants = [];

// DOM Elements
const elements = {
    loadingSpinner: document.getElementById('loadingSpinner'),
    deleteModal: document.getElementById('deleteConfirmationModal'),
    notificationContainer: document.getElementById('notificationContainer'),
    assignedApplicantsList: document.getElementById('assignedApplicantsList'),
    editAssessorBtn: document.getElementById('editAssessorBtn'),
    deleteAssessorBtn: document.getElementById('deleteAssessorBtn'),
    profileDropdown: document.querySelector('.profile-dropdown'),
    dropdownMenu: document.querySelector('.dropdown-menu'),
    logoutLink: document.getElementById('logoutLink'),
    usernameElement: document.querySelector('.username'),
    userAvatar: document.querySelector('.user-avatar'),
    exportApplicantsBtn: document.getElementById('export-applicants-btn'),
    searchApplicantsInput: document.getElementById('searchApplicantsInput')
};

// Utility Functions
const utils = {
    showLoading: () => elements.loadingSpinner.classList.add("active"),
    hideLoading: () => elements.loadingSpinner.classList.remove("active"),
    
    showNotification: (message, type = "info", duration = 3000) => {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            ${message}
        `;
        elements.notificationContainer.appendChild(notification);
        
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 500);
        }, duration);
    },
    
    formatDate: (dateString) => {
        if (!dateString) return 'N/A';
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString(undefined, options);
    },
    
    formatExpertise: (expertise) => {
        if (!expertise) return 'N/A';
        return expertise
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    },
    
    getAssessorIdFromUrl: () => {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('id');
    },
    
    capitalizeFirstLetter: (string) => {
        if (!string) return "";
        return string.charAt(0).toUpperCase() + string.slice(1);
    },
    
    escapeHtml: (unsafe) => {
        if (!unsafe) return "";
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
};

// Profile Display Functions
const profileDisplay = {
    update: (assessor) => {
        if (!assessor) return;

        document.getElementById('assessorId').textContent = assessor.assessorId || 'N/A';
        document.getElementById('fullName').textContent = assessor.fullName || 'N/A';
        document.getElementById('email').textContent = assessor.email || 'N/A';
        document.getElementById('expertise').textContent = utils.formatExpertise(assessor.expertise);

        const assessorType = document.getElementById('assessorType');
        assessorType.textContent = utils.capitalizeFirstLetter(assessor.assessorType) || 'N/A';
        
        const statusElement = document.getElementById('status');
        statusElement.innerHTML = '';
        const statusBadge = document.createElement('span');
        statusBadge.className = `status-badge status-${assessor.isApproved ? 'active' : 'pending'}`;
        statusBadge.textContent = assessor.isApproved ? 'Active' : 'Pending Approval';
        statusElement.appendChild(statusBadge);
        
        document.getElementById('createdAt').textContent = utils.formatDate(assessor.createdAt);
        document.getElementById('lastLogin').textContent = utils.formatDate(assessor.lastLogin);
    },
    
    updateAssignedApplicants: (applicants) => {
        const container = elements.assignedApplicantsList;
        container.innerHTML = '';
        
        if (!applicants || applicants.length === 0) {
            container.innerHTML = `
                <div class="no-applicants">
                    <i class="fas fa-user-times"></i>
                    <p>No applicants currently assigned to this assessor</p>
                </div>
            `;
            return;
        }
        
        const table = document.createElement('table');
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Applicant ID</th>
                    <th>Full Name</th>
                    <th>Course</th>
                    <th>Status</th>
                    <th>Date Assigned</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        
        const tbody = table.querySelector('tbody');
        
        applicants.forEach(applicant => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${applicant.applicantId || 'N/A'}</td>
                <td>${utils.escapeHtml(applicant.name || applicant.fullName)}</td>
                <td>${applicant.course || 'N/A'}</td>
                <td>
                    <span class="status-badge status-${(applicant.status || '').toLowerCase().replace(/\s+/g, '-')}">
                        ${utils.capitalizeFirstLetter(applicant.status) || 'N/A'}
                    </span>
                </td>
                <td>${utils.formatDate(applicant.dateAssigned) || 'N/A'}</td>
                <td>
                    <button class="action-btn view-btn" onclick="window.location.href='/frontend/client/admin/applicantprofile/applicantprofile.html?id=${applicant._id}'">
                        <i class="fas fa-eye"></i> View
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
        
        container.appendChild(table);
    }
};

// API Functions
const api = {
    fetchAssessorData: async (assessorId) => {
        utils.showLoading();
        try {
            const response = await fetch(`${API_BASE_URL}/assessor/${assessorId}`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            if (data.success && data.data) {
                currentAssessor = data.data;
                profileDisplay.update(currentAssessor);
                
                // Process assigned applicants data
                assignedApplicants = currentAssessor.assignedApplicants.map(app => {
                    const applicant = app.applicantId || {};
                    const isPopulatedApplicant = applicant && applicant._id;
                    
                    return {
                        _id: isPopulatedApplicant ? applicant._id : app._id || app.applicantId,
                        applicantId: isPopulatedApplicant ? 
                            applicant.applicantId : 
                            (app.applicantId && typeof app.applicantId === 'string' ? app.applicantId : 'N/A'),
                        name: applicant.personalInfo ? 
                            `${applicant.personalInfo.lastname || ''}, ${applicant.personalInfo.firstname || ''}`.trim() : 
                            app.fullName || 'No name provided',
                        fullName: applicant.personalInfo ? 
                            `${applicant.personalInfo.firstname || ''} ${applicant.personalInfo.lastname || ''}`.trim() : 
                            app.fullName || 'No name provided',
                        course: applicant.personalInfo?.firstPriorityCourse || app.course || 'Not specified',
                        status: applicant.status || app.status || 'Under Assessment',
                        dateAssigned: app.dateAssigned || new Date()
                    };
                });
                
                profileDisplay.updateAssignedApplicants(assignedApplicants);
                return true;
            }
            throw new Error(data.error || 'Failed to load assessor data');
        } catch (error) {
            console.error('Error fetching assessor data:', error);
            utils.showNotification(error.message || 'Failed to load profile data. Please try again.', 'error');
            return false;
        } finally {
            utils.hideLoading();
        }
    },
    
    deleteAssessor: async (assessorId) => {
        utils.showLoading();
        try {
            const response = await fetch(`${API_BASE_URL}/assessor/${assessorId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            
            const data = await response.json();
            if (data.success) {
                utils.showNotification('Assessor deleted successfully', 'success');
                setTimeout(() => {
                    window.location.href = '/client/admin/assessors/assessors.html';
                }, 1500);
                return true;
            }
            throw new Error(data.error || 'Failed to delete assessor');
        } catch (error) {
            console.error('Error deleting assessor:', error);
            utils.showNotification('Failed to delete assessor. Please try again.', 'error');
            return false;
        } finally {
            utils.hideLoading();
        }
    },
    
    loadAdminInfo: async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/admin/auth-status`, {
                method: "GET",
                credentials: 'include'
            });
            
            if (!response.ok) throw new Error('Failed to fetch admin info');
            
            const data = await response.json();
            
            if (data.authenticated && data.user) {
                admin.updateUserDisplay(data.user);
                sessionStorage.setItem('adminData', JSON.stringify(data.user));
            } else {
                admin.redirectToLogin();
            }
        } catch (error) {
            console.error('Error loading admin info:', error);
            const storedData = sessionStorage.getItem('adminData');
            if (storedData) {
                admin.updateUserDisplay(JSON.parse(storedData));
            } else {
                admin.redirectToLogin();
            }
        }
    }
};

// Search and Sort Functions
function handleApplicantSearch(e) {
    const searchTerm = e.target.value.trim().toLowerCase();
    
    if (!searchTerm) {
        profileDisplay.updateAssignedApplicants(assignedApplicants);
        return;
    }
    
    const filteredApplicants = assignedApplicants.filter(applicant => 
        (applicant.name && applicant.name.toLowerCase().includes(searchTerm)) ||
        (applicant.applicantId && applicant.applicantId.toLowerCase().includes(searchTerm)) ||
        (applicant.course && applicant.course.toLowerCase().includes(searchTerm))
    );
    
    profileDisplay.updateAssignedApplicants(filteredApplicants);
}

function handleApplicantSort(sortType) {
    if (!assignedApplicants || assignedApplicants.length === 0) return;

    let sortedApplicants = [...assignedApplicants];

    switch (sortType) {
        case 'name-asc':
            sortedApplicants.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            break;
        case 'name-desc':
            sortedApplicants.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
            break;
        case 'id-asc':
            sortedApplicants.sort((a, b) => (a.applicantId || '').localeCompare(b.applicantId || ''));
            break;
        case 'id-desc':
            sortedApplicants.sort((a, b) => (b.applicantId || '').localeCompare(a.applicantId || ''));
            break;
        case 'course-asc':
            sortedApplicants.sort((a, b) => (a.course || '').localeCompare(b.course || ''));
            break;
        case 'course-desc':
            sortedApplicants.sort((a, b) => (b.course || '').localeCompare(a.course || ''));
            break;
        case 'status-pending':
            sortedApplicants = sortedApplicants.filter(app => 
                /pending/i.test(app.status));
            break;
        case 'status-under-assessment':
            sortedApplicants = sortedApplicants.filter(app => 
                /under[\s-]?assessment/i.test(app.status));
            break;
        case 'status-evaluated-pass':
            sortedApplicants = sortedApplicants.filter(app => 
                /evaluated[\s-]?pass/i.test(app.status) || 
                /passed/i.test(app.status) ||
                /pass/i.test(app.status));
            break;
        case 'status-evaluated-failed':
            sortedApplicants = sortedApplicants.filter(app => 
                /evaluated[\s-]?fail/i.test(app.status) || 
                /failed/i.test(app.status) ||
                /fail/i.test(app.status));
            break;
        default:
            break;
    }

    profileDisplay.updateAssignedApplicants(sortedApplicants);
    
    let sortMessage = '';
    switch (sortType) {
        case 'name-asc': sortMessage = 'Sorted by name (A-Z)'; break;
        case 'name-desc': sortMessage = 'Sorted by name (Z-A)'; break;
        case 'id-asc': sortMessage = 'Sorted by ID (ascending)'; break;
        case 'id-desc': sortMessage = 'Sorted by ID (descending)'; break;
        case 'course-asc': sortMessage = 'Sorted by course (A-Z)'; break;
        case 'course-desc': sortMessage = 'Sorted by course (Z-A)'; break;
        case 'status-pending': sortMessage = 'Showing Pending Review applicants'; break;
        case 'status-under-assessment': sortMessage = 'Showing Under Assessment applicants'; break;
        case 'status-evaluated-pass': sortMessage = 'Showing Evaluated-Pass applicants'; break;
        case 'status-evaluated-failed': sortMessage = 'Showing Evaluated-Failed applicants'; break;
    }
    
    if (sortMessage) {
        utils.showNotification(sortMessage, 'info');
    }
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Admin Functions
const admin = {
    updateUserDisplay: (user) => {
        if (elements.usernameElement && user) {
            elements.usernameElement.textContent = user.fullName || user.email || 'Admin';
        }
        
        if (elements.userAvatar) {
            const displayName = user?.fullName || user?.email || 'A';
            elements.userAvatar.textContent = displayName.charAt(0).toUpperCase();
            elements.userAvatar.style.fontFamily = 'Arial, sans-serif';
        }
    },
    
    handleLogout: async () => {
        utils.showLoading();
        try {
            const response = await fetch(`${API_BASE_URL}/admin/logout`, {
                method: "POST",
                credentials: 'include'
            });
            
            const data = await response.json();
            if (data.success) {
                utils.showNotification('Logout successful! Redirecting...', 'success');
                admin.clearAuthData();
                setTimeout(admin.redirectToLogin, 1500);
            } else {
                utils.showNotification('Logout failed. Please try again.', 'error');
                utils.hideLoading();
            }
        } catch (error) {
            console.error('Logout error:', error);
            utils.showNotification('Logout failed. Please try again.', 'error');
            utils.hideLoading();
        }
    },
    
    redirectToLogin: () => {
        window.location.href = '/client/applicant/login/login.html';
    },
    
    clearAuthData: () => {
        sessionStorage.removeItem('adminData');
    },
    
    initializeDropdown: () => {
        if (!elements.profileDropdown || !elements.dropdownMenu) return;
        
        elements.profileDropdown.addEventListener('click', function(e) {
            e.stopPropagation();
            admin.toggleDropdown();
        });
        
        document.addEventListener('click', function() {
            if (elements.dropdownMenu.style.opacity === '1') {
                admin.hideDropdown();
            }
        });
        
        elements.dropdownMenu.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    },
    
    toggleDropdown: () => {
        const isVisible = elements.dropdownMenu.style.opacity === '1';
        if (isVisible) {
            admin.hideDropdown();
        } else {
            admin.showDropdown();
        }
    },
    
    showDropdown: () => {
        elements.dropdownMenu.style.opacity = '1';
        elements.dropdownMenu.style.visibility = 'visible';
        elements.dropdownMenu.style.transform = 'translateY(0)';
    },
    
    hideDropdown: () => {
        elements.dropdownMenu.style.opacity = '0';
        elements.dropdownMenu.style.visibility = 'hidden';
        elements.dropdownMenu.style.transform = 'translateY(10px)';
    },
    
    initializeLogout: () => {
        if (!elements.logoutLink) return;
        
        elements.logoutLink.addEventListener('click', async function(e) {
            e.preventDefault();
            await admin.handleLogout();
        });
    }
};

// Modal Functions
const modal = {
    openDelete: () => {
        elements.deleteModal.style.display = 'flex';
    },
    
    closeDelete: () => {
        elements.deleteModal.style.display = 'none';
    },
    
    confirmDelete: async () => {
        if (!currentAssessor) return;
        await api.deleteAssessor(currentAssessor._id);
    }
};

// Navigation Functions
const navigation = {
    viewApplicant: (applicantId) => {
        window.location.href = `/client/admin/applicantprofile/applicantprofile.html?id=${applicantId}`;
    },
    
    editAssessor: () => {
        if (!currentAssessor) return;
        window.location.href = `/client/admin/assessors/AssessorEdit.html?id=${currentAssessor._id}`;
    }
};

// Export Functions
const exportFunctions = {
    exportAssignedApplicants: () => {
        if (!filteredApplicants || filteredApplicants.length === 0) {
            utils.showNotification('No applicants to export', 'info');
            return;
        }

        try {
            // Create a map to ensure uniqueness in the export
            const uniqueExportData = new Map();
            
            filteredApplicants.forEach(applicant => {
                // Use applicant ID as the key to ensure uniqueness
                if (!uniqueExportData.has(applicant._id)) {
                    uniqueExportData.set(applicant._id, {
                        'Applicant ID': applicant.applicantId || 'N/A',
                        'Full Name': applicant.name || 'No name provided',
                        'Course': applicant.course || 'Not specified',
                        'Status': applicant.status || 'Under Assessment',
                        'Date Assigned': utils.formatDate(applicant.dateAssigned) || 'N/A'
                    });
                }
            });

            // Convert to array for export
            const exportData = Array.from(uniqueExportData.values());

            // Create worksheet
            const ws = XLSX.utils.json_to_sheet(exportData);
            
            // Create workbook
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Assigned Applicants");
            
            // Export the file
            XLSX.writeFile(wb, `Assigned_Applicants_${currentAssessor.assessorId || 'Export'}_${new Date().toISOString().slice(0,10)}.xlsx`);
            
            utils.showNotification('Export successful! Unique applicants exported.', 'success');
        } catch (error) {
            console.error('Export error:', error);
            utils.showNotification(`Export failed: ${error.message}`, 'error');
        }
    }
};

// Event Listeners
const setupEventListeners = () => {
    // Delete button
    if (elements.deleteAssessorBtn) {
        elements.deleteAssessorBtn.addEventListener('click', modal.openDelete);
    }
    
    // Edit button
    if (elements.editAssessorBtn) {
        elements.editAssessorBtn.addEventListener('click', navigation.editAssessor);
    }
    
    // Export button
    if (elements.exportApplicantsBtn) {
        elements.exportApplicantsBtn.addEventListener('click', exportFunctions.exportAssignedApplicants);
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target === elements.deleteModal) {
            modal.closeDelete();
        }
    });
    
    // Search input
    if (elements.searchApplicantsInput) {
        elements.searchApplicantsInput.addEventListener('input', debounce(handleApplicantSearch, 300));
    }
    
    // Sort dropdown
    const sortBtn = document.querySelector('.sort-btn');
    const sortOptions = document.querySelector('.sort-options');
    
    if (sortBtn && sortOptions) {
        sortBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            sortOptions.style.display = sortOptions.style.display === 'block' ? 'none' : 'block';
        });
        
        document.addEventListener('click', () => {
            sortOptions.style.display = 'none';
        });
        
        document.querySelectorAll('.sort-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const sortType = e.target.getAttribute('data-sort');
                handleApplicantSort(sortType);
                sortOptions.style.display = 'none';
            });
        });
    }
    
    // Initialize admin UI components
    admin.initializeDropdown();
    admin.initializeLogout();
};

// Initialize the page
const init = async () => {
    const assessorId = utils.getAssessorIdFromUrl();
    
    if (!assessorId) {
        utils.showNotification('No assessor specified. Redirecting...', 'error');
        setTimeout(() => {
            window.location.href = '/client/admin/assessors/assessors.html';
        }, 2000);
        return;
    }
    
    setupEventListeners();
    
    try {
        await api.loadAdminInfo();
        await api.fetchAssessorData(assessorId);
    } catch (error) {
        console.error('Initialization error:', error);
        utils.showNotification('Failed to load assessor data', 'error');
    }
};

// Make functions available globally
window.viewApplicant = navigation.viewApplicant;
window.closeDeleteModal = modal.closeDelete;
window.confirmDelete = modal.confirmDelete;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', init);