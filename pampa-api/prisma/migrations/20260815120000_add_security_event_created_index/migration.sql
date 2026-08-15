-- CreateIndex
-- Supports the Platform Admin global activity feed (GET /platform-admin/activity),
-- which orders security_event by created_at across all companies/event types.
-- The existing composite indexes (company_id, created_at) / (actor_user_id, created_at) /
-- (event_type, created_at) don't help an unfiltered global scan.
CREATE INDEX "idx_security_event_created" ON "security_event"("created_at");
