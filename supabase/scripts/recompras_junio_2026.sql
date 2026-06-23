-- ============================================================
-- SUMAK — Carga historica de recompras de junio 2026
-- ============================================================
-- One-off script, NO migration. Pegar en SQL Editor de Supabase
-- (corre como service_role, bypass de RLS). Idempotente por
-- idempotency_key derivado de email + fecha.
--
-- ATENCION: este script asume que la migration 026 ya esta aplicada
-- (estado 'retenida' + cadena binaria + porcentajes oficiales).
--
-- Registra 4 recompras de activacion mensual ($100 c/u) con sus
-- items y dispara las comisiones por nivel correspondientes:
--   - Cadena = red_binaria.padre_id (no patrocinador_id)
--   - Porcentajes oficiales: 5/20/5/4/3/2/1/0.5x7
--   - Comisiones SIEMPRE generadas; estado pendiente si benef activo
--     en el mes, retenida si no. Las retenidas pasan a pendiente
--     automaticamente cuando el beneficiario activa via trigger
--     pedidos_liberar_retenidas (mig 026).
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
-- ============================================================

do $$
declare
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
      "email": "laalondradelosrios@gmail.com",
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

  -- Porcentajes oficiales (mig 026)
  v_porcentajes jsonb := '[
    {"nivel":1,"porcentaje":5.0},   {"nivel":2,"porcentaje":20.0},
    {"nivel":3,"porcentaje":5.0},   {"nivel":4,"porcentaje":4.0},
    {"nivel":5,"porcentaje":3.0},   {"nivel":6,"porcentaje":2.0},
    {"nivel":7,"porcentaje":1.0},   {"nivel":8,"porcentaje":0.5},
    {"nivel":9,"porcentaje":0.5},   {"nivel":10,"porcentaje":0.5},
    {"nivel":11,"porcentaje":0.5},  {"nivel":12,"porcentaje":0.5},
    {"nivel":13,"porcentaje":0.5},  {"nivel":14,"porcentaje":0.5}
  ]'::jsonb;

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
  v_puntos integer;
  v_count_pedidos int := 0;
  v_count_comisiones int := 0;
begin
  ------------------------------------------------------------------
  -- FASE 1: insertar pedidos + items + sumar puntos
  -- (el trigger pedidos_liberar_retenidas_ins se dispara al insert
  -- y libera retenidas previas del comprador si las hay).
  ------------------------------------------------------------------
  for v_recompra in select * from jsonb_array_elements(v_recompras)
  loop
    v_email := lower(v_recompra->>'email');
    v_fecha := (v_recompra->>'fecha')::date;
    v_tipo  := v_recompra->>'tipo_precio';
    v_items := v_recompra->'items';

    select id into v_distrib_id from public.profiles where lower(email) = v_email;
    if v_distrib_id is null then
      raise exception 'Distribuidor no encontrado por email: %', v_email;
    end if;

    v_idemp := md5('recompra:' || v_email || ':' || v_fecha::text)::uuid;

    select id into v_existing from public.pedidos where idempotency_key = v_idemp;
    if v_existing is not null then
      raise notice 'SKIP: pedido ya existe para % en % (id=%)', v_email, v_fecha, v_existing;
      continue;
    end if;

    select coalesce(sum((x->>'cantidad')::numeric * (x->>'precio')::numeric), 0)
      into v_total
      from jsonb_array_elements(v_items) x;

    if v_total <> 100 then
      raise exception 'Total calculado (%) <> 100 para %. Revisar items.', v_total, v_email;
    end if;

    v_puntos := round(v_total)::integer;

    insert into public.pedidos (
      distribuidor_id, estado, tipo_precio, total, puntos_generados,
      notas, idempotency_key, created_at, recibido_at, updated_at
    ) values (
      v_distrib_id, 'entregado', v_tipo, v_total, v_puntos,
      'Recompra de activacion mensual junio 2026 (carga historica).',
      v_idemp, v_fecha::timestamptz, v_fecha::timestamptz, v_fecha::timestamptz
    ) returning id into v_pedido_id;

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

    update public.profiles
       set puntos = coalesce(puntos, 0) + v_puntos
     where id = v_distrib_id;

    v_count_pedidos := v_count_pedidos + 1;
    raise notice 'OK pedido %/4: % (%) -> pedido_id=% total=$% puntos=%',
      v_count_pedidos, v_email, v_fecha, v_pedido_id, v_total, v_puntos;
  end loop;

  ------------------------------------------------------------------
  -- FASE 2: comisiones nivel para cada pedido recien creado,
  -- caminando la red binaria con porcentajes oficiales. Estado
  -- pendiente o retenida segun activacion del beneficiario en el
  -- mes del pedido. Idempotente: skip si ya existe (pedido_id,
  -- beneficiario_id, nivel, tipo='nivel').
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

    insert into public.comisiones (
      beneficiario_id, origen_id, pedido_id, tipo, nivel_red,
      monto, estado, descripcion, created_at
    )
    select
      bu.upline_id,
      v_distrib_id,
      v_pedido_id,
      'nivel',
      bu.nivel,
      round((v_puntos * (pc.value->>'porcentaje')::numeric / 100.0)::numeric, 2),
      case when public.distribuidor_activo_en_mes_de(bu.upline_id, v_fecha::timestamptz)
           then 'pendiente'
           else 'retenida'
      end,
      'Comision nivel ' || bu.nivel || ' (red binaria) - recompra junio 2026 - ' || v_email,
      v_fecha::timestamptz
    from public.get_binary_upline_chain(v_distrib_id, 14) bu
    join lateral (
      select value from jsonb_array_elements(v_porcentajes) j(value)
       where (j.value->>'nivel')::int = bu.nivel
       limit 1
    ) pc on true
    where round((v_puntos * (pc.value->>'porcentaje')::numeric / 100.0)::numeric, 2) > 0
      and not exists (
        select 1 from public.comisiones cx
         where cx.pedido_id = v_pedido_id
           and cx.beneficiario_id = bu.upline_id
           and cx.tipo = 'nivel'
           and cx.nivel_red = bu.nivel
      );

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
--   select numero_pedido, p.created_at::date as fecha, pr.email,
--          p.estado, p.total, p.puntos_generados
--     from pedidos p join profiles pr on pr.id = p.distribuidor_id
--    where p.idempotency_key in (
--      md5('recompra:jennymiranda57@yahoo.ec:2026-06-05')::uuid,
--      md5('recompra:lourdesvillamar48@gmail.com:2026-06-05')::uuid,
--      md5('recompra:laalondradelosrios@gmail.com:2026-06-19')::uuid,
--      md5('recompra:alvarezfeliz83@gmail.com:2026-06-19')::uuid
--    );
--
-- 2) Comisiones generadas por estos pedidos (incluye retenidas):
--   select origen.email as compro, benef.email as gana, benef.codigo_distribuidor,
--          c.nivel_red, c.monto, c.estado
--     from comisiones c
--     join profiles origen on origen.id = c.origen_id
--     join profiles benef on benef.id = c.beneficiario_id
--    where c.pedido_id in (
--      select id from pedidos
--       where notas like 'Recompra de activacion mensual junio 2026%'
--    )
--    order by origen.email, c.nivel_red;
--
-- 3) Resumen por estado:
--   select estado, count(*), sum(monto)
--     from comisiones
--    where pedido_id in (
--      select id from pedidos where notas like 'Recompra de activacion mensual junio 2026%'
--    )
--    group by estado;
-- ============================================================
