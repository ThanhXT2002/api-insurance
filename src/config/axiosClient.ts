import axios from 'axios'

// Tạo axios instance cho file upload service
export const fileUploadClient = axios.create({
  baseURL: process.env.FILE_UPLOAD_BASE_URL,
  timeout: 30000, // 30 seconds timeout cho upload
  headers: {
    'x-api-key': process.env.IMAGE_UPLOAD_KEY
  }
})

// Interceptor để log request/response (optional)
fileUploadClient.interceptors.request.use(
  (config) => {
    console.log(`Making request to: ${config.baseURL}${config.url}`)
    return config
  },
  (error) => {
    console.error('Request error:', error)
    return Promise.reject(error)
  }
)

fileUploadClient.interceptors.response.use(
  (response) => {
    console.log(`Response from ${response.config.url}:`, response.status)
    return response
  },
  (error) => {
    console.error('Response error:', error.response?.data || error.message)
    return Promise.reject(error)
  }
)

// Tạo general axios instance cho các API khác
export const apiClient = axios.create({
  timeout: 10000, // 10 seconds timeout
  headers: {
    'Content-Type': 'application/json'
  }
})

// Export default cho file upload client
export default fileUploadClient
