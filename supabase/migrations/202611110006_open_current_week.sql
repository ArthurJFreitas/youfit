-- Orders are accepted for any open day up to default_cutoff_hours (2h) before the delivery window,
-- including today; the seeded fixed cutoffs (previous day 18:00) no longer apply.
update public.delivery_days set cutoff_at = null where cutoff_at is not null;
update public.business_settings
set delivery_notice = 'Entregas em domicílio nos dias disponíveis. Pedidos até 2 horas antes da entrega.'
where id = 1;
