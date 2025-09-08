// Export all upload related services and utilities
export { fileUploadService, FileUploadService } from './fileUploadService'
export { UploadHelpers } from './uploadHelpers'
export { imageProcessingService, ImageProcessingService } from './imageProcessingService'
export type { UploadedFile, UploadResponse, UploadOptions } from './fileUploadService'
export type { ProcessedImage, ImageProcessingOptions } from './imageProcessingService'

// Export axios clients
export { fileUploadClient, apiClient } from '../config/axiosClient'
