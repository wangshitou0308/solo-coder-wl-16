import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { dbReady } from './db';
import authRouter from './routes/auth';
import categoriesRouter from './routes/categories';
import capacityRouter from './routes/capacity';
import appointmentsRouter from './routes/appointments';
import pointsRouter from './routes/points';
import exchangeRouter from './routes/exchange';
import statsRouter from './routes/stats';
import usersRouter from './routes/users';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

app.use('/api/auth', authRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/capacity', capacityRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/points', pointsRouter);
app.use('/api/exchange', exchangeRouter);
app.use('/api/stats', statsRouter);
app.use('/api/users', usersRouter);

app.get('/api/health', (_req, res) => {
  res.json({ success: true, message: '回收服务系统API运行正常', timestamp: new Date().toISOString() });
});

app.post('/api/upload', (req, res) => {
  const { image, filename } = req.body;
  if (!image) {
    res.status(400).json({ success: false, message: '未提供图片数据' });
    return;
  }
  const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
  const ext = (image.match(/^data:image\/(\w+);base64,/) || [])[1] || 'png';
  const realFilename = filename || `upload_${Date.now()}.${ext}`;
  const filePath = path.join(uploadDir, realFilename);
  fs.writeFile(filePath, base64Data, 'base64', (err) => {
    if (err) {
      res.status(500).json({ success: false, message: '上传失败' });
      return;
    }
    res.json({ success: true, data: { url: `/uploads/${realFilename}`, filename: realFilename } });
  });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: `路由不存在: ${req.method} ${req.path}` });
});

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('服务器错误:', err);
  res.status(500).json({ success: false, message: err.message || '服务器内部错误' });
});

function initSeedData() {
  try {
    require('./seed');
  } catch (e: any) {
    console.log('种子数据初始化跳过:', e?.message || e);
  }
}

dbReady.then(() => {
  initSeedData();
  app.listen(PORT, () => {
    console.log(`
  ==============================================
  🚀 社区废旧物品回收服务系统 API 服务已启动
  ==============================================
  接口地址: http://localhost:${PORT}
  健康检查: http://localhost:${PORT}/api/health
  启动时间: ${new Date().toLocaleString('zh-CN')}
  ==============================================
  `);
  });
}).catch((e) => {
  console.error('数据库初始化失败:', e);
  process.exit(1);
});

export default app;
