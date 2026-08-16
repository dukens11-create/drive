import * as service from '../services/promos.service';

export async function validate(req: any, res: any) {
  const result = await service.validatePromo({ ...req.body, actor: req.user }) as any;
  if (!result.valid) return res.status(400).json(result);
  res.json(result);
}