import { API_BASE_URL } from './config.js';

class NavProfile {
  constructor() {
    this.userId = localStorage.getItem("userId");
    this.init();
  }

  async init() {
    try {
      await this.loadUserData();
      this.setupEventListeners();
    } catch (error) {
      console.error("Navigation profile initialization error:", error);
    }
  }

  async loadUserData() {
    try {
      const authResponse = await fetch(`${API_BASE_URL}/auth-status`, {
        credentials: "include"
      });
      
      if (!authResponse.ok) throw new Error("Auth check failed");
      
      const authData = await authResponse.json();

      if (!authData.authenticated) {
        console.warn("User not authenticated.");
        return;
      }

      if (authData.user) {
        await this.loadProfilePicture();
        this.updateProfileName(authData.user.personalInfo || authData.user);
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  }

  async loadProfilePicture() {
    try {
      const response = await fetch(`${API_BASE_URL}/profile-pic/${this.userId}`, {
        credentials: "include"
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const imageUrl = URL.createObjectURL(blob);
        const navProfilePic = document.getElementById("nav-profile-pic");
        if (navProfilePic) {
          navProfilePic.src = imageUrl;
        }
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
        .filter(part => part && part.trim())
        .join(" ");
      navProfileName.textContent = displayName || "Applicant";
    }
  }

  setupEventListeners() {
    // Get logout button reference safely
    const logoutBtn = document.getElementById("logoutBtn");
    
    if (logoutBtn) {
      logoutBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        try {
          const response = await fetch(`${API_BASE_URL}/logout`, {
            method: "POST",
            credentials: "include"
          });
          
          if (response.ok) {
            localStorage.clear();
            window.location.href = "../login/login.html";
          }
        } catch (err) {
          console.error("Logout failed:", err);
        }
      });
    }

    // Dropdown toggle functionality
    const dropdownToggles = document.querySelectorAll(".dropdown-toggle");
    dropdownToggles.forEach(toggle => {
      toggle.addEventListener("click", (e) => {
        e.preventDefault();
        const dropdown = toggle.closest(".dropdown");
        if (!dropdown) return;

        const content = dropdown.querySelector(".dropdown-content");
        if (!content) return;

        // Close other dropdowns
        document.querySelectorAll(".dropdown-content").forEach(el => {
          if (el !== content) el.classList.remove("show");
        });

        // Toggle current dropdown
        content.classList.toggle("show");
      });
    });

    // Close dropdowns when clicking outside
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".dropdown")) {
        document.querySelectorAll(".dropdown-content").forEach(el => {
          el.classList.remove("show");
        });
      }
    });
  }
}

// Initialize only after DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
  new NavProfile();
});