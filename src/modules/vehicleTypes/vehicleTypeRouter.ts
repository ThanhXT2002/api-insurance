import { Router } from 'express'
import { VehicleTypeController } from './vehicleTypeController'
import { VehicleTypeService } from './vehicleTypeService'
import { VehicleTypeRepository } from './vehicleTypeRepository'
import { authenticate, requirePermissions } from '../../middlewares/authMiddleware'

const repository = new VehicleTypeRepository()
const service = new VehicleTypeService(repository)
const controller = new VehicleTypeController(service)

const router = Router()

// Public endpoints - Không cần authentication
/**
 * @openapi
 * /api/vehicle-types:
 *   get:
 *     tags:
 *       - Vehicle Types
 *     summary: Lấy danh sách loại phương tiện
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *         description: Số trang (mặc định 1)
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *         description: Số mục trên trang (mặc định 20)
 *       - in: query
 *         name: keyword
 *         schema: { type: string }
 *         description: Từ khóa tìm kiếm theo mã và tên loại phương tiện
 *       - in: query
 *         name: active
 *         schema: { type: boolean }
 *         description: Lọc theo trạng thái hoạt động
 *       - in: query
 *         name: usageType
 *         schema:
 *           type: string
 *           enum: [OTOKKDVT, OTOKDVT, XEMAY, VCXOTO]
 *         description: Lọc theo loại sử dụng phương tiện
 *       - in: query
 *         name: usagePurpose
 *         schema:
 *           type: string
 *           enum: [XCN, XCH, XCN_CH]
 *         description: Lọc theo mục đích sử dụng
 *     responses:
 *       200:
 *         description: Danh sách loại phương tiện
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     rows:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/VehicleType'
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 */
router.get('/', controller.getAll.bind(controller))

/**
 * @openapi
 * /api/vehicle-types/code/{code}:
 *   get:
 *     tags:
 *       - Vehicle Types
 *     summary: Lấy loại phương tiện theo mã code
 *     parameters:
 *       - in: path
 *         name: code
 *         required: true
 *         schema: { type: string }
 *         description: Mã loại phương tiện
 *     responses:
 *       200:
 *         description: Thông tin loại phương tiện
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VehicleType'
 *       404:
 *         description: Không tìm thấy loại phương tiện
 */
router.get('/code/:code', controller.getByCode.bind(controller))

/**
 * @openapi
 * /api/vehicle-types/usage-type/{usageType}:
 *   get:
 *     tags:
 *       - Vehicle Types
 *     summary: Lấy danh sách loại phương tiện theo loại sử dụng (chỉ active)
 *     description: Lấy danh sách các loại phương tiện đang hoạt động theo loại sử dụng
 *     parameters:
 *       - in: path
 *         name: usageType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [OTOKKDVT, OTOKDVT, XEMAY, VCXOTO]
 *         description: Loại sử dụng phương tiện
 *     responses:
 *       200:
 *         description: Danh sách loại phương tiện theo loại sử dụng (chỉ active = true)
 */
router.get('/usage-type/:usageType', controller.getByUsageType.bind(controller))

/**
 * @openapi
 * /api/vehicle-types/usage-purpose/{usagePurpose}:
 *   get:
 *     tags:
 *       - Vehicle Types
 *     summary: Lấy danh sách loại phương tiện theo mục đích sử dụng (chỉ active)
 *     description: Lấy danh sách các loại phương tiện đang hoạt động theo mục đích sử dụng
 *     parameters:
 *       - in: path
 *         name: usagePurpose
 *         required: true
 *         schema:
 *           type: string
 *           enum: [XCN, XCH, XCN_CH]
 *         description: Mục đích sử dụng
 *     responses:
 *       200:
 *         description: Danh sách loại phương tiện theo mục đích sử dụng (chỉ active = true)
 */
router.get('/usage-purpose/:usagePurpose', controller.getByUsagePurpose.bind(controller))

/**
 * @openapi
 * /api/vehicle-types/statistics:
 *   get:
 *     tags:
 *       - Vehicle Types
 *     summary: Lấy thống kê loại phương tiện
 *     description: Thống kê số lượng loại phương tiện theo từng loại sử dụng, mục đích và trạng thái
 *     responses:
 *       200:
 *         description: Thống kê loại phương tiện
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   usageType:
 *                     type: string
 *                     enum: [OTOKKDVT, OTOKDVT, XEMAY, VCXOTO]
 *                   usagePurpose:
 *                     type: string
 *                     enum: [XCN, XCH, XCN_CH]
 *                   active:
 *                     type: boolean
 *                   _count:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 */
router.get('/statistics', controller.getStatistics.bind(controller))

/**
 * @openapi
 * /api/vehicle-types/{id}:
 *   get:
 *     tags:
 *       - Vehicle Types
 *     summary: Lấy loại phương tiện theo ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: ID của loại phương tiện
 *     responses:
 *       200:
 *         description: Thông tin loại phương tiện
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VehicleType'
 *       404:
 *         description: Không tìm thấy loại phương tiện
 */
router.get('/:id', controller.getById.bind(controller))

// Protected endpoints - Cần authentication và phân quyền
/**
 * @openapi
 * /api/vehicle-types:
 *   post:
 *     tags:
 *       - Vehicle Types
 *     summary: Tạo mới loại phương tiện
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VehicleTypeInput'
 *     responses:
 *       201:
 *         description: Tạo loại phương tiện thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/VehicleType'
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Không có quyền truy cập
 */
router.post('/', authenticate, requirePermissions('vehicle_type.create'), controller.create.bind(controller))

/**
 * @openapi
 * /api/vehicle-types/{id}:
 *   put:
 *     tags:
 *       - Vehicle Types
 *     summary: Cập nhật loại phương tiện
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: ID của loại phương tiện
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/VehicleTypeInput'
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       404:
 *         description: Không tìm thấy loại phương tiện
 *       401:
 *         description: Không có quyền truy cập
 */
router.put('/:id', authenticate, requirePermissions('vehicle_type.update'), controller.update.bind(controller))

/**
 * @openapi
 * /api/vehicle-types/{id}/soft-delete:
 *   patch:
 *     tags:
 *       - Vehicle Types
 *     summary: Vô hiệu hóa loại phương tiện (soft delete)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: ID của loại phương tiện
 *     responses:
 *       200:
 *         description: Vô hiệu hóa thành công
 *       404:
 *         description: Không tìm thấy loại phương tiện
 *       401:
 *         description: Không có quyền truy cập
 */
router.patch(
  '/:id/soft-delete',
  authenticate,
  requirePermissions('vehicle_type.delete'),
  controller.softDelete.bind(controller)
)

/**
 * @openapi
 * /api/vehicle-types/{id}:
 *   delete:
 *     tags:
 *       - Vehicle Types
 *     summary: Xóa vĩnh viễn loại phương tiện (hard delete)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: ID của loại phương tiện
 *     responses:
 *       200:
 *         description: Xóa thành công
 *       404:
 *         description: Không tìm thấy loại phương tiện
 *       401:
 *         description: Không có quyền truy cập
 */
router.delete('/:id', authenticate, requirePermissions('vehicle_type.delete'), controller.hardDelete.bind(controller))

/**
 * @openapi
 * /api/vehicle-types/toggle-multiple:
 *   patch:
 *     tags:
 *       - Vehicle Types
 *     summary: Kích hoạt/vô hiệu hóa nhiều loại phương tiện
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Danh sách ID loại phương tiện
 *               active:
 *                 type: boolean
 *                 description: Trạng thái mới (true = kích hoạt, false = vô hiệu hóa)
 *             required:
 *               - ids
 *               - active
 *     responses:
 *       200:
 *         description: Cập nhật trạng thái thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Không có quyền truy cập
 */
router.patch(
  '/toggle-multiple',
  authenticate,
  requirePermissions('vehicle_type.update'),
  controller.toggleMultiple.bind(controller)
)

/**
 * @openapi
 * /api/vehicle-types/delete-multiple:
 *   post:
 *     tags:
 *       - Vehicle Types
 *     summary: Xóa nhiều loại phương tiện
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Danh sách ID loại phương tiện
 *               hard:
 *                 type: boolean
 *                 description: true = xóa vĩnh viễn, false = vô hiệu hóa (mặc định false)
 *             required:
 *               - ids
 *     responses:
 *       200:
 *         description: Xóa thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Không có quyền truy cập
 */
router.post(
  '/delete-multiple',
  authenticate,
  requirePermissions('vehicle_type.delete'),
  controller.deleteMultiple.bind(controller)
)

/**
 * @openapi
 * components:
 *   schemas:
 *     VehicleType:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: ID loại phương tiện
 *         vehicleTypeCode:
 *           type: string
 *           description: Mã loại phương tiện
 *         vehicleTypeName:
 *           type: string
 *           description: Tên loại phương tiện
 *         usageType:
 *           type: string
 *           enum: [OTOKKDVT, OTOKDVT, XEMAY, VCXOTO]
 *           description: Loại sử dụng phương tiện
 *         usagePurpose:
 *           type: string
 *           enum: [XCN, XCH, XCN_CH]
 *           description: Mục đích sử dụng
 *         seatMin:
 *           type: integer
 *           description: Số ghế tối thiểu
 *         seatMax:
 *           type: integer
 *           description: Số ghế tối đa
 *         weightMin:
 *           type: integer
 *           description: Trọng tải tối thiểu (kg)
 *         weightMax:
 *           type: integer
 *           description: Trọng tải tối đa (kg)
 *         isShowSeat:
 *           type: boolean
 *           description: Có hiển thị thông tin số ghế không
 *         isShowWeight:
 *           type: boolean
 *           description: Có hiển thị thông tin trọng tải không
 *         pricePerYear:
 *           type: integer
 *           description: Giá bảo hiểm theo năm (VND)
 *         active:
 *           type: boolean
 *           description: Trạng thái hoạt động
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Thời gian tạo
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Thời gian cập nhật
 *         createdBy:
 *           type: integer
 *           description: ID người tạo
 *         updatedBy:
 *           type: integer
 *           description: ID người cập nhật
 *         creator:
 *           $ref: '#/components/schemas/User'
 *         updater:
 *           $ref: '#/components/schemas/User'
 *     VehicleTypeInput:
 *       type: object
 *       required:
 *         - vehicleTypeCode
 *         - vehicleTypeName
 *         - usageType
 *         - usagePurpose
 *         - seatMin
 *         - seatMax
 *         - weightMin
 *         - weightMax
 *         - pricePerYear
 *       properties:
 *         vehicleTypeCode:
 *           type: string
 *           description: Mã loại phương tiện (duy nhất)
 *         vehicleTypeName:
 *           type: string
 *           description: Tên loại phương tiện
 *         usageType:
 *           type: string
 *           enum: [OTOKKDVT, OTOKDVT, XEMAY, VCXOTO]
 *           description: Loại sử dụng phương tiện
 *         usagePurpose:
 *           type: string
 *           enum: [XCN, XCH, XCN_CH]
 *           description: Mục đích sử dụng
 *         seatMin:
 *           type: integer
 *           minimum: 0
 *           description: Số ghế tối thiểu
 *         seatMax:
 *           type: integer
 *           minimum: 0
 *           description: Số ghế tối đa
 *         weightMin:
 *           type: integer
 *           minimum: 0
 *           description: Trọng tải tối thiểu (kg)
 *         weightMax:
 *           type: integer
 *           minimum: 0
 *           description: Trọng tải tối đa (kg)
 *         isShowSeat:
 *           type: boolean
 *           default: false
 *           description: Có hiển thị thông tin số ghế không
 *         isShowWeight:
 *           type: boolean
 *           default: false
 *           description: Có hiển thị thông tin trọng tải không
 *         pricePerYear:
 *           type: integer
 *           minimum: 0
 *           description: Giá bảo hiểm theo năm (VND)
 *         active:
 *           type: boolean
 *           default: true
 *           description: Trạng thái hoạt động
 */

export default router
