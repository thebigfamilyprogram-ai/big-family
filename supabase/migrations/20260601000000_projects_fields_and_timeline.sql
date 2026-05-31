-- Add missing columns to projects table
alter table projects
  add column if not exists plan_continuidad            text,
  add column if not exists big_leader_model_reflection text;

-- Día de Liderazgo 2026 — preserved in public timeline
insert into timeline_events (title, description, event_date)
values (
  'Primer Día de Liderazgo 2026',
  'Evento especial donde estudiantes de los 8 colegios presentaron sus proyectos capstone ante jurados, coordinadores y familias. Más de 200 participantes.',
  '2026-05-16'
)
on conflict do nothing;
