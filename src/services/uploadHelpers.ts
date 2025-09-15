import { fileUploadService, UploadedFile, DeleteFilesResult } from './fileUploadService'
import { withRollback, RollbackManager } from '../utils/rollbackHelper'

/**
 * High-level upload helpers cho các use cases phổ biến
 */
export class UploadHelpers {
  /**
   * Upload post images
   */
  static async uploadPostImages(files: Array<{ buffer: Buffer; originalName: string }>): Promise<UploadedFile[]> {
    return fileUploadService.uploadMultipleFiles(files, {
      folderName: 'project-insurance/posts',
      maxFileSize: 8 * 1024 * 1024, // 8MB (before processing)
      allowedTypes: ['image/'],
      processImages: true,
      imageProcessing: {
        maxWidth: 1200,
        maxHeight: 800,
        quality: 95,
        format: 'webp'
      }
    })
  }

  /**
   * Upload user documents
   */
  static async uploadUserDocuments(files: Array<{ buffer: Buffer; originalName: string }>): Promise<UploadedFile[]> {
    return fileUploadService.uploadMultipleFiles(files, {
      folderName: 'project-insurance/user-documents',
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['image/', 'application/pdf', 'application/msword', 'text/'],
      processImages: true,
      imageProcessing: {
        maxWidth: 1920,
        maxHeight: 1080,
        quality: 95,
        format: 'webp'
      }
    })
  }

  /**
   * Upload insurance documents
   */
  static async uploadInsuranceDocuments(
    files: Array<{ buffer: Buffer; originalName: string }>
  ): Promise<UploadedFile[]> {
    return fileUploadService.uploadMultipleFiles(files, {
      folderName: 'project-insurance/insurance-docs',
      maxFileSize: 20 * 1024 * 1024, // 20MB for insurance docs
      allowedTypes: ['image/', 'application/pdf', 'application/msword', 'text/']
    })
  }

  /**
   * Upload category images
   */
  static async uploadCategoryImage(file: Buffer, originalName: string): Promise<UploadedFile> {
    return fileUploadService.uploadSingleFile(file, originalName, {
      folderName: 'project-insurance/categories',
      maxFileSize: 5 * 1024 * 1024, // 5MB (before processing)
      allowedTypes: ['image/'],
      processImages: true,
      imageProcessing: {
        maxWidth: 800,
        maxHeight: 600,
        quality: 95,
        format: 'webp'
      }
    })
  }

  /**
   * Upload general files với custom folder
   */
  static async uploadToFolder(
    files: Array<{ buffer: Buffer; originalName: string }>,
    folderName: string,
    options?: {
      maxFileSize?: number
      allowedTypes?: string[]
    }
  ): Promise<UploadedFile[]> {
    return fileUploadService.uploadMultipleFiles(files, {
      folderName: `project-insurance/${folderName}`,
      maxFileSize: options?.maxFileSize || 10 * 1024 * 1024, // 10MB default
      allowedTypes: options?.allowedTypes || ['image/', 'application/pdf', 'text/']
    })
  }
  /**
   * Update file with old file cleanup - pattern for replacing existing files
   */
  static async updateFileWithCleanup<T>(
    uploadFn: () => Promise<UploadedFile>,
    updateDbFn: (newFileUrl: string) => Promise<T>,
    oldFileUrl?: string
  ): Promise<{ result: T; uploadedFile: UploadedFile }> {
    // 1) upload file mới
    const uploadedFile = await uploadFn()

    try {
      // 2) cập nhật DB với link mới — bắt buộc, không phụ thuộc kết quả xóa file cũ
      const result = await updateDbFn(uploadedFile.url)
      try {
        // Log minimal info to confirm DB persisted the new URL (caller can decide details)
        const maybeAvatar = (result as any)?.avatarUrl ?? (result as any)?.avatar?.url
        console.log('DB update completed for file replacement. newUrl:', uploadedFile.url, 'dbAvatar:', maybeAvatar)
      } catch (logErr) {
        // swallow logging errors
      }

      // 3) cố gắng xóa file cũ nhưng không ném lỗi nếu thất bại
      if (oldFileUrl) {
        try {
          const delRes = await fileUploadService.deleteFileByUrl(oldFileUrl)
          if (delRes && delRes.success) {
            console.log('Old file deleted successfully')
          } else {
            console.warn('Non-fatal: failed to delete old file:', delRes)
          }
        } catch (deleteErr: any) {
          console.warn(
            'Non-fatal: unexpected error when deleting old file:',
            deleteErr?.response?.data || deleteErr?.message
          )
        }
      }

      return { result, uploadedFile }
    } catch (dbErr) {
      // Nếu cập nhật DB thất bại thì rollback: xóa file mới (nỗ lực, nhưng không làm mất nguyên lỗi gốc)
      try {
        const rollbackRes = await fileUploadService.deleteFileByUrl(uploadedFile.url)
        if (rollbackRes && rollbackRes.success) {
          console.log('Rolled back new upload after DB update failure')
        } else {
          console.error('Failed to rollback new upload (delete API returned failure):', rollbackRes)
        }
      } catch (rollbackErr: any) {
        console.error('Failed to rollback new upload (exception):', rollbackErr?.response?.data || rollbackErr?.message)
      }
      throw dbErr
    }
  }

  /**
   * Upload with rollback - for when you need to perform operations after upload
   */
  static async uploadWithTransaction<T>(
    uploadOperation: (rollbackManager: RollbackManager) => Promise<{ uploads: UploadedFile[]; result: T }>
  ): Promise<T> {
    return withRollback(async (rollbackManager) => {
      const { uploads, result } = await uploadOperation(rollbackManager)

      // Add all uploaded file URLs to rollback in case of error
      const urls = uploads.map((upload) => upload.url)
      rollbackManager.addFileDeleteAction(urls)

      return result
    })
  }

  /**
   * Delete files by URLs - convenience method
   */
  static async deleteFiles(urls: string[]): Promise<DeleteFilesResult> {
    return fileUploadService.deleteFilesByUrls(urls)
  }
}

export default UploadHelpers
