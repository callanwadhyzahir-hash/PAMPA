// Shared vocabulary for GET /platform-admin/system. Unknown is a legitimate
// value: it means we couldn't determine a status, not that the component is
// broken — never collapse Unknown into Healthy or Unavailable.
export type ComponentStatus =
  'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE' | 'UNKNOWN';

const SEVERITY: Record<ComponentStatus, number> = {
  HEALTHY: 0,
  UNKNOWN: 1,
  DEGRADED: 2,
  UNAVAILABLE: 3,
};

export function worstStatus(statuses: ComponentStatus[]): ComponentStatus {
  return statuses.reduce<ComponentStatus>(
    (worst, current) => (SEVERITY[current] > SEVERITY[worst] ? current : worst),
    'HEALTHY',
  );
}
