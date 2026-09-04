ALTER TABLE public.academy_courses
DROP CONSTRAINT IF EXISTS academy_courses_instructor_id_fkey;

ALTER TABLE public.academy_courses
ADD CONSTRAINT academy_courses_instructor_id_fkey
FOREIGN KEY (instructor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
