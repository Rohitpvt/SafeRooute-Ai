"""Phase 1 Spatial Tables Migration

Revision ID: 001_phase1_spatial
Revises: 
Create Date: 2026-08-31 23:25:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from geoalchemy2 import Geometry


# revision identifiers, used by Alembic.
revision: str = '001_phase1_spatial'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Enable PostGIS extension if running on PostgreSQL
    bind = op.get_bind()
    if bind.dialect.name == 'postgresql':
        op.execute("CREATE EXTENSION IF NOT EXISTS postgis;")

    # 2. Create road_segments table
    op.create_table(
        'road_segments',
        sa.Column('id', sa.UUID(), nullable=False, primary_key=True),
        sa.Column('osm_way_id', sa.BigInteger(), nullable=False),
        sa.Column('road_name', sa.String(length=255), nullable=True),
        sa.Column('road_type', sa.String(length=50), nullable=False),
        sa.Column('lanes', sa.Integer(), nullable=False, server_default='1'),
        sa.Column('speed_limit', sa.Integer(), nullable=False, server_default='50'),
        sa.Column('is_junction', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('is_lit', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('h3_index', sa.String(length=15), nullable=False),
        sa.Column('geometry_wkt', sa.Text(), nullable=True),
        sa.Column('geom', Geometry(geometry_type='LINESTRING', srid=4326, spatial_index=True), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('ix_road_segments_osm_way_id', 'road_segments', ['osm_way_id'], unique=True)
    op.create_index('ix_road_segments_road_type', 'road_segments', ['road_type'], unique=False)
    op.create_index('ix_road_segments_h3_index', 'road_segments', ['h3_index'], unique=False)

    # 3. Create accident_records table
    op.create_table(
        'accident_records',
        sa.Column('id', sa.UUID(), nullable=False, primary_key=True),
        sa.Column('source_name', sa.String(length=100), nullable=False),
        sa.Column('source_record_id', sa.String(length=100), nullable=True),
        sa.Column('dataset_mode', sa.String(length=30), nullable=False, server_default='RESEARCH_REAL'),
        sa.Column('original_timestamp', sa.DateTime(), nullable=False),
        sa.Column('severity', sa.String(length=20), nullable=False, server_default='Minor'),
        sa.Column('latitude', sa.Float(), nullable=False),
        sa.Column('longitude', sa.Float(), nullable=False),
        sa.Column('matched_osm_way_id', sa.BigInteger(), nullable=True),
        sa.Column('match_distance_meters', sa.Float(), nullable=True),
        sa.Column('h3_index', sa.String(length=15), nullable=False),
        sa.Column('is_quarantined', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('quarantine_reason', sa.String(length=255), nullable=True),
        sa.Column('geometry_wkt', sa.Text(), nullable=True),
        sa.Column('geom', Geometry(geometry_type='POINT', srid=4326, spatial_index=True), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
    )
    op.create_index('ix_accident_records_source_name', 'accident_records', ['source_name'], unique=False)
    op.create_index('ix_accident_records_source_record_id', 'accident_records', ['source_record_id'], unique=False)
    op.create_index('ix_accident_records_dataset_mode', 'accident_records', ['dataset_mode'], unique=False)
    op.create_index('ix_accident_records_original_timestamp', 'accident_records', ['original_timestamp'], unique=False)
    op.create_index('ix_accident_records_matched_osm_way_id', 'accident_records', ['matched_osm_way_id'], unique=False)
    op.create_index('ix_accident_records_h3_index', 'accident_records', ['h3_index'], unique=False)
    op.create_index('ix_accident_records_is_quarantined', 'accident_records', ['is_quarantined'], unique=False)

    # 4. Create weather_observations table
    op.create_table(
        'weather_observations',
        sa.Column('id', sa.UUID(), nullable=False, primary_key=True),
        sa.Column('h3_index', sa.String(length=15), nullable=False),
        sa.Column('timestamp', sa.DateTime(), nullable=False),
        sa.Column('temperature_c', sa.Float(), nullable=True),
        sa.Column('precipitation_mm', sa.Float(), nullable=True),
        sa.Column('visibility_meters', sa.Float(), nullable=True),
        sa.Column('weather_code', sa.Integer(), nullable=True),
        sa.Column('weather_condition', sa.String(length=50), nullable=False, server_default='Clear'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.UniqueConstraint('h3_index', 'timestamp', name='uq_weather_h3_timestamp'),
    )
    op.create_index('ix_weather_observations_h3_index', 'weather_observations', ['h3_index'], unique=False)
    op.create_index('ix_weather_observations_timestamp', 'weather_observations', ['timestamp'], unique=False)


def downgrade() -> None:
    op.drop_table('weather_observations')
    op.drop_table('accident_records')
    op.drop_table('road_segments')
