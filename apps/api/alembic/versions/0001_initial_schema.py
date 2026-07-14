"""initial_schema

Revision ID: 0001
Revises: 
Create Date: 2026-07-14 16:45:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create companies table
    op.create_table(
        'companies',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('name', sa.String(length=150), nullable=False),
        sa.Column('slug', sa.String(length=100), nullable=False),
        sa.Column('status', sa.String(length=20), server_default='ACTIVE', nullable=False),
        sa.Column('contact_email', sa.String(length=150), nullable=True),
        sa.Column('website', sa.String(length=150), nullable=True),
        sa.Column('support_phone', sa.String(length=50), nullable=True),
        sa.Column('logo_url', sa.String(length=255), nullable=True),
        sa.Column('timezone', sa.String(length=100), server_default='UTC', nullable=False),
        sa.Column('date_format', sa.String(length=30), server_default='YYYY-MM-DD', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_companies_slug'), 'companies', ['slug'], unique=True)
    op.create_index(op.f('ix_companies_status'), 'companies', ['status'], unique=False)

    # 2. Create users table
    op.create_table(
        'users',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('company_id', sa.UUID(), nullable=False),
        sa.Column('full_name', sa.String(length=150), nullable=False),
        sa.Column('email', sa.String(length=150), nullable=False),
        sa.Column('password_hash', sa.Text(), nullable=False),
        sa.Column('role', sa.String(length=20), server_default='ADMIN', nullable=False),
        sa.Column('status', sa.String(length=20), server_default='ACTIVE', nullable=False),
        sa.Column('last_login_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_company_id'), 'users', ['company_id'], unique=False)
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=False)
    op.create_index(op.f('ix_users_status'), 'users', ['status'], unique=False)
    op.create_unique_constraint('uq_users_company_email', 'users', ['company_id', 'email'])

    # 3. Create devices table
    op.create_table(
        'devices',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('company_id', sa.UUID(), nullable=False),
        sa.Column('device_name', sa.String(length=100), nullable=False),
        sa.Column('serial_number', sa.String(length=150), nullable=False),
        sa.Column('android_version', sa.String(length=30), nullable=True),
        sa.Column('app_version', sa.String(length=30), nullable=True),
        sa.Column('department', sa.String(length=100), nullable=True),
        sa.Column('device_type', sa.String(length=20), server_default='PHONE', nullable=False),
        sa.Column('pairing_status', sa.String(length=20), server_default='UNPAIRED', nullable=False),
        sa.Column('status', sa.String(length=20), server_default='PENDING_SYNC', nullable=False),
        sa.Column('last_sync_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_devices_company_id'), 'devices', ['company_id'], unique=False)
    op.create_index(op.f('ix_devices_last_sync_at'), 'devices', ['last_sync_at'], unique=False)
    op.create_index(op.f('ix_devices_pairing_status'), 'devices', ['pairing_status'], unique=False)
    op.create_index(op.f('ix_devices_serial_number'), 'devices', ['serial_number'], unique=True)
    op.create_index(op.f('ix_devices_status'), 'devices', ['status'], unique=False)

    # 4. Create pairing_tokens table
    op.create_table(
        'pairing_tokens',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('company_id', sa.UUID(), nullable=False),
        sa.Column('device_id', sa.UUID(), nullable=False),
        sa.Column('token', sa.String(length=255), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['device_id'], ['devices.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_pairing_tokens_company_id'), 'pairing_tokens', ['company_id'], unique=False)
    op.create_index(op.f('ix_pairing_tokens_device_id'), 'pairing_tokens', ['device_id'], unique=False)
    op.create_index(op.f('ix_pairing_tokens_token'), 'pairing_tokens', ['token'], unique=True)

    # 5. Create gps_logs table
    op.create_table(
        'gps_logs',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('company_id', sa.UUID(), nullable=False),
        sa.Column('device_id', sa.UUID(), nullable=False),
        sa.Column('latitude', sa.Numeric(precision=10, scale=7), nullable=False),
        sa.Column('longitude', sa.Numeric(precision=10, scale=7), nullable=False),
        sa.Column('accuracy', sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column('recorded_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('synced_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['device_id'], ['devices.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_gps_logs_company_id'), 'gps_logs', ['company_id'], unique=False)
    op.create_index(op.f('ix_gps_logs_device_id'), 'gps_logs', ['device_id'], unique=False)
    op.create_index(op.f('ix_gps_logs_recorded_at'), 'gps_logs', ['recorded_at'], unique=False)
    op.create_index('idx_gps_logs_device_recorded', 'gps_logs', ['device_id', 'recorded_at'], unique=False)

    # 6. Create battery_logs table
    op.create_table(
        'battery_logs',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('company_id', sa.UUID(), nullable=False),
        sa.Column('device_id', sa.UUID(), nullable=False),
        sa.Column('battery_level', sa.SmallInteger(), nullable=False),
        sa.Column('charging', sa.Boolean(), nullable=False),
        sa.Column('recorded_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('synced_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['device_id'], ['devices.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_battery_logs_company_id'), 'battery_logs', ['company_id'], unique=False)
    op.create_index(op.f('ix_battery_logs_device_id'), 'battery_logs', ['device_id'], unique=False)
    op.create_index(op.f('ix_battery_logs_recorded_at'), 'battery_logs', ['recorded_at'], unique=False)

    # 7. Create network_logs table
    op.create_table(
        'network_logs',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('company_id', sa.UUID(), nullable=False),
        sa.Column('device_id', sa.UUID(), nullable=False),
        sa.Column('network_type', sa.String(length=20), nullable=False),
        sa.Column('is_online', sa.Boolean(), nullable=False),
        sa.Column('recorded_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('synced_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['device_id'], ['devices.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_network_logs_company_id'), 'network_logs', ['company_id'], unique=False)
    op.create_index(op.f('ix_network_logs_device_id'), 'network_logs', ['device_id'], unique=False)
    op.create_index(op.f('ix_network_logs_recorded_at'), 'network_logs', ['recorded_at'], unique=False)


def downgrade() -> None:
    op.drop_table('network_logs')
    op.drop_table('battery_logs')
    op.drop_table('gps_logs')
    op.drop_table('pairing_tokens')
    op.drop_table('devices')
    op.drop_table('users')
    op.drop_table('companies')
