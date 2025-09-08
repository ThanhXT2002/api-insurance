import { fileUploadService } from '../services/fileUploadService'

export interface RollbackAction {
  type: 'delete_files'
  urls: string[]
}

export class RollbackManager {
  private actions: RollbackAction[] = []

  /**
   * Add a rollback action to be executed if something fails
   */
  addFileDeleteAction(urls: string | string[]): void {
    const urlArray = Array.isArray(urls) ? urls : [urls]
    this.actions.push({
      type: 'delete_files',
      urls: urlArray
    })
  }

  /**
   * Execute all rollback actions
   */
  async executeRollback(): Promise<void> {
    console.log(`Executing ${this.actions.length} rollback actions`)

    for (const action of this.actions) {
      try {
        switch (action.type) {
          case 'delete_files':
            await fileUploadService.deleteFilesByUrls(action.urls)
            console.log(`Rollback: Deleted ${action.urls.length} files`)
            break
        }
      } catch (error: any) {
        console.error(`Rollback action failed:`, error.message)
        // Continue with other rollback actions even if one fails
      }
    }

    // Clear actions after rollback
    this.actions = []
  }

  /**
   * Clear all pending rollback actions (call this on success)
   */
  clearActions(): void {
    this.actions = []
  }

  /**
   * Check if there are any pending actions
   */
  hasPendingActions(): boolean {
    return this.actions.length > 0
  }
}

/**
 * Utility function to execute operations with automatic rollback on failure
 */
export async function withRollback<T>(operation: (rollbackManager: RollbackManager) => Promise<T>): Promise<T> {
  const rollbackManager = new RollbackManager()

  try {
    const result = await operation(rollbackManager)
    rollbackManager.clearActions() // Success - no rollback needed
    return result
  } catch (error) {
    // Failure - execute rollback
    await rollbackManager.executeRollback()
    throw error
  }
}
