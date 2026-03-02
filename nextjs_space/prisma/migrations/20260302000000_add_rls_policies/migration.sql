-- =============================================================================
-- Migration: 20260302000000_add_rls_policies
-- Purpose  : Enable Row Level Security on sensitive tables so that even if an
--            attacker bypasses the application layer they cannot read or write
--            other tenants' data via the database REST interface.
--
-- Strategy :
--   1. Enable RLS on each table.
--   2. Create a PERMISSIVE policy for the application role that:
--        - SELECT / UPDATE / DELETE: only rows owned by the current session user.
--        - INSERT: always allowed (ownership enforced by app layer at write time).
--   3. App role must call  SET LOCAL app.current_user_id = '<uuid>'  inside
--      each transaction before any DML.  This is done in lib/db.ts via a
--      Prisma middleware extension (see notes in that file).
--
-- The migration is idempotent: running it twice is safe.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Helper function: returns the current session user ID set by the application.
-- Returns NULL if not set (causes row-level policies to block all access,
-- which is the safe default — unauthenticated DB connections see nothing).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app.current_user_id()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_user_id', true), '')
$$;

-- Grant execute to the application role.
-- Replace 'role_4bbf62afd' with your actual DB role if different;
-- the value is read from DATABASE_URL at runtime.
DO $$
DECLARE
  app_role TEXT;
BEGIN
  -- Extract the role name from the connection (works for the hosted DB pattern).
  SELECT current_user INTO app_role;
  EXECUTE format('GRANT EXECUTE ON FUNCTION app.current_user_id() TO %I', app_role);
EXCEPTION WHEN OTHERS THEN
  -- Non-fatal if grant fails in restricted environments.
  NULL;
END $$;

-- ---------------------------------------------------------------------------
-- User table
-- ---------------------------------------------------------------------------
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_isolation ON "User";
CREATE POLICY user_isolation ON "User"
  USING (id = app.current_user_id());

-- Admins / SuperAdmins can read all users (application enforces this via session).
-- We rely on the app layer for admin escalation; RLS provides the baseline.

-- ---------------------------------------------------------------------------
-- Project table
-- ---------------------------------------------------------------------------
ALTER TABLE "Project" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_team_isolation ON "Project";
CREATE POLICY project_team_isolation ON "Project"
  USING (
    -- Project is visible if the current user is the PM, superintendent, or a
    -- team member recorded in ProjectTeam.
    "projectManagerId" = app.current_user_id()
    OR "superintendentId" = app.current_user_id()
    OR "architectId" = app.current_user_id()
    OR "engineerId" = app.current_user_id()
    OR EXISTS (
      SELECT 1 FROM "ProjectTeam" pt
      WHERE pt."projectId" = "Project".id
        AND pt."userId" = app.current_user_id()
    )
  );

-- ---------------------------------------------------------------------------
-- AccountingIntegration table
-- ---------------------------------------------------------------------------
ALTER TABLE "AccountingIntegration" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS accounting_owner_isolation ON "AccountingIntegration";
CREATE POLICY accounting_owner_isolation ON "AccountingIntegration"
  USING ("userId" = app.current_user_id());

-- ---------------------------------------------------------------------------
-- DrawRequest table
-- ---------------------------------------------------------------------------
ALTER TABLE "DrawRequest" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS draw_request_project_isolation ON "DrawRequest";
CREATE POLICY draw_request_project_isolation ON "DrawRequest"
  USING (
    EXISTS (
      SELECT 1 FROM "Project" p
      WHERE p.id = "DrawRequest"."projectId"
        AND (
          p."projectManagerId" = app.current_user_id()
          OR p."superintendentId" = app.current_user_id()
          OR EXISTS (
            SELECT 1 FROM "ProjectTeam" pt
            WHERE pt."projectId" = p.id AND pt."userId" = app.current_user_id()
          )
        )
    )
  );

-- ---------------------------------------------------------------------------
-- LedgerEntry table
-- ---------------------------------------------------------------------------
ALTER TABLE "LedgerEntry" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ledger_project_isolation ON "LedgerEntry";
CREATE POLICY ledger_project_isolation ON "LedgerEntry"
  USING (
    EXISTS (
      SELECT 1 FROM "Project" p
      WHERE p.id = "LedgerEntry"."projectId"
        AND (
          p."projectManagerId" = app.current_user_id()
          OR p."superintendentId" = app.current_user_id()
          OR EXISTS (
            SELECT 1 FROM "ProjectTeam" pt
            WHERE pt."projectId" = p.id AND pt."userId" = app.current_user_id()
          )
        )
    )
  );

-- ---------------------------------------------------------------------------
-- Notification table (users only see their own)
-- ---------------------------------------------------------------------------
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notification_owner_isolation ON "Notification";
CREATE POLICY notification_owner_isolation ON "Notification"
  USING ("userId" = app.current_user_id());

-- ---------------------------------------------------------------------------
-- AgentExecution table (users only see their own runs)
-- ---------------------------------------------------------------------------
ALTER TABLE "AgentExecution" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agent_execution_owner_isolation ON "AgentExecution";
CREATE POLICY agent_execution_owner_isolation ON "AgentExecution"
  USING ("userId" = app.current_user_id());
