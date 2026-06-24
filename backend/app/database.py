import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv

load_dotenv()

# Point to a local file in the project directory
DATABASE_URL = "sqlite:///./lifesaver.db"

engine = create_engine(
    DATABASE_URL, connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependency utility to yield database sessions to API endpoints
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()