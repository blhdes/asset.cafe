-- Add position column to lists and assets tables for drag-and-drop reordering
-- Run this in the Supabase SQL Editor

ALTER TABLE lists ADD COLUMN position INTEGER DEFAULT 0;
ALTER TABLE assets ADD COLUMN position INTEGER DEFAULT 0;

-- Backfill existing rows with sequential positions based on created_at
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY vault_hash ORDER BY created_at) - 1 AS pos
  FROM lists
)
UPDATE lists SET position = numbered.pos FROM numbered WHERE lists.id = numbered.id;

WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY list_id ORDER BY created_at) - 1 AS pos
  FROM assets
)
UPDATE assets SET position = numbered.pos FROM numbered WHERE assets.id = numbered.id;
