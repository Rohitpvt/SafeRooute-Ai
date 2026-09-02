import json
import logging
import os
import sys
from datetime import datetime
from app.config import settings


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        log_payload = {
            "timestamp": datetime.utcfromtimestamp(record.created).isoformat() + "Z",
            "level": record.levelname,
            "message": record.getMessage(),
            "module": record.module,
            "filename": record.filename,
            "line_number": record.lineno,
            "process": record.process,
            "thread": record.threadName,
        }
        if record.exc_info:
            log_payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_payload)


def setup_logging() -> logging.Logger:
    log_level = logging.DEBUG if settings.ENVIRONMENT == "development" else logging.INFO

    # Prepare root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)

    # Clear existing handlers
    root_logger.handlers = []

    # Console Handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(log_level)

    if settings.ENVIRONMENT == "production":
        console_handler.setFormatter(JsonFormatter())
    else:
        standard_formatter = logging.Formatter(
            "[%(asctime)s] %(levelname)s in %(module)s (%(filename)s:%(lineno)d): %(message)s"
        )
        console_handler.setFormatter(standard_formatter)

    root_logger.addHandler(console_handler)

    # File Handler
    log_dir = "logs"
    if not os.path.exists(log_dir):
        os.makedirs(log_dir)

    file_handler = logging.FileHandler(os.path.join(log_dir, "saferoute.log"), encoding="utf-8")
    file_handler.setLevel(log_level)

    if settings.ENVIRONMENT == "production":
        file_handler.setFormatter(JsonFormatter())
    else:
        standard_formatter = logging.Formatter(
            "[%(asctime)s] %(levelname)s in %(module)s: %(message)s"
        )
        file_handler.setFormatter(standard_formatter)

    root_logger.addHandler(file_handler)

    # Configure third-party loggers to prevent noise
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.error").setLevel(logging.INFO)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

    logger = logging.getLogger("saferoute_app")
    logger.info(
        f"Logging initialized in {settings.ENVIRONMENT} mode. Level: {logging.getLevelName(log_level)}"
    )
    return logger


logger = setup_logging()
