"""Application settings."""
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/eam_local"
    DB_SCHEMA: str = "eam"
    PORT: int = 4000
    HOST: str = "0.0.0.0"

    # Auth configuration
    # SECURITY: defaults to False (auth enabled).  Set AUTH_DISABLED=true in
    # your .env ONLY for local development.  Never disable in production.
    AUTH_DISABLED: bool = False
    AUTH_DEV_USER: str = "dev_admin"  # Dev mode: fixed username (itcode)
    AUTH_DEV_ROLE: str = "admin"  # Dev mode: fixed role

    # Keycloak configuration (used when AUTH_DISABLED=False)
    KEYCLOAK_SERVER_URL: str = ""  # e.g. https://is-tdp-tst.lenovo.com/
    KEYCLOAK_REALM: str = "myapp"
    KEYCLOAK_CLIENT_ID: str = ""  # e.g. tap-eam-b
    KEYCLOAK_CLIENT_SECRET: str = ""
    KEYCLOAK_ALGORITHMS: str = "RS256"

    class Config:
        env_file = ".env"


settings = Settings()
