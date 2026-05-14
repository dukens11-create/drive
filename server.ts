import { createApp } from './app';
import { env } from './env';

const { httpServer } = createApp();

httpServer.listen(env.port, () => console.log(`API V7 running on ${env.port}`));
