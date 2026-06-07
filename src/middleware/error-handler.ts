import { getErrorDetails, logger } from '../utils';

const WRAPPED = Symbol('async-handler-wrapped');
const ROUTER_WRAPPED = Symbol('router-async-wrapped');

function normalizeStatusCode(err: any) {
  const status = Number(err?.status ?? err?.statusCode);
  if (Number.isInteger(status) && status >= 400 && status <= 599) {
    return status;
  }
  return 500;
}

function wrapAsyncHandler(handler: any) {
  if (typeof handler !== 'function' || handler.length === 4 || handler[WRAPPED]) {
    return handler;
  }

  const wrapped = function wrappedHandler(req: any, res: any, next: any) {
    try {
      const result = handler(req, res, next);
      if (result && typeof result.then === 'function') {
        result.catch(next);
      }
    } catch (error) {
      next(error);
    }
  };

  wrapped[WRAPPED] = true;
  return wrapped;
}

export function wrapRouterAsyncHandlers(router: any) {
  if (!router || router[ROUTER_WRAPPED]) return router;

  for (const layer of router.stack || []) {
    if (layer?.route?.stack) {
      for (const routeLayer of layer.route.stack) {
        routeLayer.handle = wrapAsyncHandler(routeLayer.handle);
      }
      continue;
    }

    if (layer?.name === 'router' && layer?.handle?.stack) {
      wrapRouterAsyncHandlers(layer.handle);
      continue;
    }

    if (typeof layer?.handle === 'function') {
      layer.handle = wrapAsyncHandler(layer.handle);
    }
  }

  router[ROUTER_WRAPPED] = true;
  return router;
}

export function errorHandler(err: any, req: any, res: any, _next: any) {
  const status = normalizeStatusCode(err);
  logger.error('request failed', {
    status,
    method: req?.method,
    url: req?.originalUrl || req?.url,
    ...getErrorDetails(err)
  });

  if (res.headersSent) {
    return;
  }

  const message = status >= 500 ? 'Internal server error' : (err?.message || 'Request failed');
  res.status(status).json({ error: message });
}
