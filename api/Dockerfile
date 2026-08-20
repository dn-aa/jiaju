# ============================================================
# 【代码段功能】后端 API 生产镜像（阶段 7）
#   - 基于 python:3.11-slim（轻量、依赖齐全）
#   - 多阶段：仅安装运行依赖（测试依赖不进入生产镜像）
#   - 启动：alembic upgrade head → uvicorn 4 worker
# ============================================================
FROM python:3.11-slim AS base

# 时区与系统依赖（cryptography/bleach 需要编译工具的场景兜底）
ENV TZ=Asia/Shanghai \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# 先装依赖（利用层缓存）
COPY requirements.txt .
# 生产只装运行依赖（剔除 requirements 中 # test 段的测试包）
RUN pip install --no-cache-dir -i https://pypi.tuna.tsinghua.edu.cn/simple \
    fastapi uvicorn[standard] sqlalchemy alembic pymysql cryptography \
    pydantic pydantic-settings PyJWT bcrypt redis pillow bleach python-multipart

# 复制应用代码
COPY . .

# 上传目录（本地存储后端；生产可挂载卷或切换 OSS）
RUN mkdir -p /app/uploads

EXPOSE 8000

# 上线顺序：迁移 → 种子（首次）→ 多 worker 启动（技术文档 §10）
CMD ["sh", "-c", "alembic upgrade head && python -m uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4"]
