class NavProfile {
  constructor() {
    this.API_BASE_URL = "https://backendeteeap-production.up.railway.app";
    this.userId = localStorage.getItem("userId");
    this.init();
  }

  async init() {
    try {
      await this.loadUserData();
      this.setupEventListeners();
    } catch (error) {
      console.error("Navigation profile initialization error:", error);
      window.location.href = "../login/login.html";
    }
  }

  async loadUserData() {
    try {
      // Try both endpoints for backward compatibility
      let response = await fetch(`${this.API_BASE_URL}/api/auth-status`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        response = await fetch(`${this.API_BASE_URL}/applicant/auth-status`, {
          credentials: 'include'
        });
      }

      if (!response.ok) {
        throw new Error('Not authenticated');
      }
      
      const authData = await response.json();

      if (!authData.authenticated) {
        window.location.href = "../login/login.html";
        return;
      }

      if (authData.user) {
        await this.loadProfilePicture(authData.user);
        this.updateProfileName(authData.user.personalInfo || authData.user);
      }
    } catch (error) {
      console.error("Error loading user data:", error);
      window.location.href = "../login/login.html";
    }
  }

  async loadProfilePicture(user) {
    try {
      const navProfilePic = document.getElementById("nav-profile-pic");
      if (!navProfilePic) return;

      if (user?.profilePicId) {
        const response = await fetch(`${this.API_BASE_URL}/api/profile-pic/${this.userId}`);
        if (response.ok) {
          const blob = await response.blob();
          navProfilePic.src = URL.createObjectURL(blob);
        }
      } else {
        // Set default profile picture if none exists
        navProfilePic.src = "../assets/images/default-profile.png";
      }
    } catch (error) {
      console.error("Error loading profile picture:", error);
    }
  }

  updateProfileName(userData) {
    const navProfileName = document.getElementById("nav-profile-name");
    if (navProfileName && userData) {
      const nameParts = [userData.firstname, userData.lastname];
      const displayName = nameParts
        .filter((part) => part && part.trim())
        .join(" ");
      navProfileName.innerText = displayName || "Applicant";
    }
  }

  setupEventListeners() {
    // Toggle dropdowns on click
    const dropdownToggles = document.querySelectorAll(".dropdown-toggle");
    dropdownToggles.forEach((toggle) => {
      toggle.addEventListener("click", (e) => {
        e.preventDefault();
        const dropdown = toggle.closest(".dropdown");
        if (!dropdown) return;

        const content = dropdown.querySelector(".dropdown-content");
        if (!content) return;

        // Close all other dropdowns first
        document.querySelectorAll(".dropdown-content").forEach((el) => {
          if (el !== content) el.classList.remove("show");
        });

        // Toggle current one
        content.classList.toggle("show");
      });
    });

    // Close dropdowns when clicking outside
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".dropdown")) {
        document.querySelectorAll(".dropdown-content").forEach((el) => {
          el.classList.remove("show");
        });
      }
    });

    // Logout handler
    const logoutBtn = document.getElementById("logout");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        try {
          // Try both logout endpoints for compatibility
          await fetch(`${this.API_BASE_URL}/applicant/logout`, {
            method: "POST",
            credentials: "include"
          });
        } catch (err) {
          console.warn("First logout attempt failed, trying alternative endpoint");
          await fetch(`${this.API_BASE_URL}/api/logout`, {
            method: "POST",
            credentials: "include"
          });
        } finally {
          localStorage.clear();
          window.location.href = "../login/login.html";
        }
      });
    }
  }
}

// Initialize the nav profile when the script loads
document.addEventListener("DOMContentLoaded", () => {
  new NavProfile();
});