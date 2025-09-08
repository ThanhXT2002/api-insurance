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
  protected modelName: TModel
  protected logger?: { info?: (...args: any[]) => void; error?: (...args: any[]) => void }

  constructor(model: TModel, logger?: BaseRepository<TModel>['logger']) {
    this.modelName = model
    this.model = prisma[model] as ModelDelegate
    this.logger = logger
  }

  // Public getter for modelName
  get getModelName(): TModel {
    return this.modelName
  }

  // choose delegate from optional client (transaction) or global prisma
  protected delegate(client?: any): ModelDelegate {
    const p = client ?? prisma
    return p[this.modelName] as ModelDelegate
  }

  // run multiple operations in a transaction
  async runTransaction<T>(cb: (tx: typeof prisma) => Promise<T>): Promise<T> {
    this.logger?.info?.('[BaseRepository] start transaction', { model: this.modelName })
    try {
      const res = await prisma.$transaction(cb)
      this.logger?.info?.('[BaseRepository] transaction committed', { model: this.modelName })
      return res
    } catch (err) {
      this.logger?.error?.('[BaseRepository] transaction failed', { model: this.modelName, err })
      throw err
    }
  }

  async findMany(query: object = {}, client?: any) {
    return this.delegate(client).findMany(query)
  }

  async findUnique(query: object, client?: any) {
    return this.delegate(client).findUnique(query)
  }

  async findById<TId extends string | number>(id: TId, client?: any): Promise<any>
  async findById(args: { where: any; include?: any; select?: any }, client?: any): Promise<any>
  async findById(idOrArgs: any, client?: any): Promise<any> {
    // Support two styles:
    // - findById(id)
    // - findById({ where: { id }, include, select }, client?)
    if (
      idOrArgs &&
      typeof idOrArgs === 'object' &&
      ('where' in idOrArgs || 'include' in idOrArgs || 'select' in idOrArgs)
    ) {
      return this.delegate(client).findUnique(idOrArgs)
    }
    return this.delegate(client).findUnique({ where: { id: idOrArgs } })
  }

  async create(data: object, client?: any) {
    try {
      const res = await this.delegate(client).create({ data })
      this.logger?.info?.('[BaseRepository] create', { model: this.modelName, data })
      return res
    } catch (err: any) {
      // Prisma unique constraint
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const e = new Error('Unique constraint violation')
        ;(e as any).code = 'P2002'
        ;(e as any).meta = err.meta
        throw e
      }
      this.logger?.error?.('[BaseRepository] create error', { model: this.modelName, err })
      throw err
    }
  }

  async update(where: object, data: object, client?: any) {
    const res = await this.delegate(client).update({ where, data })
    this.logger?.info?.('[BaseRepository] update', { model: this.modelName, where, data })
    return res
  }

  async delete(where: object, client?: any) {
    const res = await this.delegate(client).delete({ where })
    this.logger?.info?.('[BaseRepository] delete', { model: this.modelName, where })
    return res
  }

  async deleteMany(where: object, client?: any) {
    const res = await this.delegate(client).deleteMany({ where })
    this.logger?.info?.('[BaseRepository] deleteMany', {
      model: this.modelName,
      where,
      count: (res && (res as any).count) || undefined
    })
    return res
  }

  async updateMany(where: object, data: object, client?: any) {
    const res = await this.delegate(client).updateMany({ where, data })
    this.logger?.info?.('[BaseRepository] updateMany', {
      model: this.modelName,
      where,
      data,
      count: (res && (res as any).count) || undefined
    })
    return res
  }

  async upsert(where: object, createData: object, updateData: object, client?: any) {
    return this.delegate(client).upsert({ where, create: createData, update: updateData })
  }

  async count(whereOrArgs: any = {}, client?: any) {
    // Support both styles:
    // - count(whereCondition)
    // - count({ where: whereCondition, select: ... })
    if (whereOrArgs && typeof whereOrArgs === 'object' && 'where' in whereOrArgs) {
      return this.delegate(client).count(whereOrArgs)
    }
    return this.delegate(client).count({ where: whereOrArgs })
  }
}
