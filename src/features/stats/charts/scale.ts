function niceStep(rough: number): number {
  if (!(rough > 0)) return 1
  const exponent = Math.floor(Math.log10(rough))
  const magnitude = 10 ** exponent
  const fraction = rough / magnitude
  const nice =
    fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 2.5 ? 2.5 : fraction <= 5 ? 5 : 10
  return nice * magnitude
}

/** Round axis ticks for a value range, always including both ends. `fromZero` anchors bars at 0. */
export function niceTicks(min: number, max: number, fromZero: boolean, steps = 3): number[] {
  let lo = fromZero ? Math.min(0, min) : min
  let hi = max
  if (hi === lo) {
    // A flat series still needs some vertical room around it.
    const pad = hi === 0 ? 1 : Math.abs(hi) * 0.1
    hi += pad
    if (!fromZero) lo -= pad
  }
  const step = niceStep((hi - lo) / steps)
  const start = Math.floor(lo / step) * step
  const end = Math.ceil(hi / step) * step
  const ticks: number[] = []
  for (let value = start; value <= end + step / 2; value += step) {
    // Avoid binary drift such as 0.30000000000000004.
    ticks.push(Math.round(value / step) * step)
  }
  return ticks.map((t) => Number(t.toPrecision(12)))
}
