"""add razorpay subscriptions

Revision ID: 20260511_0001
Revises:
Create Date: 2026-05-11
"""

from alembic import op
import sqlalchemy as sa


revision = "20260511_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("razorpay_customer_id", sa.String(), nullable=True))
    op.add_column("users", sa.Column("razorpay_subscription_id", sa.String(), nullable=True))
    op.add_column("users", sa.Column("subscription_status", sa.String(), nullable=True))
    op.add_column("users", sa.Column("current_period_end", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_users_razorpay_subscription_id", "users", ["razorpay_subscription_id"])

    op.create_table(
        "razorpay_webhook_events",
        sa.Column("event_id", sa.String(), nullable=False),
        sa.Column("event_name", sa.String(), nullable=True),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("event_id"),
    )


def downgrade():
    op.drop_table("razorpay_webhook_events")
    op.drop_index("ix_users_razorpay_subscription_id", table_name="users")
    op.drop_column("users", "current_period_end")
    op.drop_column("users", "subscription_status")
    op.drop_column("users", "razorpay_subscription_id")
    op.drop_column("users", "razorpay_customer_id")
