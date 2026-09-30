"""add failed status to contractstatus enum

Revision ID: 56327c736d47
Revises: 80bd7a9b2071
Create Date: 2026-09-09 08:23:04.679258

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '56327c736d47'
down_revision: Union[str, Sequence[str], None] = '80bd7a9b2071'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.execute("ALTER TYPE contractstatus ADD VALUE IF NOT EXISTS 'failed'")
    
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
