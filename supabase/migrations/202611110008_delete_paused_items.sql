-- Paused legacy items are gone for good; order history keeps product_name/combo_name (FKs set null).
delete from public.products where not active;
delete from public.combos where not active;
