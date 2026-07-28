import { describe, expect, it } from "vitest";
import type { CommandLogEntry } from "../src/core/models/commands";
import { validateCommandChain } from "../src/core/utils/command-chain";
import { hashDeterministic } from "../src/core/utils/stable-hash";

function createEntry(
  sequence: number,
  previousHash: string,
  commandType: string,
  createdAt: number
): CommandLogEntry {
  const base = {
    sequence,
    id: `cmd:${sequence}:${commandType}`,
    issuerType: "system" as const,
    issuerId: "runtime",
    tick: sequence,
    commandType,
    payload: { index: sequence },
    createdAt,
    previousHash
  };

  const hashMaterial = {
    sequence,
    id: base.id,
    issuerType: base.issuerType,
    issuerId: base.issuerId,
    tick: base.tick,
    commandType: base.commandType,
    payload: base.payload,
    previousHash: base.previousHash
  };

  return {
    ...base,
    hash: hashDeterministic(hashMaterial)
  };
}

describe("command chain validation", () => {
  it("validates contiguous deterministic command chain", () => {
    const first = createEntry(1, "genesis", "tick.processed", 10_000);
    const second = createEntry(2, first.hash, "tick.processed", 11_000);
    const result = validateCommandChain([first, second]);

    expect(result.valid).toBe(true);
    expect(result.issues.length).toBe(0);
    expect(result.lastSequence).toBe(2);
    expect(result.lastHash).toBe(second.hash);
  });

  it("detects invalid previous hash", () => {
    const first = createEntry(1, "genesis", "tick.processed", 10_000);
    const second = createEntry(2, "wrong_hash", "tick.processed", 11_000);
    const result = validateCommandChain([first, second]);

    expect(result.valid).toBe(false);
    expect(result.issues.some((issue) => issue.reason.includes("previousHash"))).toBe(true);
  });
});
