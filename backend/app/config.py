"""Application settings."""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/eam_local"
    DB_SCHEMA: str = "eam"
    PORT: int = 4000
    HOST: str = "0.0.0.0"

    class Config:
        env_file = ".env"


settings = Settings()
