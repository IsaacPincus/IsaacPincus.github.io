import {
  compileExpr, linspace, rk4, arrows2d, joinPaths, polygonArea, polar2d, matVec2,
  matMul2, det2, centroid, layout2d, label3d, fmt, tex,
  transpose2
} from "../helpers.js";

const FRAMES = 160; // precomputed time steps
const PER_EDGE = 14; // points along each edge of the blob
const DENSITY = 11; // arrows per axis

const DARK = "#15233a";
const RED = "#b03a2b";
const VIOLET = "#6a3d9a";

const SHAPES = {
  square: [[-0.5, -0.5], [-0.5, 0.5], [0.5, 0.5], [0.5, -0.5]],
  diamond: [[0, -0.7], [-0.7, 0], [0, 0.7], [0.7, 0]],
  tall: [[-0.25, -0.8], [-0.25, 0.8], [0.25, 0.8], [0.25, -0.8]]
};

/** Corners subdivided, so the outline bends rather than staying a polygon. */
function outline(corners) {
  const points = [];
  corners.forEach((a, i) => {
    const b = corners[(i + 1) % corners.length];
    for (let k = 0; k < PER_EDGE; k++) {
      const s = k / PER_EDGE;
      points.push([a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s]);
    }
  });
  return points;
}

function closed(points) {
  const loop = points.concat([points[0]]);
  return { x: loop.map((p) => p[0]), y: loop.map((p) => p[1]) };
}

/** Apply a 2x2 matrix to the blob's offsets and place it at `at`. */
function transformed(offsets, M, at) {
  return closed(offsets.map((o) => {
    const w = matVec2(M, o);
    return [at[0] + w[0], at[1] + w[1]];
  }));
}

export default {
  id: "flow-deformation",
  dim: 2,
  title: "Rotation and stretch in a flow",
  blurb: "A flow turns a piece of material and stretches it at the same time. The red outline is the blob as the flow leaves it, the dashed outline is the rotation alone, and the purple outline is the same deformation with that rotation removed.",
  drawLabel: "Run the flow",
  presets: {
    shear: { label: "Simple shear", values: { vx: "y", vy: "0", tmax: 4, shape: "square", lo: -2, hi: 2 } },
    pure: { label: "Pure shear", values: { vx: "y", vy: "x", tmax: 2, shape: "square", lo: -2, hi: 2 } },
    extension: { label: "Extensional flow", values: { vx: "x", vy: "-y", tmax: 1.5, shape: "square", lo: -2, hi: 2 } },
    rotation: { label: "Rigid rotation", values: { vx: "-y", vy: "x", tmax: 6.2832, shape: "tall", lo: -2, hi: 2 } },
    vortex: { label: "Point vortex", values: { vx: "-y/(x^2+y^2+0.2)", vy: "x/(x^2+y^2+0.2)", tmax: 8, shape: "square", lo: -2, hi: 2 } }
  },
  controls: [
    { kind: "text", name: "vx", label: "v\u2093(t, x, y)" },
    { kind: "text", name: "vy", label: "v\u1D67(t, x, y)" },
    { kind: "number", name: "tmax", label: "run until t =" },
    {
      kind: "select", name: "shape", label: "Blob",
      options: [
        { value: "square", label: "Square" },
        { value: "diamond", label: "Diamond" },
        { value: "tall", label: "Tall rectangle" }
      ]
    },
    { kind: "pair", label: "box from / to", names: ["lo", "hi"] },
    {
      kind: "select", name: "mode", label: "Rotation removed",
      options: [
        { value: "corotating", label: "Continuously, from W" },
        { value: "polar", label: "All at once, F = RU" }
      ]
    },
    {
      kind: "checks", label: "Show",
      items: [
        { name: "rot", label: "Rotation R", checked: true },
        { name: "stretch", label: "Stretch U", checked: true },
        { name: "axes", label: "Principal axes", checked: true }
      ]
    }
  ],
  sliders: [{ name: "t", label: "t" }],

  build(vals) {
    const tmax = Number(vals.tmax);
    const lo = Number(vals.lo);
    const hi = Number(vals.hi);
    if (!isFinite(tmax) || tmax <= 0) throw new Error("Need a positive end time");
    if (!isFinite(lo) || !isFinite(hi) || hi <= lo) throw new Error("Need a box with start < end");

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

    const start = outline(SHAPES[vals.shape] || SHAPES.square);
    const home = centroid(start);
    const offsets = start.map((p) => [p[0] - home[0], p[1] - home[1]]);
    const reach = Math.max(...offsets.map((o) => Math.hypot(o[0], o[1])));

    // Two things are integrated together. The outline is advected point by
    // point, which is what the flow really does to the blob. Alongside it,
    // dF/dt = L F carries the deformation gradient down the centroid's path;
    // its polar decomposition is what splits rotation from stretch.
    const dt = tmax / (FRAMES - 1);
    const history = [start];
    const gradients = [[[1, 0], [0, 1]]];
    const frames = [[[1, 0], [0, 1]]];
    const centres = [home.slice()];

    let shape = start;
    let state = [home[0], home[1], 1, 0, 0, 1, 1, 0, 0, 1];
    const combined = (t, s) => {
      const p = [s[0], s[1]];
      const v = velocity(t, p);
      const L = gradV(t, p);
      // W is the antisymmetric half of L: the spin at this instant
      const W = [
        [0, (L[0][1] - L[1][0]) / 2],
        [(L[1][0] - L[0][1]) / 2, 0]
      ];
      const F = [[s[2], s[3]], [s[4], s[5]]];
      const Q = [[s[6], s[7]], [s[8], s[9]]];
      const dF = matMul2(L, F);
      const dQ = matMul2(W, Q); // the frame that turns with the local spin
      return [
        v[0], v[1],
        dF[0][0], dF[0][1], dF[1][0], dF[1][1],
        dQ[0][0], dQ[0][1], dQ[1][0], dQ[1][1]
      ];
    };

    for (let f = 1; f < FRAMES; f++) {
      const t = (f - 1) * dt;
      shape = shape.map((p) => rk4(velocity, t, p, dt));
      state = rk4(combined, t, state, dt);
      history.push(shape);
      centres.push([state[0], state[1]]);
      gradients.push([[state[2], state[3]], [state[4], state[5]]]);
      frames.push([[state[6], state[7]], [state[8], state[9]]]);
    }
    if (!shape.every((p) => isFinite(p[0]) && isFinite(p[1]))) {
      throw new Error("The flow carries the blob off to infinity \u2014 try a shorter run");
    }

    const axesLine = linspace(lo, hi, DENSITY);
    const gridPoints = [];
    axesLine.forEach((x) => axesLine.forEach((y) => gridPoints.push([x, y])));
    const speeds = gridPoints.map((p) => Math.hypot(...velocity(0, p)));
    const fastest = Math.max(...speeds.filter(isFinite)) || 1;
    const scale = (0.85 * (hi - lo)) / (DENSITY - 1) / fastest;

    const field = arrows2d(gridPoints, gridPoints.map((p) => velocity(0, p)), scale);
    const first = closed(start);
    const show = { rot: !!vals.rot, stretch: !!vals.stretch, axes: !!vals.axes };

    return {
      traces: [
        { type: "scatter", mode: "lines", hoverinfo: "skip", x: field.x, y: field.y, line: { color: "#9fb2c1", width: 1 } },
        {
          type: "scatter", mode: "lines", hoverinfo: "skip", x: first.x, y: first.y,
          line: { color: DARK, width: 1.5, dash: "dash" }, visible: show.rot
        },
        {
          type: "scatter", mode: "lines", hoverinfo: "skip", x: first.x, y: first.y,
          line: { color: VIOLET, width: 2 }, visible: show.stretch
        },
        {
          type: "scatter", mode: "lines", fill: "toself", hoverinfo: "skip", x: first.x, y: first.y,
          line: { color: RED, width: 2.5 }, fillcolor: "rgba(176,58,43,.12)"
        },
        {
          type: "scatter", mode: "lines", hoverinfo: "skip", x: [], y: [],
          line: { color: VIOLET, width: 1.5, dash: "dot" }, visible: show.axes
        }
      ],
      layout: layout2d([lo, hi], [lo, hi]),
      sliders: { t: { min: 0, max: tmax, step: dt, value: 0 } },
      state: {
        velocity, history, gradients, frames, centres, offsets, dt, show, reach,
        shapeName: vals.shape,
        mode: vals.mode === "polar" ? "polar" : "corotating",
        gridPoints, scale, area0: Math.abs(polygonArea(start))
      },
      formula: `\\mathbf{v}(t,x,y) = \\left(${tex(vals.vx)},\\ ${tex(vals.vy)}\\right)`
    };
  },

  update(S, at) {
    const frame = Math.max(0, Math.min(S.history.length - 1, Math.round(at.t / S.dt)));
    const t = frame * S.dt;
    const blob = S.history[frame];
    const here = S.centres[frame];
    const F = S.gradients[frame];
    const Q = S.frames[frame];

    // Two ways to take the rotation out. "polar" removes the total rotation
    // once, at the end: F = R U. "corotating" removes the spin continuously as
    // the flow proceeds, leaving G = Q^T F, which is what the strain rate E
    // accumulates to in a frame that turns with the material.
    const G = matMul2(transpose2(Q), F);
    const spinning = S.mode === "corotating";
    const rotation = spinning ? Q : polar2d(F).R;
    const deformation = spinning ? G : polar2d(F).U;
    const inner = polar2d(deformation);
    const { stretches } = inner;
    const residual = inner.angle;
    // the drawn outline is (rotation part of `deformation`) times a pure
    // stretch, so its long axis sits along that rotation applied to the
    // material principal direction
    const axes = inner.axes.map((e) => matVec2(inner.R, e));
    const angle = Math.atan2(rotation[1][0], rotation[0][0]);

    const rotated = transformed(S.offsets, rotation, here);
    const stretched = transformed(S.offsets, deformation, here);
    const field = arrows2d(S.gridPoints, S.gridPoints.map((p) => S.velocity(t, p)), S.scale);
    const area = Math.abs(polygonArea(blob));

    // the principal directions, drawn through the blob's centre at the length
    // the stretch gives them
    const bars = axes.map((e, i) => {
      const half = stretches[i] * S.reach;
      return [
        [here[0] - e[0] * half, here[1] - e[1] * half],
        [here[0] + e[0] * half, here[1] + e[1] * half]
      ];
    });
    const cross = joinPaths(bars);

    const annotations = [];
    if (S.show.axes) {
      axes.forEach((e, i) => {
        const half = stretches[i] * S.reach;
        annotations.push(
          label3d([here[0] + e[0] * half, here[1] + e[1] * half, 0], `\u03BB${i === 0 ? "\u2081" : "\u2082"} = ${fmt(stretches[i], 2)}`, VIOLET)
        );
      });
    }

    return {
      labels: { t: t.toFixed(2) },
      restyle: [
        { trace: 0, data: { x: [field.x], y: [field.y] } },
        { trace: 1, data: { x: [rotated.x], y: [rotated.y] } },
        { trace: 2, data: { x: [stretched.x], y: [stretched.y] } },
        { trace: 3, data: { x: [closed(blob).x], y: [closed(blob).y] } },
        { trace: 4, data: { x: [cross.x], y: [cross.y] } }
      ],
      annotations,
      readout:
        (spinning ? "frame turned by W: " : "rotation R: ") +
        `<span class="k-ink">${fmt((angle * 180) / Math.PI, 1)}\u00B0</span>   ` +
        `stretches <span class="k-violet">\u03BB\u2081 = ${fmt(stretches[0], 3)}, ` +
        `\u03BB\u2082 = ${fmt(stretches[1], 3)}</span>   ` +
        (spinning && Math.abs(residual) > 1e-3
          ? `residual turn in G <span class="k-violet">${fmt((residual * 180) / Math.PI, 1)}\u00B0</span>   `
          : "") +
        `det F = ${fmt(det2(F), 3)}   ` +
        `area ratio <span class="k-red">${fmt(area / S.area0, 3)}</span>`
    };
  },

  sections: [
    {
      heading: "The deformation gradient",
      body: "<p>Follow a blob down the flow and ask what has happened to a small material vector \\(d\\mathbf{X}\\) attached to it. One matrix answers this, the deformation gradient \\(\\mathbf{F}(t)\\), with \\(d\\mathbf{x} = \\mathbf{F}\\, d\\mathbf{X}\\). It is found by carrying the velocity gradient along the trajectory:</p>\\[ \\frac{d\\mathbf{F}}{dt} = \\mathbf{L}\\,\\mathbf{F}, \\qquad \\mathbf{L} = \\nabla\\mathbf{v}, \\qquad \\mathbf{F}(0) = \\mathbf{I} \\]<p>Its determinant is the area ratio, so \\(\\det\\mathbf{F} = 1\\) means the flow is incompressible.</p>"
    },
    {
      heading: "Separating rotation from stretch",
      body: "<p>Every deformation gradient factors into a rotation and a stretch:</p>\\[ \\mathbf{F} = \\mathbf{R}\\,\\mathbf{U}, \\qquad \\mathbf{R}^{\\top}\\mathbf{R} = \\mathbf{I}, \\qquad \\mathbf{U} = \\mathbf{U}^{\\top} \\]<p>Read right to left: stretch the material along a set of perpendicular axes, then turn the result rigidly. The eigenvalues of \\(\\mathbf{U}\\) are the principal stretches \\(\\lambda_1\\) and \\(\\lambda_2\\), marked by the dotted cross, and their product is \\(\\det\\mathbf{F}\\).</p><p>There is a second way to take the rotation out, chosen from the menu. Instead of removing the total rotation at the end, turn with the local spin \\(\\mathbf{W}\\) as you go. That frame obeys \\(\\dot{\\mathbf{Q}} = \\mathbf{W}\\mathbf{Q}\\), and the deformation seen from inside it, \\(\\mathbf{G} = \\mathbf{Q}^{\\top}\\mathbf{F}\\), accumulates the strain rate alone:</p>\\[ \\dot{\\mathbf{G}} = \\left(\\mathbf{Q}^{\\top}\\mathbf{E}\\mathbf{Q}\\right)\\mathbf{G} \\]"
    },
    {
      heading: "What simple shear shows",
      body: "<p>Rigid rotation has \\(\\mathbf{E} = \\mathbf{0}\\), so with the rotation removed continuously the purple outline never moves however long you turn. This is why the viscous stress \\(\\boldsymbol{\\tau} = 2\\mu\\mathbf{E}\\) depends on \\(\\mathbf{E}\\) and not on \\(\\mathbf{L}\\): a fluid rotating rigidly is under no stress.</p><p>In simple shear the two ways of removing the rotation give the same stretches but different orientations. \\(\\mathbf{R}\\) creeps towards 90&deg; and stops, while \\(\\mathbf{Q}\\) keeps turning at \\(\\dot\\gamma/2\\) forever. So in the co-rotating frame the stretching axis drifts round rather than sitting still.</p>"
    }
  ]
};
