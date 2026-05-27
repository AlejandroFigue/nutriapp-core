import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./nutriapp.db")

# El argumento connect_args es crucial para SQLite en entornos multihilo
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Dependencia para el manejo seguro de sesiones en los endpoints
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
