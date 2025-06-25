const API_BASE_URL = "https://backendeteeap-production.up.railway.app";

document.addEventListener("DOMContentLoaded", async function () {
  try {
    // Check authentication status
    const authResponse = await fetch(`${API_BASE_URL}/auth-status`, {
      credentials: 'include' // Important for cookies/sessions
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

    // If authenticated, use the user data from auth response
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

  // ... (keep all other existing functions the same until fetchAndDisplayFiles)

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
      console.log("Files data:", data); // Log the complete response

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
            tbody.innerHTML =
              '<tr><td colspan="5">No files uploaded yet</td></tr>';
            fileCountSpan.textContent = "0";
          }
        });
        return;
      }

      // Update each section with its files
      const sections = {
        "initial-submission": "Initial Submissions",
        resume: "Updated Resume / CV",
        training: "Certificate of Training",
        awards: "Awards",
        interview: "Interview Form",
        others: "Others",
      };

      function findSectionByTitle(sectionTitle) {
        const sections = document.querySelectorAll(".dropdown-section");
        return Array.from(sections).find((section) => {
          const h4 = section.querySelector("h4");
          return h4 && h4.textContent.trim() === sectionTitle;
        });
      }

      Object.entries(sections).forEach(([label, sectionTitle]) => {
        const files = data.files[label] || [];
        const section = findSectionByTitle(sectionTitle);
        if (section) {
          const tbody = section.querySelector("tbody");
          const fileCountSpan = section.querySelector(".file-count");

          // Clear existing rows
          tbody.innerHTML = "";

          // Add files to table
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

          // Update file count
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
});