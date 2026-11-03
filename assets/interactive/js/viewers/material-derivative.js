import {
  compileExpr, linspace, rk4, arrows2d, layout2d, label3d, fmt, tex
} from "../helpers.js";

const FRAMES = 160;
const DENSITY = 9;
const GRID = 60; // resolution of the field image

const GREEN = "#12795a";
const DARK = "#15233a";

export default {
  id: "material-derivative",
  dim: 2,
  title: "The material derivative",
  blurb: "There are two ways to ask how fast something changes in a flow. A fixed probe sees only ∂φ/∂t. A particle carried along also feels the field change underneath it. The green marker rides with the flow and the dark one stays put.",
  drawLabel: "Run the flow",
  presets: {
    steady: {
      label: "Steady field, moving particle",
      values: { phi: "x", vx: "1", vy: "0", tmax: 3, x0: -1.5, y0: 0.5, lo: -2.5, hi: 2.5 }
    },
    unsteady: {
      label: "Field changes, particle still",
      values: { phi: "t - 1", vx: "0", vy: "0", tmax: 3, x0: 0, y0: 0, lo: -2.5, hi: 2.5 }
    },
    cancelling: {
      label: "The two cancel",
      values: { phi: "x - t", vx: "1", vy: "0", tmax: 3, x0: -1.5, y0: 0, lo: -2.5, hi: 2.5 }
    },
    hotspot: {
      label: "Through a hot spot",
      values: { phi: "2 exp(-(x^2 + y^2))", vx: "1", vy: "0.3", tmax: 4, x0: -2, y0: -0.6, lo: -2.5, hi: 2.5 }
    },
    swirl: {
      label: "Rotating past a gradient",
      values: { phi: "y", vx: "-y", vy: "x", tmax: 6.2832, x0: 1.2, y0: 0, lo: -2.5, hi: 2.5 }
    }
  },
  controls: [
    { kind: "text", name: "phi", label: "\u03C6(t, x, y)" },
    { kind: "text", name: "vx", label: "v\u2093(t, x, y)" },
    { kind: "text", name: "vy", label: "v\u1D67(t, x, y)" },
    { kind: "number", name: "tmax", label: "run until t =" },
    { kind: "pair", label: "particle starts at", names: ["x0", "y0"] },
    { kind: "pair", label: "box from / to", names: ["lo", "hi"] }
  ],
  sliders: [{ name: "t", label: "t" }],

  build(vals) {
    const tmax = Number(vals.tmax);
    const lo = Number(vals.lo);
    const hi = Number(vals.hi);
    const seed = [Number(vals.x0), Number(vals.y0)];
    if (!isFinite(tmax) || tmax <= 0) throw new Error("Need a positive end time");
    if (!isFinite(lo) || !isFinite(hi) || hi <= lo) throw new Error("Need a box with start < end");
    if (!isFinite(seed[0]) || !isFinite(seed[1])) throw new Error("Need a starting point");

    const ephi = compileExpr(vals.phi, "\u03C6");
    const ex = compileExpr(vals.vx, "v\u2093");
    const ey = compileExpr(vals.vy, "v\u1D67");
    const phi = (t, p) => ephi({ t, x: p[0], y: p[1], z: 0 });
    const velocity = (t, p) => {
      const scope = { t, x: p[0], y: p[1], z: 0 };
      const u = ex(scope);
      const v = ey(scope);
      return [isFinite(u) ? u : 0, isFinite(v) ? v : 0];
    };

    const dt = tmax / (FRAMES - 1);
    const path = [seed.slice()];
    let p = seed.slice();
    for (let f = 1; f < FRAMES; f++) {
      p = rk4(velocity, (f - 1) * dt, p, dt);
      path.push(p.slice());
    }

    const axesLine = linspace(lo, hi, GRID);
    const arrowAxis = linspace(lo, hi, DENSITY);
    const arrowPoints = [];
    arrowAxis.forEach((x) => arrowAxis.forEach((y) => arrowPoints.push([x, y])));
    const speeds = arrowPoints.map((q) => Math.hypot(...velocity(0, q)));
    const fastest = Math.max(...speeds.filter(isFinite)) || 1;
    const scale = (0.8 * (hi - lo)) / (DENSITY - 1) / fastest;

    // a colour range that covers the whole run, so the picture is comparable
    // from frame to frame rather than rescaling as you drag
    let extreme = 0;
    for (let f = 0; f < FRAMES; f += 8)
      arrowPoints.forEach((q) => {
        const value = phi(f * dt, q);
        if (isFinite(value)) extreme = Math.max(extreme, Math.abs(value));
      });
    extreme = extreme || 1;

    const image = (t) => axesLine.map((y) => axesLine.map((x) => {
      const value = phi(t, [x, y]);
      return isFinite(value) ? value : null;
    }));
    if (!image(0).flat().some((c) => c !== null)) throw new Error("\u03C6 is undefined over this box");

    const field = arrows2d(arrowPoints, arrowPoints.map((q) => velocity(0, q)), scale);

    return {
      traces: [
        {
          type: "heatmap", x: axesLine, y: axesLine, z: image(0), hoverinfo: "skip",
          colorscale: "RdBu", reversescale: true, zmin: -extreme, zmax: extreme, zsmooth: "best",
          opacity: 0.75, colorbar: { title: { text: "\u03C6", font: { size: 15 } }, thickness: 12, len: 0.6 }
        },
        { type: "scatter", mode: "lines", hoverinfo: "skip", x: field.x, y: field.y, line: { color: "#5b6b7c", width: 1 } },
        { type: "scatter", mode: "lines", hoverinfo: "skip", x: [], y: [], line: { color: GREEN, width: 3 } },
        { type: "scatter", mode: "markers", hoverinfo: "skip", x: [], y: [], marker: { size: 10, color: GREEN } },
        {
          type: "scatter", mode: "markers", hoverinfo: "skip", x: [seed[0]], y: [seed[1]],
          marker: { size: 10, color: DARK, symbol: "square-open", line: { width: 2.5 } }
        }
      ],
      layout: layout2d([lo, hi], [lo, hi]),
      sliders: { t: { min: 0, max: tmax, step: dt, value: 0 } },
      state: {
        phi, velocity, path, dt, seed, image, arrowPoints, scale,
        h: (hi - lo) * 1e-4, ht: Math.max(tmax * 1e-4, 1e-6)
      },
      formula:
        `\\varphi(t,x,y) = ${tex(vals.phi)}, \\qquad ` +
        `\\mathbf{v} = \\left(${tex(vals.vx)},\\ ${tex(vals.vy)}\\right)`
    };
  },

  update(S, at) {
    const frame = Math.max(0, Math.min(S.path.length - 1, Math.round(at.t / S.dt)));
    const t = frame * S.dt;
    const here = S.path[frame];

    const rates = (p) => {
      const dphidt = (S.phi(t + S.ht, p) - S.phi(t - S.ht, p)) / (2 * S.ht);
      const gx = (S.phi(t, [p[0] + S.h, p[1]]) - S.phi(t, [p[0] - S.h, p[1]])) / (2 * S.h);
      const gy = (S.phi(t, [p[0], p[1] + S.h]) - S.phi(t, [p[0], p[1] - S.h])) / (2 * S.h);
      const v = S.velocity(t, p);
      const advective = v[0] * gx + v[1] * gy;
      return { dphidt, advective, total: dphidt + advective, value: S.phi(t, p) };
    };

    const moving = rates(here);
    const fixed = rates(S.seed);
    const trail = S.path.slice(0, frame + 1);
    const field = arrows2d(S.arrowPoints, S.arrowPoints.map((q) => S.velocity(t, q)), S.scale);

    return {
      labels: { t: t.toFixed(2) },
      restyle: [
        { trace: 0, data: { z: [S.image(t)] } },
        { trace: 1, data: { x: [field.x], y: [field.y] } },
        { trace: 2, data: { x: [trail.map((q) => q[0])], y: [trail.map((q) => q[1])] } },
        { trace: 3, data: { x: [[here[0]]], y: [[here[1]]] } }
      ],
      annotations: [
        label3d([here[0], here[1], 0], `\u03C6 = ${fmt(moving.value, 2)}`, GREEN),
        label3d([S.seed[0], S.seed[1], 0], `\u03C6 = ${fmt(fixed.value, 2)}`, DARK)
      ],
      readout:
        `riding along: D\u03C6/Dt = <span class="k-green">${fmt(moving.total, 3)}</span> = ` +
        `\u2202\u03C6/\u2202t ${fmt(moving.dphidt, 3)} + v\u00B7\u2207\u03C6 ${fmt(moving.advective, 3)}` +
        `   \u2014 fixed probe sees \u2202\u03C6/\u2202t = <span class="k-ink">${fmt(fixed.dphidt, 3)}</span>`
    };
  },

  sections: [
    {
      heading: "Two observers, two rates",
      body: "<p>A buoy anchored in a river measures the temperature at one fixed place, recording \\(\\partial\\varphi/\\partial t\\). A boat drifting with the current measures something different, because it is being carried into water that was always at a different temperature. The rate the boat records is the material derivative:</p>\\[ \\frac{D\\varphi}{Dt} = \\frac{\\partial\\varphi}{\\partial t} + \\mathbf{v}\\cdot\\nabla\\varphi \\]<p>The first term is how the field itself is changing; the second is how much of the field's spatial variation the particle is sweeping through.</p>"
    },
    {
      heading: "Three cases",
      body: "<ul><li><strong>Steady field, moving particle.</strong> \\(\\varphi = x\\) with \\(\\mathbf{v} = (1,0)\\). The picture never changes, so the fixed probe reads zero, yet the particle has \\(D\\varphi/Dt = 1\\). A steady field does not mean nothing is happening to the fluid.</li><li><strong>Changing field, still particle.</strong> With \\(\\mathbf{v} = \\mathbf{0}\\) the advective term vanishes and the two rates agree.</li><li><strong>The two cancel.</strong> \\(\\varphi = x - t\\) carried by \\(\\mathbf{v} = (1,0)\\) gives \\(\\partial\\varphi/\\partial t = -1\\) and \\(\\mathbf{v}\\cdot\\nabla\\varphi = +1\\). The pattern sweeps past the fixed probe, which sees a falling value, while the particle rides along with it and its \\(\\varphi\\) never changes.</li></ul><p>That last case is the one to remember. \\(D\\varphi/Dt = 0\\) says a quantity is carried unchanged by the flow.</p>"
    },
    {
      heading: "Vectors and tensors need more",
      body: "<p>For a scalar this is enough. A temperature does not care which way it points, so following the particle is the whole story.</p><p>A vector or tensor does care. Carry a small material line element down the flow and it is turned and stretched on the way, so its components change even when nothing has happened to it that the material would recognise. \\(D\\mathbf{A}/Dt = \\mathbf{0}\\) is therefore not the right way to say a tensor is carried along unchanged, which is the problem the convected derivatives solve.</p>"
    }
  ]
};
