// src/utils/api.js

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://updated-backend-production-ff82.up.railway.app";

// Request interceptor
const beforeRequest = (config) => {
  // Add auth token if exists
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers = {
      ...config.headers,
      'Authorization': `Bearer ${token}`
    };
  }
  return config;
};

// Response interceptor
const afterResponse = async (response) => {
  if (!response.ok) {
    const error = new Error('API request failed');
    error.status = response.status;
    try {
      error.data = await response.json();
    } catch {
      error.data = await response.text();
    }
    throw error;
  }
  return response.json();
};

// Core fetch wrapper
const apiClient = async (endpoint, options = {}) => {
  try {
    const config = beforeRequest({
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const response = await fetch(url, config);
    
    return await afterResponse(response);
  } catch (error) {
    console.error(`API Error at ${endpoint}:`, error);
    
    // Handle unauthorized errors
    if (error.status === 401) {
      window.location.href = '/login';
    }
    
    throw {
      message: error.message || 'Network error',
      status: error.status || 500,
      data: error.data || null
    };
  }
};

// HTTP method shortcuts
const get = (endpoint, options) => apiClient(endpoint, { ...options, method: 'GET' });
const post = (endpoint, body, options) => apiClient(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) });
const put = (endpoint, body, options) => apiClient(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) });
const del = (endpoint, options) => apiClient(endpoint, { ...options, method: 'DELETE' });
const patch = (endpoint, body, options) => apiClient(endpoint, { ...options, method: 'PATCH', body: JSON.stringify(body) });

export default {
  get,
  post,
  put,
  delete: del,
  patch,
  raw: apiClient // For custom requests
};

/* --------- Usage Examples --------- */

// Example 1: Updating user info with userId (JSON request)
import api from './utils/api';

const updateUserInfo = async (userId, personalInfo) => {
  try {
    const response = await api.post('/update-info', {
      userId, // include userId here
      ...personalInfo
    });
    console.log('Update successful:', response);
  } catch (error) {
    console.error('Error updating info:', error);
  }
};

// Usage:
const userId = '60d5ec49f5d4f916f4d6e8d7'; // your ObjectId as string
const personalInfo = {
  firstname: 'John',
  lastname: 'Doe',
  gender: 'Male',
  age: 30,
  occupation: 'Engineer',
  nationality: 'Country',
  civilstatus: 'Single',
  birthDate: '1993-01-01',
  birthplace: 'City',
  mobileNumber: '1234567890',
  emailAddress: 'john@example.com',
  country: 'Country',
  province: 'Province',
  city: 'City',
  street: '123 Street',
  zipCode: '12345',
  firstPriorityCourse: 'Course Name'
};

// Call the function
updateUserInfo(userId, personalInfo);


// Example 2: Upload files with userId (using raw fetch, since FormData is not handled by your api.js)
const uploadFiles = async (userId, files) => {
  const formData = new FormData();
  formData.append('userId', userId);
  files.forEach((file) => {
    formData.append('files', file);
  });

  try {
    const response = await fetch(`${API_BASE_URL}/file-submit`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
        // Do NOT set 'Content-Type' for FormData; browser sets it with boundary
      },
      body: formData
    });
    const data = await response.json();
    console.log('Files uploaded:', data);
  } catch (error) {
    console.error('File upload error:', error);
  }
};

// Usage example:
const files = [/* File objects from input[type="file"] */];
const userIdForUpload = '60d5ec49f5d4f916f4d6e8d7';
uploadFiles(userIdForUpload, files);
