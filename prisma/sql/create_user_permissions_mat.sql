-- Create a materialized view that aggregates user's roles and permissions.
-- Run this once on your Postgres DB (psql or Prisma):
-- psql $DATABASE_URL -f prisma/sql/create_user_permissions_mat.sql

CREATE MATERIALIZED VIEW IF NOT EXISTS user_permissions_mat AS
SELECT
  u.id AS user_id,
  u."supabaseId" AS supabase_id,
  u.email AS email,
  u.name AS name,
  u."phoneNumber" AS phone_number,
  u.addresses AS addresses,
  u."avatarUrl" AS avatar_url,
  u.active AS active,
  u."updatedAt" AS updated_at,

  -- Aggregate roles with nested permissions as JSONB
  COALESCE(
    jsonb_agg(DISTINCT jsonb_build_object(
      'id', r.id,
      'key', r.key,
      'name', r.name,
      'permissions', (
        SELECT COALESCE(jsonb_agg(jsonb_build_object('id', p2.id, 'key', p2.key, 'name', p2.name)), '[]'::jsonb)
        FROM role_permissions rp2
        JOIN permissions p2 ON p2.id = rp2."permissionId"
        WHERE rp2."roleId" = r.id
      )
    )) FILTER (WHERE r.id IS NOT NULL),
    '[]'::jsonb
  ) AS roles,

  -- Flat list of permission keys coming from roles (useful to union quickly in app)
  COALESCE(array_agg(DISTINCT p.key) FILTER (WHERE p.key IS NOT NULL), ARRAY[]::text[]) AS role_permission_keys,

  -- Direct user permission objects (key + allowed)
  COALESCE(jsonb_agg(DISTINCT jsonb_build_object('key', up_perm.key, 'allowed', up.allowed)) FILTER (WHERE up_perm.key IS NOT NULL), '[]'::jsonb) AS user_permissions

FROM users u
LEFT JOIN user_role_assignments ura ON ura."userId" = u.id
LEFT JOIN user_roles r ON r.id = ura."roleId"
LEFT JOIN role_permissions rp ON rp."roleId" = r.id
LEFT JOIN permissions p ON p.id = rp."permissionId"
LEFT JOIN user_permissions up ON up."userId" = u.id
LEFT JOIN permissions up_perm ON up_perm.id = up."permissionId"

GROUP BY u.id;

-- Unique index on user_id is required if you want to REFRESH MATERIALIZED VIEW CONCURRENTLY.
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_permissions_mat_user_id ON user_permissions_mat(user_id);

-- Optional: GIN index on role_permission_keys (text[]). Useful if you need to filter by membership.
CREATE INDEX IF NOT EXISTS idx_user_permissions_mat_role_keys_gin ON user_permissions_mat USING GIN (role_permission_keys);

-- Optional: GIN index on roles JSONB for json containment queries
CREATE INDEX IF NOT EXISTS idx_user_permissions_mat_roles_gin ON user_permissions_mat USING GIN (roles);

-- Ghi chú:
-- 1) Sau khi tạo materialized view, bạn có thể REFRESH nó bằng:
--    REFRESH MATERIALIZED VIEW user_permissions_mat;
--    hoặc (không chặn đọc) REFRESH MATERIALIZED VIEW CONCURRENTLY user_permissions_mat;
--    (CONCURRENTLY yêu cầu chỉ mục UNIQUE trên user_id đã được tạo ở trên.)
-- 2) Không nên REFRESH sau mỗi thay đổi nhỏ theo cách đồng bộ. Hãy sử dụng một job nền hoặc refresh theo sự kiện.
-- 3) Bạn có thể truy vấn view này từ Prisma bằng prisma.$queryRaw hoặc prisma.$executeRaw.
--
-- Ví dụ kiểm tra nhanh (chạy trong psql):
-- SELECT * FROM user_permissions_mat WHERE user_id = 1 LIMIT 1;


-- 1 xác nhận tồn tại
-- SELECT to_regclass('public.user_permissions_mat') AS exists;
-- 2 Đếm số hàng đã populate (should match Affected rows):
-- SELECT count(*) FROM user_permissions_mat;
-- 3 Xem vài hàng mẫu:
-- SELECT user_id, supabase_id, email, role_permission_keys, user_permissions
-- FROM user_permissions_mat
-- LIMIT 5;
-- 4 Kiểm tra index (để dùng REFRESH CONCURRENTLY cần UNIQUE index trên user_id):
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'user_permissions_mat';
-- 5 Nếu muốn xem chi tiết một user cụ thể:
-- SELECT * FROM user_permissions_mat WHERE user_id = 184;