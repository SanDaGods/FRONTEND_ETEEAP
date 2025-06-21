class NavProfile {
  constructor() {
    this.userId = localStorage.getItem("userId");
    this.init();
  }

  async init() {
    try {
      await this.loadUserData();
      this.setupEventListeners(); // <-- this sets up dropdown toggles
    } catch (error) {
      console.error("Navigation profile initialization error:", error);
    }
  }

  async loadUserData() {
    const authResponse = await fetch("/applicant/auth-status");
    const authData = await authResponse.json();

    if (!authData.authenticated) {
      window.location.href = "../login/login.html";
      return;
    }

    if (authData.user) {
      await this.loadProfilePicture();
      this.updateProfileName(authData.user.personalInfo || authData.user);
    }
  }

  async loadProfilePicture() {
    try {
      const response = await fetch(`/api/profile-pic/${this.userId}`);
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
        localStorage.clear();
        try {
          await fetch("/applicant/logout", { method: "POST", credentials: "include" });
        } catch (err) {
          console.warn("Logout failed or no session:", err);
        }
        window.location.href = "../login/login.html";
      });
    }
  }
}

// Initialize the nav profile when the script loads
document.addEventListener("DOMContentLoaded", () => {
  new NavProfile();
});
