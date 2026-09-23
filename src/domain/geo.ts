export function distanceMeters(a: [number, number], b: [number, number]) {
  const r = Math.PI / 180;
  const dLat = (b[1] - a[1]) * r,
    dLon = (b[0] - a[0]) * r;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a[1] * r) * Math.cos(b[1] * r) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
export function distanceToRoute(
  point: [number, number],
  route: [number, number][],
): number {
  if (!route.length) return Infinity;
  if (route.length === 1) return distanceMeters(point, route[0]);
  const scaleX = 111320 * Math.cos((point[1] * Math.PI) / 180),
    scaleY = 111320;
  let minimum = Infinity;
  for (let i = 1; i < route.length; i++) {
    const a = [
      (route[i - 1][0] - point[0]) * scaleX,
      (route[i - 1][1] - point[1]) * scaleY,
    ];
    const b = [
      (route[i][0] - point[0]) * scaleX,
      (route[i][1] - point[1]) * scaleY,
    ];
    const dx = b[0] - a[0],
      dy = b[1] - a[1];
    const t = Math.max(
      0,
      Math.min(1, -(a[0] * dx + a[1] * dy) / (dx * dx + dy * dy || 1)),
    );
    minimum = Math.min(minimum, Math.hypot(a[0] + t * dx, a[1] + t * dy));
  }
  return minimum;
}
