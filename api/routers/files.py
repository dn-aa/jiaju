"""文件上传路由：/api/files/*（登录用户；图片 ≤2MB、简历 ≤10MB，服务端二次校验）。"""
from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from core.response import BizError, ErrCode, ok
from core.storage import validate_upload, save_upload
from db.session import get_db
from deps.auth import CurrentUser
from models.org import User

router = APIRouter(prefix="/api/files", tags=["files"])


@router.post("/upload")
async def upload(
    file: UploadFile = File(...),
    kind: str = Form(...),
    user: CurrentUser = None,
):
    if kind not in ("image", "resume"):
        raise BizError(ErrCode.VALIDATION, "kind 仅支持 image|resume")
    url = await save_upload(file, kind)
    return ok({"url": url})


@router.post("/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    user: CurrentUser = None,
    db: Session = Depends(get_db),
):
    data = await file.read()
    validate_upload(file.filename or "avatar.png", data, "image")
    url = await save_upload(file, "image")
    user.avatar = url
    db.commit()
    return ok({"url": url})
