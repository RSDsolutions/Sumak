-- Add layout_config JSONB field to academy_diploma_templates
ALTER TABLE public.academy_diploma_templates 
ADD COLUMN IF NOT EXISTS layout_config jsonb DEFAULT '{
  "participant_name": { "x": 420, "y": 290, "size": 36, "color": "#0a2213", "align": "center", "font": "bold", "visible": true },
  "course_name": { "x": 420, "y": 380, "size": 24, "color": "#111111", "align": "center", "font": "bold", "visible": true },
  "issue_date": { "x": 420, "y": 440, "size": 12, "color": "#333333", "align": "center", "font": "normal", "visible": true },
  "qr_code": { "x": 50, "y": 50, "size": 80, "visible": true },
  "verification_text": { "x": 420, "y": 45, "size": 9, "color": "#ab8224", "align": "center", "font": "normal", "visible": true }
}';

COMMENT ON COLUMN public.academy_diploma_templates.layout_config IS 'JSON layout configuration for dynamic PDF generation';
