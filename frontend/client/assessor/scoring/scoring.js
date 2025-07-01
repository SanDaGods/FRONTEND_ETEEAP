// ==============================================
// SCORING SYSTEM FUNCTIONS
// ==============================================

let currentApplicantId = null;
let currentEvaluation = null;
let currentApplicantData = null;
const API_BASE_URL = "https://backendeteeap-production.up.railway.app";
const DOCUMENTS_BASE_PATH = "/documents/";

// ========================
// INITIALIZATION
// ========================

async function initializeScoringPage() {
    try {
      showLoading();
      
      // First verify authentication
      const authResponse = await fetch(`${API_BASE_URL}/assessor/auth-status`, {
        credentials: 'include'
      });
      
      if (!authResponse.ok) throw new Error('Authentication check failed');
      
      const authData = await authResponse.json();
      if (!authData.authenticated) {
        redirectToLogin();
        return;
      }
      
      // Get applicant ID using the new function
      currentApplicantId = getApplicantIdFromVariousSources();
      
      // Validate the ID format
      if (!currentApplicantId || !/^[0-9a-fA-F]{24}$/.test(currentApplicantId)) {
        showNotification('Invalid or missing applicant ID', 'error');
        setTimeout(redirectToAppList, 2000);
        return;
      }
      
      // Rest of your initialization code...
      const applicantResponse = await fetch(`${API_BASE_URL}/api/assessor/applicants/${currentApplicantId}`, {
        credentials: 'include'
      });
      
      // ... continue with the rest of your function
    } catch (error) {
      console.error("Initialization error:", error);
      showNotification(error.message || 'Failed to initialize page', 'error');
      setTimeout(redirectToAppList, 2000);
    } finally {
      hideLoading();
    }
  }


  function getApplicantIdFromVariousSources() {
    try {
      // ... existing code ...
      return applicantId;
    } catch (error) {
      console.error('Error getting applicant ID:', error);
      return null;
    }
  }


  function getApplicantIdFromVariousSources() {
    const sources = [];
    let applicantId;
    
    // Check each source and track where we found it
    if ((applicantId = new URLSearchParams(window.location.search).get('id'))) {
      sources.push('URL search params');
    }
    else if ((applicantId = sessionStorage.getItem('currentScoringApplicant'))) {
      sources.push('sessionStorage');
    }
    else if (window.location.hash && (applicantId = new URLSearchParams(window.location.hash.substring(1)).get('applicantId'))) {
      sources.push('URL hash');
    }
    
    console.log(`Applicant ID ${applicantId || 'not'} found in ${sources.join(', ') || 'any source'}`);
    return applicantId;
  }
  

  async function loadApplicantData(applicantId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/assessor/applicants/${applicantId}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 403) {
          throw new Error('This applicant is not assigned to you');
        }
        if (response.status === 404) {
          throw new Error('Applicant not found');
        }
        throw new Error(errorData.message || 'Failed to load applicant data');
      }
      
      const data = await response.json();
      return data.data;
    } catch (error) {
      console.error('Error loading applicant:', error);
      throw error; // Re-throw for calling function to handle
    }
  }


async function loadExistingEvaluationData(applicantId) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/evaluations?applicantId=${applicantId}`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch evaluation data');
    }
    
    const data = await response.json();
    
    if (data.success && data.data) {
      currentEvaluation = data.data;
      loadExistingEvaluation(data.data);
    }
  } catch (error) {
    console.error('Error loading evaluation:', error);
    showNotification('Failed to load existing evaluation', 'error');
  }
}


function updateApplicantInfo(applicant) {
    const applicantNameElement = document.getElementById('applicantName');
    const applicantCourseElement = document.getElementById('applicantCourse');
    
    if (applicantNameElement) {
        applicantNameElement.textContent = applicant.name || 'No name provided';
    }
    
    if (applicantCourseElement) {
        applicantCourseElement.textContent = applicant.course || 'Not specified';
    }
}




function loadExistingEvaluation(evaluation) {
    if (evaluation.educationalQualification) {
        document.getElementById('eduAccumulated').textContent = evaluation.educationalQualification.score || 0;
        document.getElementById('eduComment').value = evaluation.educationalQualification.comments || '';
    }
    
    if (evaluation.workExperience) {
        document.getElementById('workAccumulated').textContent = evaluation.workExperience.score || 0;
        document.getElementById('workComment').value = evaluation.workExperience.comments || '';
    }
    
    if (evaluation.professionalAchievements) {
        document.getElementById('achieveAccumulated').textContent = evaluation.professionalAchievements.score || 0;
        document.getElementById('achieveComment').value = evaluation.professionalAchievements.comments || '';
    }
    
    if (evaluation.interview) {
        document.getElementById('interviewAccumulated').textContent = evaluation.interview.score || 0;
        document.getElementById('interviewComment').value = evaluation.interview.comments || '';
    }
    
    updateOverallScore();
}

function disableScoringForm() {
    document.querySelectorAll('input[type="number"]').forEach(input => {
        input.disabled = true;
    });
    
    document.querySelectorAll('textarea').forEach(textarea => {
        textarea.disabled = true;
    });
    
    document.querySelectorAll('.section button').forEach(button => {
        button.disabled = true;
    });
    
    document.getElementById('finalizeButton').disabled = true;
}

// ========================
// SCORING FUNCTIONS
// ========================

async function saveEvaluation() {
    try {
        const scores = {
            educationalQualification: {
                score: parseInt(document.getElementById('eduAccumulated').textContent) || 0,
                comments: document.getElementById('eduComment').value || '',
                breakdown: [] // Add actual breakdown if you have criteria
            },
            workExperience: {
                score: parseInt(document.getElementById('workAccumulated').textContent) || 0,
                comments: document.getElementById('workComment').value || '',
                breakdown: []
            },
            professionalAchievements: {
                score: parseInt(document.getElementById('achieveAccumulated').textContent) || 0,
                comments: document.getElementById('achieveComment').value || '',
                breakdown: []
            },
            interview: {
                score: parseInt(document.getElementById('interviewAccumulated').textContent) || 0,
                comments: document.getElementById('interviewComment').value || '',
                breakdown: []
            }
        };

        const response = await fetch(`${API_BASE_URL}/api/evaluations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                applicantId: currentApplicantId,
                scores
            })
        });

        const data = await response.json();
        
        if (data.success) {
            showNotification('Evaluation saved successfully', 'success');
            currentEvaluation = data.data.evaluation;
            return true;
        } else {
            showNotification(data.error || 'Failed to save evaluation', 'error');
            return false;
        }
    } catch (error) {
        console.error('Error saving evaluation:', error);
        showNotification('Failed to save evaluation', 'error');
        return false;
    }
}

async function finalizeEvaluation() {
    if (!confirm('Are you sure you want to finalize this evaluation? This action cannot be undone.')) {
        return;
    }

    const finalComments = prompt('Please enter your final comments for this evaluation:');
    if (finalComments === null) return; // User cancelled

    try {
        showLoading();
        
        // First save any unsaved changes
        const saved = await saveEvaluation();
        if (!saved) return;

        const response = await fetch(`${API_BASE_URL}/api/evaluations/finalize`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                applicantId: currentApplicantId,
                comments: finalComments
            })
        });

        const data = await response.json();
        
        if (data.success) {
            showNotification('Evaluation finalized successfully!', 'success');
            // Redirect back to applicant list after 2 seconds
            setTimeout(() => {
                window.location.href = '/frontend/client/assessor/applicants/applicants.html';
            }, 2000);
        } else {
            showNotification(data.error || 'Failed to finalize evaluation', 'error');
        }
    } catch (error) {
        console.error('Error finalizing evaluation:', error);
        showNotification('Failed to finalize evaluation', 'error');
    } finally {
        hideLoading();
    }
}

function addEduPoints() {
    const points = parseInt(document.getElementById('eduPoints').value) || 0;
    if (points < 0 || points > 20) {
        showNotification('Please enter points between 0-20', 'error');
        return;
    }
    const current = parseInt(document.getElementById('eduAccumulated').textContent) || 0;
    const newTotal = Math.min(current + points, 20);
    document.getElementById('eduAccumulated').textContent = newTotal;
    updateOverallScore();
    document.getElementById('eduPoints').value = '';
}

function addWorkPoints() {
    const points = parseInt(document.getElementById('workPoints').value) || 0;
    if (points < 0 || points > 40) {
        showNotification('Please enter points between 0-40', 'error');
        return;
    }
    const current = parseInt(document.getElementById('workAccumulated').textContent) || 0;
    const newTotal = Math.min(current + points, 40);
    document.getElementById('workAccumulated').textContent = newTotal;
    updateOverallScore();
    document.getElementById('workPoints').value = '';
}

function addAchievePoints() {
    const points = parseInt(document.getElementById('achievePoints').value) || 0;
    if (points < 0 || points > 25) {
        showNotification('Please enter points between 0-25', 'error');
        return;
    }
    const current = parseInt(document.getElementById('achieveAccumulated').textContent) || 0;
    const newTotal = Math.min(current + points, 25);
    document.getElementById('achieveAccumulated').textContent = newTotal;
    updateOverallScore();
    document.getElementById('achievePoints').value = '';
}

function addInterviewPoints() {
    const points = parseInt(document.getElementById('interviewPoints').value) || 0;
    if (points < 0 || points > 15) {
        showNotification('Please enter points between 0-15', 'error');
        return;
    }
    const current = parseInt(document.getElementById('interviewAccumulated').textContent) || 0;
    const newTotal = Math.min(current + points, 15);
    document.getElementById('interviewAccumulated').textContent = newTotal;
    updateOverallScore();
    document.getElementById('interviewPoints').value = '';
}

function updateOverallScore() {
    const eduScore = parseInt(document.getElementById('eduAccumulated').textContent) || 0;
    const workScore = parseInt(document.getElementById('workAccumulated').textContent) || 0;
    const achieveScore = parseInt(document.getElementById('achieveAccumulated').textContent) || 0;
    const interviewScore = parseInt(document.getElementById('interviewAccumulated').textContent) || 0;
    
    const overallScore = eduScore + workScore + achieveScore + interviewScore;
    document.getElementById('overallPoints').textContent = overallScore;
    
    // Update the visual indication of pass/fail
    const overallElement = document.getElementById('overallPoints');
    if (overallScore >= 60) {
        overallElement.classList.add('pass');
        overallElement.classList.remove('fail');
    } else {
        overallElement.classList.add('fail');
        overallElement.classList.remove('pass');
    }
    
    updateLastUpdated();
}

function updateLastUpdated() {
    const now = new Date();
    document.getElementById('lastUpdated').textContent = now.toLocaleString();
}

// ========================
// DOCUMENT FUNCTIONS
// ========================

function previewDocument(filePath) {
    if (!filePath) {
      showNotification('No document path provided', 'error');
      return;
    }
  
    // Browser-compatible way to get file extension
    const lastDotIndex = filePath.lastIndexOf('.');
    const fileExt = lastDotIndex >= 0 ? filePath.substring(lastDotIndex).toLowerCase() : '';
    
    const validExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx'];
    
    if (!validExtensions.includes(fileExt)) {
      showNotification('Only PDF, Word, and Excel files can be previewed', 'error');
      return;
    }

  const previewFrame = document.getElementById('documentPreview');
  const fallbackDiv = document.querySelector('.preview-unavailable');
  
  showLoading();
  fallbackDiv.style.display = 'none';
  previewFrame.style.display = 'block';

  // Use Google Docs Viewer for better compatibility
  const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(window.location.origin + DOCUMENTS_BASE_PATH + filePath)}&embedded=true`;
  
  previewFrame.src = '';
  
  setTimeout(() => {
    previewFrame.src = googleViewerUrl;
    
    previewFrame.onload = () => hideLoading();
    previewFrame.onerror = () => {
      // Fallback to direct PDF view
      previewFrame.src = `${DOCUMENTS_BASE_PATH}${encodeURIComponent(filePath)}?t=${Date.now()}`;
      previewFrame.onerror = () => {
        showPreviewError('Failed to load document preview');
        hideLoading();
      };
    };
  }, 100);
}


function validatePdfFile(filePath) {
    if (!filePath) return false;
    // Browser-compatible way to check file extension
    const lastDotIndex = filePath.lastIndexOf('.');
    const extension = lastDotIndex >= 0 ? filePath.substring(lastDotIndex).toLowerCase() : '';
    return extension === '.pdf';
}

function showPreviewError(message) {
    const fallbackDiv = document.querySelector('.preview-unavailable');
    fallbackDiv.querySelector('p').textContent = message;
    fallbackDiv.style.display = 'block';
    document.getElementById('documentPreview').style.display = 'none';
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
            updateUserDisplay(data.user);
            return true;
        } else {
            redirectToLogin();
            return false;
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        redirectToLogin();
        return false;
    }
}

function updateUserDisplay(user) {
    const usernameElement = document.querySelector('.username');
    if (usernameElement && user?.fullName) {
        usernameElement.textContent = user.fullName;
    }
}

function redirectToLogin() {
    window.location.href = '/frontend/client/applicant/login/login.html';
}

async function handleLogout() {
    showLoading();
    try {
        await fetch(`${API_BASE_URL}/assessor/logout`, {
            method: 'POST',
            credentials: 'include'
        });
        
        sessionStorage.removeItem('assessorData');
        showNotification('Logout successful', 'success');
        setTimeout(redirectToLogin, 1000);
    } catch (error) {
        console.error('Logout failed:', error);
        showNotification('Logout failed', 'error');
        hideLoading();
    }
}

// ========================
// UTILITY FUNCTIONS
// ========================

function showLoading() {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) spinner.classList.add('active');
}

function hideLoading() {
    const spinner = document.getElementById('loadingSpinner');
    if (spinner) spinner.classList.remove('active');
}

function showNotification(message, type = "info") {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}



// ========================
// EVENT LISTENERS
// ========================

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the page
    initializeScoringPage();
    
    // Finalize button
    document.getElementById('finalizeButton')?.addEventListener('click', finalizeEvaluation);
    
    // Logout handler
    document.getElementById('logoutLink')?.addEventListener('click', (e) => {
        e.preventDefault();
        handleLogout();
    });

    // Auto-save every 2 minutes
    setInterval(saveEvaluation, 120000);
});



function redirectToLogin() {
  window.location.href = '/frontend/client/applicant/login/login.html';
}

function redirectToAppList() {
  window.location.href = '/frontend/client/assessor/applicants/applicants.html';
}

function validateApplicantId(id) {
  return id && /^[0-9a-fA-F]{24}$/.test(id);
}


// Add this to scoring.js to clean up stored IDs
window.addEventListener('beforeunload', function() {
  sessionStorage.removeItem('currentScoringApplicant');
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

// Close dropdowns when clicking outside
document.addEventListener('click', function(event) {
    // ... other code ...

    // Close profile dropdown when clicking outside
    if (!event.target.closest('.profile-dropdown')) {
        const menu = document.querySelector('.dropdown-menu');
        if (menu) {
            menu.style.opacity = '0';
            menu.style.visibility = 'hidden';
            menu.style.transform = 'translateY(10px)';
        }
    }
});


document.addEventListener('click', function(event) {
    // ... other code ...

    // Close profile dropdown when clicking outside
    if (!event.target.closest('.profile-dropdown')) {
        const menu = document.querySelector('.dropdown-menu');
        if (menu) {
            menu.style.opacity = '0';
            menu.style.visibility = 'hidden';
            menu.style.transform = 'translateY(10px)';
        }
    }
});


// Initialize on page load
document.addEventListener("DOMContentLoaded", function() {
    // Load assessor info and profile
    showLoading();
    loadAssessorInfo().then((authenticated) => {
        if (authenticated) {
            fetchAssessorProfile();
        }
    }).finally(() => {
        hideLoading();
    });
})


function getApplicantIdFromVariousSources() {
    // 1. Check URL query params first
    const urlParams = new URLSearchParams(window.location.search);
    let applicantId = urlParams.get('id');
    
    // 2. Check sessionStorage as fallback
    if (!applicantId) {
      applicantId = sessionStorage.getItem('currentScoringApplicant');
    }
    
    // 3. Check URL hash as additional fallback
    if (!applicantId && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      applicantId = hashParams.get('applicantId');
    }
    
    // 4. If coming from evaluation page, check referrer
    if (!applicantId && document.referrer.includes('Evaluation')) {
      try {
        const referrerUrl = new URL(document.referrer);
        const referrerParams = new URLSearchParams(referrerUrl.search);
        applicantId = referrerParams.get('id');
      } catch (e) {
        console.error('Error parsing referrer URL:', e);
      }
    }
    
    return applicantId;
  }

  // Add this function to scoring.js to handle point recording
async function recordPoints(category, points, comments) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/record-points`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                applicantId: currentApplicantId,
                category,
                points,
                comments
            })
        });

        const data = await response.json();
        return data.success;
    } catch (error) {
        console.error('Error recording points:', error);
        return false;
    }
}

// Modify your existing point addition functions to record points:
function addEduPoints() {
    const points = parseInt(document.getElementById('eduPoints').value) || 0;
    if (points < 0 || points > 20) {
        showNotification('Please enter points between 0-20', 'error');
        return;
    }
    const current = parseInt(document.getElementById('eduAccumulated').textContent) || 0;
    const newTotal = Math.min(current + points, 20);
    document.getElementById('eduAccumulated').textContent = newTotal;
    
    // Record the points
    const comments = document.getElementById('eduComment').value;
    recordPoints('educationalQualification', points, comments);
    
    updateOverallScore();
    document.getElementById('eduPoints').value = '';
}

// Similarly modify the other point addition functions (addWorkPoints, addAchievePoints, addInterviewPoints)


// Global exports
window.addEduPoints = addEduPoints;
window.addWorkPoints = addWorkPoints;
window.addAchievePoints = addAchievePoints;
window.addInterviewPoints = addInterviewPoints;
