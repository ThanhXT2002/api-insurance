import { BaseRepository } from '../../bases/repositoryBase'
import prisma from '../../config/prismaClient'

export class PostCategoryRepository extends BaseRepository<'postCategory'> {
  constructor() {
    super('postCategory')
  }

}
