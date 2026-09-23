alter table app_private.student
  add column age_range text
  constraint student_age_range_check check (
    age_range in ('UNDER_18', 'AGE_18_24', 'AGE_25_34', 'AGE_35_44', 'AGE_45_54', 'AGE_55_64', 'AGE_65_PLUS')
  );
