"""Create application schema and session tracking fields."""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect

revision = "20260901_01"
down_revision = None
branch_labels = None
depends_on = None


def column_names(table_name):
    return {column["name"] for column in inspect(op.get_bind()).get_columns(table_name)}


def upgrade():
    tables = set(inspect(op.get_bind()).get_table_names())

    if "users" not in tables:
        op.create_table(
            "users",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("fullname", sa.String(100), nullable=False),
            sa.Column("email", sa.String(120), nullable=False, unique=True),
            sa.Column("password_hash", sa.String(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )
        op.create_index("ix_users_email", "users", ["email"], unique=True)

    if "questions" not in tables:
        op.create_table(
            "questions",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("field", sa.String(150)),
            sa.Column("subfield", sa.String(150)),
            sa.Column("subject", sa.String(150)),
            sa.Column("difficulty", sa.String(50)),
            sa.Column("question_text", sa.Text()),
            sa.Column("expected_answer", sa.Text()),
            sa.Column("source", sa.Text()),
        )

    if "interview_sessions" not in tables:
        op.create_table(
            "interview_sessions",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("field", sa.String(150)),
            sa.Column("difficulty", sa.String(50)),
            sa.Column("duration_minutes", sa.Integer()),
            sa.Column("status", sa.String(30), server_default="in_progress"),
            sa.Column("avg_eye_contact", sa.Float()),
            sa.Column("avg_confidence", sa.Float()),
            sa.Column("avg_engagement", sa.Float()),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
            sa.Column("completed_at", sa.DateTime(timezone=True)),
        )
        op.create_index("ix_interview_sessions_user_id", "interview_sessions", ["user_id"])
    else:
        existing = column_names("interview_sessions")
        for name, column_type in (("duration_minutes", sa.Integer()), ("avg_eye_contact", sa.Float()), ("avg_confidence", sa.Float()), ("avg_engagement", sa.Float())):
            if name not in existing:
                op.add_column("interview_sessions", sa.Column(name, column_type))

    if "interview_answers" not in tables:
        op.create_table(
            "interview_answers",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("interview_session_id", sa.Integer(), sa.ForeignKey("interview_sessions.id")),
            sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
            sa.Column("question_id", sa.Integer(), sa.ForeignKey("questions.id"), nullable=False),
            sa.Column("answer_text", sa.Text(), nullable=False),
            sa.Column("ai_feedback", sa.Text()),
            sa.Column("score", sa.Integer()),
            sa.Column("status", sa.String(30), nullable=False, server_default="answered"),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        )
        op.create_index("ix_interview_answers_session_id", "interview_answers", ["interview_session_id"])
        op.create_index("ix_interview_answers_user_id", "interview_answers", ["user_id"])
    else:
        existing = column_names("interview_answers")
        if "interview_session_id" not in existing:
            op.add_column("interview_answers", sa.Column("interview_session_id", sa.Integer(), sa.ForeignKey("interview_sessions.id")))
        if "status" not in existing:
            op.add_column("interview_answers", sa.Column("status", sa.String(30), nullable=False, server_default="answered"))


def downgrade():
    # Keep existing internship data safe; this baseline is intentionally non-destructive.
    pass
