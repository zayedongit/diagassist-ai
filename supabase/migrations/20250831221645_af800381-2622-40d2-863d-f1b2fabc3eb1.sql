-- Add pdf_path column to pdf_analyses table to store original PDF file paths
ALTER TABLE public.pdf_analyses 
ADD COLUMN pdf_path text;