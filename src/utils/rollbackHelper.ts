import { fileUploadService, DeleteFilesResult } from '../services/fileUploadService'

export interface RollbackAction {
  type: 'delete_files'
  urls: string[]
}

export type RollbackAsyncAction = () => Promise<void>

export class RollbackManager {
  private actions: RollbackAction[] = []
  private asyncActions: RollbackAsyncAction[] = []

  /**
   * Add a rollback action to be executed if something fails
   */
  addFileDeleteAction(urls: string | string[]): void {
    const urlArray = Array.isArray(urls) ? urls : [urls]

    // Validate URLs before adding
    const validUrls = urlArray.filter((url) => {
      if (!url || typeof url !== 'string') {
        console.warn(`Invalid URL in rollback: ${url}`)
        return false
      }
      try {
        new URL(url)
        return true
      } catch {
        console.warn(`Invalid URL format in rollback: ${url}`)
        return false
      }
    })

    if (validUrls.length > 0) {
      this.actions.push({
        type: 'delete_files',
        urls: validUrls
      })
    }
  }

  /**
   * Add a generic async rollback action
   */
  addAsyncAction(action: RollbackAsyncAction): void {
    this.asyncActions.push(action)
  }

  /**
   * Execute all rollback actions
   */
  async executeRollback(): Promise<void> {
    console.log(`Executing ${this.actions.length} rollback actions`)

    for (const action of this.actions) {
      try {
        switch (action.type) {
          case 'delete_files': {
            try {
              const res: DeleteFilesResult = await fileUploadService.deleteFilesByUrls(action.urls)
              if (res && res.success) {
                console.log(`Rollback: Deleted ${action.urls.length} files`)
              } else {
                console.error(`Rollback: Failed to delete files`, res)
              }
            } catch (err: any) {
              console.error(`Rollback: deleteFilesByUrls threw unexpected error:`, err?.message || err)
            }
            break
          }
        }
      } catch (error: any) {
        console.error(`Rollback action failed:`, error.message)
        // Continue with other rollback actions even if one fails
      }
    }

    // Execute async actions (like deleting remote users) after file deletions
    for (const a of this.asyncActions) {
      try {
        await a()
      } catch (err: any) {
        console.error('Rollback async action failed:', err?.message || err)
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
    this.asyncActions = []
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
