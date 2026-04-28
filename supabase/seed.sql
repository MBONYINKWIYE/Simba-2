do $$
declare
  kisimenti_shop_id uuid;
  sonatube_shop_id uuid;
  prod_id bigint;
  kisimenti_qty integer;
  sonatube_qty integer;
begin
  if not exists (select 1 from public.shops where name = 'Simba Kisimenti') then
    insert into public.shops (name, address, latitude, longitude, phone)
    values ('Simba Kisimenti', 'KG 9 Ave, Kisimenti, Kigali', -1.9489, 30.1044, '+250788333333');
  end if;

  if not exists (select 1 from public.shops where name = 'Simba Sonatube') then
    insert into public.shops (name, address, latitude, longitude, phone)
    values ('Simba Sonatube', 'KN 5 Rd, Sonatube, Kigali', -1.9806, 30.1178, '+250788444444');
  end if;

  select id into kisimenti_shop_id from public.shops where name = 'Simba Kisimenti' limit 1;
  select id into sonatube_shop_id from public.shops where name = 'Simba Sonatube' limit 1;

  delete from public.inventory
  where shop_id in (kisimenti_shop_id, sonatube_shop_id);

  for prod_id in select id from public.catalog_products loop
    kisimenti_qty := floor(random() * 321 + 3)::int;
    sonatube_qty := floor(random() * 321 + 3)::int;

    if sonatube_qty = kisimenti_qty then
      sonatube_qty := case
        when sonatube_qty = 323 then 322
        else sonatube_qty + 1
      end;
    end if;

    insert into public.inventory (shop_id, product_id, quantity)
    values
      (kisimenti_shop_id, prod_id, kisimenti_qty),
      (sonatube_shop_id, prod_id, sonatube_qty);
  end loop;
end
$$;
