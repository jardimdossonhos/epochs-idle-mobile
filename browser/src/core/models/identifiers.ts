export function sortUniqueIds(ids: readonly string[]): string[] {
  return Array.from(new Set(ids)).sort((left, right) => left.localeCompare(right));
}

export function canonicalPair(leftId: string, rightId: string): [string, string] {
  const [first, second] = sortUniqueIds([leftId, rightId]);
  return [first ?? leftId, second ?? rightId];
}

export function canonicalPairId(leftId: string, rightId: string): string {
  const [first, second] = canonicalPair(leftId, rightId);
  return `${first}__${second}`;
}

export function canonicalGroupId(ids: readonly string[]): string {
  return sortUniqueIds(ids).join("+");
}

export function buildWarId(attackerId: string, defenderId: string, tick: number): string {
  return `war:${canonicalPairId(attackerId, defenderId)}:${Math.trunc(tick)}`;
}

export function buildWarIdFromSides(attackers: readonly string[], defenders: readonly string[], stamp: number): string {
  const leftGroup = canonicalGroupId(attackers);
  const rightGroup = canonicalGroupId(defenders);
  const [left, right] = leftGroup.localeCompare(rightGroup) <= 0 ? [leftGroup, rightGroup] : [rightGroup, leftGroup];
  return `war:${left}::${right}:${Math.trunc(stamp)}`;
}

export function buildTreatyId(type: string, parties: readonly string[], signedAt: number): string {
  return `treaty:${type}:${canonicalGroupId(parties)}:${Math.trunc(signedAt)}`;
}
