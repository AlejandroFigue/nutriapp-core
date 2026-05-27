from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import Dict
import os
from dotenv import load_dotenv

from .database import engine, Base, get_db
from .schemas import SyncPayload
from .models import Paciente, HistoriaClinica, Turno, PlantillaPlan

load_dotenv()

# Crear las tablas físicas en SQLite en el arranque si no existen
Base.metadata.create_all(bind=engine)

app = FastAPI(title="NutriApp Core Backend", version="1.0.0")

# Configurar orígenes permitidos desde variables de entorno para seguridad CORS
origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Endpoint estrella: Sincronización Masiva Transaccional (Bulk Sync)
@app.post("/api/sync", status_code=status.HTTP_200_OK)
def procesar_sincronizacion(payload: SyncPayload, db: Session = Depends(get_db)):
    """
    Procesa en lote y de manera atómica todas las modificaciones realizadas
    por el profesional en la PWA mientras se encontraba offline.
    """
    mapa_modelos = {
        "pacientes": Paciente,
        "historias": HistoriaClinica,
        "turnos": Turno,
        "plantillas": PlantillaPlan
    }

    # Ordenamos por timestamp para asegurar el orden cronológico de las acciones
    tareas = sorted(payload.queue, key=lambda x: x.timestamp)

    try:
        for tarea in tareas:
            tabla_nombre = tarea.tabla
            if tabla_nombre not in mapa_modelos:
                continue

            modelo = mapa_modelos[tabla_nombre]
            datos_objeto = tarea.datos
            id_registro = datos_objeto.get("id")

            if not id_registro:
                continue

            # Limpiar campo 'sincronizado' que solo pertenece al cliente local
            datos_objeto.pop("sincronizado", None)

            if tarea.accion in ["INSERT", "UPDATE"]:
                # Operación Upsert nativa y eficiente para evitar duplicados
                registro_existente = db.query(modelo).filter(modelo.id == id_registro).first()
                if registro_existente:
                    for key, val in datos_objeto.items():
                        setattr(registro_existente, key, val)
                else:
                    nuevo_registro = modelo(**datos_objeto)
                    db.add(nuevo_registro)

            elif tarea.accion == "DELETE":
                db.query(modelo).filter(modelo.id == id_registro).delete()

        # Confirmar todos los cambios en la base de datos de manera segura
        db.commit()
        return {"status": "success", "processed_items": len(tareas)}

    except Exception as e:
        db.rollback()  # Si algo falla en el lote, cancelamos todo para no corromper datos
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Fallo en la transacción de sincronización: {str(e)}"
        )

@app.get("/api/health")
def estado_servidor():
    return {"status": "healthy", "database": "connected"}
