import * as service from '../services/twofa.service';

export function health(_req: any, res: any) { res.json({ module: '2fa', ok: true }); }

export async function setup(req: any, res: any) {
  const result = await service.setupTotp({ ...req.body, actor: req.user });
  if (result.error) return res.status(400).json(result);
  res.json(result);
}

export async function verify(req: any, res: any) {
  const result = await service.verifyAndEnableTotp({ ...req.body, actor: req.user });
  if (result.error) return res.status(400).json(result);
  res.json(result);
}

export async function disable(req: any, res: any) {
  const result = await service.disableTotp({ ...req.body, actor: req.user });
  if (result.error) return res.status(400).json(result);
  res.json(result);
}

export async function validate(req: any, res: any) {
  const result = await service.validateTotpToken({ ...req.body, actor: req.user });
  if (result.error) return res.status(400).json(result);
  res.json(result);
}

export async function status(req: any, res: any) {
  const result = await service.getTotpStatus({ ...req.body, actor: req.user }) as any;
  if (result.error) return res.status(400).json(result);
  res.json(result.status ?? result);
}

export async function sendSmsOtp(req: any, res: any) {
  const result = await service.sendSmsOtpCode(req.body);
  if (result.error) return res.status(400).json(result);
  res.json(result);
}

export async function verifySmsOtp(req: any, res: any) {
  const result = await service.verifySmsOtpCode(req.body);
  if (result.error) return res.status(400).json(result);
  res.json(result);
}
