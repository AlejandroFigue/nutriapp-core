/**
 * Planes — pestaña del plan alimentario del paciente seleccionado.
 *
 * Lee el `pacienteId` del store global (establecido al seleccionar un paciente
 * en la pestaña Pacientes) y delega en PlanAlimentario.
 *
 * Si no hay paciente seleccionado, PlanAlimentario muestra su propio estado vacío.
 */
import { useUIStore } from '@/store/useUIStore'
import PlanAlimentario from '@/components/PlanAlimentario'

export default function Planes() {
  const pacienteId = useUIStore((s) => s.pacienteId)
  return <PlanAlimentario pacienteId={pacienteId} />
}
