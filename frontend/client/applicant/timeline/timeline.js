const API_BASE_URL = "https://backendeteeap-production.up.railway.app";

document.addEventListener("DOMContentLoaded", function () {
  // Notification function
  function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Add to body
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => notification.remove(), 500);
    }, 5000);
  }

  // Add some basic styles for the notification
  const style = document.createElement('style');
  style.textContent = `
    .notification {
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 15px 20px;
      border-radius: 5px;
      color: white;
      background-color: #333;
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
      transition: all 0.3s ease;
      z-index: 1000;
    }
    .notification.info { background-color: #3498db; }
    .notification.success { background-color: #2ecc71; }
    .notification.warning { background-color: #f39c12; }
    .notification.error { background-color: #e74c3c; }
    .notification.fade-out {
      opacity: 0;
      transform: translateY(20px);
    }
  `;
  document.head.appendChild(style);

  // Authentication and dropdown code remains the same
  const logoutButton = document.querySelector("#logout");

  if (logoutButton) {
    logoutButton.addEventListener("click", function (event) {
      event.preventDefault();
      sessionStorage.clear();
      localStorage.removeItem("userSession");
      window.location.href = "../login/login.html";
    });
  }

  const dropdownToggles = document.querySelectorAll(".dropdown-toggle");

  dropdownToggles.forEach((toggle) => {
    toggle.addEventListener("click", function (event) {
      event.preventDefault();
      const parentDropdown = toggle.parentElement;
      parentDropdown.classList.toggle("active");

      document.querySelectorAll(".dropdown").forEach((dropdown) => {
        if (dropdown !== parentDropdown) {
          dropdown.classList.remove("active");
        }
      });
    });
  });

  document.addEventListener("click", function (event) {
    if (!event.target.closest(".dropdown")) {
      document.querySelectorAll(".dropdown").forEach((dropdown) => {
        dropdown.classList.remove("active");
      });
    }
  });

  // New Timeline Logic
async function fetchApplicantStatus() {
  try {
    const response = await fetch(`${API_BASE_URL}/auth-status`, {
      credentials: 'include' // 👈 This is crucial for sending cookies
    });
    
    const data = await response.json();

    if (data.authenticated && data.user) { // 👈 Fixed typo here (was "authenticated")
      updateTimeline(data.user.status);
      showNotification("Timeline updated successfully!", "success");
    } else {
      showNotification("Please login to view your application timeline", "warning");
      console.warn("Auth response:", data); // 👈 Better debugging
    }
  } catch (error) {
    console.error("Error fetching applicant status:", error);
    showNotification("Failed to load timeline data", "error");
  }
}

  function updateTimeline(status) {
    const steps = document.querySelectorAll("#progress-bar li");

    // Reset all steps
    steps.forEach((step) => {
      step.className = "step-todo";
    });

    // Special handling for rejected/failed states
    const timelineTitle = document.querySelector(".timeline");
    const resultLink = document.getElementById("result-link");

    switch (status) {
      case "Pending Review":
        steps[0].className = "step-active";
        break;

      case "Approved":
        steps[0].className = "step-done";
        steps[1].className = "step-active";
        break;

      case "Under Assessment":
        steps[0].className = "step-done";
        steps[1].className = "step-done";
        steps[2].className = "step-active";
        break;

      case "Evaluated - Passed":
        steps.forEach((step) => (step.className = "step-done"));
        resultLink.href = "result.html";
        resultLink.style.pointerEvents = "auto";
        resultLink.style.color = "";
        break;

      case "Evaluated - Failed":
        steps.forEach((step) => (step.className = "step-done"));
        steps[4].className = "step-failed"; // Add special class for failed state
        timelineTitle.textContent = "Application Timeline (Not Passed)";
        resultLink.href = "result.html";
        resultLink.style.pointerEvents = "auto";
        resultLink.style.color = "";
        break;

      case "Rejected":
        steps[0].className = "step-done";
        steps[1].className = "step-rejected"; // Special styling for rejection
        steps[1].querySelector(".sub-text").textContent =
          "Your application was rejected";
        // Hide remaining steps
        for (let i = 2; i < steps.length; i++) {
          steps[i].style.display = "none";
        }
        timelineTitle.textContent = "Application Timeline (Rejected)";
        break;

      default:
        steps[0].className = "step-active";
    }
  }

  fetchApplicantStatus();
});