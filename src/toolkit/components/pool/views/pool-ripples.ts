/** Shared surface slopes for reflections and screen-space refraction. */
export const POOL_RIPPLE_GLSL = /* glsl */ `
// The slope of a few small travelling waves: a nearly still surface.
vec2 slope(vec2 p, float t) {
  vec2 g = vec2(0.0);
  g += vec2(0.8, 0.6) * cos(dot(p, vec2(0.8, 0.6)) * 5.0 + t * 1.1) * 0.5;
  g += vec2(-0.5, 0.86) * cos(dot(p, vec2(-0.5, 0.86)) * 9.0 + t * 1.6) * 0.32;
  g += vec2(0.24, -0.97) * cos(dot(p, vec2(0.24, -0.97)) * 15.0 + t * 2.2) * 0.2;
  g += vec2(-0.95, -0.3) * cos(dot(p, vec2(-0.95, -0.3)) * 27.0 + t * 3.1) * 0.1;
  g += vec2(0.6, -0.8) * cos(dot(p, vec2(0.6, -0.8)) * 43.0 + t * 3.9) * 0.05;
  return g;
}
`;
