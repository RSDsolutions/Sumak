-- Delete all academy courses
-- This will trigger ON DELETE CASCADE on modules, lessons, questions, etc. provided they are set up that way,
-- but just in case we can truncate to be safe if cascade isn't on everything.
-- The safest is just DELETE FROM, Supabase constraints usually have cascade.
DELETE FROM public.academy_courses;
