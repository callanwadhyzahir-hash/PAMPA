-- CreateIndex
-- Supports the Platform Admin User Detail activity timeline (GET
-- /platform-admin/activity?userId=), which matches security_event where the
-- user is either the actor OR the target. Only actor_user_id had an index;
-- events where the user is only the target (e.g. USER_DEACTIVATED done by
-- someone else) would fall back to a sequential scan.
CREATE INDEX "idx_security_event_target_created" ON "security_event"("target_user_id", "created_at");
