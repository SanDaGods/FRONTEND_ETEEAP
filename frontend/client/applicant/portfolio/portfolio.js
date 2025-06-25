const API_BASE_URL = "https://backendeteeap-production.up.railway.app";

// Helper functions first
function showNotification(message, type = "info") {
  const existingNotifications = document.querySelectorAll(".notification");
  existingNotifications.forEach((notification) => notification.remove());

  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.opacity = "0";
    setTimeout(() => notification.remove(), 500);
  }, 3000);
}

async function fetchWithTimeout(url, options, timeout = 5000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    if (error.name === "AbortError") {
      throw new Error("Request timed out");
    }
    throw error;
  }
}

async function logoutUser() {
  try {
    const response = await fetch(`${API_BASE_URL}/logout`, {
      method: "POST",
      credentials: "same-origin",
    });

    if (response.ok) {
      sessionStorage.clear();
      localStorage.clear();
      window.location.href = "/frontend/client/applicant/login/login.html";
    } else {
      throw new Error("Logout failed");
    }
  } catch (error) {
    console.error("Logout error:", error);
    showNotification("Failed to logout. Please try again.", "error");
  }
}

function setupEventListeners() {
  const logoutButton = document.querySelector("#logout");
  if (logoutButton) {
    logoutButton.addEventListener("click", function (event) {
      event.preventDefault();
      logoutUser();
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

  document.querySelectorAll(".top-section").forEach((section) => {
    section.addEventListener("click", function () {
      document.querySelectorAll(".dropdown-section").forEach((otherSection) => {
        if (otherSection !== this.closest(".dropdown-section")) {
          otherSection.classList.remove("expanded");
          otherSection.querySelector(".arrow").classList.remove("rotated");
          otherSection.querySelector(".file-table").classList.add("hidden");
          otherSection.querySelector(".upload-btn").classList.add("hidden");
        }
      });

      const parent = this.closest(".dropdown-section");
      parent.classList.toggle("expanded");
      parent.querySelector(".arrow").classList.toggle("rotated");
      parent.querySelector(".file-table").classList.toggle("hidden");
      parent.querySelector(".upload-btn").classList.toggle("hidden");
    });
  });

  document.querySelectorAll(".upload-btn").forEach((button) => {
    button.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      this.closest(".dropdown-section").querySelector(".file-input").click();
    });
  });

  document.querySelectorAll(".file-input").forEach((input) => {
    input.addEventListener("change", function () {
      const parent = this.closest(".dropdown-section");
      const fileTableBody = parent.querySelector(".file-table tbody");
      const fileCountSpan = parent.querySelector(".file-count");

      Array.from(this.files).forEach((file) => {
        const documentId = Math.floor(Math.random() * 10000);
        const row = document.createElement("tr");
        row.innerHTML = `
          <td title="${file.name}">${file.name}</td>
          <td>Uploaded</td>
          <td>${new Date().toLocaleDateString()}</td>
          <td>${documentId}</td>
          <td>
              <button class="view-btn" data-file-url="${URL.createObjectURL(file)}">View</button>
              <button class="delete-btn">Delete</button>
          </td>
        `;
        fileTableBody.appendChild(row);
      });
      fileCountSpan.textContent = fileTableBody.children.length;
      this.value = "";
    });
  });

  document.addEventListener("click", function (event) {
    if (event.target.classList.contains("delete-btn")) {
      const row = event.target.closest("tr");
      const parent = row.closest(".dropdown-section");
      row.remove();
      parent.querySelector(".file-count").textContent =
        parent.querySelector(".file-table tbody").children.length;
    }

    if (event.target.classList.contains("view-btn")) {
      const fileUrl = event.target.getAttribute("data-file-url");
      window.open(fileUrl, "_blank");
    }
  });

  const searchBar = document.querySelector(".search-bar");
  const clearSearchBtn = document.querySelector(".clear-search");

  searchBar.addEventListener("input", function () {
    const searchText = searchBar.value.toLowerCase();
    if (searchText.length > 0) {
      clearSearchBtn.style.display = "block";
    } else {
      clearSearchBtn.style.display = "none";
    }

    document.querySelectorAll(".dropdown-section").forEach((section) => {
      const fileRows = section.querySelectorAll("tbody tr");
      let fileMatch = false;

      fileRows.forEach((row) => {
        const fileName = row.querySelector("td").textContent.toLowerCase();
        if (fileName.includes(searchText)) {
          row.style.display = "table-row";
          fileMatch = true;
        } else {
          row.style.display = "none";
        }
      });

      if (fileMatch) {
        section.classList.add("expanded");
        section.querySelector(".arrow").classList.add("rotated");
        section.querySelector(".file-table").classList.remove("hidden");
        section.querySelector(".upload-btn").classList.remove("hidden");
      } else {
        section.classList.remove("expanded");
        section.querySelector(".arrow").classList.remove("rotated");
        section.querySelector(".file-table").classList.add("hidden");
        section.querySelector(".upload-btn").classList.add("hidden");
      }
    });
  });

  clearSearchBtn.addEventListener("click", function () {
    searchBar.value = "";
    clearSearchBtn.style.display = "none";
    searchBar.dispatchEvent(new Event("input"));
  });
}

async function fetchAndDisplayFiles() {
  try {
    const userId = localStorage.getItem("userId");

    if (!userId) {
      showNotification("User session not found. Please login again.", "error");
      return;
    }

    const response = await fetchWithTimeout(
      `${API_BASE_URL}/api/fetch-user-files/${userId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include"
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `HTTP error! status: ${response.status}`
      );
    }

    const data = await response.json();
    console.log("Files data:", data);

    if (!data.success) {
      throw new Error(data.error || "Failed to fetch files");
    }

    if (!data.files || Object.keys(data.files).length === 0) {
      showNotification("No files found for this user.", "info");
      const sections = {
        "initial-submission": "Initial Submissions",
        resume: "Updated Resume / CV",
        training: "Certificate of Training",
        awards: "Awards",
        interview: "Interview Form",
        others: "Others",
      };

      Object.entries(sections).forEach(([label, sectionTitle]) => {
        const section = findSectionByTitle(sectionTitle);
        if (section) {
          const tbody = section.querySelector("tbody");
          const fileCountSpan = section.querySelector(".file-count");
          tbody.innerHTML = '<tr><td colspan="5">No files uploaded yet</td></tr>';
          fileCountSpan.textContent = "0";
        }
      });
      return;
    }

    function findSectionByTitle(sectionTitle) {
      const sections = document.querySelectorAll(".dropdown-section");
      return Array.from(sections).find((section) => {
        const h4 = section.querySelector("h4");
        return h4 && h4.textContent.trim() === sectionTitle;
      });
    }

    const sections = {
      "initial-submission": "Initial Submissions",
      resume: "Updated Resume / CV",
      training: "Certificate of Training",
      awards: "Awards",
      interview: "Interview Form",
      others: "Others",
    };

    Object.entries(sections).forEach(([label, sectionTitle]) => {
      const files = data.files[label] || [];
      const section = findSectionByTitle(sectionTitle);
      if (section) {
        const tbody = section.querySelector("tbody");
        const fileCountSpan = section.querySelector(".file-count");

        tbody.innerHTML = "";

        files.forEach((file) => {
          const row = document.createElement("tr");
          row.innerHTML = `
            <td title="${file.filename}">${file.filename}</td>
            <td>${file.contentType}</td>
            <td>${new Date(file.uploadDate).toLocaleDateString()}</td>
            <td>${file._id}</td>
            <td>
                <button class="view-btn" data-file-id="${file._id}">View</button>
                <button class="delete-btn" data-file-id="${file._id}">Delete</button>
            </td>
          `;
          tbody.appendChild(row);
        });

        fileCountSpan.textContent = files.length;
      }
    });
  } catch (error) {
    console.error("File Fetching Error Details:", {
      error: error.message,
      stack: error.stack
    });
    showNotification(
      `Failed to load files: ${error.message}`,
      "error"
    );
  }
}

// Main execution
document.addEventListener("DOMContentLoaded", async function () {
  try {
    const authResponse = await fetch(`${API_BASE_URL}/auth-status`, {
      credentials: 'include'
    });
    
    if (!authResponse.ok) {
      throw new Error(`HTTP error! status: ${authResponse.status}`);
    }
    
    const authData = await authResponse.json();
    const userId = localStorage.getItem("userId");

    if (!userId) {
      showNotification("Session expired. Please login again.", "error");
      return;
    }

    if (!authData.authenticated) {
      showNotification("Authentication failed. Please login again.", "error");
      return;
    }

    if (authData.user) {
      console.log("User data from auth:", authData.user);
      setupEventListeners();
      await fetchAndDisplayFiles();
    } else {
      showNotification("No user data found. Please log in again.", "error");
    }
  } catch (error) {
    console.error("Authentication Error:", error);
    showNotification(`Failed to load profile data: ${error.message}`, "error");
  }
});