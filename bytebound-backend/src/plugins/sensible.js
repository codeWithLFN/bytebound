import sensible from '@fastify/sensible';

export default async function sensiblePlugin(app) {
    await app.register(sensible);
}