"""Request middleware — OpenTelemetry trace_id correlation."""
import uuid
from typing import Callable

from django.http import HttpRequest, HttpResponse


class RequestIdMiddleware:
    """
    Добавляет trace_id к каждому запросу.
    В production заменяется на OpenTelemetry trace_id (§18, §5 v1.6).
    """

    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]) -> None:
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        trace_id = request.headers.get("X-Trace-Id") or str(uuid.uuid4())
        request.trace_id = trace_id  # type: ignore[attr-defined]
        response = self.get_response(request)
        response["X-Trace-Id"] = trace_id
        return response
