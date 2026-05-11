from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

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
    FRONTEND_URL: str = "http://localhost:3000"
    CORS_ORIGINS: str = "http://localhost:3000"
    ENVIRONMENT: str = "development"

    # Plan limits (invoices per month)
    FREE_INVOICE_LIMIT: int = 5

    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""
    RAZORPAY_WEBHOOK_SECRET: str = ""
    RAZORPAY_STARTER_PLAN_ID: str = ""
    RAZORPAY_PRO_PLAN_ID: str = ""

    GROQ_API_KEY: str = ""
    AI_SCAN_MODEL: str = "llama-3.2-11b-vision-preview"
    GEMINI_API_KEY: str = ""
    GEMINI_AI_SCAN_MODEL: str = "gemini-2.5-flash"

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    def validate_production_settings(self) -> None:
        if not self.is_production:
            return
        if len(self.SECRET_KEY) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters in production")
        if "*" in self.cors_origin_list:
            raise ValueError("CORS_ORIGINS must not contain '*' in production")
        if not self.RAZORPAY_KEY_ID or not self.RAZORPAY_KEY_SECRET or not self.RAZORPAY_WEBHOOK_SECRET:
            raise ValueError("Razorpay keys and webhook secret are required in production")


settings = Settings()
