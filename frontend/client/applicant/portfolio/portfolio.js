const API_BASE_URL = "https://backendeteeap-production.up.railway.app";
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
];

// File viewer state
let currentFiles = [];
let currentFileIndex = 0;

// Initialize the file viewer modal
function initializeFileViewer() {
  const modal = document.getElementById("fileModal");
  if (!modal) return;

  const closeBtn = modal.querySelector(".close-modal");
  const prevBtn = modal.querySelector(".prev-btn");
  const nextBtn = modal.querySelector(".next-btn");

  function closeModal() {
    modal.style.display = "none";
    document.getElementById("fileViewer").style.display = "none";
    document.getElementById("imageViewer").style.display = "none";
    currentFiles = [];
    currentFileIndex = 0;
  }

  // Event listeners for modal controls
  closeBtn.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => e.target === modal && closeModal());

  // Navigation buttons
  prevBtn.addEventListener("click", () => {
    if (currentFileIndex > 0) showFile(currentFileIndex - 1);
  });

  nextBtn.addEventListener("click", () => {
    if (currentFileIndex < currentFiles.length - 1) showFile(currentFileIndex + 1);
  });

  // Keyboard navigation
  document.addEventListener("keydown", (e) => {
    if (modal.style.display === "block") {
      if (e.key === "Escape") closeModal();
      if (e.key === "ArrowLeft" && currentFileIndex > 0) showFile(currentFileIndex - 1);
      if (e.key === "ArrowRight" && currentFileIndex < currentFiles.length - 1) showFile(currentFileIndex + 1);
    }
  });
}

// Show file in viewer
async function showFile(index) {
  try {
    const file = currentFiles[index];
    currentFileIndex = index;

    const modal = document.getElementById("fileModal");
    const fileViewer = document.getElementById("fileViewer");
    const imageViewer = document.getElementById("imageViewer");
    const currentFileText = document.getElementById("currentFileText");
    const fileName = document.getElementById("fileName");
    const prevBtn = modal.querySelector(".prev-btn");
    const nextBtn = modal.querySelector(".next-btn");

    // Update UI
    currentFileText.textContent = `File ${index + 1} of ${currentFiles.length}`;
    fileName.textContent = file.filename;
    prevBtn.disabled = index === 0;
    nextBtn.disabled = index === currentFiles.length - 1;

    // Show loading state
    fileName.textContent = `Loading ${file.filename}...`;

    // Fetch the file - UPDATED TO USE CORRECT ENDPOINT
    const response = await fetch(`${API_BASE_URL}/api/fetch-documents/${file._id}`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to load file: ${response.status} ${response.statusText}`);
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);

    // Get content type from response headers if not available in file object
    const contentType = response.headers.get('content-type') || file.contentType;

    // Hide both viewers first
    fileViewer.style.display = "none";
    imageViewer.style.display = "none";

    // Show appropriate viewer based on file type
    if (contentType.startsWith("image/")) {
      imageViewer.onload = () => {
        imageViewer.style.display = "block";
        fileName.textContent = file.filename;
      };
      imageViewer.src = url;
    } else {
      fileViewer.onload = () => {
        fileViewer.style.display = "block";
        fileName.textContent = file.filename;
      };
      fileViewer.src = url;
    }

    // Clean up URL when modal closes
    const cleanup = () => {
      URL.revokeObjectURL(url);
      modal.removeEventListener("click", cleanup);
    };
    modal.addEventListener("click", cleanup, { once: true });

  } catch (error) {
    console.error("Error showing file:", error);
    showNotification(`Error: Could not display file (${error.message})`, "error");
    
    // Close modal on error
    const modal = document.getElementById("fileModal");
    if (modal) modal.style.display = "none";
  }
}

// View a specific file
async function viewFile(fileId, sectionFiles) {
  try {
    currentFiles = sectionFiles;
    currentFileIndex = currentFiles.findIndex(file => file._id === fileId);
    
    if (currentFileIndex === -1) {
      throw new Error("File not found in this section");
    }

    const modal = document.getElementById("fileModal");
    modal.style.display = "block";
    
    await showFile(currentFileIndex);
  } catch (error) {
    console.error("Error viewing file:", error);
    showNotification(`Error viewing file: ${error.message}`, "error");
  }
}

// Upload files to server
async function uploadFiles(files, label, section) {
  const uploadBtn = section.querySelector(".upload-btn");
  const originalText = uploadBtn.innerHTML;
  
  try {
    const userId = localStorage.getItem("userId");
    if (!userId) throw new Error("User not logged in");

    const formData = new FormData();
    formData.append("userId", userId);
    formData.append("label", label);
    files.forEach(file => formData.append("files", file));

    // Show loading state
    uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading...';
    uploadBtn.disabled = true;

    const response = await fetch(`${API_BASE_URL}/api/submit-documents`, {
      method: "POST",
      body: formData,
      credentials: 'include'
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Upload failed: ${response.statusText}`);
    }

    const result = await response.json();
    if (!result.success) throw new Error(result.error || "Upload failed");

    showNotification("Files uploaded successfully!", "success");
    await fetchAndDisplayFiles(); // Refresh the file list

  } catch (error) {
    console.error("Upload error:", error);
    showNotification(`Upload failed: ${error.message}`, "error");
  } finally {
    uploadBtn.innerHTML = originalText;
    uploadBtn.disabled = false;
  }
}

// Helper function to map section titles to labels
function getSectionLabel(sectionTitle) {
  const labelMap = {
    "Initial Submissions": "initial-submission",
    "Updated Resume / CV": "resume",
    "Certificate of Training": "training",
    "Awards": "awards",
    "Interview Form": "interview",
    "Others": "others"
  };
  return labelMap[sectionTitle] || "others";
}

// Notification system
function showNotification(message, type = "info") {
  const existingNotifications = document.querySelectorAll(".notification");
  existingNotifications.forEach(notification => notification.remove());

  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.opacity = "0";
    setTimeout(() => notification.remove(), 500);
  }, 3000);
}

// Fetch with timeout
async function fetchWithTimeout(url, options, timeout = 5000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
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

// Logout function
async function logoutUser() {
  try {
    const response = await fetch(`${API_BASE_URL}/logout`, {
      method: "POST",
      credentials: "same-origin"
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

// Setup all event listeners
function setupEventListeners() {
  // Logout button
  const logoutButton = document.querySelector("#logout");
  if (logoutButton) {
    logoutButton.addEventListener("click", (event) => {
      event.preventDefault();
      logoutUser();
    });
  }

  // Dropdown toggles
  document.querySelectorAll(".dropdown-toggle").forEach(toggle => {
    toggle.addEventListener("click", (event) => {
      event.preventDefault();
      const parent = toggle.parentElement;
      parent.classList.toggle("active");
      
      // Close other dropdowns
      document.querySelectorAll(".dropdown").forEach(dropdown => {
        if (dropdown !== parent) dropdown.classList.remove("active");
      });
    });
  });

  // Close dropdowns when clicking outside
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".dropdown")) {
      document.querySelectorAll(".dropdown").forEach(dropdown => {
        dropdown.classList.remove("active");
      });
    }
  });

  // Section expansion
  document.querySelectorAll(".top-section").forEach(section => {
    section.addEventListener("click", function() {
      const parent = this.closest(".dropdown-section");
      
      // Collapse other sections
      document.querySelectorAll(".dropdown-section").forEach(otherSection => {
        if (otherSection !== parent) {
          otherSection.classList.remove("expanded");
          otherSection.querySelector(".arrow").classList.remove("rotated");
          otherSection.querySelector(".file-table").classList.add("hidden");
          otherSection.querySelector(".upload-btn").classList.add("hidden");
        }
      });

      // Toggle current section
      parent.classList.toggle("expanded");
      parent.querySelector(".arrow").classList.toggle("rotated");
      parent.querySelector(".file-table").classList.toggle("hidden");
      parent.querySelector(".upload-btn").classList.toggle("hidden");
    });
  });

  // File upload handling
  document.querySelectorAll(".file-input").forEach(input => {
    input.addEventListener("change", async function(event) {
      event.preventDefault();
      const files = Array.from(this.files);
      const section = this.closest(".dropdown-section");
      const sectionTitle = section.querySelector("h4").textContent.trim();
      const label = getSectionLabel(sectionTitle);

      // Validate files
      const validFiles = files.filter(file => {
        if (file.size > MAX_FILE_SIZE) {
          showNotification(`File "${file.name}" exceeds 25MB limit`, "error");
          return false;
        }
        if (!ALLOWED_TYPES.includes(file.type)) {
          showNotification(
            `File type not supported: ${file.name}. Please upload PDF, JPG, PNG, or DOC/DOCX`,
            "error"
          );
          return false;
        }
        return true;
      });

      if (validFiles.length > 0) {
        await uploadFiles(validFiles, label, section);
      }

      this.value = ""; // Reset input
    });
  });

  // Upload button triggers file input
  document.querySelectorAll(".upload-btn").forEach(button => {
    button.addEventListener("click", function(event) {
      event.preventDefault();
      event.stopPropagation();
      this.closest(".dropdown-section").querySelector(".file-input").click();
    });
  });

  // View and delete buttons
  document.addEventListener("click", async function(event) {
    // View button
    const viewBtn = event.target.closest(".view-btn");
    if (viewBtn) {
      event.preventDefault();
      const fileId = viewBtn.getAttribute("data-file-id");
      const section = viewBtn.closest(".dropdown-section");
      
      // Get all files in this section
      const sectionFiles = Array.from(section.querySelectorAll("tbody tr")).map(row => ({
        _id: row.querySelector(".view-btn").getAttribute("data-file-id"),
        filename: row.querySelector("td:first-child").textContent,
        contentType: row.querySelector("td:nth-child(2)").textContent
      }));

      await viewFile(fileId, sectionFiles);
    }

    // Delete button
    if (event.target.classList.contains("delete-btn")) {
      const row = event.target.closest("tr");
      const fileId = event.target.getAttribute("data-file-id");
      const parent = row.closest(".dropdown-section");
      
      try {
        const response = await fetch(`${API_BASE_URL}/api/delete-file/${fileId}`, {
          method: "DELETE",
          credentials: 'include'
        });
        
        if (!response.ok) throw new Error("Failed to delete file");
        
        row.remove();
        parent.querySelector(".file-count").textContent =
          parent.querySelector(".file-table tbody").children.length;
          
        showNotification("File deleted successfully", "success");
      } catch (error) {
        console.error("Delete error:", error);
        showNotification("Failed to delete file", "error");
      }
    }
  });

  // Search functionality
  const searchBar = document.querySelector(".search-bar");
  const clearSearchBtn = document.querySelector(".clear-search");

  searchBar.addEventListener("input", function() {
    const searchText = this.value.toLowerCase();
    clearSearchBtn.style.display = searchText.length > 0 ? "block" : "none";

    document.querySelectorAll(".dropdown-section").forEach(section => {
      const fileRows = section.querySelectorAll("tbody tr");
      let fileMatch = false;

      fileRows.forEach(row => {
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

  clearSearchBtn.addEventListener("click", function() {
    searchBar.value = "";
    this.style.display = "none";
    searchBar.dispatchEvent(new Event("input"));
  });
}

// Fetch and display user files
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
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) throw new Error(data.error || "Failed to fetch files");

    // Define sections mapping
    const sections = {
      "initial-submission": "Initial Submissions",
      "resume": "Updated Resume / CV",
      "training": "Certificate of Training",
      "awards": "Awards",
      "interview": "Interview Form",
      "others": "Others"
    };

    // Helper function to find section by title
    function findSectionByTitle(title) {
      const allSections = document.querySelectorAll(".dropdown-section");
      return Array.from(allSections).find(section => {
        const h4 = section.querySelector("h4");
        return h4 && h4.textContent.trim() === title;
      });
    }

    // Update each section
    Object.entries(sections).forEach(([label, title]) => {
      const section = findSectionByTitle(title);
      if (section) {
        const files = data.files?.[label] || [];
        const tbody = section.querySelector("tbody");
        const fileCountSpan = section.querySelector(".file-count");

        // Clear existing rows
        tbody.innerHTML = files.length ? "" : '<tr><td colspan="5">No files uploaded yet</td></tr>';

        // Add files to table
        files.forEach(file => {
          const row = document.createElement("tr");
          row.innerHTML = `
            <td title="${file.filename}">${file.filename}</td>
            <td>${file.contentType}</td>
            <td>${new Date(file.uploadDate).toLocaleDateString()}</td>
            <td>${file._id}</td>
            <td>
              <button class="view-btn" data-file-id="${file._id}">
                <i class="fas fa-eye"></i> View
              </button>
              <button class="delete-btn" data-file-id="${file._id}">
                <i class="fas fa-trash"></i> Delete
              </button>
            </td>
          `;
          tbody.appendChild(row);
        });

        // Update file count
        fileCountSpan.textContent = files.length;
      }
    });

  } catch (error) {
    console.error("Error fetching files:", {
      error: error.message,
      stack: error.stack
    });
    showNotification(`Failed to load files: ${error.message}`, "error");
  }
}

// Main initialization when DOM loads
document.addEventListener("DOMContentLoaded", async function() {
  loadProfilePicture();
  // Initialize file viewer
  initializeFileViewer();

  try {
    // Check authentication status
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

async function loadProfilePicture() {
  try {
    const response = await fetch(`${API_BASE_URL}/auth-status`, {
      credentials: 'include'
    });
    const authData = await response.json();

    if (authData.authenticated && authData.user) {
      // Update profile name in navigation
      const navProfileName = document.getElementById("nav-profile-name");
      if (navProfileName) {
        const nameParts = [
          authData.user.personalInfo?.firstname || '',
          authData.user.personalInfo?.lastname || ''
        ];
        const displayName = nameParts.filter(part => part.trim()).join(' ');
        navProfileName.innerText = displayName || "Applicant";
      }

      // Load profile picture
      const userId = authData.user._id; // or whatever your user ID field is
      const picResponse = await fetch(`${API_BASE_URL}/api/profile-pic/${userId}`, {
        credentials: 'include'
      });
      
      if (picResponse.ok) {
        const blob = await picResponse.blob();
        const imageUrl = URL.createObjectURL(blob);
        const navProfilePic = document.getElementById("nav-profile-pic");
        if (navProfilePic) {
          navProfilePic.src = imageUrl;
        }
      }
    }
  } catch (error) {
    console.error("Error loading profile picture:", error);
  }
}