export function detectConflict(localVersion, serverVersion) {
  return localVersion < serverVersion;
}

export function mergeConflict(yours, theirs) {
  // Naive line-level merge — replace with diff3 library for production
  const yourLines = new Set(yours.split('\n'));
  const theirLines = theirs.split('\n');
  const merged = theirLines.map(line =>
    yourLines.has(line) ? line : `[CONFLICT] ${line}`
  );
  return merged.join('\n');
}