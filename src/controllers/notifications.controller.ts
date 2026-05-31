import * as service from '../services/notifications.service';

function sendResult(res: any, result: any) {
  if (result?.error) {
    const status = result.error.includes('not found') ? 404 : result.error === 'forbidden' ? 403 : 400;
    return res.status(status).json(result);
  }
  res.json(result.deviceToken || result.preferences || result.logs || result);
}

export function health(_req: any, res: any) {
  res.json({ module: 'notifications', ok: true });
}

export async function getPreferences(req: any, res: any) {
  sendResult(res, await service.getNotificationPreferences({ ...req.body, actor: req.user }));
}

export async function updatePreferences(req: any, res: any) {
  sendResult(res, await service.upsertNotificationPreferences({ ...req.body, actor: req.user }));
}

export async function registerDeviceToken(req: any, res: any) {
  sendResult(res, await service.registerDeviceToken({ ...req.body, actor: req.user }));
}

export async function listLogs(req: any, res: any) {
  const result = await service.listNotificationLogs({
    ...req.query,
    ...req.body,
    userId: req.user?.role === 'admin' ? (req.query.userId || req.body?.userId) : req.user?.id
  });
  sendResult(res, result);
}

export async function sendPush(req: any, res: any) {
  sendResult(res, await service.sendPush({ ...req.body, actor: req.user }));
}

export async function sendEmail(req: any, res: any) {
  sendResult(res, await service.sendEmailNotification({ ...req.body, actor: req.user }));
}

export async function sendSms(req: any, res: any) {
  sendResult(res, await service.sendSmsNotification({ ...req.body, actor: req.user }));
}
