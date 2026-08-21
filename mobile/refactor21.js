const fs = require('fs');
let p = 'src/infrastructure/persistence/command-snapshot-schema.ts';
let code = fs.readFileSync(p, 'utf8');

code = code.replace(/import type \{ CommandLogEntry, SnapshotSummary \} from "\.\.\/\.\.\/core\/models\/commands";/, 'import type { CommandLogEntry } from "../../core/models/commands";');
code = code.replace(/type SnapshotReason = [\s\S]*?;\r?\n/, '');
code = code.replace(/export interface StateSnapshotEnvelope [\s\S]*?\}\r?\n/, '');
code = code.replace(/export const SnapshotSchema = [\s\S]*?\}\);\r?\n/, '');
code = code.replace(/export function serializeSnapshot[\s\S]*?\}\r?\n/, '');
code = code.replace(/export function deserializeSnapshot[\s\S]*?\}\r?\n/, '');
code = code.replace(/export function extractSnapshotSummary[\s\S]*?\}\r?\n/, '');

fs.writeFileSync(p, code);