# TP 全屋家居 · 部署与回滚文档

| 项    | 内容                        |
| ---- | ------------------------- |
| 文档版本 | v1.0                      |
| 适用范围 | 阶段 7（部署与上线 M5）            |
| 依据   | 开发技术文档 v1.4 §10 / 实施方案 §8 |

---

## 1. 架构总览（五服务）

```
                         ┌─ web:8080  前台官网（Nginx 静态 + /api、/uploads 反代）
客户端 ── HTTPS ── Nginx ── admin:8081 后台管理（Nginx 静态 + /api、/uploads 反代）
                         └─ api:8000  FastAPI（uvicorn 4 worker）
                                  ├─ mysql:3306（数据卷 ./data/mysql）
                                  ├─ redis:6379（数据卷 ./data/redis）
                                  └─ ./data/uploads（本地存储上传目录）
```

- 镜像来源：`web/`、`admin/`、`api/` 各自 Dockerfile 构建（多阶段，生产镜像不含构建工具/测试依赖）。
- 站点访问：`web:8080`（前台）、`admin:8081`（后台）；生产可配置 Nginx 域名分流（见 §5）。

## 2. 上线前置

| 项         | 说明                                     | 状态  |
| --------- | -------------------------------------- | --- |
| 服务器       | Linux + Docker（≥24）+ Docker Compose v2 | 待提供 |
| 域名        | 前台/后台域名或子域                             | 待提供 |
| ICP 备案    | 页脚备案号（当前占位 `粤ICP备XXXXXXXX号`）           | 待提供 |
| 百度地图 AK | 联系我们页合规地图接入（百度地图开放平台，当前为占位图） | 待提供 |
| 隐私政策/用户协议 | 前台已上线草稿版（/privacy、/terms），正式文案由甲方确认    | 草稿  |

## 3. 环境变量清单（deploy/.env，模板见 deploy/.env.example）

| 变量                                   | 必填   | 说明                                             |
| ------------------------------------ | ---- | ---------------------------------------------- |
| `MYSQL_ROOT_PASSWORD`                | ✅    | 数据库口令（生产必须修改，建议 `openssl rand -hex 16`）        |
| `MYSQL_DATABASE`                     | —    | 库名，默认 `tp_home_prod`                           |
| `JWT_SECRET`                         | ✅    | 令牌签名密钥（`openssl rand -hex 32`，变更后旧 token 全部失效） |
| `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL` | —    | 默认 30m / 7d                                    |
| `STORAGE_KIND`                       | —    | `local`（默认）或 `oss`（切换时配置 `OSS_*`）              |
| `CORS_ORIGINS`                       | —    | 生产收紧为实际站点域名                                    |
| `CAPTCHA_ENABLED`                    | —    | 默认 `true`（防刷开关）                                |
| `SEED_ADMIN_PASSWORD`                | ✅ 首次 | 种子初始管理员强密码（api 容器内注入）                          |

## 4. 首次上线步骤

```bash
# 1) 准备环境变量（生产密钥）
cp deploy/.env.example deploy/.env
#    编辑 deploy/.env：MYSQL_ROOT_PASSWORD / JWT_SECRET / SEED_ADMIN_PASSWORD

# 2) 构建并启动五服务（api 启动时自动执行 alembic upgrade head）
docker compose --env-file deploy/.env up -d --build

# 3) 首次种子（建 4 角色 + 初始账号 + 分类/配置/流程等；幂等可重复执行）
docker compose exec api python seed.py
#    种子读取 SEED_ADMIN_PASSWORD 生成初始管理员强密码；首次登录后台强制改密

# 4) 验证
curl -s http://localhost:8080/api/health        # 前台反代 → api
curl -s http://localhost:8080/api/public/home   # 前台首页数据
# 浏览器打开 http://localhost:8080（前台）/ http://localhost:8081（后台）
# 后台初始账号：admin / SEED_ADMIN_PASSWORD 所设密码
```

> 迁移：`api` 容器 CMD 内置 `alembic upgrade head`（幂等）；如手动执行：  
> `docker compose exec api alembic upgrade head`

## 5. HTTPS 与域名分流（生产）

在宿主机部署反向 Nginx，将流量转发到容器端口，并配置证书：

```nginx
server {
    listen 443 ssl;
    server_name www.tp-home.com;
    ssl_certificate     /etc/letsencrypt/live/www.tp-home.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/www.tp-home.com/privkey.pem;
    location / { proxy_pass http://127.0.0.1:8080; proxy_set_header X-Forwarded-Proto https; }
}
server { listen 443 ssl; server_name admin.tp-home.com; ... proxy_pass http://127.0.0.1:8081; }
# 证书申请：certbot --nginx -d www.tp-home.com -d admin.tp-home.com
```

- 后端 `CORS_ORIGINS` 同步改为实际域名（`https://www.tp-home.com,https://admin.tp-home.com`）。
- 若走同域路径分流（`/admin/` 前缀），需调整 admin 构建的 base 路径与 Nginx `location /admin/` 规则（本期默认子域方式）。

## 6. 回滚流程

| 场景            | 操作                                                                                                           |
| ------------- | ------------------------------------------------------------------------------------------------------------ |
| **代码回滚**      | 镜像按 git tag 构建并固定版本：`docker compose build api:${TAG}` → `docker compose up -d api`（其余服务不变）。旧版本镜像保留 ≥3 个 tag。 |
| **数据库回滚（结构）** | `docker compose exec api alembic downgrade -1`（仅回退最近一个变更；回滚前务必备份）。                                           |
| **数据恢复**      | 每日 `mysqldump` 备份 + 上传目录（`./data/uploads`）定期快照；恢复：停服 → 恢复 dump → 启动 → 校验。                                    |
| **回滚演练**      | 上线后建议在预发环境演练一次「代码回退 + downgrade -1」，确认耗时与影响面。                                                                |

## 7. 备份与监控

- **数据库**：crontab 每日 `docker compose exec -T mysql mysqldump -uroot -p$MYSQL_ROOT_PASSWORD tp_home_prod > backup/$(date +%F).sql`（保留 30 天）。
- **上传目录**：`./data/uploads` 随数据卷备份（切换 OSS 后由对象存储保障）。
- **监控建议**：`docker compose ps` 健康检查；api 日志 `docker compose logs -f api`；关键告警：磁盘、容器重启次数、接口 5xx 比例。
- **性能基线**：见 `api/scripts/perf_baseline.py`（并发/分位/成功率），上线后定期复测（目标：核心接口 P95 ≤500ms）。

## 8. 附录：便携版直跑部署（无 Docker，替代 §4/§5）

适用：服务器无 Docker，或希望零容器化交付。**本项目从阶段 0 起即为便携版架构**（`.tools/` 绿色目录 + `bootstrap.sh --db portable`），仅需另备一个静态托管（Nginx/IIS）。

### 8.1 前置条件
| 项 | 说明 |
|----|------|
| 便携 MySQL | `.tools/mysql`（Windows 版 mysqld.exe；Linux 服务器改用官方免安装 tar.gz，操作一致） |
| 便携 Redis | `.tools/redis` |
| 静态托管 | 系统 Nginx（推荐）或 IIS；反代配置复用 `deploy/nginx/web.conf`、`admin.conf`（仅改 `proxy_pass http://api:8000` → `http://127.0.0.1:8000`） |
| 运行环境 | Python ≥3.11（api）+ Node ≥20（仅构建期） |

### 8.2 首次上线步骤（Windows 服务器示例）
```bash
# 1) 拷贝便携依赖并启动（生产需改强密码：MYSQL_ROOT_PWD=xxx ./.tools/start-deps.sh）
cp -r .tools/mysql .tools/redis 服务器对应目录/
MYSQL_ROOT_PWD=强密码 bash .tools/start-deps.sh   # 启动 3306 + 6379

# 2) 后端：迁移 → 种子（强密码）→ 4 worker 直跑
cd api && pip install -r requirements.txt
set DATABASE_URL=mysql+pymysql://root:强密码@127.0.0.1:3306/tp_home_prod?charset=utf8mb4
set JWT_SECRET=$(openssl rand -hex 32)   # Windows: 任意 64 位十六进制串
alembic upgrade head
set SEED_ADMIN_PASSWORD=初始强密码 && python seed.py
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
# 守护：Windows 计划任务 / NSSM，或 Linux systemd（见下方模板）

# 3) 前端：构建 → 静态托管（Nginx 反代 /api、/uploads → 127.0.0.1:8000）
cd web && npm run build && copy dist 到 Nginx 站点根目录
cd admin && npm run build && copy dist 到 Nginx 站点根目录
# Nginx 配置：复用 deploy/nginx/web.conf、admin.conf，端口改 80/81 或按域名分流

# 4) 验证（同 §4 第 4 步）
```

### 8.3 Linux systemd 守护模板（api）
```ini
# /etc/systemd/system/tp-home-api.service
[Unit]
Description=TP Home API
After=network.target
[Service]
WorkingDirectory=/opt/tp-home/api
ExecStart=/opt/tp-home/venv/bin/python -m uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
EnvironmentFile=/opt/tp-home/api/.env
Restart=always
[Install]
WantedBy=multi-user.target
```

### 8.4 备份 / 回滚（便携版）
- **备份**：① 数据目录整体拷贝（`.tools/mysql-data`，停服或 XtraBackup 下执行）；② 每日 `mysqldump`；③ 上传目录 `api/uploads` 快照。
- **代码回滚**：git tag 切换 → 重启 uvicorn + 静态站点。
- **结构回滚**：`alembic downgrade -1`（回滚前备份）。
- **便携版优势**：目录拷贝即环境重建，回滚演练成本低（如本次开发环境 InnoDB 故障，即靠 `.tools/mysql-data-backup-*` 目录级备份完整恢复）。

### 8.5 与容器化方案的差异
| 项 | 容器化（§4） | 便携版直跑（§8） |
|----|------------|------------------|
| 依赖环境 | Docker 镜像（含 MySQL/Redis） | 系统自带/便携目录 |
| 数据库上线 | 容器 CMD 自动迁移 | 手动 `alembic upgrade head`（或脚本） |
| 守护进程 | compose restart | systemd / 计划任务 / NSSM |
| 适用 | Linux 服务器、多机编排 | 单机快速交付、Windows 服务器 |

## 9. 验收清单（M5）

- [ ] 五服务 compose 一键启动，健康检查通过
- [ ] `alembic upgrade head` 执行成功，20 表结构就绪
- [ ] 种子幂等可重复执行，初始管理员强密码 + 首次登录强制改密
- [ ] 前台 10 页 + 三表单（预约/留言/投递）在 8080 正常，线索落库
- [ ] 后台四角色登录/权限矩阵在 8081 正常
- [ ] HTTPS 证书生效，`X-Forwarded-Proto` 透传
- [ ] 页脚 ICP 备案号、隐私政策/用户协议、合规地图（Key 就绪后）落地
- [ ] 回滚流程文档化并演练一次
