/**
 * Telemetry Module (Disabled for NewClaw)
 * All telemetry functions are no-ops to protect user privacy.
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function initTelemetry(): Promise<void> {
  // No-op: NewClaw does not collect telemetry
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function trackMetric(_event: string, _properties: Record<string, unknown> = {}): void {
  // No-op
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function captureTelemetryEvent(_event: string, _properties: Record<string, unknown> = {}): void {
  // No-op
}

export async function shutdownTelemetry(): Promise<void> {
  // No-op
}
