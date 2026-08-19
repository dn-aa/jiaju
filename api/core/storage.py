"""文件存储抽象：本地 LocalBackend（开发）/ S3 兼容（生产）。
白名单：图片 jpg/png/webp ≤2MB；简历 pdf/doc/docx ≤10MB；magic bytes 二次校验。"""
import io
import mimetypes
import os
import re
import uuid
from abc import ABC, abstractmethod

from fastapi import UploadFile

from core.config import settings
from core.response import BizError, ErrCode

ALLOWED_IMAGE = {"jpg", "jpeg", "png", "webp"}
ALLOWED_RESUME = {"pdf", "doc", "docx"}
IMAGE_MAX = 2 * 1024 * 1024
RESUME_MAX = 10 * 1024 * 1024

# magic bytes（文件头）校验
MAGIC = {
    "jpg": (b"\xff\xd8\xff", 3),
    "jpeg": (b"\xff\xd8\xff", 3),
    "png": (b"\x89PNG\r\n\x1a\n", 8),
    "webp": (b"RIFF", 4),
    "pdf": (b"%PDF", 4),
    "doc": (b"\xd0\xcf\x11\xe0", 4),
    "docx": (b"PK\x03\x04", 4),
}


def _ext_from_name(name: str) -> str:
    ext = os.path.splitext(name or "")[1].lstrip(".").lower()
    return ext


def validate_upload(filename: str, content: bytes, kind: str) -> str:
    """校验类型/大小/magic bytes，返回规范扩展名。"""
    ext = _ext_from_name(filename)
    allowed = ALLOWED_IMAGE if kind == "image" else ALLOWED_RESUME
    size_max = IMAGE_MAX if kind == "image" else RESUME_MAX
    if ext not in allowed:
        raise BizError(ErrCode.FILE_TYPE, f"仅支持 {'/'.join(allowed)} 格式")
    if len(content) > size_max:
        raise BizError(ErrCode.FILE_SIZE, f"文件过大（{'2MB' if kind == 'image' else '10MB'} 以内）")
    magic, n = MAGIC.get(ext, (None, 0))
    if magic and content[:n] != magic:
        raise BizError(ErrCode.FILE_TYPE, "文件内容与扩展名不符")
    return ext


class StorageBackend(ABC):
    @abstractmethod
    def upload(self, data: bytes, filename: str, kind: str) -> str: ...


class LocalBackend(StorageBackend):
    """写入 {upload_dir}/{kind}/{随机前缀}_{文件名}，返回 /uploads/... URL。"""

    def upload(self, data: bytes, filename: str, kind: str) -> str:
        ext = _ext_from_name(filename) or "bin"
        rel_dir = os.path.join(settings.upload_dir, kind)
        os.makedirs(rel_dir, exist_ok=True)
        safe = re.sub(r"[^\w.\-]", "_", os.path.splitext(filename)[0])[:40] or "file"
        name = f"{uuid.uuid4().hex[:12]}_{safe}.{ext}"
        path = os.path.join(rel_dir, name)
        with open(path, "wb") as f:
            f.write(data)
        return f"{settings.public_base_url}/{kind}/{name}"


class S3Backend(StorageBackend):
    """生产接入 S3 兼容 / 腾讯云 COS（预留；SDK 由部署环境注入）。"""

    def upload(self, data: bytes, filename: str, kind: str) -> str:
        # 一期开发不启用；生产部署时实现 boto3/cos-python-sdk 上传
        raise NotImplementedError("S3 storage 需在部署阶段配置 SDK")


def get_storage() -> StorageBackend:
    if settings.storage_kind == "s3":
        return S3Backend()
    return LocalBackend()


async def save_upload(file: UploadFile, kind: str) -> str:
    """统一上传入口：读流 → 校验 → 存储 → 返回 URL。"""
    data = await file.read()
    filename = file.filename or "upload"
    validate_upload(filename, data, kind)
    return get_storage().upload(data, filename, kind)
