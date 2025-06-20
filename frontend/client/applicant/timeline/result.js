// Constants
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://backendeteeap-production.up.railway.app";

// DOM Elements
const applicantNameElement = document.getElementById('applicantName');
const eduScoreElement = document.getElementById('eduScore');
const workScoreElement = document.getElementById('workScore');
const achieveScoreElement = document.getElementById('achieveScore');
const interviewScoreElement = document.getElementById('interviewScore');
const remarksElement = document.getElementById('remarks');
const totalScoreElement = document.getElementById('totalScore');
const departmentCourseElement = document.getElementById('departmentCourse');
const loadingElement = document.getElementById('loading');

// Main function to load results
async function loadResults() {
    try {
        showLoading();
        
        // First verify authentication
        const authResponse = await fetch(`${API_BASE_URL}/applicant/auth-status`, {
            credentials: 'include'
        });
        
        if (!authResponse.ok) {
            throw new Error('Authentication check failed');
        }
        
        const authData = await authResponse.json();
        if (!authData.authenticated) {
            redirectToLogin();
            return;
        }
        
        // Get full applicant data including evaluations
        const applicantResponse = await fetch(`${API_BASE_URL}/api/profile/${authData.user._id}`, {
            credentials: 'include'
        });
        
        if (!applicantResponse.ok) {
            throw new Error('Failed to fetch applicant data');
        }
        
        const applicantData = await applicantResponse.json();
        
        // Display the data with evaluations
        displayResults(applicantData.data);
        
    } catch (error) {
        console.error('Error loading results:', error);
        showNotification(error.message || 'Failed to load results', 'error');
        // Still try to display what we can
        try {
            const authResponse = await fetch(`${API_BASE_URL}/applicant/auth-status`, {
                credentials: 'include'
            });
            if (authResponse.ok) {
                const authData = await authResponse.json();
                if (authData.authenticated) {
                    displayResults(authData.user);
                }
            }
        } catch (e) {
            console.error('Fallback display failed:', e);
        }
    } finally {
        hideLoading();
    }
}

function displayResults(applicant) {
    // Display applicant name
    if (applicant.personalInfo) {
        const { firstname, middlename, lastname } = applicant.personalInfo;
        const fullName = [firstname, middlename, lastname].filter(Boolean).join(' ');
        applicantNameElement.textContent = fullName;
    } else if (applicant.email) {
        applicantNameElement.textContent = applicant.email;
    } else {
        applicantNameElement.textContent = 'Applicant';
    }
    
    // Display courses
    if (applicant.personalInfo) {
        const courses = [
            applicant.personalInfo.firstPriorityCourse,
            applicant.personalInfo.secondPriorityCourse,
            applicant.personalInfo.thirdPriorityCourse
        ].filter(Boolean).join(', ');
        
        departmentCourseElement.innerHTML = `<strong>Courses:</strong> ${courses || 'Not specified'}`;
    } else {
        departmentCourseElement.innerHTML = `<strong>Courses:</strong> Not specified`;
    }
    
    // Check if we have evaluations
    if (applicant.evaluations && applicant.evaluations.length > 0) {
        // Get the most recent finalized evaluation
        const finalizedEvaluations = applicant.evaluations.filter(e => e.status === 'finalized');
        const latestEvaluation = finalizedEvaluations.length > 0 
            ? finalizedEvaluations[0] 
            : applicant.evaluations[applicant.evaluations.length - 1];
        
        // Extract scores with proper fallbacks
        const eduScore = latestEvaluation.educationalQualification?.score || 0;
        const workScore = latestEvaluation.workExperience?.score || 0;
        const achieveScore = latestEvaluation.professionalAchievements?.score || 0;
        const interviewScore = latestEvaluation.interview?.score || 0;
        
        // Calculate total score if not provided
        const totalScore = latestEvaluation.totalScore || 
                          (eduScore + workScore + achieveScore + interviewScore);
        
        // Update DOM elements
        eduScoreElement.textContent = `${eduScore}/20`;
        workScoreElement.textContent = `${workScore}/40`;
        achieveScoreElement.textContent = `${achieveScore}/25`;
        interviewScoreElement.textContent = `${interviewScore}/15`;
        totalScoreElement.innerHTML = `<strong>Total Score: ${totalScore}/100</strong>`;
        
        // Determine pass/fail based on total score (60+ is passing)
        const isPassed = totalScore >= 60;
        const remarks = isPassed ? 'Passed' : 'Failed';
        remarksElement.textContent = remarks;
        remarksElement.style.color = isPassed ? 'green' : 'red';
        
        // Removed the final comments display here
    } 
    // If no evaluations, check applicant status
    else {
        // Default scores
        eduScoreElement.textContent = '0/20';
        workScoreElement.textContent = '0/40';
        achieveScoreElement.textContent = '0/25';
        interviewScoreElement.textContent = '0/15';
        totalScoreElement.innerHTML = '<strong>Total Score: 0/100</strong>';
        
        // Check applicant status for better message
        if (applicant.status === 'Approved') {
            remarksElement.textContent = 'Application Approved - No Evaluation Yet';
            remarksElement.style.color = 'green';
        } else if (applicant.status === 'Rejected') {
            remarksElement.textContent = 'Application Rejected';
            remarksElement.style.color = 'red';
        } else if (applicant.status === 'Under Assessment') {
            remarksElement.textContent = 'Under Assessment - Evaluation in Progress';
            remarksElement.style.color = 'blue';
        } else if (applicant.status === 'Evaluated - Passed') {
            remarksElement.textContent = 'Evaluation Completed - Passed';
            remarksElement.style.color = 'green';
        } else if (applicant.status === 'Evaluated - Failed') {
            remarksElement.textContent = 'Evaluation Completed - Failed';
            remarksElement.style.color = 'red';
        } else {
            remarksElement.textContent = 'Pending Evaluation';
            remarksElement.style.color = 'orange';
        }
    }
}

// Utility functions
function showLoading() {
    if (loadingElement) loadingElement.style.display = 'block';
}

function hideLoading() {
    if (loadingElement) loadingElement.style.display = 'none';
}

function showNotification(message, type = 'error') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 5000);
}

function redirectToLogin() {
    window.location.href = '/frontend/applicant/login/login.html';
}

// Logout functionality
document.getElementById('logout')?.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
        showLoading();
        const response = await fetch(`${API_BASE_URL}/applicant/logout`, {
            method: 'POST',
            credentials: 'include'
        });
        
        if (response.ok) {
            window.location.href = '/frontend/applicant/login/login.html';
        } else {
            throw new Error('Logout failed');
        }
    } catch (error) {
        console.error('Logout error:', error);
        showNotification('Failed to logout', 'error');
    } finally {
        hideLoading();
    }
});

// Initialize the page
document.addEventListener('DOMContentLoaded', loadResults);
