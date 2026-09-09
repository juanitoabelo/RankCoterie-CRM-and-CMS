-- Add missing enum values to the Role type (schema has them, DB doesn't)
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'EDITOR';
