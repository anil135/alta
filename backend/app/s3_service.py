import re
from collections.abc import Iterable
from typing import Any

import boto3
from botocore.client import BaseClient

from .config import settings


def _s3_client() -> BaseClient:
    params: dict[str, Any] = {"region_name": settings.aws_region}
    if settings.aws_access_key_id and settings.aws_secret_access_key:
        params["aws_access_key_id"] = settings.aws_access_key_id
        params["aws_secret_access_key"] = settings.aws_secret_access_key
    return boto3.client("s3", **params)


def _extract_hour_from_key(key: str) -> int | None:
    filename = key.rsplit("/", 1)[-1]
    if len(filename) >= 2 and filename[0:2].isdigit():
        return int(filename[0:2])

    match = re.search(settings.s3_key_pattern, filename)
    if match:
        return int(match.group("hour"))
    return None


def list_prefix_children(prefix: str, delimiter: str = "/") -> list[str]:
    s3 = _s3_client()
    paginator = s3.get_paginator("list_objects_v2")
    children: set[str] = set()
    for page in paginator.paginate(Bucket=settings.s3_bucket_name, Prefix=prefix, Delimiter=delimiter):
        for pref in page.get("CommonPrefixes", []):
            child = pref.get("Prefix", "")
            if child.startswith(prefix):
                child = child[len(prefix) :]
            child = child.rstrip(delimiter)
            if child:
                children.add(child)
    return sorted(children)


def list_objects_for_day(location: str, camera: str, day: str) -> Iterable[dict[str, Any]]:
    prefix = f"{location}/{camera}/{day}/"
    s3 = _s3_client()
    paginator = s3.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=settings.s3_bucket_name, Prefix=prefix):
        for item in page.get("Contents", []):
            key = item.get("Key")
            if not key or key.endswith("/"):
                continue
            yield {
                "key": key,
                "size_bytes": item.get("Size", 0),
                "last_modified": item.get("LastModified"),
                "hour": _extract_hour_from_key(key),
            }


def build_presigned_url(key: str) -> str:
    s3 = _s3_client()
    return s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.s3_bucket_name, "Key": key},
        ExpiresIn=settings.s3_presigned_ttl_seconds,
    )
