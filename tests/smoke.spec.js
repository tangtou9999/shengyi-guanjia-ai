const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('dashboard renders and navigation reaches all core modules', async ({ page }) => {
  await expect(page.locator('#page-home')).toBeVisible();
  for (const [key, label] of [['customers', '客户中心'], ['appointments', '预约管理'], ['orders', '订单管理'], ['expenses', '支出管理'], ['reports', '经营分析']]) {
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
  await page.getByRole('button', { name: '保存记录' }).click();
  await expect(page.locator('#toast')).toContainText('该时间已有预约');
  await page.locator('#f_time').fill('11:00');
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
  await page.locator('[data-page="appointments"]').filter({ visible: true }).first().click();
  await page.getByRole('button', { name: /新建预约/ }).click();
  const serviceId = await page.locator('#f_service option').filter({ hasText: '深层护理' }).getAttribute('value');
  await page.locator('#f_service').selectOption(serviceId);
  await expect(page.locator('#serviceInfo')).toContainText('199');
  await expect(page.locator('#serviceInfo')).toContainText('45 分钟');
  await page.locator('#f_date').fill(new Date().toISOString().slice(0, 10));
  await page.locator('#f_time').fill('16:00');
  await page.locator('#f_staff').fill('自动化员工');
  await page.getByRole('button', { name: '保存记录' }).click();
  await expect(page.locator('#appointmentRows')).toContainText('深层护理');
  await expect(page.locator('#appointmentRows')).toContainText('45 分钟');
});
