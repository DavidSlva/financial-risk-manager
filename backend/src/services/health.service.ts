export interface HealthStatus {
  status: 'ok';
  uptimeSeconds: number;
  timestamp: string;
}

export function getHealthStatus(): HealthStatus {
  return {
    status: 'ok',
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  };
}
