import {
  compileExpr, linspace, rk4, arrows2d, joinPaths, layout2d, label3d, fmt, tex
} from "../helpers.js";

const FRAMES = 150;
const DENSITY = 11;
const STREAM_STEPS = 70;
const SEEDS = 9;

const BLUE = "#2b5c8a";
const GREEN = "#12795a";
const RED = "#b03a2b";

export default {
  id: "stream-path-streak",
  dim: 2,
  title: "Streamlines, pathlines and streaklines",
  blurb: "Three different curves get called the flow. In a steady flow they are the same curve; in an unsteady one they are not. Blue: streamlines. Green: the pathline of one particle. Red: the streakline made by releasing particles continuously from the marker.",
  drawLabel: "Run the flow",
  presets: {
    steady: {
      label: "Steady: v = (1, x)",
      values: { vx: "1", vy: "x", tmax: 4, x0: -1.5, y0: 0, lo: -2.5, hi: 2.5 }
    },
    oscillating: {
      label: "Unsteady: v = (1, sin(2t))",
      values: { vx: "1", vy: "sin(2 t)", tmax: 6, x0: -2, y0: 0, lo: -2.5, hi: 2.5 }
    },
    flapping: {
      label: "Unsteady: v = (1, cos(t) y)",
      values: { vx: "1", vy: "cos(t) y", tmax: 6, x0: -2, y0: 0.6, lo: -2.5, hi: 2.5 }
    },
    swirl: {
      label: "Unsteady vortex",
      values: { vx: "-y + 0.6 sin(t)", vy: "x", tmax: 8, x0: 1, y0: 0, lo: -2.5, hi: 2.5 }
    }
  },
  controls: [
    { kind: "text", name: "vx", label: "v\u2093(t, x, y)" },
    { kind: "text", name: "vy", label: "v\u1D67(t, x, y)" },
    { kind: "number", name: "tmax", label: "run until t =" },
    { kind: "pair", label: "release point x\u2080, y\u2080", names: ["x0", "y0"] },
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
    if (!isFinite(seed[0]) || !isFinite(seed[1])) throw new Error("Need a release point");

    const ex = compileExpr(vals.vx, "v\u2093");
    const ey = compileExpr(vals.vy, "v\u1D67");
    const velocity = (t, p) => {
      const scope = { t, x: p[0], y: p[1], z: 0 };
      const u = ex(scope);
      const v = ey(scope);
      return [isFinite(u) ? u : 0, isFinite(v) ? v : 0];
    };

    const dt = tmax / (FRAMES - 1);

    // Step every particle forward together, releasing a new one each frame.
    // The particle released at t = 0 traces the pathline; the whole population,
    // read off at one instant, is the streakline.
    let particles = [seed.slice()];
    const pathline = [seed.slice()];
    const streaks = [[seed.slice()]];
    for (let f = 1; f < FRAMES; f++) {
      const t = (f - 1) * dt;
      particles = particles.map((p) => rk4(velocity, t, p, dt));
      particles.push(seed.slice()); // released now, at the current instant
      pathline.push(particles[0].slice());
      streaks.push(particles.map((p) => p.slice()));
    }

    const axes = linspace(lo, hi, DENSITY);
    const gridPoints = [];
    axes.forEach((x) => axes.forEach((y) => gridPoints.push([x, y])));
    const sampleSpeeds = [];
    for (let f = 0; f < FRAMES; f += 20)
      gridPoints.forEach((p) => sampleSpeeds.push(Math.hypot(...velocity(f * dt, p))));
    const fastest = Math.max(...sampleSpeeds.filter(isFinite)) || 1;
    const scale = (0.8 * (hi - lo)) / (DENSITY - 1) / fastest;

    const seedRow = linspace(lo + (hi - lo) / 10, hi - (hi - lo) / 10, SEEDS);

    return {
      traces: [
        { type: "scatter", mode: "lines", hoverinfo: "skip", x: [], y: [], line: { color: "#c3ced8", width: 1 } },
        { type: "scatter", mode: "lines", hoverinfo: "skip", x: [], y: [], line: { color: BLUE, width: 1.6 }, opacity: 0.85 },
        { type: "scatter", mode: "lines", hoverinfo: "skip", x: [], y: [], line: { color: GREEN, width: 3 } },
        { type: "scatter", mode: "lines", hoverinfo: "skip", x: [], y: [], line: { color: RED, width: 3 } },
        {
          type: "scatter", mode: "markers", hoverinfo: "skip",
          x: [seed[0]], y: [seed[1]], marker: { size: 9, color: "#15233a", symbol: "circle-open", line: { width: 2 } }
        },
        { type: "scatter", mode: "markers", hoverinfo: "skip", x: [], y: [], marker: { size: 8, color: GREEN } }
      ],
      layout: layout2d([lo, hi], [lo, hi]),
      sliders: { t: { min: 0, max: tmax, step: dt, value: 0 } },
      state: {
        velocity, dt, pathline, streaks, gridPoints, scale, seed, seedRow,
        bounds: [lo, hi], step: (hi - lo) / STREAM_STEPS
      },
      formula: `\\mathbf{v}(t,x,y) = \\left(${tex(vals.vx)},\\ ${tex(vals.vy)}\\right)`
    };
  },

  update(S, at) {
    const frame = Math.max(0, Math.min(S.streaks.length - 1, Math.round(at.t / S.dt)));
    const t = frame * S.dt;
    const [lo, hi] = S.bounds;

    // Streamlines: integrate through the field frozen at this instant, both
    // ways from each seed, so the curve passes through the seed rather than
    // starting there.
    const inside = (p) => p[0] >= lo && p[0] <= hi && p[1] >= lo && p[1] <= hi;
    const frozen = (s, p) => {
      const v = S.velocity(t, p);
      const speed = Math.hypot(v[0], v[1]);
      return speed > 1e-9 ? [v[0] / speed, v[1] / speed] : [0, 0];
    };
    const lines = S.seedRow.map((y) => {
      const forward = [];
      const backward = [];
      let p = [lo + 0.02 * (hi - lo), y];
      let q = p.slice();
      for (let i = 0; i < STREAM_STEPS; i++) {
        p = rk4(frozen, 0, p, S.step);
        if (!inside(p)) break;
        forward.push(p.slice());
      }
      for (let i = 0; i < STREAM_STEPS; i++) {
        q = rk4(frozen, 0, q, -S.step);
        if (!inside(q)) break;
        backward.push(q.slice());
      }
      return backward.reverse().concat([[lo + 0.02 * (hi - lo), y]], forward);
    });

    const stream = joinPaths(lines);
    const path = S.pathline.slice(0, frame + 1);
    const streak = S.streaks[frame];
    const field = arrows2d(S.gridPoints, S.gridPoints.map((p) => S.velocity(t, p)), S.scale);
    const head = path[path.length - 1];

    return {
      labels: { t: t.toFixed(2) },
      restyle: [
        { trace: 0, data: { x: [field.x], y: [field.y] } },
        { trace: 1, data: { x: [stream.x], y: [stream.y] } },
        { trace: 2, data: { x: [path.map((p) => p[0])], y: [path.map((p) => p[1])] } },
        { trace: 3, data: { x: [streak.map((p) => p[0])], y: [streak.map((p) => p[1])] } },
        { trace: 5, data: { x: [[head[0]]], y: [[head[1]]] } }
      ],
      annotations: [
        label3d([head[0], head[1], 0], "particle", GREEN),
        label3d([streak[streak.length - 1][0], streak[streak.length - 1][1], 0], "", RED)
      ],
      readout:
        `particle at <span class="k-green">(${fmt(head[0])}, ${fmt(head[1])})</span>   ` +
        `dye released from (${fmt(S.seed[0])}, ${fmt(S.seed[1])})   ` +
        `<span class="k-blue">streamline</span> \u2014 <span class="k-green">pathline</span> \u2014 ` +
        `<span class="k-red">streakline</span>`
    };
  },

  sections: [
    {
      heading: "Three curves, three questions",
      body: "<p>A <strong>streamline</strong> is a snapshot. Freeze the field at time \\(t\\) and follow the curve that is everywhere tangent to it:</p>\\[ \\frac{d\\mathbf{x}}{ds} \\parallel \\mathbf{v}(t, \\mathbf{x}), \\qquad t \\text{ fixed} \\]<p>A <strong>pathline</strong> is a history. Release one particle and record where it goes:</p>\\[ \\frac{d\\mathbf{x}}{dt} = \\mathbf{v}(t, \\mathbf{x}), \\qquad \\mathbf{x}(t_0) = \\mathbf{x}_0 \\]<p>A <strong>streakline</strong> is what dye makes in a lab. Inject dye continuously at one point; at time \\(t\\) it occupies the positions of all the particles released at earlier times, each carried along since its own release.</p>"
    },
    {
      heading: "Why they coincide, and when they don't",
      body: "<p>If the field does not depend on time the snapshot never changes. A particle following the field stays on the streamline it started on, and every particle released at the same point takes the same route, so all three curves lie on top of each other. The steady example shows this.</p><p>Now try \\(\\mathbf{v} = (1, \\sin 2t)\\). The streamlines are straight lines whose slope swings up and down as the whole field moves together. The pathline is a single wavy trajectory. The streakline is a different wave again, because its head was released just now while its tail was released long ago and has been swung about since.</p><p>This matters when reading experimental images. Smoke and dye photographs show streaklines, a long exposure of one bright particle shows a pathline, and the arrows in a computed field map are tangent to streamlines.</p>"
    }
  ]
};
