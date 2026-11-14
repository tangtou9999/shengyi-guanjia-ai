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
  await page.locator('#f_service').fill('自动化测试服务');
  await page.getByRole('button', { name: '保存记录' }).click();
  await expect(page.locator('#toast')).toContainText('该时间已有预约');
  await page.locator('#f_time').fill('11:00');
  await page.getByRole('button', { name: '保存记录' }).click();
  await expect(page.locator('#appointmentRows')).toContainText('自动化测试服务');
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
