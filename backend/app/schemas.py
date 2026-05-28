from pydantic import BaseModel, ConfigDict
from typing import Any, Dict, List, Literal, Optional


class PacienteSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    nombre: str
    email: str
    telefono: Optional[str] = None


class HistoriaClinicaSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    pacienteId: str
    fecha: str
    peso: float
    altura: float
    grasa: Optional[float] = None
    musculo: Optional[float] = None
    imc: float


class TurnoSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    pacienteId: str
    fecha: str
    hora: str
    estado: str = "Pendiente"
    motivo: Optional[str] = None


class PlanAlimentarioSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    pacienteId: str
    fecha: str
    desayuno: Optional[str] = None
    almuerzo: Optional[str] = None
    merienda: Optional[str] = None
    cena: Optional[str] = None
    indicaciones: Optional[str] = None
    costoEstimado: Optional[float] = None  # Motor de costos regional Posadas, Misiones


class TareaSync(BaseModel):
    id: Optional[str] = None
    tabla: Literal["pacientes", "historias", "turnos", "planes"]
    accion: Literal["CREATE", "UPDATE", "DELETE"]
    datos: Dict[str, Any]
    timestamp: int


class SyncPayload(BaseModel):
    queue: List[TareaSync]


class SyncResponse(BaseModel):
    status: str
    synced_ids: List[str]
    processed_items: int


# Mapa de schemas para validación tipada de datos por tabla en el endpoint /api/sync
MAPA_SCHEMAS: dict[str, type[BaseModel]] = {
    "pacientes": PacienteSchema,
    "historias": HistoriaClinicaSchema,
    "turnos": TurnoSchema,
    "planes": PlanAlimentarioSchema,
}
