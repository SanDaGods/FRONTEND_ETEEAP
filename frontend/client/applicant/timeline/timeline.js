document.addEventListener("DOMContentLoaded", function () {
  const API_BASE_URL = "https://backendeteeap-production.up.railway.app";
  
  // Authentication and dropdown code
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

  // Timeline Logic
  async function fetchApplicantStatus() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth-status`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();

      if (data.authenticated && data.user) {
        updateTimeline(data.user.status);
      } else {
        window.location.href = "../login/login.html";
      }
    } catch (error) {
      console.error("Error fetching applicant status:", error);
      window.location.href = "../login/login.html";
    }
  }

  function updateTimeline(status) {
    const steps = document.querySelectorAll("#progress-bar li");
    const timelineTitle = document.querySelector(".timeline");
    const resultLink = document.getElementById("result-link");

    // Reset all steps
    steps.forEach((step) => {
      step.className = "step-todo";
    });

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
        if (resultLink) {
          resultLink.href = "result.html";
          resultLink.style.pointerEvents = "auto";
          resultLink.style.color = "";
        }
        break;

      case "Evaluated - Failed":
        steps.forEach((step) => (step.className = "step-done"));
        steps[4].className = "step-failed";
        if (timelineTitle) timelineTitle.textContent = "Application Timeline (Not Passed)";
        if (resultLink) {
          resultLink.href = "result.html";
          resultLink.style.pointerEvents = "auto";
          resultLink.style.color = "";
        }
        break;

      case "Rejected":
        steps[0].className = "step-done";
        steps[1].className = "step-rejected";
        if (timelineTitle) timelineTitle.textContent = "Application Timeline (Rejected)";
        // Hide remaining steps
        for (let i = 2; i < steps.length; i++) {
          steps[i].style.display = "none";
        }
        break;

      default:
        steps[0].className = "step-active";
    }
  }

  // Initialize
  fetchApplicantStatus();
});