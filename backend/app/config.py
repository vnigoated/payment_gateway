from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days

    SENDGRID_API_KEY: str = ""
    FROM_EMAIL: str = "invoices@example.com"
    FROM_NAME: str = "Invoice API"
    ADMIN_EMAIL: str = ""

    UPSTASH_REDIS_REST_URL: str = ""
    UPSTASH_REDIS_REST_TOKEN: str = ""

    APP_NAME: str = "Invoice API"
    APP_URL: str = "http://localhost:8000"
    ENVIRONMENT: str = "development"

    # Plan limits (invoices per month)
    FREE_INVOICE_LIMIT: int = 5
    GROQ_API_KEY: str = ""
    AI_SCAN_MODEL: str = "llama-3.2-11b-vision-preview"
    GEMINI_API_KEY: str = ""
    GEMINI_AI_SCAN_MODEL: str = "gemini-2.5-flash"

    class Config:
        env_file = ".env"


settings = Settings()
