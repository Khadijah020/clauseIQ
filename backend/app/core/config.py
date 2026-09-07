from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    env: str = "development"
    secret_key: str = "change-me"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440

    database_url: str = "postgresql+asyncpg://clauseiq:clauseiq@localhost:5432/clauseiq"

    redis_url: str = "redis://localhost:6379/0"
    celery_broker_url: str = "redis://localhost:6379/0"
    celery_result_backend: str = "redis://localhost:6379/1"

    gemini_api_key: str = ""
    embedding_model: str = "text-embedding-004"

    upload_dir: str = "./uploads"

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)

    secret_key: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

settings = Settings()