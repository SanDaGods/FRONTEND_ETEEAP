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
      console.log("Redirect to login would happen here");
    }
  }

  async loadUserData() {
    try {
      console.log("Attempting to load user data...");
      
      // Try both endpoints for backward compatibility
      let response = await fetch(`${this.API_BASE_URL}/api/auth-status`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        console.log("Trying alternative auth-status endpoint");
        response = await fetch(`${this.API_BASE_URL}/applicant/auth-status`, {
          credentials: 'include'
        });
      }

      if (!response.ok) {
        console.warn("Authentication failed, status:", response.status);
        return;
      }
      
      const authData = await response.json();
      console.log("Auth status response:", authData);

      if (!authData.authenticated) {
        console.warn("User not authenticated");
        return;
      }

      if (authData.user) {
        console.log("User authenticated:", authData.user);
        await this.loadProfilePicture(authData.user);
        this.updateProfileName(authData.user.personalInfo || authData.user);
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  }

  async loadProfilePicture(user) {
    try {
      const navProfilePic = document.getElementById("nav-profile-pic");
      if (!navProfilePic) {
        console.warn("Profile picture element not found");
        return;
      }

      if (user?.profilePicId) {
        console.log("Loading profile picture for user:", this.userId);
        const response = await fetch(`${this.API_BASE_URL}/api/profile-pic/${this.userId}`);
        if (response.ok) {
          const blob = await response.blob();
          navProfilePic.src = URL.createObjectURL(blob);
          console.log("Profile picture loaded successfully");
        } else {
          console.warn("Failed to load profile picture, status:", response.status);
        }
      } else {
        console.log("No profile picture ID, using default");
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
      console.log("Updated profile name:", displayName);
    }
  }

  setupEventListeners() {
    console.log("Setting up event listeners...");
    
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
        console.log("Toggled dropdown visibility");
      });
    });

    // Close dropdowns when clicking outside
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".dropdown")) {
        document.querySelectorAll(".dropdown-content").forEach((el) => {
          el.classList.remove("show");
        });
        console.log("Closed all dropdowns");
      }
    });

    // Logout handler
    const logoutBtn = document.getElementById("logout");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        console.log("Logout initiated");
        try {
          console.log("Attempting logout at primary endpoint");
          await fetch(`${this.API_BASE_URL}/applicant/logout`, {
            method: "POST",
            credentials: "include"
          });
        } catch (err) {
          console.warn("Primary logout failed, trying alternative:", err);
          try {
            await fetch(`${this.API_BASE_URL}/api/logout`, {
              method: "POST",
              credentials: "include"
            });
          } catch (err2) {
            console.error("Both logout attempts failed:", err2);
          }
        } finally {
          localStorage.clear();
          console.log("Local storage cleared. Redirect would happen here.");
          // window.location.href = "../login/login.html"; // Removed for debugging
        }
      });
    }
  }
}

// Initialize the nav profile when the script loads
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM loaded, initializing NavProfile");
  new NavProfile();
});