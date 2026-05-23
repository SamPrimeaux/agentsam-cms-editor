import json
from js import Response


def json_response(data, status=200):
    return Response.new(
        json.dumps(data, indent=2),
        status=status,
        headers={
            "content-type": "application/json; charset=utf-8",
            "cache-control": "no-store",
            "access-control-allow-origin": "*",
        },
    )


def cors_preflight():
    return Response.new(
        None,
        status=204,
        headers={
            "access-control-allow-origin": "*",
            "access-control-allow-methods": "GET,POST,OPTIONS",
            "access-control-allow-headers": "content-type",
        },
    )
