-- Quotes are created in supabase/schema.sql for the current app schema.
-- Keep this migration as a compatibility checkpoint so the historical
-- migration order remains runnable on fresh projects.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'quotes'
    ) THEN
        RAISE EXCEPTION 'quotes table must exist before create-quotes-table.sql runs';
    END IF;
END $$;

