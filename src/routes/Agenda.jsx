/**
 * Agenda — pestaña de la agenda médica de turnos.
 *
 * Wrapper fino que renderiza AgendaTurnos.
 * AgendaTurnos es autocontenido: carga pacientes y turnos de Dexie directamente.
 */
import AgendaTurnos from '@/components/AgendaTurnos'

export default function Agenda() {
  return <AgendaTurnos />
}
