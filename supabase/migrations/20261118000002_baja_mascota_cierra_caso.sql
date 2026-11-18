-- Dar de baja una mascota cierra su caso de pérdida abierto (2026-11-18).
--
-- "Eliminar mascota" la da de baja (activa = false, baja lógica), pero un caso
-- `perdida` o `posible_perdida` que tuviera abierto quedaba abierto para
-- siempre: la ficha ya no responde (ficha_publica pide activa), así que nadie
-- podía avisar ni cerrarlo, y sumaba un caso fantasma a "casos abiertos" en
-- las estadísticas. Pasó con Liliana (cuenta de prueba de Ariel).
--
-- Se resuelve en la base, con un trigger, para que valga por cualquier camino
-- (el panel, la API, una pantalla futura). Mismo criterio que un cierre
-- normal: estado 'cerrada' y cerrado_en; sin agradecimiento, foto ni
-- rescatista.

create or replace function public.cerrar_casos_de_mascota_dada_de_baja()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  update casos_perdida
     set estado = 'cerrada', cerrado_en = now()
   where mascota_id = new.id
     and estado in ('posible_perdida', 'perdida');
  return new;
end;
$$;
revoke all on function public.cerrar_casos_de_mascota_dada_de_baja() from public, anon, authenticated;

drop trigger if exists mascotas_baja_cierra_caso on public.mascotas;
create trigger mascotas_baja_cierra_caso
  after update of activa on public.mascotas
  for each row
  when (old.activa and not new.activa)
  execute function public.cerrar_casos_de_mascota_dada_de_baja();

-- El caso fantasma que ya existía (Liliana, dada de baja con el caso abierto).
update public.casos_perdida
   set estado = 'cerrada', cerrado_en = now()
 where id = 'd7235c62-1fb9-40f6-87a5-4d35b9f81983'
   and estado in ('posible_perdida', 'perdida');
