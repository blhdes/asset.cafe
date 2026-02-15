-- Add image_url column to assets table
-- Run this in the Supabase SQL Editor

ALTER TABLE assets
ADD COLUMN image_url TEXT;

COMMENT ON COLUMN assets.image_url IS 'URL to a custom logo/image for the asset';
