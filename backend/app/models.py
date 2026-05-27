from sqlalchemy import Column, String, Float, Integer, ForeignKey, Text
from .database import Base

# Estructuras relacionales idénticas a los almacenes indexados de IndexedDB (PWA)
class Paciente(Base):
    __tablename__ = "pacientes"
    id = Column(String, primary_key=True, index=True)
    nombre = Column(String, nullable=False)
    email = Column(String, nullable=False)
    telefono = Column(String, nullable=True)

class HistoriaClinica(Base):
    __tablename__ = "historias"
    id = Column(String, primary_key=True, index=True)
    pacienteId = Column(String, ForeignKey("pacientes.id"), nullable=False)
    fecha = Column(String, nullable=False)
    peso = Column(Float, nullable=False)
    altura = Column(Float, nullable=False)
    grasa = Column(Float, nullable=True)
    musculo = Column(Float, nullable=True)
    imc = Column(Float, nullable=False)

class Turno(Base):
    __tablename__ = "turnos"
    id = Column(String, primary_key=True, index=True)
    pacienteId = Column(String, ForeignKey("pacientes.id"), nullable=False)
    fecha = Column(String, nullable=False)
    hora = Column(String, nullable=False)
    motivo = Column(String, nullable=True)
    estado = Column(String, default="Pendiente")

class PlantillaPlan(Base):
    __tablename__ = "plantillas"
    id = Column(String, primary_key=True, index=True)
    nombre_plantilla = Column(String, nullable=False)
    desayuno = Column(Text, nullable=True)
    almuerzo = Column(Text, nullable=True)
    merienda = Column(Text, nullable=True)
    cena = Column(Text, nullable=True)
    consejos = Column(Text, nullable=True)
