const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('dashboard renders and navigation reaches all core modules', async ({ page }) => {
  await expect(page.locator('#page-home')).toBeVisible();
  for (const [key, label] of [['customers', '客户中心'], ['appointments', '预约管理'], ['services', '服务项目'], ['staff', '员工管理'], ['orders', '订单管理'], ['expenses', '支出管理'], ['reports', '经营分析']]) {
    await page.locator('[data-page="' + key + '"]').filter({ visible: true }).first().click();
    await expect(page.locator('#pageTitle')).toHaveText(label);
  }
});

test('customer can be created and searched', async ({ page }) => {
  await page.locator('[data-page="customers"]').filter({ visible: true }).first().click();
  await page.getByRole('button', { name: /新增客户/ }).click();
  await page.locator('#f_name').fill('自动化测试客户');
  await page.locator('#f_phone').fill('13800000000');
  await page.getByRole('button', { name: '保存记录' }).click();
  await expect(page.locator('#customerRows')).toContainText('自动化测试客户');
  await page.locator('#customerSearch').fill('自动化测试客户');
  await expect(page.locator('#customerRows')).toContainText('自动化测试客户');
});

test('appointment rejects occupied time and accepts a free time', async ({ page }) => {
  await page.locator('[data-page="appointments"]').filter({ visible: true }).first().click();
  await page.getByRole('button', { name: /新建预约/ }).click();
  await page.locator('#f_time').fill('10:00');
  await page.locator('#f_service').selectOption('s1');
  await page.locator('#f_staff').selectOption('st1');
  await page.getByRole('button', { name: '保存记录' }).click();
  await expect(page.locator('#toast')).toContainText('该员工在此时段已有预约');
  await page.locator('#f_time').fill('11:00');
  await page.locator('#f_staff').selectOption('st1');
  await page.getByRole('button', { name: '保存记录' }).click();
  await expect(page.locator('#appointmentRows')).toContainText('精油按摩');
});

test('order can be recorded and reflected in business analysis', async ({ page }) => {
  await page.locator('[data-page="reports"]').filter({ visible: true }).first().click();
  const before = Number((await page.locator('#reportRevenue').textContent()).replace(/[^0-9.]/g, ''));
  await page.locator('[data-page="orders"]').filter({ visible: true }).first().click();
  await page.getByRole('button', { name: /新建订单/ }).click();
  await page.locator('#f_amount').fill('356');
  await page.locator('#f_paid').fill('300');
  await page.getByRole('button', { name: '保存记录' }).click();
  await expect(page.locator('#orderRows')).toContainText('356');
  await page.locator('[data-page="reports"]').filter({ visible: true }).first().click();
  const after = Number((await page.locator('#reportRevenue').textContent()).replace(/[^0-9.]/g, ''));
  expect(after).toBeCloseTo(before + 356, 2);
});

test('expense can be recorded, searched and deleted', async ({ page }) => {
  await page.locator('[data-page="expenses"]').filter({ visible: true }).first().click();
  await page.getByRole('button', { name: /记录支出/ }).click();
  await page.locator('#f_name').fill('自动化测试耗材');
  await page.locator('#f_amount').fill('88');
  await page.getByRole('button', { name: '保存记录' }).click();
  await expect(page.locator('#expenseRows')).toContainText('自动化测试耗材');
  await page.locator('#expenseSearch').fill('自动化测试耗材');
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: '删除' }).click();
  await expect(page.locator('#expenseRows')).toContainText('暂无支出记录');
});

test('backup can be restored after validation without losing its records', async ({ page }) => {
  await page.locator('.userpill').click();
  const backup = {
    app: 'shengyi-guanjia-ai',
    schemaVersion: 1,
    data: {
      schemaVersion: 1,
      currency: 'CNY',
      storeName: '恢复测试门店',
      customers: [{ id: 'restore-c1', name: '备份恢复客户', phone: '13800000000', source: '导入', created: '2026-11-15' }],
      appointments: [],
      orders: [{ id: 'restore-o1', code: 'RESTORE-001', customerId: 'restore-c1', amount: 520, paid: 520, date: '2026-11-15', status: '已完成' }],
      expenses: [{ id: 'restore-e1', name: '恢复测试耗材', amount: 20, date: '2026-11-15' }]
    }
  };
  page.once('dialog', dialog => dialog.accept());
  await page.locator('#backupFile').setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(backup))
  });
  await expect(page.locator('#toast')).toContainText('备份恢复成功');
  await page.locator('[data-page="customers"]').filter({ visible: true }).first().click();
  await expect(page.locator('#customerRows')).toContainText('备份恢复客户');
  await page.locator('[data-page="reports"]').filter({ visible: true }).first().click();
  await expect(page.locator('#reportRevenue')).toContainText('520');
});

test('invalid backup is rejected without replacing current data', async ({ page }) => {
  await page.locator('.userpill').click();
  await page.locator('#backupFile').setInputFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ app: 'shengyi-guanjia-ai', data: { customers: [] } }))
  });
  await expect(page.locator('#toast')).toContainText('备份缺少必要数据');
  await page.locator('[data-page="customers"]').filter({ visible: true }).first().click();
  await expect(page.locator('#customerRows')).toContainText('王女士');
});

test('PWA manifest and offline service worker are registered', async ({ page }) => {
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', './manifest.webmanifest');
  const manifest = await page.evaluate(async () => {
    const response = await fetch('./manifest.webmanifest');
    if (!response.ok) throw new Error('Manifest request failed');
    return response.json();
  });
  expect(manifest.name).toBe('生意管家 AI');
  await expect.poll(() => page.evaluate(() => 'serviceWorker' in navigator)).toBeTruthy();
  await page.evaluate(() => navigator.serviceWorker.ready);
});

test('service catalog creates priced services and appointments use catalog pricing', async ({ page }) => {
  await page.locator('[data-page="services"]').filter({ visible: true }).first().click();
  await page.getByRole('button', { name: /新增服务/ }).click();
  await page.locator('#f_serviceName').fill('深层护理');
  await page.locator('#f_servicePrice').fill('199');
  await page.locator('#f_serviceDuration').fill('45');
  await page.locator('#f_serviceDescription').fill('自动化测试服务项目');
  await page.getByRole('button', { name: '保存记录' }).click();
  await expect(page.locator('#serviceRows')).toContainText('深层护理');
  await expect(page.locator('#serviceRows')).toContainText('199');
  const serviceRow = page.locator('#serviceRows tr').filter({ hasText: '深层护理' });
  await serviceRow.getByRole('button', { name: '编辑' }).click();
  await page.locator('#f_servicePrice').fill('219');
  await page.getByRole('button', { name: '保存记录' }).click();
  await expect(page.locator('#serviceRows')).toContainText('219');
  await page.locator('[data-page="appointments"]').filter({ visible: true }).first().click();
  await page.getByRole('button', { name: /新建预约/ }).click();
  const serviceId = await page.locator('#f_service option').filter({ hasText: '深层护理' }).getAttribute('value');
  await page.locator('#f_service').selectOption(serviceId);
  await expect(page.locator('#serviceInfo')).toContainText('219');
  await expect(page.locator('#serviceInfo')).toContainText('45 分钟');
  await page.locator('#f_date').fill(new Date().toISOString().slice(0, 10));
  await page.locator('#f_time').fill('16:00');
  await page.locator('#f_staff').selectOption('st1');
  await page.getByRole('button', { name: '保存记录' }).click();
  await expect(page.locator('#appointmentRows')).toContainText('深层护理');
  await expect(page.locator('#appointmentRows')).toContainText('45 分钟');
});

test('staff can be added, edited and safely deactivated', async ({ page }) => {
  await page.locator('[data-page="staff"]').filter({ visible: true }).first().click();
  await page.getByRole('button', { name: /新增员工/ }).click();
  await page.locator('#f_staffName').fill('自动化员工');
  await page.locator('#f_staffRole').fill('高级技师');
  await page.locator('#f_staffPhone').fill('13900000000');
  await page.getByRole('button', { name: '保存记录' }).click();
  const row = page.locator('#staffRows tr').filter({ hasText: '自动化员工' });
  await expect(row).toContainText('高级技师');
  await row.getByRole('button', { name: '编辑' }).click();
  await page.locator('#f_staffRole').fill('店长');
  await page.getByRole('button', { name: '保存记录' }).click();
  await expect(page.locator('#staffRows')).toContainText('店长');
  await page.locator('#staffRows tr').filter({ hasText: '自动化员工' }).getByRole('button', { name: '停用' }).click();
  await expect(page.locator('#staffRows tr').filter({ hasText: '自动化员工' })).toContainText('已停用');
});

test('same employee cannot have overlapping appointments but another employee can', async ({ page }) => {
  await page.locator('[data-page="appointments"]').filter({ visible: true }).first().click();
  await page.getByRole('button', { name: /新建预约/ }).click();
  await page.locator('#f_time').fill('10:30');
  await page.locator('#f_service').selectOption('s1');
  await page.locator('#f_staff').selectOption('st1');
  await page.getByRole('button', { name: '保存记录' }).click();
  await expect(page.locator('#toast')).toContainText('该员工在此时段已有预约');
  await page.locator('#f_staff').selectOption('st2');
  await page.getByRole('button', { name: '保存记录' }).click();
  await expect(page.locator('#appointmentRows')).toContainText('小周');
});

test('older local data migrates historical staff names into the staff roster', async ({ page }) => {
  await page.evaluate(() => {
    const today = new Date();
    const date = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'), String(today.getDate()).padStart(2, '0')].join('-');
    localStorage.setItem('shengyi_guanjia_v01', JSON.stringify({
      currency: 'CNY',
      storeName: '旧版门店',
      customers: [{ id: 'old-c1', name: '旧版客户', phone: '', source: '导入', created: date, notes: '' }],
      appointments: [{ id: 'old-a1', date, time: '09:00', customerId: 'old-c1', service: '旧版护理', staff: '历史员工甲', status: '已确认' }],
      services: [],
      orders: [],
      expenses: []
    }));
  });
  await page.reload();
  await page.locator('[data-page="staff"]').filter({ visible: true }).first().click();
  await expect(page.locator('#staffRows')).toContainText('历史员工甲');
  await page.locator('[data-page="appointments"]').filter({ visible: true }).first().click();
  await page.getByRole('button', { name: /新建预约/ }).click();
  await expect(page.locator('#f_staff')).toContainText('历史员工甲');
});

test('completed appointment creates one linked order for the correct customer', async ({ page }) => {
  await page.locator('[data-page="appointments"]').filter({ visible: true }).first().click();
  const row = page.locator('#appointmentRows tr').filter({ hasText: '精油按摩' }).first();
  await expect(row).not.toContainText('生成订单');
  await row.getByRole('button', { name: '更新状态' }).click();
  await expect(row).toContainText('已完成');
  await row.getByRole('button', { name: '生成订单' }).click();
  await expect(page.locator('#modalTitle')).toHaveText('根据预约登记订单');
  await expect(page.locator('#f_customer')).toHaveValue('c1');
  await expect(page.locator('#f_amount')).toHaveValue('268');
  await page.locator('#f_paid').fill('200');
  await page.getByRole('button', { name: '保存记录' }).click();
  await expect(row).toContainText('已关联订单');
  const linked = await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('shengyi_guanjia_v01'));
    return state.orders.find(order => order.appointmentId === 'a1');
  });
  expect(linked).toBeTruthy();
  expect(linked.customerId).toBe('c1');
  expect(linked.amount).toBe(268);
  expect(linked.paid).toBe(200);
  await page.evaluate(() => createOrderFromAppointment('a1'));
  await expect(page.locator('#toast')).toContainText('该预约已经生成订单');
  const count = await page.evaluate(() => JSON.parse(localStorage.getItem('shengyi_guanjia_v01')).orders.filter(order => order.appointmentId === 'a1').length);
  expect(count).toBe(1);
});

test('customer profile shows lifetime metrics, order history and appointment history', async ({ page }) => {
  await page.locator('[data-page="customers"]').filter({ visible: true }).first().click();
  const row = page.locator('#customerRows tr').filter({ hasText: '王女士' });
  await row.getByRole('button', { name: '档案' }).click();
  await expect(page.locator('#customerProfileTitle')).toHaveText('王女士 · 客户档案');
  await expect(page.locator('#profileTotal')).toContainText('268');
  await expect(page.locator('#profileOrders')).toContainText('1 笔');
  await expect(page.locator('#customerProfileBody')).toContainText('SG20260001');
  await expect(page.locator('#customerProfileBody')).toContainText('精油按摩');
  await expect(page.locator('#customerProfileBody')).toContainText('小李');
});

test('customer tags and last contact date can be edited and searched', async ({ page }) => {
  await page.locator('[data-page="customers"]').filter({ visible: true }).first().click();
  const row = page.locator('#customerRows tr').filter({ hasText: '王女士' });
  await row.getByRole('button', { name: '编辑' }).click();
  await page.locator('#f_tags').fill('老客户, 高价值, 需要回访');
  await page.locator('#f_lastContact').fill('2026-11-12');
  await page.locator('#f_notes').fill('偏好提前一天预约');
  await page.getByRole('button', { name: '保存记录' }).click();
  await expect(page.locator('#customerRows')).toContainText('高价值');
  await page.locator('#customerSearch').fill('需要回访');
  await expect(page.locator('#customerRows')).toContainText('王女士');
  await page.locator('#customerRows tr').getByRole('button', { name: '档案' }).click();
  await expect(page.locator('#customerProfileBody')).toContainText('11/12');
  await expect(page.locator('#customerProfileBody')).toContainText('偏好提前一天预约');
  await expect(page.locator('#customerProfileBody')).toContainText('高价值');
});

test('legacy customer records migrate tags and last contact defaults without data loss', async ({ page }) => {
  await page.evaluate(() => {
    localStorage.setItem('shengyi_guanjia_v01', JSON.stringify({
      schemaVersion: 2,
      currency: 'CNY',
      storeName: '旧版客户门店',
      customers: [{ id: 'legacy-customer-1', name: '老版本客户', phone: '', source: '朋友介绍', created: '2026-10-01', notes: '原有客户备注' }],
      appointments: [],
      staff: [],
      services: [],
      orders: [],
      expenses: []
    }));
  });
  await page.reload();
  await page.locator('[data-page="customers"]').filter({ visible: true }).first().click();
  const row = page.locator('#customerRows tr').filter({ hasText: '老版本客户' });
  await expect(row).toContainText('10/01');
  await row.getByRole('button', { name: '档案' }).click();
  await expect(page.locator('#customerProfileBody')).toContainText('原有客户备注');
  await expect(page.locator('#customerProfileBody')).toContainText('暂无');
  const migrated = await page.evaluate(() => JSON.parse(localStorage.getItem('shengyi_guanjia_v01')).customers[0]);
  expect(migrated.tags).toEqual([]);
  expect(migrated.lastContact).toBe('2026-10-01');
});

test('backup rejects malformed customer tags without changing existing records', async ({ page }) => {
  await page.locator('.userpill').click();
  const invalid = {
    app: 'shengyi-guanjia-ai',
    data: {
      customers: [{ id: 'bad-customer', name: '错误标签客户', tags: '不是数组' }],
      appointments: [],
      orders: [],
      expenses: []
    }
  };
  await page.locator('#backupFile').setInputFiles({
    name: 'bad-customer-tags.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(invalid))
  });
  await expect(page.locator('#toast')).toContainText('客户标签数据格式无效');
  await page.locator('[data-page="customers"]').filter({ visible: true }).first().click();
  await expect(page.locator('#customerRows')).toContainText('王女士');
});
