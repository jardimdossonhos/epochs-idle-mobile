"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sortUniqueIds = sortUniqueIds;
exports.canonicalPair = canonicalPair;
exports.canonicalPairId = canonicalPairId;
exports.canonicalGroupId = canonicalGroupId;
exports.buildWarId = buildWarId;
exports.buildWarIdFromSides = buildWarIdFromSides;
exports.buildTreatyId = buildTreatyId;
function sortUniqueIds(ids) {
    return Array.from(new Set(ids)).sort((left, right) => left.localeCompare(right));
}
function canonicalPair(leftId, rightId) {
    const [first, second] = sortUniqueIds([leftId, rightId]);
    return [first ?? leftId, second ?? rightId];
}
function canonicalPairId(leftId, rightId) {
    const [first, second] = canonicalPair(leftId, rightId);
    return `${first}__${second}`;
}
function canonicalGroupId(ids) {
    return sortUniqueIds(ids).join("+");
}
function buildWarId(attackerId, defenderId, tick) {
    return `war:${canonicalPairId(attackerId, defenderId)}:${Math.trunc(tick)}`;
}
function buildWarIdFromSides(attackers, defenders, stamp) {
    const leftGroup = canonicalGroupId(attackers);
    const rightGroup = canonicalGroupId(defenders);
    const [left, right] = leftGroup.localeCompare(rightGroup) <= 0 ? [leftGroup, rightGroup] : [rightGroup, leftGroup];
    return `war:${left}::${right}:${Math.trunc(stamp)}`;
}
function buildTreatyId(type, parties, signedAt) {
    return `treaty:${type}:${canonicalGroupId(parties)}:${Math.trunc(signedAt)}`;
}
