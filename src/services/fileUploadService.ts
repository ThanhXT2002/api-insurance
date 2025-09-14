import FormData from 'form-data'
import { fileUploadClient } from '../config/axiosClient'
import { imageProcessingService, ProcessedImage } from './imageProcessingService'

// Types cho file upload
export interface UploadedFile {
  id: string
  originalName: string
  url: string
  size: number
  fileType: string
  folderName: string
}

export interface UploadResponse {
  status: boolean
  code: number
  data: {
    success: UploadedFile[]
    failed: any[]
  }
  message: string
  timestamp: string
}

export interface UploadOptions {
  folderName?: string
  maxFileSize?: number
  allowedTypes?: string[]
  processImages?: boolean // Có xử lý ảnh hay không
  imageProcessing?: {
    maxWidth?: number
    maxHeight?: number
    quality?: number
    format?: 'webp' | 'jpeg' | 'png'
  }
}

export class FileUploadService {
  private static instance: FileUploadService

  // Singleton pattern
  public static getInstance(): FileUploadService {
    if (!FileUploadService.instance) {
      FileUploadService.instance = new FileUploadService()
    }
    return FileUploadService.instance
  }

  /**
   * Upload single file
   */
  async uploadSingleFile(file: Buffer, originalName: string, options: UploadOptions = {}): Promise<UploadedFile> {
    const {
      folderName = '',
      maxFileSize = 5 * 1024 * 1024, // 5MB default
      allowedTypes = ['image/'],
      processImages = true,
      imageProcessing = {}
    } = options

    let fileToUpload = file
    let nameToUpload = originalName

    // Process image if enabled and file is an image
    if (processImages && (await this.isImageFile(file))) {
      try {
        const processed = await this.processImageFile(file, originalName, imageProcessing)
        fileToUpload = processed.buffer
        nameToUpload = processed.processedName

        console.log(`Image processed: ${originalName} -> ${nameToUpload}`)
        console.log(`Size: ${processed.originalSize} -> ${processed.processedSize} bytes`)
      } catch (error: any) {
        console.warn(`Image processing failed for ${originalName}: ${error.message}`)
        // Continue with original file if processing fails
      }
    }

    // Validate file size (after processing)
    if (fileToUpload.length > maxFileSize) {
      throw new Error(`File size exceeds limit of ${maxFileSize} bytes`)
    }

    // Create FormData
    const formData = new FormData()
    formData.append('files', fileToUpload, {
      filename: nameToUpload,
      contentType: this.getContentType(nameToUpload, allowedTypes)
    })

    if (folderName) {
      formData.append('folderName', folderName)
    }

    try {
      const response = await fileUploadClient.post<UploadResponse>('/upload', formData, {
        headers: {
          ...formData.getHeaders()
        }
      })

      // Validate response
      if (!response.data?.status || !response.data?.data?.success?.length) {
        throw new Error('File upload failed: No successful uploads')
      }

      // Return first successful upload
      return response.data.data.success[0]
    } catch (error: any) {
      if (error.response?.data) {
        throw new Error(`Upload failed: ${error.response.data.message || 'Unknown error'}`)
      }
      throw error
    }
  }

  /**
   * Upload multiple files
   */
  async uploadMultipleFiles(
    files: Array<{ buffer: Buffer; originalName: string }>,
    options: UploadOptions = {}
  ): Promise<UploadedFile[]> {
    const {
      folderName = '',
      maxFileSize = 5 * 1024 * 1024, // 5MB default
      allowedTypes = ['image/'],
      processImages = true,
      imageProcessing = {}
    } = options

    // Create FormData
    const formData = new FormData()

    // Process each file
    for (const { buffer, originalName } of files) {
      let fileToUpload = buffer
      let nameToUpload = originalName

      // Process image if enabled and file is an image
      if (processImages && (await this.isImageFile(buffer))) {
        try {
          const processed = await this.processImageFile(buffer, originalName, imageProcessing)
          fileToUpload = processed.buffer
          nameToUpload = processed.processedName

          console.log(`Image processed: ${originalName} -> ${nameToUpload}`)
          console.log(`Size: ${processed.originalSize} -> ${processed.processedSize} bytes`)
        } catch (error: any) {
          console.warn(`Image processing failed for ${originalName}: ${error.message}`)
          // Continue with original file if processing fails
        }
      }

      // Validate file size (after processing)
      if (fileToUpload.length > maxFileSize) {
        throw new Error(`File ${originalName} exceeds size limit of ${maxFileSize} bytes`)
      }

      formData.append('files', fileToUpload, {
        filename: nameToUpload,
        contentType: this.getContentType(nameToUpload, allowedTypes)
      })
    }

    if (folderName) {
      formData.append('folderName', folderName)
    }

    try {
      const response = await fileUploadClient.post<UploadResponse>('/upload', formData, {
        headers: {
          ...formData.getHeaders()
        }
      })

      // Validate response
      if (!response.data?.status) {
        throw new Error('File upload failed')
      }

      return response.data.data.success
    } catch (error: any) {
      if (error.response?.data) {
        throw new Error(`Upload failed: ${error.response.data.message || 'Unknown error'}`)
      }
      throw error
    }
  }

  /**
   * Upload avatar specifically
   */
  async uploadAvatar(file: Buffer, originalName: string): Promise<UploadedFile> {
    return this.uploadSingleFile(file, originalName, {
      folderName: 'project-insurance/avatarUrl',
      maxFileSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: ['image/'], // Only images
      processImages: true,
      imageProcessing: {
        maxWidth: 500,
        maxHeight: 500,
        quality: 95,
        format: 'webp'
      }
    })
  }

  /**
   * Upload image for SEO (Open Graph / social preview)
   * Uses a dedicated folder and a larger aspect size for OG images
   */
  async uploadSeoImage(file: Buffer, originalName: string): Promise<UploadedFile> {
    return this.uploadSingleFile(file, originalName, {
      folderName: 'project-insurance/seo',
      maxFileSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: ['image/'],
      processImages: true,
      imageProcessing: {
        // Open Graph recommended 1200x630 — keep aspect and limit
        maxWidth: 1200,
        maxHeight: 630,
        quality: 90,
        format: 'webp'
      }
    })
  }

  /**
   * Upload document/file
   */
  async uploadDocument(file: Buffer, originalName: string, folder?: string): Promise<UploadedFile> {
    return this.uploadSingleFile(file, originalName, {
      folderName: folder || 'project-insurance/documents',
      maxFileSize: 10 * 1024 * 1024, // 10MB for documents
      allowedTypes: ['image/', 'application/pdf', 'application/msword', 'text/'],
      processImages: false // Don't process document images
    })
  }

  /**
   * Helper method to determine content type
   */
  private getContentType(filename: string, allowedTypes: string[]): string {
    const extension = filename.split('.').pop()?.toLowerCase()

    const mimeMap: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      txt: 'text/plain'
    }

    const mimeType = mimeMap[extension || ''] || 'application/octet-stream'

    // Check if mime type is allowed
    const isAllowed = allowedTypes.some((type) => mimeType.startsWith(type))
    if (!isAllowed) {
      throw new Error(`File type ${mimeType} is not allowed`)
    }

    return mimeType
  }

  /**
   * Delete files by URLs - for rollback purposes
   */
  async deleteFilesByUrls(urls: string[]): Promise<void> {
    if (!urls || urls.length === 0) {
      return
    }

    try {
      console.log(`Attempting to delete ${urls.length} files for rollback`)

      const response = await fileUploadClient.request({
        method: 'DELETE',
        url: '/bulk-by-urls',
        headers: {
          'Content-Type': 'application/json'
        },
        data: { urls }
      })

      console.log(`Rollback delete response:`, response.status)
    } catch (error: any) {
      console.error(`Rollback delete failed:`, error.response?.data || error.message)
      // Don't throw error here as this is cleanup operation
    }
  }

  /**
   * Delete single file by URL - convenience method
   */
  async deleteFileByUrl(url: string): Promise<void> {
    return this.deleteFilesByUrls([url])
  }

  /**
   * Check if file is an image
   */
  private async isImageFile(buffer: Buffer): Promise<boolean> {
    return imageProcessingService.isImage(buffer)
  }

  /**
   * Process image file
   */
  private async processImageFile(
    buffer: Buffer,
    originalName: string,
    options: { maxWidth?: number; maxHeight?: number; quality?: number; format?: 'webp' | 'jpeg' | 'png' }
  ): Promise<ProcessedImage> {
    return imageProcessingService.processImage(buffer, originalName, options)
  }
}

// Export singleton instance
export const fileUploadService = FileUploadService.getInstance()
export default fileUploadService
