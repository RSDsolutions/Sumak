BEGIN;
UPDATE public.profiles 
SET patrocinador_id = '9460e09d-9861-425a-8b5f-83062f678bc7', 
    codigo_patrocinador = 'SUMAK-00022' 
WHERE id = '0e805ba1-2210-412f-9319-afb801a36c73';

UPDATE public.red_binaria 
SET padre_id = 'fc9be078-5918-4c67-83f6-cc801b8b1a89', 
    nivel = 6, 
    posicion = 'izquierda' 
WHERE distribuidor_id = '0e805ba1-2210-412f-9319-afb801a36c73';
COMMIT;
