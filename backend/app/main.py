from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, ValidationError
from sqlalchemy.orm import Session
from typing import Optional
import os
import json
import urllib.request
import urllib.error
from dotenv import load_dotenv

from .database import engine, Base, get_db
from .schemas import SyncPayload, SyncResponse, MAPA_SCHEMAS
from .models import (  # noqa: F401 — importar todos para que create_all los registre
    Paciente,
    HistoriaClinica,
    Turno,
    PlanAlimentario,
    PlantillaPlan,
    PacienteSincro,
)

load_dotenv()

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="NutriApp Core Backend",
    version="2.0.0",
    docs_url="/api/docs",
    redoc_url=None,
    openapi_url="/api/openapi.json",
)

origins = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Content-Type", "Authorization", "Accept"],
)

# ---------------------------------------------------------------------------
# Seguridad — Autenticación Google OAuth2 (ID Token)
# ---------------------------------------------------------------------------

_bearer_scheme = HTTPBearer(auto_error=False)

_GOOGLE_TOKENINFO = "https://oauth2.googleapis.com/tokeninfo?id_token={}"


class UsuarioProfesional(BaseModel):
    email: str
    nombre: str
    foto: str = ""


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer_scheme),
) -> UsuarioProfesional:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Se requiere autenticación",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    url = _GOOGLE_TOKENINFO.format(token)

    try:
        req = urllib.request.Request(url, headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data: dict = json.loads(resp.read().decode())
    except urllib.error.HTTPError:
        # Google devuelve 400/401 cuando el token es inválido o expiró
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No se pudo verificar la identidad con Google",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Google devuelve email_verified como string "true"
    if str(data.get("email_verified", "false")).lower() != "true":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="La cuenta de Google no está verificada",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Validación de audiencia: si GOOGLE_CLIENT_ID está configurado en .env,
    # se verifica que el token pertenezca a esta aplicación específica.
    google_client_id = os.getenv("GOOGLE_CLIENT_ID", "")
    if google_client_id and data.get("aud") != google_client_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token no autorizado para esta aplicación",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return UsuarioProfesional(
        email=data.get("email", ""),
        nombre=data.get("name", ""),
        foto=data.get("picture", ""),
    )


# ---------------------------------------------------------------------------
# Mapas internos
# ---------------------------------------------------------------------------

_MAPA_MODELOS = {
    "pacientes": Paciente,
    "historias": HistoriaClinica,
    "turnos": Turno,
    "planes": PlanAlimentario,
}


# ---------------------------------------------------------------------------
# Endpoints públicos (sin autenticación)
# ---------------------------------------------------------------------------


@app.get("/")
def raiz():
    return {"status": "online", "version": "2.0.0", "region": "Posadas, Misiones"}


@app.get("/api/health")
def estado_servidor():
    return {"status": "healthy", "database": "connected"}


# ---------------------------------------------------------------------------
# Endpoint protegido — sincronización masiva (requiere token Google válido)
# ---------------------------------------------------------------------------


@app.post("/api/sync", response_model=SyncResponse, status_code=status.HTTP_200_OK)
def procesar_sincronizacion(
    payload: SyncPayload,
    db: Session = Depends(get_db),
    usuario: UsuarioProfesional = Depends(get_current_user),
):
    tareas = sorted(payload.queue, key=lambda t: t.timestamp)
    synced_ids: list[str] = []

    try:
        for tarea in tareas:
            modelo = _MAPA_MODELOS[tarea.tabla]

            if tarea.accion in ("CREATE", "UPDATE"):
                # Valida tipos y coerciones según el schema de tabla; exclude_unset evita
                # sobreescribir campos con None cuando el cliente no los envió (UPDATE parcial)
                datos = (
                    MAPA_SCHEMAS[tarea.tabla]
                    .model_validate(tarea.datos)
                    .model_dump(exclude_unset=True)
                )
            else:
                datos = dict(tarea.datos)

            id_registro = datos.get("id")
            if not id_registro:
                raise ValueError(
                    f"Campo 'id' ausente en tarea tabla='{tarea.tabla}' accion='{tarea.accion}'"
                )

            columnas_validas = {col.name for col in modelo.__table__.columns}
            datos_filtrados = {k: v for k, v in datos.items() if k in columnas_validas}

            if tarea.accion in ("CREATE", "UPDATE"):
                registro = db.query(modelo).filter(modelo.id == id_registro).first()
                if registro:
                    for campo, valor in datos_filtrados.items():
                        setattr(registro, campo, valor)
                else:
                    db.add(modelo(**datos_filtrados))
            elif tarea.accion == "DELETE":
                db.query(modelo).filter(modelo.id == id_registro).delete(
                    synchronize_session=False
                )

            synced_ids.append(id_registro)

        db.commit()
        return SyncResponse(
            status="success",
            synced_ids=synced_ids,
            processed_items=len(synced_ids),
        )

    except ValidationError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Error de validación en datos médicos: {exc.error_count()} campo(s) inválido(s) — {exc.errors()[0]['loc']}",
        )
    except (ValueError, KeyError) as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Datos inválidos en el lote de sincronización: {exc}",
        )
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error interno al procesar la sincronización: {exc}",
        )
