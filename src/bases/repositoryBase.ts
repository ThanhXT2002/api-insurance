import prisma from '../config/prismaClient'
import { Prisma } from '../../generated/prisma'

type ModelDelegate = {
  findMany: (args?: any) => Promise<any>
  findUnique: (args: any) => Promise<any>
  create: (args: any) => Promise<any>
  update: (args: any) => Promise<any>
  delete: (args: any) => Promise<any>
  deleteMany: (args: any) => Promise<any>
  updateMany: (args: any) => Promise<any>
  upsert: (args: any) => Promise<any>
  count: (args?: any) => Promise<any>
  aggregate: (args: any) => Promise<any>
  groupBy: (args: any) => Promise<any>
}

type PrismaModelKeys = keyof typeof prisma & string

export class BaseRepository<TModel extends PrismaModelKeys> {
  protected model: ModelDelegate

  constructor(model: TModel) {
    this.model = prisma[model] as ModelDelegate
  }

  async findMany(query: object = {}) {
    return this.model.findMany(query)
  }

  async findUnique(query: object) {
    return this.model.findUnique(query)
  }

  async findById<TId extends string | number>(id: TId): Promise<any>
  async findById(args: { where: any; include?: any; select?: any }): Promise<any>
  async findById(idOrArgs: any): Promise<any> {
    // Support two styles:
    // - findById(id)
    // - findById({ where: { id }, include, select })
    if (
      idOrArgs &&
      typeof idOrArgs === 'object' &&
      ('where' in idOrArgs || 'include' in idOrArgs || 'select' in idOrArgs)
    ) {
      return this.model.findUnique(idOrArgs)
    }
    return this.model.findUnique({ where: { id: idOrArgs } })
  }

  async create(data: object) {
    try {
      return await this.model.create({ data })
    } catch (err: any) {
      // Prisma unique constraint
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const e = new Error('Unique constraint violation')
        ;(e as any).code = 'P2002'
        ;(e as any).meta = err.meta
        throw e
      }
      throw err
    }
  }

  async update(where: object, data: object) {
    return this.model.update({ where, data })
  }

  async delete(where: object) {
    return this.model.delete({ where })
  }

  async deleteMany(where: object) {
    return this.model.deleteMany({ where })
  }

  async updateMany(where: object, data: object) {
    return this.model.updateMany({ where, data })
  }

  async upsert(where: object, createData: object, updateData: object) {
    return this.model.upsert({ where, create: createData, update: updateData })
  }

  async count(where: object = {}) {
    return this.model.count({ where })
  }
}
