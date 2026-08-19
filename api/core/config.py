"""全局配置（pydantic-settings，读取 api/.env）。"""
import re
from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def parse_ttl(value: str | int) -> int:
    """解析时长：'30m'/'7d'/1800 → 秒。"""
    if isinstance(value, int):
        return value
    m = re.fullmatch(r"(\d+)([smhd]?)", str(value).strip().lower())
    if not m:
        raise ValueError(f"无法解析时长: {value}")
    n = int(m.group(1))
    unit = m.group(2) or "s"
    return n * {"s": 1, "m": 60, "h": 3600, "d": 86400}[unit]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # 数据库 / Redis
    database_url: str = "mysql+pymysql://root:tp_home_dev@127.0.0.1:3306/tp_home_dev?charset=utf8mb4"
    redis_url: str = "redis://127.0.0.1:6379/0"

    # JWT（支持 30m / 7d 或秒数）
    jwt_secret: str = "dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    jwt_access_ttl: str | int = "30m"
    jwt_refresh_ttl: str | int = "7d"

    @field_validator("jwt_access_ttl", "jwt_refresh_ttl", mode="before")
    @classmethod
    def _parse_ttl(cls, v):
        return parse_ttl(v)

    # 文件存储：local / s3
    storage_kind: str = "local"
    upload_dir: str = "uploads"
    public_base_url: str = "/uploads"
    oss_endpoint: str = ""
    oss_bucket: str = ""
    oss_key: str = ""
    oss_secret: str = ""

    # 跨域（生产放行前台/后台域名）
    cors_origins: str = "http://localhost:5173,http://localhost:5174"

    # 表单防刷
    captcha_enabled: bool = True
    rate_limit_per_minute: int = 5

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
