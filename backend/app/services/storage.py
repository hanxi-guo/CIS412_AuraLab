"""Media storage utilities."""
# pylint: disable=missing-module-docstring,missing-function-docstring,missing-class-docstring
from pathlib import Path
from typing import Iterable, List
from uuid import uuid4

from fastapi import UploadFile

from ..config import MEDIA_MAX_PER_POST, MEDIA_ROOT, MAX_FILE_SIZE_BYTES
from ..schemas import MediaCreate


def ensure_media_root() -> None:
    MEDIA_ROOT.mkdir(parents=True, exist_ok=True)


def _campaign_dir(campaign_id: str) -> Path:
    return MEDIA_ROOT / campaign_id


async def save_uploads(
    campaign_id: str, files: List[UploadFile]
) -> List[MediaCreate]:
    ensure_media_root()
    target_dir = _campaign_dir(campaign_id)
    target_dir.mkdir(parents=True, exist_ok=True)

    saved: List[MediaCreate] = []

    for file in files[:MEDIA_MAX_PER_POST]:
        suffix = Path(file.filename or "").suffix
        filename = f"{uuid4()}{suffix}"
        dest = target_dir / filename

        size = 0
        with dest.open("wb") as out:
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break
                size += len(chunk)
                if size > MAX_FILE_SIZE_BYTES:
                    out.close()
                    dest.unlink(missing_ok=True)
                    raise ValueError("File too large")
                out.write(chunk)

        saved.append(
            MediaCreate(
                url=f"/media/{campaign_id}/{filename}",
                type=file.content_type.split("/")[0] if file.content_type else "image",
                size_bytes=size,
            )
        )

    return saved


def delete_files(urls: Iterable[str]) -> None:
    for url in urls:
        # Accept both /media/... and bare relative
        relative = url.replace("/media/", "", 1) if url.startswith("/media/") else url
        path = MEDIA_ROOT / relative
        try:
            path.unlink(missing_ok=True)
        except OSError:
            # Swallow errors but keep going
            continue
