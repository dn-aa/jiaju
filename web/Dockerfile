# ============================================================
# 【代码段功能】前台官网（web）生产镜像（阶段 7）
#   多阶段：Node 22 构建 → nginx:alpine 托管静态资源
#   静态文件 + /api 与 /uploads 反向代理到 api 服务（见 deploy/nginx/web.conf）
# ============================================================
FROM node:22-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
# 安装依赖（含构建所需 typescript/vite）
RUN npm install --registry=https://registry.npmjs.org
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
# 站点配置：静态资源 + /api、/uploads 反向代理
COPY deploy/nginx/web.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
