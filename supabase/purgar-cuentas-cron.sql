-- Programa el borrado diario de la papelera (se ejecuta UNA vez, a mano, en el
-- SQL Editor de Supabase). NO subir a git con el secreto real: reemplazá
-- TU_SECRETO por el mismo valor que cargaste como CRON_SECRET en la función.
--
-- Antes: Database > Extensions > activar "pg_cron" y "pg_net".

select cron.schedule(
  'purgar-cuentas',
  '0 5 * * *',  -- todos los días a las 05:00 UTC (02:00 en Argentina)
  $$
  select net.http_post(
    url := 'https://pgnxanjiswmytdocdhuw.supabase.co/functions/v1/purgar-cuentas',
    headers := jsonb_build_object('x-cron-secret', 'TU_SECRETO', 'Content-Type', 'application/json'),
    body := '{}'::jsonb
  );
  $$
);

-- Para ver si corrió:  select * from cron.job_run_details order by start_time desc limit 5;
-- Para quitarlo:       select cron.unschedule('purgar-cuentas');
