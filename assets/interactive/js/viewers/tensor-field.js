import {
  compileExpr, jacobian, symmetric, antisymmetric, curl, grid3d, tensorCube,
  axis, layout3d, arrow, moveArrow, label3d, quad, norm, fmt, tex, texMatrix
} from "../helpers.js";

const FACE = { x: "#b03a2b", y: "#12795a", z: "#2b5c8a" };
const KIND = {
  grad: { label: "Velocity gradient \u2207F", tex: "\\nabla \\mathbf{F}", of: (J) => J },
  strain: { label: "Strain rate E", tex: "\\mathbf{E}", of: symmetric },
  spin: { label: "Rotation W", tex: "\\mathbf{W}", of: antisymmetric }
};

export default {
  id: "tensor-field",
  title: "Tensor fields",
  blurb: "Differentiating a vector field gives a tensor at every point. Move the probe through the field and the cube shows that tensor, one arrow per face. Switch between the velocity gradient and its symmetric and antisymmetric parts.",
  drawLabel: "Draw field",
  presets: {
    shear: { label: "Simple shear (y, 0, 0)", values: { fx: "y", fy: "0", fz: "0", lo: -2, hi: 2, n: 5, kind: "grad" } },
    rotation: { label: "Rigid rotation (-y, x, 0)", values: { fx: "-y", fy: "x", fz: "0", lo: -2, hi: 2, n: 5, kind: "grad" } },
    extension: { label: "Extension (x, -y, 0)", values: { fx: "x", fy: "-y", fz: "0", lo: -2, hi: 2, n: 5, kind: "grad" } },
    swirl: { label: "Swirl (-y/r\u00B2, x/r\u00B2, 0)", values: { fx: "-y/(x^2+y^2+0.1)", fy: "x/(x^2+y^2+0.1)", fz: "0", lo: -2, hi: 2, n: 5, kind: "grad" } }
  },
  controls: [
    { kind: "text", name: "fx", label: "F\u2093(x, y, z)" },
    { kind: "text", name: "fy", label: "F\u1D67(x, y, z)" },
    { kind: "text", name: "fz", label: "F_z(x, y, z)" },
    { kind: "pair", label: "box from / to", names: ["lo", "hi"] },
    { kind: "number", name: "n", label: "points per axis" },
    {
      kind: "select", name: "kind", label: "Tensor shown",
      options: Object.keys(KIND).map((k) => ({ value: k, label: KIND[k].label }))
    }
  ],
  sliders: [
    { name: "x", label: "x" },
    { name: "y", label: "y" },
    { name: "z", label: "z" }
  ],

  build(v) {
    const lo = Number(v.lo);
    const hi = Number(v.hi);
    const n = Math.max(2, Math.min(9, Math.round(Number(v.n) || 5)));
    if (!isFinite(lo) || !isFinite(hi) || hi <= lo) throw new Error("Need a box with start < end");
    const kind = KIND[v.kind] ? v.kind : "grad";

    const ex = compileExpr(v.fx, "F\u2093");
    const ey = compileExpr(v.fy, "F\u1D67");
    const ez = compileExpr(v.fz, "F_z");
    const F = (p) => {
      const scope = { x: p[0], y: p[1], z: p[2] };
      return [ex(scope), ey(scope), ez(scope)];
    };

    const { points, spacing } = grid3d(lo, hi, n);
    const vectors = points.map(F);
    const speeds = vectors.map(norm).filter(isFinite);
    if (!speeds.length) throw new Error("F is undefined over this box");
    const fastest = Math.max(...speeds) || 1;

    const span = hi - lo;
    const probe = [(lo + hi) / 2, (lo + hi) / 2, (lo + hi) / 2];
    const size = 0.9 * spacing;
    const faces = tensorCube(probe, size);
    const sizeref = 0.06 * span;

    const traces = [
      {
        type: "cone", hoverinfo: "skip", showscale: false,
        x: points.map((p) => p[0]), y: points.map((p) => p[1]), z: points.map((p) => p[2]),
        u: vectors.map((w) => (isFinite(w[0]) ? w[0] : 0)),
        v: vectors.map((w) => (isFinite(w[1]) ? w[1] : 0)),
        w: vectors.map((w) => (isFinite(w[2]) ? w[2] : 0)),
        sizemode: "absolute", sizeref: (0.6 * spacing) / fastest, anchor: "tail",
        colorscale: [[0, "#cdd8e1"], [1, "#8fa3b3"]], opacity: 0.5, lighting: { ambient: 0.95 }
      }
    ];
    faces.forEach((face) => traces.push(quad(face.corners, FACE[face.axis], 0.32)));
    faces.forEach((face) => traces.push(...arrow(face.centre, [0, 0, 0], FACE[face.axis], sizeref)));

    return {
      traces,
      layout: layout3d({
        xaxis: axis("x", [lo, hi]), yaxis: axis("y", [lo, hi]), zaxis: axis("z", [lo, hi]),
        aspectmode: "cube",
        camera: { eye: { x: 1.6, y: -1.7, z: 0.9 } }
      }),
      sliders: {
        x: { min: lo, max: hi, step: span / 200, value: probe[0] },
        y: { min: lo, max: hi, step: span / 200, value: probe[1] },
        z: { min: lo, max: hi, step: span / 200, value: probe[2] }
      },
      state: { F, h: span * 1e-4, size, kind, arrowScale: 0.55 * spacing },
      formula: `${KIND[kind].tex} \\text{ at the probe}`
    };
  },

  update(S, at) {
    const p = [at.x, at.y, at.z];
    const J = jacobian(S.F, p, S.h);
    const T = KIND[S.kind].of(J);
    const faces = tensorCube(p, S.size);

    const biggest = Math.max(...T.flat().map(Math.abs)) || 1;
    const scale = S.arrowScale / biggest;

    const restyle = [];
    faces.forEach((face, i) => {
      restyle.push({
        trace: 1 + i,
        data: {
          x: [face.corners.map((c) => c[0])],
          y: [face.corners.map((c) => c[1])],
          z: [face.corners.map((c) => c[2])]
        }
      });
    });
    faces.forEach((face, i) => {
      restyle.push(...moveArrow(4 + 2 * i, face.centre, T[i].map((c) => c * scale)));
    });

    const rot = curl(J);
    const trace = J[0][0] + J[1][1] + J[2][2];

    return {
      restyle,
      annotations: faces.map((face, i) =>
        label3d(
          face.centre.map((c, k) => c + T[i][k] * scale),
          `row ${i + 1}`,
          FACE[face.axis]
        )
      ),
      readout:
        `\u2207\u00B7F = <span class="k-red">${fmt(trace, 3)}</span>   ` +
        `\u2207\u00D7F = <span class="k-violet">(${fmt(rot[0])}, ${fmt(rot[1])}, ${fmt(rot[2])})</span>   ` +
        `arrows drawn at ${fmt(scale, 2)}\u00D7`,
      formula: `${KIND[S.kind].tex} = ${texMatrix(T)}`
    };
  },

  sections: [
    {
      heading: "The velocity gradient",
      body: "<p>A vector field has three components, each depending on three coordinates, so its derivative has nine numbers in it. They form a rank-2 tensor:</p>\\[ (\\nabla \\mathbf{F})_{ij} = \\frac{\\partial F_i}{\\partial x_j} \\]<p>This describes what the field looks like to an observer riding along with it. A nearby point offset by \\(d\\mathbf{x}\\) moves with velocity \\(\\mathbf{F} + (\\nabla\\mathbf{F})\\, d\\mathbf{x}\\), so the tensor is the part of the motion that deforms a small blob rather than carrying it along.</p>"
    },
    {
      heading: "Stretching and spinning",
      body: "<p>Splitting the velocity gradient into symmetric and antisymmetric halves separates two different motions:</p>\\[ \\nabla\\mathbf{F} = \\underbrace{\\tfrac{1}{2}\\left(\\nabla\\mathbf{F} + \\nabla\\mathbf{F}^{\\top}\\right)}_{\\mathbf{E}} + \\underbrace{\\tfrac{1}{2}\\left(\\nabla\\mathbf{F} - \\nabla\\mathbf{F}^{\\top}\\right)}_{\\mathbf{W}} \\]<p>\\(\\mathbf{E}\\) is the strain rate. It stretches a blob along some axes and squeezes it along others, and its trace is the divergence, the rate at which the blob's volume grows.</p><p>\\(\\mathbf{W}\\) is the rotation. It turns the blob rigidly at angular velocity \\(\\tfrac{1}{2}\\nabla\\times\\mathbf{F}\\) without changing its shape.</p><p>Compare the examples. Simple shear \\((y,0,0)\\) splits into equal parts strain and rotation. Rigid rotation \\((-y,x,0)\\) has \\(\\mathbf{E} = \\mathbf{0}\\). Extension \\((x,-y,0)\\) has \\(\\mathbf{W} = \\mathbf{0}\\).</p>"
    }
  ],
  note: "Row i of the tensor is drawn on the face whose normal is x, y or z in turn. Arrow lengths are scaled to fit the cube; the matrix above gives the true values."
};
