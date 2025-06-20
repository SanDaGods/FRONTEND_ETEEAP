document.addEventListener("DOMContentLoaded", function () {
      const API_BASE_URL = "https://backendeteeap-production.up.railway.app";
  
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
    console.log("Attempting to fetch auth status..."); // Debug log
    
    const response = await fetch(`${API_BASE_URL}/api/auth-status`, {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json' // Explicitly ask for JSON
      }
    });

    console.log("Received response:", response); // Debug log

    // First check if response is HTML (indicating 404)
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
      const html = await response.text();
      console.error("Received HTML instead of JSON:", html);
      throw new Error("Endpoint returned HTML (likely 404)");
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error("Auth status check failed:", {
        status: response.status,
        statusText: response.statusText,
        errorData
      });
      return;
    }

    const data = await response.json();
    console.log("Auth status data:", data);

    if (data.authenticated && data.user) {
      updateTimeline(data.user.status);
    } else {
      console.log("User not authenticated:", data.message || "No authentication data");
    }
  } catch (error) {
    console.error("Full error details:", {
      error: error.message,
      stack: error.stack
    });
    
    // For debugging - show error on page temporarily
    document.body.insertAdjacentHTML('beforeend', 
      `<div style="position:fixed;bottom:0;background:red;color:white;padding:1rem;">
        Debug: ${error.message}
      </div>`);
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
