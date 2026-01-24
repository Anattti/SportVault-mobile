-- Add notes column to session_sets table if it doesn't exist
ALTER TABLE public.session_sets 
ADD COLUMN IF NOT EXISTS notes text;
