# 社区废旧物品回收预约与积分兑换服务系统

## 项目简介
面向社区居民的废旧物品回收预约与环保积分激励闭环系统。

## 角色说明
- **居民**：提交回收预约、查询积分、兑换商品、服务评价
- **回收员**：接单、上门回收、填写实际重量、上传照片
- **社区管理员**：查看全量数据、大屏统计、用户管理

## 预置账号
| 角色 | 用户名 | 密码 |
|------|--------|------|
| 居民 | resident1 | 123456 |
| 居民 | resident2 | 123456 |
| 回收员 | collector1 | 123456 |
| 回收员 | collector2 | 123456 |
| 管理员 | admin | admin123 |

## 技术栈
- 后端：Node.js + Express + TypeScript + SQLite + JWT
- 前端：React 18 + TypeScript + Vite + Ant Design 5 + ECharts

## 快速启动
```bash
# 安装依赖
npm run install:all

# 开发模式（同时启动前后端）
npm run dev

# 后端地址: http://localhost:3001
# 前端地址: http://localhost:5173
```
