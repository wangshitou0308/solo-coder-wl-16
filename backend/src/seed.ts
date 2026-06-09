import db from './db';

const currentYear = new Date().getFullYear();

function seed() {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
  if (userCount.count > 0) {
    console.log('数据已存在，跳过初始化');
    return;
  }

  const insertUser = db.prepare(`
    INSERT INTO users (username, password, realName, phone, role, address)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const resident1 = insertUser.run('resident1', '123456', '张三', '13800138001', 'resident', '阳光社区1号楼101室').lastInsertRowid as number;
  const resident2 = insertUser.run('resident2', '123456', '李四', '13800138002', 'resident', '阳光社区2号楼202室').lastInsertRowid as number;
  const resident3 = insertUser.run('resident3', '123456', '王五', '13800138003', 'resident', '阳光社区3号楼303室').lastInsertRowid as number;
  const collector1 = insertUser.run('collector1', '123456', '刘回收', '13900139001', 'collector', '').lastInsertRowid as number;
  const collector2 = insertUser.run('collector2', '123456', '陈师傅', '13900139002', 'collector', '').lastInsertRowid as number;
  insertUser.run('admin', 'admin123', '系统管理员', '13700137000', 'admin', '');

  console.log('用户数据初始化完成');

  const insertCategory = db.prepare(`
    INSERT INTO categories (name, unit, pointsPerUnit, description, tips, icon, sort)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const categories = [
    ['废纸', '公斤', 10, '包括报纸、书籍、纸箱、办公用纸等', '请尽量叠放整齐，去除塑料包装；浸湿的废纸不回收', '📄', 1],
    ['塑料瓶', '个', 2, '饮料瓶、矿泉水瓶等PET塑料容器', '请清空瓶内液体，压扁后投放，瓶盖可单独回收', '🧴', 2],
    ['金属罐', '个', 5, '易拉罐、食品金属罐等', '请清空内容物并清洗，压扁可节省空间', '🥫', 3],
    ['旧衣物', '公斤', 15, '闲置衣物、床上纺织品等', '请清洗干净后打包，严重破损或污渍不可回收', '👕', 4],
    ['电子废弃物', '件', 50, '旧手机、充电器、小家电等', '请保持设备完整，电池需单独取出分类投放', '📱', 5],
    ['废电池', '节', 3, '干电池、纽扣电池、充电电池等', '请单独存放，不可与生活垃圾混放，避免破损漏液', '🔋', 6],
    ['玻璃瓶', '个', 3, '玻璃饮料瓶、酱菜瓶等', '请清洗干净，有色玻璃与无色玻璃分开投放', '🍾', 7],
    ['废旧家电', '件', 200, '旧冰箱、洗衣机、电视等大家电', '请提前告知尺寸重量，部分家电需专业拆卸', '📺', 8],
  ];

  const categoryIds: number[] = [];
  categories.forEach((cat, idx) => {
    const id = insertCategory.run(cat[0], cat[1], cat[2], cat[3], cat[4], cat[5], idx + 1).lastInsertRowid as number;
    categoryIds.push(id);
  });

  console.log('回收品类数据初始化完成');

  const insertProduct = db.prepare(`
    INSERT INTO exchange_products (name, description, pointsCost, stock, image, category, sort)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const products = [
    ['抽绳垃圾袋（3卷装）', '加厚耐用，分类标识清晰，适合家庭日常使用', 100, 200, '🗑️', '日用品', 1],
    ['环保购物袋', '可折叠帆布材质，大容量，时尚耐脏', 200, 150, '🛍️', '日用品', 2],
    ['话费充值10元', '中国移动/联通/电信三网通用，即时到账', 500, 999, '📞', '充值卡', 3],
    ['全家便利店20元代金券', '全国门店通用，有效期30天', 800, 100, '🎫', '代金券', 4],
    ['竹纤维洗碗布（5片装）', '天然抗菌，吸水性强，不沾油易清洗', 150, 180, '🧽', '日用品', 5],
    ['多肉植物盆栽', '精选绿植，净化空气，送盆土', 300, 80, '🪴', '礼品', 6],
    ['话费充值30元', '中国移动/联通/电信三网通用，即时到账', 1400, 500, '📱', '充值卡', 7],
    ['星巴克中杯券', '全国门店通用，有效期90天', 1200, 60, '☕', '代金券', 8],
  ];

  products.forEach((prod, idx) => {
    insertProduct.run(prod[0], prod[1], prod[2], prod[3], prod[4], prod[5], idx + 1);
  });

  console.log('兑换商品数据初始化完成');

  const insertAccount = db.prepare(`
    INSERT INTO points_accounts (userId, currentPoints, lastYearPoints, currentYear)
    VALUES (?, ?, ?, ?)
  `);

  insertAccount.run(resident1, 380, 120, currentYear);
  insertAccount.run(resident2, 150, 0, currentYear);
  insertAccount.run(resident3, 0, 500, currentYear);

  console.log('积分账户初始化完成');

  const insertRecord = db.prepare(`
    INSERT INTO points_records (userId, type, points, balance, year, description)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertAppointment = db.prepare(`
    INSERT INTO appointments (residentId, collectorId, address, expectedDate, expectedTimeSlot, status, estimatedPoints, actualPoints, rating, comment, createdAt, acceptedAt, completedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertItem = db.prepare(`
    INSERT INTO appointment_items (appointmentId, categoryId, estimatedQuantity, actualQuantity)
    VALUES (?, ?, ?, ?)
  `);

  const appt1 = insertAppointment.run(
    resident1, collector1, '阳光社区1号楼101室',
    '2026-06-01', '09:00-11:00', 'completed', 85, 92, 5,
    '回收员很准时，服务态度很好！',
    '2026-05-30 14:20:00', '2026-05-30 16:00:00', '2026-06-01 10:15:00'
  ).lastInsertRowid as number;
  insertItem.run(appt1, categoryIds[0], 5, 5.2);
  insertItem.run(appt1, categoryIds[1], 15, 15);
  insertItem.run(appt1, categoryIds[2], 3, 3);
  insertRecord.run(resident1, 'earn', 92, 380, currentYear, '上门回收获得积分');

  const appt2 = insertAppointment.run(
    resident1, collector1, '阳光社区1号楼101室',
    '2026-05-15', '14:00-16:00', 'completed', 55, 58, 4,
    '总体不错，稍微晚了一点',
    '2026-05-13 10:00:00', '2026-05-13 11:30:00', '2026-05-15 15:00:00'
  ).lastInsertRowid as number;
  insertItem.run(appt2, categoryIds[3], 2, 2.2);
  insertItem.run(appt2, categoryIds[5], 8, 8);
  insertRecord.run(resident1, 'earn', 58, 288, currentYear, '上门回收获得积分');

  const appt3 = insertAppointment.run(
    resident2, collector2, '阳光社区2号楼202室',
    '2026-06-05', '09:00-11:00', 'completed', 200, 200, 5,
    '非常专业，称重很准确',
    '2026-06-02 09:00:00', '2026-06-02 10:00:00', '2026-06-05 09:30:00'
  ).lastInsertRowid as number;
  insertItem.run(appt3, categoryIds[4], 4, 4);
  insertRecord.run(resident2, 'earn', 200, 150, currentYear, '上门回收获得积分');

  const appt4 = insertAppointment.run(
    resident1, null, '阳光社区1号楼101室',
    '2026-06-10', '14:00-16:00', 'pending', 35, null, null, null,
    '2026-06-08 16:30:00', null, null
  ).lastInsertRowid as number;
  insertItem.run(appt4, categoryIds[0], 3, null);
  insertItem.run(appt4, categoryIds[6], 2, null);

  const appt5 = insertAppointment.run(
    resident3, collector2, '阳光社区3号楼303室',
    '2026-06-09', '09:00-11:00', 'accepted', 250, null, null, null,
    '2026-06-07 11:00:00', '2026-06-07 14:00:00', null
  ).lastInsertRowid as number;
  insertItem.run(appt5, categoryIds[7], 1, null);
  insertItem.run(appt5, categoryIds[4], 1, null);

  console.log('预约历史数据初始化完成');

  const insertExchange = db.prepare(`
    INSERT INTO exchange_orders (userId, productId, quantity, totalPoints, status, createdAt, deliveredAt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const ex1 = insertExchange.run(resident1, 1, 2, 200, 'delivered', '2026-05-20 10:00:00', '2026-05-22 15:00:00').lastInsertRowid as number;
  insertRecord.run(resident1, 'spend', -200, 230, currentYear, '兑换：抽绳垃圾袋（3卷装）x2');

  const ex2 = insertExchange.run(resident1, 2, 1, 200, 'pending', '2026-06-06 14:00:00', null).lastInsertRowid as number;
  insertRecord.run(resident1, 'spend', -200, 30, currentYear, '兑换：环保购物袋 x1');

  console.log('兑换订单初始化完成');

  const slots = [
    '09:00-11:00',
    '11:00-13:00',
    '14:00-16:00',
    '16:00-18:00',
  ];

  const insertCapacity = db.prepare(`
    INSERT OR IGNORE INTO time_slot_capacity (date, timeSlot, maxCapacity, currentCount)
    VALUES (?, ?, ?, ?)
  `);

  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    slots.forEach(slot => {
      const count = i < 2 ? Math.floor(Math.random() * 4) : 0;
      insertCapacity.run(dateStr, slot, 5, count);
    });
  }

  console.log('时段容量数据初始化完成');
  console.log('全部数据初始化成功！');
}

seed();
