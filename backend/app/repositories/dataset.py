from app.models.dataset import DatasetMetadata
from app.repositories.base import BaseRepository


class DatasetRepository(BaseRepository[DatasetMetadata]):
    def __init__(self):
        super().__init__(DatasetMetadata)


dataset_repo = DatasetRepository()
