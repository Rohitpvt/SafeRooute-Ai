from sqlalchemy.types import TypeDecorator, Text
from geoalchemy2 import Geometry


class SafeGeometry(TypeDecorator):
    """Custom Geometry TypeDecorator that renders native PostGIS Geometry on PostgreSQL
    and a lightweight Text column on SQLite to ensure 100% SQLite test suite compatibility
    without spatialite DDL dependencies.
    """

    impl = Text
    cache_ok = True

    def __init__(self, geometry_type: str = "GEOMETRY", srid: int = 4326, **kwargs):
        super().__init__()
        self.geometry_type = geometry_type
        self.srid = srid
        self.kwargs = kwargs

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(
                Geometry(geometry_type=self.geometry_type, srid=self.srid, **self.kwargs)
            )
        return dialect.type_descriptor(Text())
