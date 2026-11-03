import {
  compileExpr, linspace, rk4, arrows2d, joinPaths, matMul2, matVec2, transpose2,
  inv2, det2, eigSym2, ellipseFromTensor, layout2d, label3d, fmt, tex
} from "../helpers.js";

const FRAMES = 160;
const DENSITY = 9;

const UPPER = "#b03a2b";
const LOWER = "#12795a";
const JAUMANN = "#6a3d9a";
const MATERIAL = "#2b5c8a";

const START = {
  circle: { label: "Circle", A: [[1, 0], [0, 1]] },
  along: { label: "Ellipse along x", A: [[4, 0], [0, 0.25]] },
  tilted: { label: "Ellipse at 45\u00B0", A: [[2.125, 1.875], [1.875, 2.125]] }
};

const RULES = {
  upper: { key: "upper", label: "Upper-convected", colour: UPPER, dash: "solid" },
  lower: { key: "lower", label: "Lower-convected", colour: LOWER, dash: "dot" },
  jaumann: { key: "jaumann", label: "Corotational", colour: JAUMANN, dash: "dash" }
};

export default {
  id: "convected-derivative",
  dim: 2,
  title: "Convected derivatives",
  blurb: "Each convected derivative answers one question differently: what does it mean for a tensor to be carried along by a flow unchanged? Each answer is a transport rule, drawn here as an ellipse riding with a material particle.",
  drawLabel: "Run the flow",
  presets: {
    shear: { label: "Simple shear", values: { vx: "y", vy: "0", tmax: 3, start: "along", x0: 0, y0: 0, lo: -2.5, hi: 2.5 } },
    rotation: { label: "Rigid rotation", values: { vx: "-y", vy: "x", tmax: 6.2832, start: "along", x0: 1, y0: 0, lo: -2.5, hi: 2.5 } },
    extension: { label: "Extensional flow", values: { vx: "x", vy: "-y", tmax: 1.2, start: "circle", x0: 0.4, y0: 0.4, lo: -2.5, hi: 2.5 } },
    tilted: { label: "Shear on a tilted ellipse", values: { vx: "y", vy: "0", tmax: 3, start: "tilted", x0: 0, y0: 0, lo: -2.5, hi: 2.5 } }
  },
  controls: [
    { kind: "text", name: "vx", label: "v\u2093(t, x, y)" },
    { kind: "text", name: "vy", label: "v\u1D67(t, x, y)" },
    { kind: "number", name: "tmax", label: "run until t =" },
    {
      kind: "select", name: "start", label: "A at t = 0",
      options: Object.keys(START).map((k) => ({ value: k, label: START[k].label }))
    },
    { kind: "pair", label: "particle starts at", names: ["x0", "y0"] },
    { kind: "pair", label: "box from / to", names: ["lo", "hi"] },
    {
      kind: "checks", label: "Transport rules",
      items: [
        { name: "upper", label: "Upper-convected", checked: true },
        { name: "lower", label: "Lower-convected", checked: true },
        { name: "jaumann", label: "Corotational", checked: true },
        { name: "lines", label: "Material line elements", checked: true }
      ]
    }
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

    const ex = compileExpr(vals.vx, "v\u2093");
    const ey = compileExpr(vals.vy, "v\u1D67");
    const velocity = (t, p) => {
      const scope = { t, x: p[0], y: p[1], z: 0 };
      const u = ex(scope);
      const v = ey(scope);
      return [isFinite(u) ? u : 0, isFinite(v) ? v : 0];
    };
    const h = (hi - lo) * 1e-4;
    const gradV = (t, p) => {
      const ax = velocity(t, [p[0] + h, p[1]]);
      const bx = velocity(t, [p[0] - h, p[1]]);
      const ay = velocity(t, [p[0], p[1] + h]);
      const by = velocity(t, [p[0], p[1] - h]);
      return [
        [(ax[0] - bx[0]) / (2 * h), (ay[0] - by[0]) / (2 * h)],
        [(ax[1] - bx[1]) / (2 * h), (ay[1] - by[1]) / (2 * h)]
      ];
    };

    const A0 = (START[vals.start] || START.along).A;

    // Every rule is integrated along the same particle path from the same A0.
    // State: position (2), then upper, lower and corotational A (4 each), then
    // F (4) so the material line elements can be drawn alongside.
    const pack = (M) => [M[0][0], M[0][1], M[1][0], M[1][1]];
    const unpack = (s, i) => [[s[i], s[i + 1]], [s[i + 2], s[i + 3]]];

    let state = [seed[0], seed[1], ...pack(A0), ...pack(A0), ...pack(A0), 1, 0, 0, 1];
    const flow = (t, s) => {
      const p = [s[0], s[1]];
      const v = velocity(t, p);
      const L = gradV(t, p);
      const LT = transpose2(L);
      const W = [[0, (L[0][1] - L[1][0]) / 2], [(L[1][0] - L[0][1]) / 2, 0]];

      const up = unpack(s, 2);
      const low = unpack(s, 6);
      const jm = unpack(s, 10);
      const F = unpack(s, 14);

      // upper-convected zero: DA/Dt = L A + A L^T   (carried like line elements)
      const dUp = add(matMul2(L, up), matMul2(up, LT));
      // lower-convected zero: DA/Dt = -L^T A - A L  (carried like surface normals)
      const dLow = add(scale(matMul2(LT, low), -1), scale(matMul2(low, L), -1));
      // corotational zero: DA/Dt = W A - A W        (merely turned by the spin)
      const dJm = add(matMul2(W, jm), scale(matMul2(jm, W), -1));
      const dF = matMul2(L, F);

      return [v[0], v[1], ...pack(dUp), ...pack(dLow), ...pack(dJm), ...pack(dF)];
    };
    function add(A, B) {
      return [[A[0][0] + B[0][0], A[0][1] + B[0][1]], [A[1][0] + B[1][0], A[1][1] + B[1][1]]];
    }
    function scale(A, k) {
      return [[A[0][0] * k, A[0][1] * k], [A[1][0] * k, A[1][1] * k]];
    }

    const dt = tmax / (FRAMES - 1);
    const path = [seed.slice()];
    const upper = [A0];
    const lower = [A0];
    const jaumann = [A0];
    const gradients = [[[1, 0], [0, 1]]];
    for (let f = 1; f < FRAMES; f++) {
      state = rk4(flow, (f - 1) * dt, state, dt);
      path.push([state[0], state[1]]);
      upper.push(unpack(state, 2));
      lower.push(unpack(state, 6));
      jaumann.push(unpack(state, 10));
      gradients.push(unpack(state, 14));
    }

    const arrowAxis = linspace(lo, hi, DENSITY);
    const arrowPoints = [];
    arrowAxis.forEach((x) => arrowAxis.forEach((y) => arrowPoints.push([x, y])));
    const speeds = arrowPoints.map((q) => Math.hypot(...velocity(0, q)));
    const fastest = Math.max(...speeds.filter(isFinite)) || 1;
    const arrowScale = (0.8 * (hi - lo)) / (DENSITY - 1) / fastest;
    const field = arrows2d(arrowPoints, arrowPoints.map((q) => velocity(0, q)), arrowScale);

    const show = {
      upper: !!vals.upper, lower: !!vals.lower, jaumann: !!vals.jaumann, lines: !!vals.lines
    };
    const size = 0.28 * (hi - lo);
    const ellipse = (A) => ellipseFromTensor(A, seed, size / 2);

    const line = (colour, dash, visible) => ({
      type: "scatter", mode: "lines", hoverinfo: "skip", x: [], y: [],
      line: { color: colour, width: 2.5, dash }, visible
    });

    return {
      traces: [
        { type: "scatter", mode: "lines", hoverinfo: "skip", x: field.x, y: field.y, line: { color: "#c3ced8", width: 1 } },
        { type: "scatter", mode: "lines", hoverinfo: "skip", x: [], y: [], line: { color: "#9fb2c1", width: 1.5 } },
        Object.assign(line(UPPER, "solid", show.upper), ellipse(A0)),
        Object.assign(line(LOWER, "dot", show.lower), ellipse(A0)),
        Object.assign(line(JAUMANN, "dash", show.jaumann), ellipse(A0)),
        {
          type: "scatter", mode: "lines", hoverinfo: "skip", x: [], y: [],
          line: { color: MATERIAL, width: 1.5 }, visible: show.lines
        },
        { type: "scatter", mode: "markers", hoverinfo: "skip", x: [seed[0]], y: [seed[1]], marker: { size: 5, color: "#15233a" } }
      ],
      layout: layout2d([lo, hi], [lo, hi]),
      sliders: { t: { min: 0, max: tmax, step: dt, value: 0 } },
      state: {
        velocity, path, upper, lower, jaumann, gradients, dt, show, size, A0,
        arrowPoints, arrowScale
      },
      formula:
        `\\mathbf{v} = \\left(${tex(vals.vx)},\\ ${tex(vals.vy)}\\right), \\qquad ` +
        `\\mathbf{A}(0) = \\begin{bmatrix} ${fmt(A0[0][0])} & ${fmt(A0[0][1])} \\\\ ` +
        `${fmt(A0[1][0])} & ${fmt(A0[1][1])} \\end{bmatrix}`
    };
  },

  update(S, at) {
    const frame = Math.max(0, Math.min(S.path.length - 1, Math.round(at.t / S.dt)));
    const t = frame * S.dt;
    const here = S.path[frame];
    const half = S.size / 2;

    const up = S.upper[frame];
    const low = S.lower[frame];
    const jm = S.jaumann[frame];
    const F = S.gradients[frame];

    const eUp = ellipseFromTensor(up, here, half);
    const eLow = ellipseFromTensor(low, here, half);
    const eJm = ellipseFromTensor(jm, here, half);

    // a cross of material line elements, carried by dx = F dX
    const spokes = [0, 1, 2, 3].map((k) => {
      const th = (Math.PI * k) / 4;
      const dX = [Math.cos(th) * half, Math.sin(th) * half];
      const dx = matVec2(F, dX);
      return [
        [here[0] - dx[0], here[1] - dx[1]],
        [here[0] + dx[0], here[1] + dx[1]]
      ];
    });
    const cross = joinPaths(spokes);
    const field = arrows2d(S.arrowPoints, S.arrowPoints.map((q) => S.velocity(t, q)), S.arrowScale);
    const trail = S.path.slice(0, frame + 1);

    const size = (A) => {
      const { values } = eigSym2(A);
      return `${fmt(Math.sqrt(Math.max(0, values[0])), 2)}\u00D7${fmt(Math.sqrt(Math.max(0, values[1])), 2)}`;
    };

    const annotations = [];
    if (S.show.upper) annotations.push(label3d([eUp.x[0], eUp.y[0], 0], "upper", UPPER));
    if (S.show.lower) annotations.push(label3d([eLow.x[20], eLow.y[20], 0], "lower", LOWER));
    if (S.show.jaumann) annotations.push(label3d([eJm.x[40], eJm.y[40], 0], "corotational", JAUMANN));

    return {
      labels: { t: t.toFixed(2) },
      restyle: [
        { trace: 0, data: { x: [field.x], y: [field.y] } },
        { trace: 1, data: { x: [trail.map((q) => q[0])], y: [trail.map((q) => q[1])] } },
        { trace: 2, data: { x: [eUp.x], y: [eUp.y] } },
        { trace: 3, data: { x: [eLow.x], y: [eLow.y] } },
        { trace: 4, data: { x: [eJm.x], y: [eJm.y] } },
        { trace: 5, data: { x: [cross.x], y: [cross.y] } },
        { trace: 6, data: { x: [[here[0]]], y: [[here[1]]] } }
      ],
      annotations,
      readout:
        `axes \u2014 <span class="k-red">upper ${size(up)}</span>   ` +
        `<span class="k-green">lower ${size(low)}</span>   ` +
        `<span class="k-violet">corotational ${size(jm)}</span>   ` +
        `det: ${fmt(det2(up), 2)} / ${fmt(det2(low), 2)} / ${fmt(det2(jm), 2)}`
    };
  },

  sections: [
    {
      heading: "Why the material derivative is not enough",
      body: "<p>Writing \\(D\\mathbf{A}/Dt = \\mathbf{0}\\) says the components of \\(\\mathbf{A}\\) in the laboratory axes stay fixed while the material underneath them turns and stretches. A fibre embedded in the fluid would swing round while the tensor describing it kept pointing the same way.</p><p>What is needed is a derivative that vanishes exactly when the tensor is being convected by the material. Different ideas of what convected means give different derivatives.</p>"
    },
    {
      heading: "The three rules",
      body: "<p>The <strong>upper-convected</strong> derivative treats the tensor as built from material line elements, \\(d\\mathbf{x} = \\mathbf{F}\\,d\\mathbf{X}\\):</p>\\[ \\stackrel{\\triangledown}{\\mathbf{A}} = \\frac{D\\mathbf{A}}{Dt} - \\mathbf{L}\\mathbf{A} - \\mathbf{A}\\mathbf{L}^{\\top} \\]<p>Setting it to zero gives \\(\\mathbf{A} = \\mathbf{F}\\mathbf{A}_0\\mathbf{F}^{\\top}\\), so the ellipse deforms exactly like a blob of fluid and stays locked to the blue cross of material line elements.</p><p>The <strong>lower-convected</strong> derivative does the same for objects that transform like surface normals or gradients:</p>\\[ \\stackrel{\\triangle}{\\mathbf{A}} = \\frac{D\\mathbf{A}}{Dt} + \\mathbf{L}^{\\top}\\mathbf{A} + \\mathbf{A}\\mathbf{L} \\]<p>with solution \\(\\mathbf{A} = \\mathbf{F}^{-\\top}\\mathbf{A}_0\\mathbf{F}^{-1}\\), which in shear leans the opposite way.</p><p>The <strong>corotational</strong> or Jaumann derivative keeps only the spin:</p>\\[ \\stackrel{\\circ}{\\mathbf{A}} = \\frac{D\\mathbf{A}}{Dt} - \\mathbf{W}\\mathbf{A} + \\mathbf{A}\\mathbf{W} \\]<p>Its solution \\(\\mathbf{A} = \\mathbf{Q}\\mathbf{A}_0\\mathbf{Q}^{\\top}\\) turns the ellipse rigidly and never changes its shape.</p>"
    },
    {
      heading: "What the examples show",
      body: "<ul><li><strong>Rigid rotation.</strong> There is no stretching, so all three rules agree and the ellipse simply turns. Any convected derivative must pass this test.</li><li><strong>Simple shear.</strong> They separate at once. The upper-convected ellipse elongates and lies down towards the flow direction, tracking the material cross. The lower-convected one tilts the other way. The corotational one keeps its shape and rotates through the material.</li><li><strong>Extensional flow.</strong> Starting from a circle, the upper-convected tensor stretches without bound along the extension axis, while the corotational one, with \\(\\mathbf{W} = \\mathbf{0}\\), does nothing at all.</li></ul><p>That last point is why the upper-convected derivative appears in the Oldroyd-B and FENE models. A polymer molecule is modelled by a connector vector between beads, which is a material line element, so its conformation tensor is convected the same way. A model built on the corotational derivative would predict no stress growth in extension.</p>"
    }
  ]
};
