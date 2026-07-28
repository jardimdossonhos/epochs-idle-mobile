function normalize(value: unknown): unknown {
  if (value === null || typeof value !== "object") {
    if (typeof value === "number") {
      if (Number.isNaN(value)) {
        return "__NaN";
      }

      if (!Number.isFinite(value)) {
        return value > 0 ? "__Infinity" : "__-Infinity";
      }
    }

    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalize(item));
  }

  const source = value as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  for (const key of Object.keys(source).sort((left, right) => left.localeCompare(right))) {
    const current = source[key];
    if (typeof current === "undefined") {
      continue;
    }

    result[key] = normalize(current);
  }

  return result;
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(normalize(value));
}

function fnv1a32(input: string): string {
  let hash = 0x811c9dc5;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    hash >>>= 0;
  }

  return hash.toString(16).padStart(8, "0");
}

export function hashDeterministic(value: unknown): string {
  return fnv1a32(stableStringify(value));
}
