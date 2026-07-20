import awsLambdaFastify from '@fastify/aws-lambda';
import { buildApp } from '../src/app.js';

const app = buildApp({
    logger: false,
});

await app.ready();

export const handler = awsLambdaFastify(app);