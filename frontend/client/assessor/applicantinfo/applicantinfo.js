const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://updated-backend-production-ff82.up.railway.app";
let currentApplicant = null;

// DOM Elements
const applicantIdElement = document.getElementById('applicantId');
const applicantNameElement = document.getElementById('applicantName');
const applicantCourseElement = document.getElementById('applicantCourse');
const applicationDateElement = document.getElementById('applicationDate');
const documentsContainer = document.getElementById('documentsContainer');
const evaluationForm = document.getElementById('evaluationForm');
const evaluationScore = document.getElementById('evaluationScore');
const evaluationNotes = document.getElementById('evaluationNotes');
const approveBtn = document.getElementById('approveBtn');
const rejectBtn = document.getElementById('rejectBtn');
const saveBtn = document.getElementById('saveBtn');
const backButton = document.getElementById('backButton');
const statusBadge = document.getElementById('statusBadge');

// Initialize the page
document.addEventListener('DOMContentLoaded', async () => {
  // Get applicant ID from sessionStorage
  const applicantId = sessionStorage.getItem('currentApplicantId');
  
  if (!applicantId) {
    showNotification('No applicant selected. Redirecting...', 'error');
    setTimeout(() => {
      window.location.href = '/client/assessor/dashboard/dashboard.html';
    }, 2000);
    return;
  }

  // Load applicant data
  await loadApplicantData(applicantId);
  
  // Set up event listeners
  setupEventListeners();
});

async function loadApplicantData(applicantId) {
  showLoading();
  try {
    // First verify assessor is authenticated
    const authResponse = await fetch(`${API_BASE_URL}/assessor/auth-status`, {
      credentials: 'include'
    });
    
    if (!authResponse.ok) {
      window.location.href = 'login/login.html'
;
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
    
  } catch (error) {
    console.error('Error loading applicant data:', error);
    showNotification(error.message, 'error');
    setTimeout(() => {
      window.location.href = '/client/assessor/dashboard/dashboard.html'
;
    }, 2000);
  } finally {
    hideLoading();
  }
}

function displayApplicantData(applicant) {
  if (!applicant) return;
  
  // Basic info
  applicantIdElement.textContent = `APP${applicant._id.toString().substring(0, 8).toUpperCase()}`;
  applicationDateElement.textContent = formatDate(applicant.createdAt);
  
  // Personal info
  if (applicant.personalInfo) {
    applicantNameElement.textContent = 
      `${applicant.personalInfo.firstname || ''} ${applicant.personalInfo.middlename || ''} ${applicant.personalInfo.lastname || ''}`.trim();
    applicantCourseElement.textContent = applicant.personalInfo.firstPriorityCourse || 'Not specified';
  }
  
  // Status
  updateStatusBadge(applicant.status);
  
  // Documents
  displayDocuments(applicant.files || []);
}

function displayDocuments(documents) {
  if (!documents || documents.length === 0) {
    documentsContainer.innerHTML = `
      <div class="no-documents">
        <i class="fas fa-folder-open"></i>
        <p>No documents submitted</p>
      </div>
    `;
    return;
  }
  
  documentsContainer.innerHTML = '';
  const documentsList = document.createElement('div');
  documentsList.className = 'documents-list';
  
  documents.forEach(doc => {
    const fileName = doc.split('/').pop() || 'Document';
    const docElement = document.createElement('div');
    docElement.className = 'document-item';
    docElement.innerHTML = `
      <i class="fas fa-file-pdf"></i>
      <span>${fileName}</span>
      <a href="${API_BASE_URL}/${doc}" target="_blank" class="view-doc">
        <i class="fas fa-eye"></i> View
      </a>
      <a href="${API_BASE_URL}/${doc}" download class="download-doc">
        <i class="fas fa-download"></i> Download
      </a>
    `;
    documentsList.appendChild(docElement);
  });
  
  documentsContainer.appendChild(documentsList);
}

function updateStatusBadge(status) {
  if (!statusBadge) return;
  
  statusBadge.textContent = status || 'Under Assessment';
  statusBadge.className = 'status-badge ';
  
  if (status === 'Approved') {
    statusBadge.classList.add('status-approved');
  } else if (status === 'Rejected') {
    statusBadge.classList.add('status-rejected');
  } else {
    statusBadge.classList.add('status-in-progress');
  }
}

function setupEventListeners() {
  // Back button
  backButton.addEventListener('click', () => {
    window.location.href = '/client/assessor/dashboard/dashboard.html'
;
  });
  
  // Form submission
  evaluationForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveEvaluation();
  });
  
  // Approve button
  approveBtn.addEventListener('click', async () => {
    if (confirm('Are you sure you want to approve this applicant?')) {
      await updateApplicantStatus('Approved');
    }
  });
  
  // Reject button
  rejectBtn.addEventListener('click', async () => {
    if (confirm('Are you sure you want to reject this applicant?')) {
      await updateApplicantStatus('Rejected');
    }
  });
}

async function saveEvaluation() {
  if (!currentApplicant) return;
  
  showLoading();
  try {
    // In a real app, you would send this to your backend
    const evaluationData = {
      score: evaluationScore.value,
      notes: evaluationNotes.value,
      evaluatedAt: new Date().toISOString()
    };
    
    // For now, we'll just show a notification
    showNotification('Evaluation saved successfully!', 'success');
    
    // You would typically update the applicant status here
    // await updateApplicantStatus('Under Assessment', evaluationData);
    
  } catch (error) {
    console.error('Error saving evaluation:', error);
    showNotification('Failed to save evaluation', 'error');
  } finally {
    hideLoading();
  }
}

async function updateApplicantStatus(newStatus) {
  if (!currentApplicant) return;
  
  showLoading();
  try {
    // In a real app, you would send this to your backend
    const response = await fetch(`${API_BASE_URL}/api/admin/applicants/${currentApplicant._id}/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: newStatus
      }),
      credentials: 'include'
    });
    
    const data = await response.json();
    
    if (data.success) {
      showNotification(`Applicant has been ${newStatus.toLowerCase()}`, 'success');
      currentApplicant.status = newStatus;
      updateStatusBadge(newStatus);
    } else {
      throw new Error(data.error || 'Failed to update status');
    }
  } catch (error) {
    console.error('Error updating applicant status:', error);
    showNotification(error.message, 'error');
  } finally {
    hideLoading();
  }
}

// Utility functions
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(dateString).toLocaleDateString(undefined, options);
}

function showLoading() {
  document.getElementById('loadingSpinner').style.display = 'flex';
}

function hideLoading() {
  document.getElementById('loadingSpinner').style.display = 'none';
}

function showNotification(message, type = 'info') {
  const notification = document.getElementById('notification');
  notification.textContent = message;
  notification.className = `notification ${type}`;
  notification.style.display = 'block';
  
  setTimeout(() => {
    notification.style.display = 'none';
  }, 3000);
}
