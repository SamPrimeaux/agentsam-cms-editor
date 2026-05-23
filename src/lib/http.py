import json

from workers import Response

_CORS_HEADERS = {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type",
}


def json_response(data, status=200):
    return Response(
        json.dumps(data, indent=2),
        status=status,
        headers={
            "content-type": "application/json; charset=utf-8",
            "cache-control": "no-store",
            **_CORS_HEADERS,
        },
    )


def cors_preflight():
    return Response("", status=204, headers=_CORS_HEADERS)
