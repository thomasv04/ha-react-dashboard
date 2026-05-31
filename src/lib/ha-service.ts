export function callHAService(
  helpers: { callService: unknown },
  domain: string,
  service: string,
  target: Record<string, unknown>,
  serviceData?: Record<string, unknown>
) {
  (helpers.callService as (args: unknown) => void)({
    domain, service, target, serviceData,
  });
}
