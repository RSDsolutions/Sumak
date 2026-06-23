-- ============================================================
-- SUMAK — Carga historica de recompras de junio 2026
-- ============================================================
-- One-off script, NO migration. Pegar en SQL Editor de Supabase
-- (corre como service_role, bypass de RLS). Idempotente por
-- idempotency_key derivado de email + fecha.
--
-- Registra 4 recompras de activacion mensual ($100 c/u) con sus
-- items y dispara las comisiones por nivel correspondientes (sin
-- pasar por submit_pedido porque no hay auth.uid en SQL editor).
--
-- Distribuidores (lookup por email, case-insensitive):
--   1. JENNY ELITA MIRANDA CABRERA   <jennymiranda57@yahoo.ec>      $100  5/jun/2026
--   2. LOURDES VIVIANA VILLAMAR ONOFRE <lourdesvillamar48@gmail.com> $100  5/jun/2026
--   3. NANCY RODRIGUEZ                <Laalondradelosrios@gmail.com> $100 19/jun/2026
--   4. FELIZ ALVAREZ                  <alvarezfeliz83@gmail.com>     $100 19/jun/2026
--
-- Reglas de pricing usadas:
--   - Jenny / Lourdes / Nancy: items a PVP real + linea final
--     'DESCUENTO EVENTO' negativa para cuadrar el total a $100.
--   - Feliz: 5 Colon Renova a $5 + 7 items a precio promo prorrateado
--     ($10.71 / $10.72) que suma $100 limpios.
--
-- Comisiones nivel: mismos porcentajes que submit_pedido vigente
-- (15/10/8/5/4/3/2/2/1/1/1/1/1/1). Eligibilidad upline = pedido
-- propio >= $100 en el mes (cualquiera de estos 4 cuenta).
--
-- IMPORTANTE: si el comprador no tiene patrocinador_id en profiles,
-- el script NO genera comisiones nivel para ese pedido. Esto pasa
-- con seeds historicos o registros donde no se capturo upline. En
-- esos casos la comision binaria sigue aplicando via el padre en
-- red_binaria al cierre mensual. Vease el RAISE NOTICE 'AVISO:'.
-- ============================================================

do $$
declare
  v_porcentajes constant jsonb := '[
    {"nivel":1,"porcentaje":15},{"nivel":2,"porcentaje":10},
    {"nivel":3,"porcentaje":8},{"nivel":4,"porcentaje":5},
    {"nivel":5,"porcentaje":4},{"nivel":6,"porcentaje":3},
    {"nivel":7,"porcentaje":2},{"nivel":8,"porcentaje":2},
    {"nivel":9,"porcentaje":1},{"nivel":10,"porcentaje":1},
    {"nivel":11,"porcentaje":1},{"nivel":12,"porcentaje":1},
    {"nivel":13,"porcentaje":1},{"nivel":14,"porcentaje":1}
  ]'::jsonb;

  -- Definicion declarativa de las 4 recompras. Editable antes de correr.
  v_recompras jsonb := $json$[
    {
      "email": "jennymiranda57@yahoo.ec",
      "fecha": "2026-06-05",
      "tipo_precio": "pvp",
      "items": [
        {"codigo":"00004","nombre":"Vive-Oxi-100","cantidad":5,"precio":25.00},
        {"codigo":"00001","nombre":"Te Extractos de la Vida","cantidad":3,"precio":25.00},
        {"codigo":"00002","nombre":"REGEN 24","cantidad":2,"precio":25.00},
        {"codigo":"00005","nombre":"Fibramak Plus","cantidad":1,"precio":25.00},
        {"codigo":"DESC-EVENTO","nombre":"Descuento evento promocional","cantidad":1,"precio":-175.00}
      ]
    },
    {
      "email": "lourdesvillamar48@gmail.com",
      "fecha": "2026-06-05",
      "tipo_precio": "pvp",
      "items": [
        {"codigo":"00001","nombre":"Te Extractos de la Vida","cantidad":2,"precio":25.00},
        {"codigo":"00002","nombre":"REGEN 24","cantidad":2,"precio":25.00},
        {"codigo":"00011","nombre":"Madre Silvestre","cantidad":1,"precio":20.00},
        {"codigo":"00004","nombre":"Vive-Oxi-100","cantidad":2,"precio":25.00},
        {"codigo":"00003","nombre":"Bebida Andina","cantidad":2,"precio":20.00},
        {"codigo":"00008","nombre":"Formula 1000","cantidad":1,"precio":60.00},
        {"codigo":"DESC-EVENTO","nombre":"Descuento evento promocional","cantidad":1,"precio":-170.00}
      ]
    },
    {
      "email": "Laalondradelosrios@gmail.com",
      "fecha": "2026-06-19",
      "tipo_precio": "pvp",
      "items": [
        {"codigo":"00001","nombre":"Te Extractos de la Vida","cantidad":5,"precio":25.00},
        {"codigo":"00011","nombre":"Madre Silvestre","cantidad":2,"precio":20.00},
        {"codigo":"00004","nombre":"Vive-Oxi-100","cantidad":3,"precio":25.00},
        {"codigo":"DESC-EVENTO","nombre":"Descuento evento promocional","cantidad":1,"precio":-140.00}
      ]
    },
    {
      "email": "alvarezfeliz83@gmail.com",
      "fecha": "2026-06-19",
      "tipo_precio": "distribuidor",
      "items": [
        {"codigo":"00016","nombre":"Formula Herbal Colon Renova","cantidad":5,"precio":5.00},
        {"codigo":"00001","nombre":"Te Extractos de la Vida (promo)","cantidad":4,"precio":10.71},
        {"codigo":"00002","nombre":"REGEN 24 (promo)","cantidad":1,"precio":10.72},
        {"codigo":"00011","nombre":"Madre Silvestre (promo)","cantidad":1,"precio":10.72},
        {"codigo":"00004","nombre":"Vive-Oxi-100 (promo)","cantidad":1,"precio":10.72}
      ]
    }
  ]$json$::jsonb;

  v_recompra jsonb;
  v_email text;
  v_fecha date;
  v_tipo text;
  v_items jsonb;
  v_distrib_id uuid;
  v_total numeric;
  v_pedido_id uuid;
  v_idemp uuid;
  v_existing uuid;
  v_item jsonb;
  v_upline_id uuid;
  v_upline record;
  v_eligible_upline uuid[];
  v_puntos integer;
  v_count_pedidos int := 0;
  v_count_comisiones int := 0;
begin
  ------------------------------------------------------------------
  -- FASE 1: insertar los 4 pedidos + items + sumar puntos
  ------------------------------------------------------------------
  for v_recompra in select * from jsonb_array_elements(v_recompras)
  loop
    v_email := lower(v_recompra->>'email');
    v_fecha := (v_recompra->>'fecha')::date;
    v_tipo  := v_recompra->>'tipo_precio';
    v_items := v_recompra->'items';

    -- lookup distribuidor (case-insensitive)
    select id into v_distrib_id from public.profiles where lower(email) = v_email;
    if v_distrib_id is null then
      raise exception 'Distribuidor no encontrado por email: %', v_email;
    end if;

    -- idempotency_key estable por email+fecha
    v_idemp := md5('recompra:' || v_email || ':' || v_fecha::text)::uuid;

    -- skip si ya fue cargado
    select id into v_existing from public.pedidos where idempotency_key = v_idemp;
    if v_existing is not null then
      raise notice 'SKIP: pedido ya existe para % en % (id=%)', v_email, v_fecha, v_existing;
      continue;
    end if;

    -- total = suma de cantidad * precio (incluye linea DESC negativa)
    select coalesce(sum((x->>'cantidad')::numeric * (x->>'precio')::numeric), 0)
      into v_total
      from jsonb_array_elements(v_items) x;

    -- validacion: total esperado = 100
    if v_total <> 100 then
      raise exception 'Total calculado (%) <> 100 para %. Revisar items.', v_total, v_email;
    end if;

    v_puntos := round(v_total)::integer;

    -- insertar pedido con estado entregado y fechas historicas
    insert into public.pedidos (
      distribuidor_id, estado, tipo_precio, total, puntos_generados,
      notas, idempotency_key, created_at, recibido_at, updated_at
    ) values (
      v_distrib_id, 'entregado', v_tipo, v_total, v_puntos,
      'Recompra de activacion mensual junio 2026 (carga historica).',
      v_idemp, v_fecha::timestamptz, v_fecha::timestamptz, v_fecha::timestamptz
    ) returning id into v_pedido_id;

    -- insertar items
    for v_item in select * from jsonb_array_elements(v_items)
    loop
      insert into public.pedido_items (
        pedido_id, producto_codigo, producto_nombre,
        cantidad, precio_unitario, subtotal
      ) values (
        v_pedido_id,
        v_item->>'codigo',
        v_item->>'nombre',
        (v_item->>'cantidad')::int,
        (v_item->>'precio')::numeric,
        (v_item->>'cantidad')::numeric * (v_item->>'precio')::numeric
      );
    end loop;

    -- sumar puntos al distribuidor
    update public.profiles
       set puntos = coalesce(puntos, 0) + v_puntos
     where id = v_distrib_id;

    v_count_pedidos := v_count_pedidos + 1;
    raise notice 'OK pedido %/4: % (%) -> pedido_id=% total=$% puntos=%',
      v_count_pedidos, v_email, v_fecha, v_pedido_id, v_total, v_puntos;
  end loop;

  ------------------------------------------------------------------
  -- FASE 2: generar comisiones nivel para los pedidos recien creados.
  -- Se hace en segunda pasada para que la eligibilidad del upline
  -- considere a los 4 nuevos pedidos como pedidos calificadores en mes.
  ------------------------------------------------------------------
  for v_recompra in select * from jsonb_array_elements(v_recompras)
  loop
    v_email := lower(v_recompra->>'email');
    v_fecha := (v_recompra->>'fecha')::date;
    v_idemp := md5('recompra:' || v_email || ':' || v_fecha::text)::uuid;

    select id, distribuidor_id, puntos_generados
      into v_pedido_id, v_distrib_id, v_puntos
      from public.pedidos where idempotency_key = v_idemp;

    if v_pedido_id is null then
      raise notice 'Pedido no encontrado para % %, skip comisiones', v_email, v_fecha;
      continue;
    end if;

    -- skip si ya existen comisiones nivel para este pedido (re-run safe)
    if exists (select 1 from public.comisiones
               where pedido_id = v_pedido_id and tipo = 'nivel') then
      raise notice 'SKIP comisiones: ya existen para pedido %', v_pedido_id;
      continue;
    end if;

    -- Guarda: si el comprador no tiene patrocinador_id en profiles,
    -- la linea de patrocinio esta vacia y no hay a quien pagar
    -- comision por nivel. Es valido para recompras de tienda cuando
    -- el cliente entro sin upline declarado: la comision binaria
    -- sigue aplicando via el padre en red_binaria al cierre mensual,
    -- pero la nivel no genera nada. Avisamos y seguimos.
    perform 1 from public.profiles
      where id = v_distrib_id and patrocinador_id is not null;
    if not found then
      raise notice 'AVISO: % no tiene patrocinador_id. Sin comisiones nivel (la binaria del padre en red_binaria sigue aplicando al cierre mensual).', v_email;
      continue;
    end if;

    -- armar cadena de upline (max 14 niveles)
    create temporary table if not exists tmp_upline_recompra (
      nivel int, upline_id uuid, porcentaje int
    ) on commit drop;
    truncate tmp_upline_recompra;

    v_upline_id := v_distrib_id;
    for v_upline in select * from jsonb_to_recordset(v_porcentajes)
                      as x(nivel int, porcentaje int) order by nivel
    loop
      select patrocinador_id into v_upline_id
        from public.profiles where id = v_upline_id;
      exit when v_upline_id is null;
      insert into tmp_upline_recompra values (v_upline.nivel, v_upline_id, v_upline.porcentaje);
    end loop;

    -- eligibilidad: upline tiene pedido >=$100 procesando/enviado/entregado
    -- en el mes del pedido origen
    select array_agg(distinct distribuidor_id) into v_eligible_upline
      from public.pedidos
      where distribuidor_id in (select upline_id from tmp_upline_recompra)
        and estado in ('procesando','enviado','entregado')
        and total >= 100
        and created_at >= date_trunc('month', v_fecha::timestamptz)
        and created_at <  date_trunc('month', v_fecha::timestamptz) + interval '1 month';

    -- insertar comisiones para uplines elegibles
    insert into public.comisiones (
      beneficiario_id, origen_id, pedido_id, tipo, nivel_red,
      monto, estado, descripcion, created_at
    )
    select
      u.upline_id, v_distrib_id, v_pedido_id, 'nivel', u.nivel,
      round((v_puntos * u.porcentaje / 100.0)::numeric, 2),
      'pendiente',
      'Comision nivel ' || u.nivel || ' - recompra junio 2026',
      v_fecha::timestamptz
    from tmp_upline_recompra u
    where v_eligible_upline is not null
      and u.upline_id = any(v_eligible_upline)
      and round((v_puntos * u.porcentaje / 100.0)::numeric, 2) > 0;

    get diagnostics v_count_comisiones = row_count;
    raise notice 'OK comisiones para %: % filas insertadas',
      v_email, v_count_comisiones;
  end loop;

  raise notice '====== CARGA COMPLETA: % pedidos procesados ======', v_count_pedidos;
end $$;

-- ============================================================
-- VERIFICACION POST-CARGA (corre por separado, solo SELECT)
-- ============================================================
-- 1) Ver los 4 pedidos creados:
--   select numero_pedido, p.created_at::date as fecha, pr.email, pr.nombre_completo,
--          p.estado, p.total, p.puntos_generados
--     from pedidos p join profiles pr on pr.id = p.distribuidor_id
--    where p.idempotency_key in (
--      md5('recompra:jennymiranda57@yahoo.ec:2026-06-05')::uuid,
--      md5('recompra:lourdesvillamar48@gmail.com:2026-06-05')::uuid,
--      md5('recompra:laalondradelosrios@gmail.com:2026-06-19')::uuid,
--      md5('recompra:alvarezfeliz83@gmail.com:2026-06-19')::uuid
--    )
--    order by p.created_at;
--
-- 2) Ver items de cada pedido:
--   select pr.email, pi.producto_codigo, pi.producto_nombre,
--          pi.cantidad, pi.precio_unitario, pi.subtotal
--     from pedido_items pi
--     join pedidos p on p.id = pi.pedido_id
--     join profiles pr on pr.id = p.distribuidor_id
--    where p.notas like 'Recompra de activacion mensual junio 2026%'
--    order by pr.email, pi.subtotal desc;
--
-- 3) Comisiones generadas por estos pedidos:
--   select origen.email as compro, benef.email as gano,
--          c.nivel_red, c.monto, c.estado, c.descripcion
--     from comisiones c
--     join profiles origen on origen.id = c.origen_id
--     join profiles benef on benef.id = c.beneficiario_id
--    where c.pedido_id in (
--      select id from pedidos
--       where notas like 'Recompra de activacion mensual junio 2026%'
--    )
--    order by origen.email, c.nivel_red;
--
-- 4) Activacion mensual de los 4:
--   select pr.email, am.*
--     from activacion_mensual am
--     join profiles pr on pr.id = am.distribuidor_id
--    where pr.email in (
--      'jennymiranda57@yahoo.ec','lourdesvillamar48@gmail.com',
--      'laalondradelosrios@gmail.com','alvarezfeliz83@gmail.com'
--    )
--      and am.mes = date_trunc('month', '2026-06-01'::date)::date;
-- ============================================================
