"""文件上传路由：/api/files/*（登录用户；图片 ≤2MB、简历 ≤10MB，服务端二次校验）。"""
from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from core.response import BizError, ErrCode, ok
from core.storage import get_storage, save_upload, validate_upload
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
    """通用上传：kind=image|resume，白名单校验后落盘（内容仅读取一次）。"""
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
    """个人中心头像上传（BR-1.4，≤2MB）：校验后落盘并回写 users.avatar。

    注意：UploadFile 流只能读取一次——先整体读出 bytes 做校验，
    再直接交给存储层写入，避免二次 read() 读到空内容。"""
    data = await file.read()
    filename = file.filename or "avatar.png"
    validate_upload(filename, data, "image")          # 白名单 + magic bytes 校验
    url = get_storage().upload(data, filename, "image")  # 直接写入，不再二次读取
    user.avatar = url                                  # 回写头像 URL
    db.commit()
    return ok({"url": url})
