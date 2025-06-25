const API_BASE_URL = "https://backendeteeap-production.up.railway.app";
let currentApplicant = null;
let applicantId = null;
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
    displayApplicantData(data.data);
    
    // Fetch documents separately
    await fetchAndDisplayDocuments();
    
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

// Fetch and display documents
async function fetchAndDisplayDocuments() {
  const loading = document.getElementById('documents-loading');
  const noDocuments = document.getElementById('no-documents');
  const grid = document.getElementById('documents-grid');
  
  // Show loading state
  if (loading) loading.style.display = 'flex';
  if (noDocuments) noDocuments.style.display = 'none';
  if (grid) grid.style.display = 'none';
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/applicants/${applicantId}/files`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || 
        errorData.message || 
        `Failed to fetch documents: ${response.status}`
      );
    }
    
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to load documents');
    }
    
    // Store files for viewer navigation
    currentFiles = data.files || [];
    
    // Display documents
    displayDocuments(currentFiles);
    
  } catch (error) {
    console.error('Error fetching documents:', error);
    showNotification(`Error loading documents: ${error.message}`, 'error');
    
    // Show empty state if error occurs
    if (loading) loading.style.display = 'none';
    if (noDocuments) noDocuments.style.display = 'flex';
  }
}

// Display documents in the UI
function displayDocuments(documents) {
  const loading = document.getElementById('documents-loading');
  const noDocuments = document.getElementById('no-documents');
  const grid = document.getElementById('documents-grid');
  
  if (!loading || !noDocuments || !grid) return;

  // Hide loading state
  loading.style.display = 'none';

  if (!documents || documents.length === 0) {
    noDocuments.style.display = 'flex';
    grid.style.display = 'none';
    return;
  }

  // Show documents grid
  noDocuments.style.display = 'none';
  grid.style.display = 'grid';
  grid.innerHTML = '';

  // Group documents by type
  const groupedDocs = groupDocumentsByType(documents);

  // Add each document to the grid
  Object.entries(groupedDocs).forEach(([type, files]) => {
    const sectionHeader = document.createElement('h4');
    sectionHeader.textContent = getSectionTitle(type);
    sectionHeader.style.gridColumn = '1 / -1';
    sectionHeader.style.marginTop = '20px';
    sectionHeader.style.marginBottom = '10px';
    sectionHeader.style.color = 'var(--primary-color)';
    grid.appendChild(sectionHeader);

    files.forEach(file => {
      const card = createDocumentCard(file);
      grid.appendChild(card);
    });
  });
}

function groupDocumentsByType(documents) {
  return documents.reduce((groups, file) => {
    const type = file.label || 'others';
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(file);
    return groups;
  }, {});
}

function getSectionTitle(type) {
  const titles = {
    'initial-submission': 'Initial Submissions',
    'resume': 'Resume/CV',
    'training': 'Training Certificates',
    'awards': 'Awards',
    'interview': 'Interview Documents',
    'others': 'Other Documents'
  };
  return titles[type] || type;
}

function createDocumentCard(file) {
  const card = document.createElement('div');
  card.className = 'document-card';
  
  // Determine icon based on file type
  const ext = file.filename.split('.').pop().toLowerCase();
  let iconClass = 'fa-file';
  
  if (ext === 'pdf') iconClass = 'fa-file-pdf';
  else if (['jpg', 'jpeg', 'png', 'gif'].includes(ext)) iconClass = 'fa-file-image';
  else if (['doc', 'docx'].includes(ext)) iconClass = 'fa-file-word';
  else if (['xls', 'xlsx'].includes(ext)) iconClass = 'fa-file-excel';

  card.innerHTML = `
    <div class="document-icon">
      <i class="fas ${iconClass}"></i>
    </div>
    <div class="document-info">
      <p class="document-name" title="${file.filename}">${file.filename}</p>
      <p class="document-date">${formatDate(file.uploadDate)}</p>
    </div>
    <div class="document-actions">
      <button class="view-btn" data-file-id="${file._id}">
        <i class="fas fa-eye"></i> View
      </button>
      <a href="${API_BASE_URL}/api/admin/view-file/${file._id}" download="${file.filename}" class="btn download-btn">
        <i class="fas fa-download"></i> Download
      </a>
    </div>
  `;

  // Add click handler for view button
  card.querySelector('.view-btn').addEventListener('click', (e) => {
    e.preventDefault();
    viewFile(file._id);
  });

  return card;
}

// View file in modal
async function viewFile(fileId) {
  try {
    // Find the file in currentFiles
    currentFileIndex = currentFiles.findIndex(file => file._id === fileId);
    if (currentFileIndex === -1) {
      throw new Error('File not found');
    }

    const file = currentFiles[currentFileIndex];
    const modal = document.getElementById('fileModal');
    const fileViewer = document.getElementById('fileViewer');
    const imageViewer = document.getElementById('imageViewer');
    const currentFileText = document.getElementById('currentFileText');
    const fileName = document.getElementById('fileName');
    const prevBtn = document.querySelector('.prev-btn');
    const nextBtn = document.querySelector('.next-btn');

    if (!modal || !fileViewer || !imageViewer || !currentFileText || !fileName) {
      throw new Error('File viewer elements not found');
    }

    // Update UI
    currentFileText.textContent = `File ${currentFileIndex + 1} of ${currentFiles.length}`;
    fileName.textContent = file.filename;
    
    // Disable/enable navigation buttons
    if (prevBtn) prevBtn.disabled = currentFileIndex === 0;
    if (nextBtn) nextBtn.disabled = currentFileIndex === currentFiles.length - 1;

    // Show loading state
    fileName.textContent = `Loading ${file.filename}...`;
    fileViewer.style.display = 'none';
    imageViewer.style.display = 'none';

    // Fetch the file
    const response = await fetch(`${API_BASE_URL}/api/admin/view-file/${fileId}`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to load file: ${response.status}`);
    }

    // Handle different file types
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);

    if (contentType.startsWith('image/')) {
      // For images
      imageViewer.onload = () => {
        imageViewer.style.display = 'block';
        fileName.textContent = file.filename;
      };
      imageViewer.src = url;
    } else if (contentType === 'application/pdf') {
      // For PDFs
      fileViewer.onload = () => {
        fileViewer.style.display = 'block';
        fileName.textContent = file.filename;
      };
      fileViewer.src = url;
    } else {
      // For other files, offer download
      fileViewer.style.display = 'block';
      fileViewer.src = url;
      fileName.textContent = file.filename;
    }

    // Show modal
    modal.style.display = 'flex';

    // Clean up URL when modal closes
    const cleanup = () => {
      URL.revokeObjectURL(url);
    };
    modal.addEventListener('click', cleanup, { once: true });

  } catch (error) {
    console.error('Error viewing file:', error);
    showNotification(`Error viewing file: ${error.message}`, 'error');
  }
}

// Initialize file viewer controls
function initializeFileViewer() {
  const modal = document.getElementById('fileModal');
  if (!modal) return;

  const closeBtn = modal.querySelector('.close-modal');
  const prevBtn = modal.querySelector('.prev-btn');
  const nextBtn = modal.querySelector('.next-btn');

  function closeModal() {
    modal.style.display = 'none';
    document.getElementById('fileViewer').style.display = 'none';
    document.getElementById('imageViewer').style.display = 'none';
  }

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  if (prevBtn) prevBtn.addEventListener('click', () => {
    if (currentFileIndex > 0) viewFile(currentFiles[currentFileIndex - 1]._id);
  });

  if (nextBtn) nextBtn.addEventListener('click', () => {
    if (currentFileIndex < currentFiles.length - 1) viewFile(currentFiles[currentFileIndex + 1]._id);
  });

  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (modal.style.display === 'flex') {
      if (e.key === 'Escape') closeModal();
      if (e.key === 'ArrowLeft' && currentFileIndex > 0) {
        viewFile(currentFiles[currentFileIndex - 1]._id);
      }
      if (e.key === 'ArrowRight' && currentFileIndex < currentFiles.length - 1) {
        viewFile(currentFiles[currentFileIndex + 1]._id);
      }
    }
  });
}

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
  // Get applicant ID
  applicantId = getApplicantId();
  if (!applicantId) return;
  
  // Initialize file viewer
  initializeFileViewer();
  
  // Load applicant data
  loadApplicantData();
  
  // Set up back button
  document.getElementById('backButton')?.addEventListener('click', () => {
    window.location.href = '/frontend/client/admin/applicants/applicants.html';
  });
  
  // Set up approve button
  document.getElementById('approveBtn')?.addEventListener('click', async () => {
    if (!confirm('Are you sure you want to approve this application?')) return;
    await showAssignAssessorModal();
  });
  
  // Set up reject button
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

// Show modal for assigning assessor
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