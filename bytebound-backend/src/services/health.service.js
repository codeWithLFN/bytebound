export function getHealthStatus() {
    return {
        status: 'ok',
        service: 'bytebound-backend',
        timestamp: new Date().toISOString(),
    };
}