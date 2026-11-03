import { arrow, label3d, axis, layout3d, quad, fmt } from "../helpers.js";

const FACE = { yz: "#b03a2b", xz: "#12795a", xy: "#2b5c8a" };

// Each row of T is the force per unit area acting on the face whose normal is
// x, y or z: the row index picks the face, the column index the direction.
const FACES = [
  { key: "yz", label: "x-face", corners: [[0, 0, 0], [0, 1, 0], [0, 1, 1], [0, 0, 1]], centre: [0, 0.5, 0.5] },
  { key: "xz", label: "y-face", corners: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], centre: [0.5, 0, 0.5] },
  { key: "xy", label: "z-face", corners: [[0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0]], centre: [0.5, 0.5, 0] }
];

const NAMES = [["t11", "t12", "t13"], ["t21", "t22", "t23"], ["t31", "t32", "t33"]];

export default {
  id: "tensor",
  title: "Tensors",
  blurb: "A tensor takes a direction and returns a vector. Enter the nine components and each row is drawn as an arrow on one face of the cube: row 1 on the face facing x, row 2 on y, row 3 on z.",
  drawLabel: "Draw tensor",
  presets: {
    identity: { label: "Identity", values: { t11: 1, t12: 0, t13: 0, t21: 0, t22: 1, t23: 0, t31: 0, t32: 0, t33: 1 } },
    shear: { label: "Simple shear", values: { t11: 0, t12: 1, t13: 0, t21: 1, t22: 0, t23: 0, t31: 0, t32: 0, t33: 0 } },
    stretch: { label: "Uniaxial stretch", values: { t11: 2, t12: 0, t13: 0, t21: 0, t22: -0.5, t23: 0, t31: 0, t32: 0, t33: -0.5 } },
    rotation: { label: "Antisymmetric (spin)", values: { t11: 0, t12: 1, t13: 0, t21: -1, t22: 0, t23: 0, t31: 0, t32: 0, t33: 0 } }
  },
  controls: [
    { kind: "row", label: "row 1 \u2014 the x-face", names: NAMES[0] },
    { kind: "row", label: "row 2 \u2014 the y-face", names: NAMES[1] },
    { kind: "row", label: "row 3 \u2014 the z-face", names: NAMES[2] }
  ],
  sliders: [],

  build(v) {
    const T = NAMES.map((row) => row.map((name) => Number(v[name])));
    if (T.some((row) => row.some((c) => !isFinite(c)))) throw new Error("Every entry has to be a number");

    const biggest = Math.max(1, ...T.flat().map(Math.abs));
    const limit = 0.5 + biggest;
    const sizeref = 0.09 * (limit + 0.5);

    const traces = [];
    FACES.forEach((face) => traces.push(quad(face.corners, FACE[face.key])));
    FACES.forEach((face, i) => traces.push(...arrow(face.centre, T[i], FACE[face.key], sizeref)));

    const symmetric = T.every((row, i) => row.every((c, j) => Math.abs(c - T[j][i]) < 1e-9));
    const trace = T[0][0] + T[1][1] + T[2][2];

    return {
      traces,
      layout: layout3d({
        xaxis: axis("x", [-0.5, limit]),
        yaxis: axis("y", [-0.5, limit]),
        zaxis: axis("z", [-0.5, limit]),
        aspectmode: "cube",
        camera: { eye: { x: 1.6, y: -1.6, z: 1.1 } }
      }),
      sliders: {},
      state: { T, symmetric, trace },
      formula:
        "\\mathbf{T} = \\begin{bmatrix}" +
        T.map((row) => row.map((c) => fmt(c, 2)).join(" & ")).join(" \\\\ ") +
        "\\end{bmatrix}"
    };
  },

  update(S) {
    return {
      labels: {},
      annotations: FACES.map((face, i) =>
        label3d(
          face.centre.map((c, k) => c + S.T[i][k]),
          face.label,
          FACE[face.key]
        )
      ),
      readout:
        `trace = ${fmt(S.trace, 2)}   ` +
        (S.symmetric ? "symmetric: no net rotation" : "not symmetric: it has an antisymmetric, rotating part")
    };
  },
  sections: [
    {
      heading: "A tensor maps a direction to a vector",
      body: "<p>A scalar needs one number, a vector three, a rank-2 tensor nine. The extra numbers are there because a tensor answers a question that has a direction in it: give it a unit normal \\(\\mathbf{n}\\) and it returns a vector</p>\\[ \\mathbf{t} = \\mathbf{T}\\mathbf{n} \\]<p>The stress tensor is the standard example. Put an imaginary surface in a material with its normal along \\(\\mathbf{n}\\); then \\(\\mathbf{t}\\) is the force per unit area across that surface. An arrow pointing straight out of its face is a normal stress, a tension or a pressure. An arrow lying flat in its face is a shear.</p>"
    },
    {
      heading: "Symmetric and antisymmetric parts",
      body: "<p>Every tensor splits into two pieces:</p>\\[ \\mathbf{T} = \\tfrac{1}{2}\\left(\\mathbf{T} + \\mathbf{T}^{\\top}\\right) + \\tfrac{1}{2}\\left(\\mathbf{T} - \\mathbf{T}^{\\top}\\right) \\]<p>The symmetric part deforms a material; the antisymmetric part rotates it. The trace \\(T_{11}+T_{22}+T_{33}\\) is the same in any set of axes, so it is a scalar.</p><p>Try the examples. The identity stretches equally in all directions. The shear example is symmetric with zero trace. The spin example is antisymmetric, with every arrow lying in its own face.</p>"
    }
  ]
};
