import sharp from 'sharp'

export interface ImageProcessingOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number // 1-100
  format?: 'webp' | 'jpeg' | 'png'
  forceConvert?: boolean // Force convert even if already in target format
}

export interface ProcessedImage {
  buffer: Buffer
  originalName: string
  processedName: string
  originalSize: number
  processedSize: number
  format: string
  width: number
  height: number
}

export class ImageProcessingService {
  private static instance: ImageProcessingService

  // Singleton pattern
  public static getInstance(): ImageProcessingService {
    if (!ImageProcessingService.instance) {
      ImageProcessingService.instance = new ImageProcessingService()
    }
    return ImageProcessingService.instance
  }

  /**
   * Process image with resize and format conversion
   */
  async processImage(
    inputBuffer: Buffer,
    originalName: string,
    options: ImageProcessingOptions = {}
  ): Promise<ProcessedImage> {
    const { maxWidth = 1920, maxHeight = 1080, quality = 95, format = 'webp', forceConvert = false } = options

    try {
      // Get original image info
      const originalMetadata = await sharp(inputBuffer).metadata()
      const originalFormat = originalMetadata.format
      const originalSize = inputBuffer.length

      // Check if we need to convert format
      const needsFormatConversion = forceConvert || originalFormat !== format

      // Create Sharp instance
      let pipeline = sharp(inputBuffer)

      // Resize if needed
      if (originalMetadata.width! > maxWidth || originalMetadata.height! > maxHeight) {
        pipeline = pipeline.resize(maxWidth, maxHeight, {
          fit: 'inside', // Maintain aspect ratio
          withoutEnlargement: true // Don't enlarge smaller images
        })
      }

      // Convert format if needed
      if (needsFormatConversion) {
        switch (format) {
          case 'webp':
            pipeline = pipeline.webp({ quality })
            break
          case 'jpeg':
            pipeline = pipeline.jpeg({ quality })
            break
          case 'png':
            pipeline = pipeline.png({
              compressionLevel: Math.round((100 - quality) / 10) // Convert quality to compression level
            })
            break
        }
      }

      // Process the image
      const processedBuffer = await pipeline.toBuffer()
      const processedMetadata = await sharp(processedBuffer).metadata()

      // Generate new filename
      const processedName = this.generateProcessedFilename(originalName, format, needsFormatConversion)

      return {
        buffer: processedBuffer,
        originalName,
        processedName,
        originalSize,
        processedSize: processedBuffer.length,
        format: format,
        width: processedMetadata.width || 0,
        height: processedMetadata.height || 0
      }
    } catch (error: any) {
      throw new Error(`Image processing failed: ${error.message}`)
    }
  }

  /**
   * Process avatar image (specific for avatars)
   */
  async processAvatar(inputBuffer: Buffer, originalName: string): Promise<ProcessedImage> {
    return this.processImage(inputBuffer, originalName, {
      maxWidth: 500, // Avatar size
      maxHeight: 500,
      quality: 95,
      format: 'webp'
    })
  }

  /**
   * Process post image (for blog posts, categories, etc.)
   */
  async processPostImage(inputBuffer: Buffer, originalName: string): Promise<ProcessedImage> {
    return this.processImage(inputBuffer, originalName, {
      maxWidth: 1200,
      maxHeight: 800,
      quality: 95,
      format: 'webp'
    })
  }

  /**
   * Process thumbnail
   */
  async processThumbnail(inputBuffer: Buffer, originalName: string): Promise<ProcessedImage> {
    return this.processImage(inputBuffer, originalName, {
      maxWidth: 300,
      maxHeight: 300,
      quality: 90,
      format: 'webp'
    })
  }

  /**
   * Process document image (higher quality, larger size)
   */
  async processDocumentImage(inputBuffer: Buffer, originalName: string): Promise<ProcessedImage> {
    return this.processImage(inputBuffer, originalName, {
      maxWidth: 1920,
      maxHeight: 1080,
      quality: 95,
      format: 'webp'
    })
  }

  /**
   * Check if file is an image
   */
  isImage(buffer: Buffer): Promise<boolean> {
    return sharp(buffer)
      .metadata()
      .then(() => true)
      .catch(() => false)
  }

  /**
   * Get image metadata
   */
  async getImageInfo(buffer: Buffer) {
    try {
      const metadata = await sharp(buffer).metadata()
      return {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: buffer.length,
        hasAlpha: metadata.hasAlpha,
        channels: metadata.channels
      }
    } catch (error) {
      throw new Error('Invalid image file')
    }
  }

  /**
   * Generate processed filename
   */
  private generateProcessedFilename(originalName: string, targetFormat: string, wasConverted: boolean): string {
    const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '')
    const timestamp = Date.now()

    if (wasConverted) {
      return `${nameWithoutExt}_processed_${timestamp}.${targetFormat}`
    } else {
      return `${nameWithoutExt}_resized_${timestamp}.${targetFormat}`
    }
  }
}

// Export singleton instance
export const imageProcessingService = ImageProcessingService.getInstance()
export default imageProcessingService
