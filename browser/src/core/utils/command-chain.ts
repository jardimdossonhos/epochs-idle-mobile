import type { CommandLogEntry } from "../models/commands";
import { hashDeterministic } from "./stable-hash";

export interface CommandChainValidationIssue {
  sequence: number;
  reason: string;
}

export interface CommandChainValidationResult {
  valid: boolean;
  lastSequence: number;
  lastHash: string;
  issues: CommandChainValidationIssue[];
}

export interface CommandChainValidationOptions {
  startSequence?: number;
  startHash?: string;
  requireContiguous?: boolean;
}

function expectedEntryHash(entry: CommandLogEntry): string {
  return hashDeterministic({
    sequence: entry.sequence,
    id: entry.id,
    issuerType: entry.issuerType,
    issuerId: entry.issuerId,
    tick: entry.tick,
    commandType: entry.commandType,
    payload: entry.payload,
    previousHash: entry.previousHash
  });
}

export function validateCommandChain(
  entries: readonly CommandLogEntry[],
  options: CommandChainValidationOptions = {}
): CommandChainValidationResult {
  const startSequence = options.startSequence ?? 0;
  const startHash = options.startHash ?? "genesis";
  const requireContiguous = options.requireContiguous ?? true;

  let previousSequence = startSequence;
  let previousHash = startHash;
  const issues: CommandChainValidationIssue[] = [];

  for (const entry of [...entries].sort((left, right) => left.sequence - right.sequence)) {
    if (entry.sequence <= previousSequence) {
      issues.push({
        sequence: entry.sequence,
        reason: "Sequência não crescente."
      });
    }

    if (requireContiguous && entry.sequence !== previousSequence + 1) {
      issues.push({
        sequence: entry.sequence,
        reason: `Sequência não contígua. Esperado ${previousSequence + 1}, recebido ${entry.sequence}.`
      });
    }

    if (entry.previousHash !== previousHash) {
      issues.push({
        sequence: entry.sequence,
        reason: "Encadeamento de hash inválido (previousHash divergente)."
      });
    }

    const hash = expectedEntryHash(entry);
    if (hash !== entry.hash) {
      issues.push({
        sequence: entry.sequence,
        reason: "Hash do comando inválido."
      });
    }

    previousSequence = entry.sequence;
    previousHash = entry.hash;
  }

  return {
    valid: issues.length === 0,
    lastSequence: previousSequence,
    lastHash: previousHash,
    issues
  };
}
