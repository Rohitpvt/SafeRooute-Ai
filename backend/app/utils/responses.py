import uuid
from datetime import datetime
from typing import Any
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse


def build_api_response(
    success: bool,
    message: str,
    data: Any = None,
    errors: Any = None,
    status_code: int = 200,
    request_id: str = None,
) -> JSONResponse:
    payload = {
        "success": success,
        "message": message,
        "data": data if data is not None else {},
        "errors": errors,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "request_id": request_id or str(uuid.uuid4()),
    }
    # Wrap in jsonable_encoder to handle UUIDs, Enums, Datetimes, etc.
    return JSONResponse(status_code=status_code, content=jsonable_encoder(payload))
