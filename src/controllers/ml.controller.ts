import * as service from '../services/ml.service';

function sendResult(res: any, result: any) {
  if (result?.error) {
    const status = result.error.includes('not found') ? 404 : result.error === 'forbidden' ? 403 : 400;
    return res.status(status).json(result);
  }
  res.json(result);
}

export function health(_req: any, res: any) {
  res.json({ module: 'ml', ok: true });
}

export async function getCurrentSurge(req: any, res: any) {
  sendResult(res, await service.getCurrentSurge());
}

export async function predictSurge(req: any, res: any) {
  sendResult(res, await service.predictSurge({ ...req.body, actor: req.user }));
}

export async function applySurge(req: any, res: any) {
  sendResult(res, await service.applySurge({ ...req.body, actor: req.user }));
}

export async function predictDemand(req: any, res: any) {
  sendResult(res, await service.predictDemand({ ...req.body, actor: req.user }));
}

export async function getRecommendations(req: any, res: any) {
  sendResult(res, await service.getRecommendations({ ...req.query, ...req.body, actor: req.user }));
}

export async function predictChurn(req: any, res: any) {
  sendResult(res, await service.predictChurn({ ...req.body, actor: req.user }));
}
