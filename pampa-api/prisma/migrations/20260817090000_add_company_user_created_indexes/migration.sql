-- CreateIndex
-- Supports two Platform Admin features that scan across all tenants:
-- 1) the "recently created" filters on GET /platform-admin/companies and
--    GET /platform-admin/users (createdWithinDays);
-- 2) the overview growth chart (GET /platform-admin/overview/growth), which
--    groups company/user creation by day over a 7/30/90-day window.
-- Neither table had an index on created_at before this.
CREATE INDEX "idx_company_created" ON "company"("created_at");

-- CreateIndex
CREATE INDEX "idx_user_created" ON "user"("created_at");
