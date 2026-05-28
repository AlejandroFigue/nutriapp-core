from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import os
from dotenv import load_dotenv

from .database import engine, Base, get_db
from .schemas import SyncPayload
from .models import Paciente, HistoriaClinica, Turno, PlantillaPlan, PacienteSincro  # noqa: F401

load_dotenv()

# Materializa todas las tablas definidas en los modelos (idempotente)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="NutriApp Core Backend",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url=None,
    openapi_url="/api/openapi.json",
)

origins = [
    origin.strip()
    for origin in os.getenv(
        "ALLOWED_ORIGINS", "http://localhost:5173"
    ).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Content-Type", "Authorization", "Accept"],
)


@app.get("/")
def raiz():
    return {"status": "online", "version": "1.0.0", "region": "Posadas, Misiones"}


@app.get("/api/health")
def estado_servidor():
    return {"status": "healthy", "database": "connected"}


@app.post("/api/sync", status_code=status.HTTP_200_OK)
def procesar_sincronizacion(payload: SyncPayload, db: Session = Depends(get_db)):
    mapa_modelos = {
        "pacientes": Paciente,
        "historias": HistoriaClinica,
        "turnos": Turno,
        "plantillas": PlantillaPlan,
    }

    tareas = sorted(payload.queue, key=lambda t: t.timestamp)

    try:
        for tarea in tareas:
            if tarea.tabla not in mapa_modelos:
                continue

            modelo = mapa_modelos[tarea.tabla]
            datos = tarea.datos
            id_registro = datos.get("id")

            if not id_registro:
                continue

            datos.pop("sincronizado", None)

            if tarea.accion in ("INSERT", "UPDATE"):
                registro = db.query(modelo).filter(modelo.id == id_registro).first()
                if registro:
                    for key, val in datos.items():
                        setattr(registro, key, val)
                else:
                    db.add(modelo(**datos))
            elif tarea.accion == "DELETE":
                db.query(modelo).filter(modelo.id == id_registro).delete()

        db.commit()
        return {"status": "success", "processed_items": len(tareas)}

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Fallo en la transacción de sincronización: {str(e)}",
        )
