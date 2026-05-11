from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import settings

engine_kwargs = {}
if settings.DATABASE_URL.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}
    if settings.DATABASE_URL in {"sqlite://", "sqlite:///:memory:"}:
        engine_kwargs["poolclass"] = StaticPool

engine = create_engine(settings.DATABASE_URL, **engine_kwargs)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ensure_subscription_columns() -> None:
    """Add nullable billing columns for older dev databases created before billing."""
    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return

    existing = {column["name"] for column in inspector.get_columns("users")}
    if settings.DATABASE_URL.startswith("postgresql"):
        column_types = {
            "razorpay_customer_id": "VARCHAR",
            "razorpay_subscription_id": "VARCHAR",
            "subscription_status": "VARCHAR",
            "current_period_end": "TIMESTAMP WITH TIME ZONE",
        }
    else:
        column_types = {
            "razorpay_customer_id": "VARCHAR",
            "razorpay_subscription_id": "VARCHAR",
            "subscription_status": "VARCHAR",
            "current_period_end": "DATETIME",
        }

    missing = [name for name in column_types if name not in existing]
    if not missing:
        return

    with engine.begin() as conn:
        for name in missing:
            conn.execute(text(f"ALTER TABLE users ADD COLUMN {name} {column_types[name]}"))
