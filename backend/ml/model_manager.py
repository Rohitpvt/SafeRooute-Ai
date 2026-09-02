import json
import os
import threading
from typing import Any
import joblib
from app.logging_config import logger

ML_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__)))


class ModelManager:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls, *args, **kwargs):
        with cls._lock:
            if not cls._instance:
                cls._instance = super().__new__(cls, *args, **kwargs)
                cls._instance._initialized = False
            return cls._instance

    def __init__(self) -> None:
        if self._initialized:
            return

        self.model_path = os.path.join(ML_DIR, "model.joblib")
        self.preprocessor_path = os.path.join(ML_DIR, "preprocessor.joblib")
        self.schema_path = os.path.join(ML_DIR, "feature_schema.json")
        self.metadata_path = os.path.join(ML_DIR, "model_metadata.json")

        self.model: Any = None
        self.preprocessor: Any = None
        self.feature_schema: dict[str, Any] = {}
        self.metadata: dict[str, Any] = {}

        self._initialized = True

    def load_artifacts(self) -> None:
        """Loads and verifies all serialized model artifacts. Thread-safe.

        Fails fast if any artifact is missing or invalid.
        """
        with self._lock:
            if self.model is not None:
                return

            logger.info("Initializing ModelManager: Loading serialized ML artifacts...")

            # Verify presence of all required files
            required_files = [self.model_path, self.preprocessor_path, self.schema_path, self.metadata_path]
            for file_path in required_files:
                if not os.path.exists(file_path):
                    logger.critical(f"Critical ML artifact missing: {file_path}")
                    raise FileNotFoundError(f"Model manager initialization failed. Missing required file: {file_path}")
                if os.path.getsize(file_path) == 0:
                    logger.critical(f"Critical ML artifact file is empty: {file_path}")
                    raise ValueError(f"Model manager initialization failed. Artifact file is empty: {file_path}")

            try:
                # Load JSON metadata and schemas
                with open(self.schema_path) as sf:
                    self.feature_schema = json.load(sf)
                with open(self.metadata_path) as mf:
                    self.metadata = json.load(mf)

                # Verify schema format
                if "features" not in self.feature_schema:
                    raise ValueError("Invalid feature schema mapping: 'features' key missing.")

                # Load joblib binaries
                self.model = joblib.load(self.model_path)
                self.preprocessor = joblib.load(self.preprocessor_path)

                logger.info(
                    f"Successfully loaded Model version {self.metadata.get('model_version')} (Algorithm: {self.metadata.get('algorithm')})."
                )
            except Exception as e:
                logger.critical(f"Failed to parse or load ML artifacts: {str(e)}", exc_info=True)
                # Reset pointers to fail subsequent calls
                self.model = None
                self.preprocessor = None
                raise RuntimeError(f"Model manager failed to load: {str(e)}") from e

    def get_model(self) -> Any:
        if self.model is None:
            self.load_artifacts()
        return self.model

    def get_preprocessor(self) -> Any:
        if self.preprocessor is None:
            self.load_artifacts()
        return self.preprocessor

    def get_metadata(self) -> dict[str, Any]:
        if not self.metadata:
            self.load_artifacts()
        return self.metadata

    def get_feature_schema(self) -> dict[str, Any]:
        if not self.feature_schema:
            self.load_artifacts()
        return self.feature_schema

    def verify_health(self) -> bool:
        """Verifies if all artifacts are loaded successfully in memory."""
        return self.model is not None and self.preprocessor is not None and len(self.feature_schema) > 0


model_manager = ModelManager()
