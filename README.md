# TP 全屋家居 · 企业官网 + 后台管理系统

前端 React（前台 Tailwind / 后台 Ant Design）+ 后端 FastAPI + MySQL 8.0 + Redis 的 Monorepo。

## 工程结构

```
jiaju_daima/
├── web/      前台官网（React 18 + TS + Vite + Tailwind，墨金设计令牌）
├── admin/    后台管理（React 18 + TS + Vite + Ant Design 5，RBAC 动态路由）
├── api/      后端（Python 3.11+ / FastAPI / SQLAlchemy 2.x / Alembic）
├── deploy/   部署（docker-compose / nginx / 环境变量模板）
├── docs/     设计文档（PRD / UIUX / 技术 / 数据库 / 实施方案）
└── static/   原型与文档基线资料
```

## 文档基线（已冻结）

| 文档 | 版本 |
|------|------|
| PRD | v2.2 |
| 开发技术文档 | v1.4 |
| UI/UX 设计文档 | v1.2 |
| 数据库设计文档 | v2.3 |
| 项目开发实施方案 | v1.2 |

## 快速开始（详见 bootstrap 脚本与《项目开发实施方案》）

```bash
# 1) 初始化环境（起 MySQL/Redis、建根 .venv、装前端依赖）
./bootstrap.sh

# 2) 激活虚拟环境并启动后端（阶段 1 后可用）
source .venv/Scripts/activate        # Git Bash / PowerShell: .venv\Scripts\Activate.ps1
cd api && uvicorn main:app --reload

# 3) 启动前台 / 后台（阶段 1 后可用）
cd web && pnpm dev      # 端口 5173
cd admin && pnpm dev    # 端口 5174
```

> 开发阶段里程碑（M1~M5）与验收标准见 docs/TP全屋家居_项目开发实施方案.md。
