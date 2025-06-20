document.addEventListener("DOMContentLoaded", () => {
  const API_BASE_URL = "https://updated-backend-production-ff82.up.railway.app"; 

  const fileInput = document.getElementById("file-upload");
  const dropArea = document.querySelector(".upload");
  const fileList = document.getElementById("file-list");
  const submitBtn = document.getElementById("submit-btn");
  let uploadedFiles = new Map();

  const userId = localStorage.getItem("userId");
  if (!userId) {
    showAlert("Session expired. Please login again.", "error");
    setTimeout(() => {
      window.location.href = "/frontend/client/applicant/login/login.html";
    }, 2000);
    return;
  }

  const MAX_FILE_SIZE = 25 * 1024 * 1024;

  const ALLOWED_TYPES = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  function handleFiles(files) {
    if (files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (file.size > MAX_FILE_SIZE) {
        showAlert(`File "${file.name}" exceeds the 25MB limit.`, "error");
        return;
      }

      if (!ALLOWED_TYPES.includes(file.type)) {
        showAlert(`File "${file.name}" has an unsupported format.`, "error");
        return;
      }

      if (uploadedFiles.has(file.name)) {
        showAlert(`File "${file.name}" is already uploaded.`, "warning");
        return;
      }

      const fileId = Date.now() + "-" + Math.random().toString(36).substr(2, 9);

      uploadedFiles.set(file.name, {
        id: fileId,
        file: file,
        type: file.type,
        size: file.size,
        uploadDate: new Date(),
        label: "initial-submission",
        owner: userId,
      });

      const fileItem = document.createElement("div");
      fileItem.classList.add("file-item");
      fileItem.dataset.fileId = fileId;

      const fileInfo = document.createElement("div");
      fileInfo.classList.add("file-info");

      const fileName = document.createElement("p");
      fileName.classList.add("file-name");
      fileName.textContent = file.name;

      const fileSize = document.createElement("span");
      fileSize.classList.add("file-size");
      fileSize.textContent = formatFileSize(file.size);

      const removeButton = document.createElement("button");
      removeButton.textContent = "×";
      removeButton.classList.add("remove-btn");
      removeButton.title = "Remove file";

      removeButton.onclick = function () {
        fileItem.remove();
        uploadedFiles.delete(file.name);
        updateFileCount();
      };

      if (file.type.startsWith("image/")) {
        const filePreview = document.createElement("div");
        filePreview.classList.add("file-preview-container");

        const imgPreview = document.createElement("img");
        imgPreview.classList.add("file-preview");
        imgPreview.src = URL.createObjectURL(file);

        filePreview.appendChild(imgPreview);
        fileItem.appendChild(filePreview);
      }

      fileInfo.appendChild(fileName);
      fileInfo.appendChild(fileSize);
      fileItem.appendChild(fileInfo);
      fileItem.appendChild(removeButton);
      fileList.appendChild(fileItem);

      updateFileCount();
    });
  }

  function formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  function updateFileCount() {
    const counter = document.getElementById("file-count");
    if (counter) {
      counter.textContent = `${uploadedFiles.size} file(s) selected`;
    }
  }

  function showAlert(message, type = "info") {
    const existingAlerts = document.querySelectorAll(".alert");
    existingAlerts.forEach((alert) => alert.remove());

    const alertBox = document.createElement("div");
    alertBox.className = `alert ${type}`;
    alertBox.textContent = message;

    document.body.appendChild(alertBox);

    setTimeout(() => {
      alertBox.classList.add("fade-out");
      setTimeout(() => alertBox.remove(), 500);
    }, 3000);
  }

  fileInput.addEventListener("change", function () {
    handleFiles(this.files);
    this.value = "";
  });

  ["dragenter", "dragover"].forEach((event) => {
    dropArea.addEventListener(event, (e) => {
      e.preventDefault();
      dropArea.classList.add("drag-active");
    });
  });

  ["dragleave", "drop"].forEach((event) => {
    dropArea.addEventListener(event, (e) => {
      e.preventDefault();
      dropArea.classList.remove("drag-active");
    });
  });

  dropArea.addEventListener("drop", (e) => {
    handleFiles(e.dataTransfer.files);
  });

  dropArea.addEventListener("click", (e) => {
    if (e.target === dropArea) {
      fileInput.click();
    }
  });

  submitBtn.addEventListener("click", async () => {
    if (uploadedFiles.size === 0) {
      showAlert("Please upload at least one document", "error");
      return;
    }

    try {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span class="spinner"></span> Submitting...';

      const formData = new FormData();
      formData.append("userId", userId);

      Array.from(uploadedFiles.values()).forEach((fileData) => {
        formData.append("files", fileData.file);
      });

      const response = await fetch(`${API_BASE_URL}/api/submit-documents`, {
        method: "POST",
        body: formData,
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        throw new Error("Invalid JSON response: " + text.slice(0, 100));
      }

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit documents");
      }

      showAlert("Documents submitted successfully!", "success");
      setTimeout(() => {
        window.location.href = "../login/login.html";
      }, 1500);
    } catch (error) {
      console.error("Submission error:", error);
      showAlert(`Error: ${error.message}`, "error");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit Documents";
    }
  });
});

// CSS (can be moved to stylesheet)
const dynamicStyles = `
  .alert {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 25px;
    border-radius: 5px;
    color: white;
    z-index: 1000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    transform: translateX(0);
    transition: all 0.3s ease;
  }
  .alert.info { background-color: #2196F3; }
  .alert.success { background-color: #4CAF50; }
  .alert.warning { background-color: #FF9800; }
  .alert.error { background-color: #F44336; }
  .alert.fade-out {
    transform: translateX(100%);
    opacity: 0;
  }
  .file-item {
    display: flex;
    align-items: center;
    padding: 8px 12px;
    margin: 5px 0;
    background: #f5f5f5;
    border-radius: 4px;
    gap: 10px;
  }
  .file-info {
    flex: 1;
    min-width: 0;
  }
  .file-name {
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .file-size {
    font-size: 0.8em;
    color: #666;
  }
  .file-preview-container {
    width: 40px;
    height: 40px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #fff;
    border-radius: 3px;
    overflow: hidden;
  }
  .file-preview {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
  .remove-btn {
    background: #ff4444;
    color: white;
    border: none;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .drag-active {
    border-color: #532989 !important;
    background-color: #f0e6ff !important;
  }
  .spinner {
    display: inline-block;
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255,255,255,0.3);
    border-radius: 50%;
    border-top-color: white;
    animation: spin 1s ease-in-out infinite;
    margin-right: 8px;
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
const styleElement = document.createElement("style");
styleElement.textContent = dynamicStyles;
document.head.appendChild(styleElement);
