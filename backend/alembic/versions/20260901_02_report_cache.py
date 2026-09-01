"""Add cached final report fields."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision = "20260901_02"
down_revision = "20260901_01"
branch_labels = None
depends_on = None


def upgrade():
    existing = {column["name"] for column in inspect(op.get_bind()).get_columns("interview_sessions")}
    if "report_summary" not in existing:
        op.add_column("interview_sessions", sa.Column("report_summary", sa.Text()))
    if "report_generated_at" not in existing:
        op.add_column("interview_sessions", sa.Column("report_generated_at", sa.DateTime(timezone=True)))


def downgrade():
    existing = {column["name"] for column in inspect(op.get_bind()).get_columns("interview_sessions")}
    if "report_generated_at" in existing:
        op.drop_column("interview_sessions", "report_generated_at")
    if "report_summary" in existing:
        op.drop_column("interview_sessions", "report_summary")
