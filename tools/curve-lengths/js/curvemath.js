// Math helpers for the curve-length explorer: f_n(x) = x^n on [0,1],
// its arc length L_n, and Simpson's-rule numerical integration.
// No dependencies, plain functions only.

(function (global) {
  'use strict';

  // f_n(x) = x^n
  function fn(x, n) {
    return Math.pow(x, n);
  }

  // f_n'(x) = n x^(n-1)
  function fnPrime(x, n) {
    if (x === 0) {
      // n=1 -> derivative is 1 everywhere; n>1 -> derivative is 0 at x=0
      return n === 1 ? 1 : 0;
    }
    return n * Math.pow(x, n - 1);
  }

  // Integrand of the arc-length integral: sqrt(1 + f_n'(x)^2)
  function integrand(x, n) {
    const d = fnPrime(x, n);
    return Math.sqrt(1 + d * d);
  }

  // Composite Simpson's rule for L_n = int_0^1 sqrt(1 + n^2 x^(2n-2)) dx,
  // split at x = 1 - 6/n so each half gets subintervals sized to its own
  // curvature: the boundary layer near x=1 is where n^2 x^(2n-2) changes
  // fastest, so it needs much finer resolution than the flat bulk.
  function simpson(f, a, b, steps) {
    if (steps % 2 !== 0) steps += 1;
    const h = (b - a) / steps;
    let sum = f(a) + f(b);
    for (let i = 1; i < steps; i++) {
      const x = a + i * h;
      const coeff = i % 2 === 0 ? 2 : 4;
      sum += coeff * f(x);
    }
    return (h / 3) * sum;
  }

  function arcLength(n) {
    const g = (x) => integrand(x, n);
    if (n <= 2) {
      return simpson(g, 0, 1, 2000);
    }
    const split = Math.max(0, 1 - 10 / n);
    const bulk = simpson(g, 0, split, 1200);
    const layer = simpson(g, split, 1, 8000);
    return bulk + layer;
  }

  // Sample the curve y = x^n on [0,1] into `count` points, biased toward
  // x=1 for large n so the sharp corner is well resolved.
  function sampleCurve(n, count) {
    count = count || 220;
    const pts = [];
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      // ease sampling toward 1 as n grows, using a power warp
      const bias = Math.min(1, 1 + Math.log10(n) * 0.6);
      const x = Math.pow(t, bias);
      pts.push([x, fn(x, n)]);
    }
    // ensure the exact endpoints are present
    pts[0] = [0, 0];
    pts[pts.length - 1] = [1, 1];
    return pts;
  }

  global.CurveMath = { fn, fnPrime, integrand, arcLength, sampleCurve };
})(window);
