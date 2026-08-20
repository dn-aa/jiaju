# ============================================================
# 【代码段功能】后台管理（admin）生产镜像（阶段 7）
#   多阶段：Node 22 构建 → nginx:alpine 托管静态资源
#   静态文件 + /api 与 /uploads 反向代理到 api 服务（见 deploy/nginx/admin.conf）
# ============================================================
FROM node:22-alpine AS build

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --registry=https://registry.npmjs.org
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY deploy/nginx/admin.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
