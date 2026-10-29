-- AforoON · borrar a una persona del equipo no debe trabarse.
-- Quien aprobó una capacitación o registró un acceso queda como referencia en esas filas.
-- Si esa persona borra su cuenta (Ley 21.719), la aprobación y el acceso se mantienen, pero
-- sin decir quién los hizo.

alter table inscripciones_capacitacion
  drop constraint inscripciones_capacitacion_aprobada_por_fkey,
  add constraint inscripciones_capacitacion_aprobada_por_fkey foreign key (aprobada_por) references personas (id) on delete set null;

alter table accesos
  drop constraint accesos_registrado_por_fkey,
  add constraint accesos_registrado_por_fkey foreign key (registrado_por) references personas (id) on delete set null;
