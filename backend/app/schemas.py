from pydantic import BaseModel
from typing import List, Optional, Any

# Esquemas de validación de entrada/salida (Pydantic v2)
class TareaSync(BaseModel):
    id: Optional[str] = None
    tabla: str  # 'pacientes', 'historias', 'turnos', 'plantillas'
    accion: str # 'INSERT', 'UPDATE', 'DELETE'
    datos: Any  # Payload dinámico que contiene el objeto a sincronizar
    timestamp: int

class SyncPayload(BaseModel):
    queue: List[TareaSync]
