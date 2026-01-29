// Guardrail validation for physical dimensions (mm)
export function validateDimensions(dim: { width: number; height: number; depth: number }): boolean {
  const allowed = [dim.width, dim.height, dim.depth].every(
    (v) => typeof v === 'number' && v > 0 && v < 100_000
  );
  if (!allowed) {
    // eslint-disable-next-line no-console
    console.error('Dimension(s) non valides:', dim);
  }
  return allowed;
}
