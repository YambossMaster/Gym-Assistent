-- Optional Coach-entered price for a future single lesson. Null differs from zero.
alter table app_private.student
  add column single_lesson_amount_minor bigint
    check (single_lesson_amount_minor between 0 and 999999999999),
  add column single_lesson_currency char(3)
    check (single_lesson_currency ~ '^[A-Z]{3}$'),
  add constraint student_single_lesson_price_pair
    check ((single_lesson_amount_minor is null) = (single_lesson_currency is null));
