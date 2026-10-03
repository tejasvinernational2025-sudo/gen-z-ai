-- Persist the student's explicit response-language choice with their signed-in learning profile.
alter table public.student_learning_profiles
  add column if not exists preferred_language text;

comment on column public.student_learning_profiles.preferred_language is
  'Explicit global language selector value, e.g. English, Hinglish, தமிழ் — Tamil.';
