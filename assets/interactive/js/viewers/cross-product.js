import { arrow, moveArrow, label3d, axis, layout3d, cubeRanges, cross, norm, fmt, texVec } from "../helpers.js";

const BLUE = "#2b5c8a";
const RED = "#b03a2b";
const MAGENTA = "#a4308f";
const LIMIT = 5;

export default {
  id: "cross-product",
  title: "The cross product",
  blurb: "The cross product w = u × v is perpendicular to both u and v, and its length is the area of the parallelogram they span. Drag the components and watch both facts hold.",
  controls: [],
  sliders: [
    { name: "ux", label: "u\u2093" }, { name: "uy", label: "u\u1D67" }, { name: "uz", label: "u_z" },
    { name: "vx", label: "v\u2093" }, { name: "vy", label: "v\u1D67" }, { name: "vz", label: "v_z" }
  ],

  build() {
    const u = [1, 1, 0];
    const v = [0, 1, 1];
    const w = cross(u, v);
    const [rx, ry, rz] = cubeRanges(LIMIT);
    const sizeref = 0.09 * 2 * LIMIT;
    return {
      traces: [
        ...arrow([0, 0, 0], u, BLUE, sizeref),
        ...arrow([0, 0, 0], v, RED, sizeref),
        ...arrow([0, 0, 0], w, MAGENTA, sizeref),
        {
          type: "mesh3d", hoverinfo: "skip",
          x: [0, u[0], u[0] + v[0], v[0]],
          y: [0, u[1], u[1] + v[1], v[1]],
          z: [0, u[2], u[2] + v[2], v[2]],
          i: [0, 0], j: [1, 2], k: [2, 3],
          color: MAGENTA, opacity: 0.18, flatshading: true,
          lighting: { ambient: 0.95, diffuse: 0.2, specular: 0 }
        },
        {
          type: "scatter3d", mode: "markers", hoverinfo: "skip", showlegend: false,
          x: [0], y: [0], z: [0], marker: { size: 4, color: "#15233a" }
        }
      ],
      layout: layout3d({
        xaxis: axis("x", rx), yaxis: axis("y", ry), zaxis: axis("z", rz),
        aspectmode: "cube",
        camera: { eye: { x: 1.7, y: 1.5, z: 0.9 } }
      }),
      sliders: {
        ux: { min: -LIMIT, max: LIMIT, step: 0.05, value: 1 },
        uy: { min: -LIMIT, max: LIMIT, step: 0.05, value: 1 },
        uz: { min: -LIMIT, max: LIMIT, step: 0.05, value: 0 },
        vx: { min: -LIMIT, max: LIMIT, step: 0.05, value: 0 },
        vy: { min: -LIMIT, max: LIMIT, step: 0.05, value: 1 },
        vz: { min: -LIMIT, max: LIMIT, step: 0.05, value: 1 }
      },
      state: {},
      formula: "\\mathbf{w} = \\mathbf{u} \\times \\mathbf{v}"
    };
  },

  update(state, at) {
    const u = [at.ux, at.uy, at.uz];
    const v = [at.vx, at.vy, at.vz];
    const w = cross(u, v);
    const lu = norm(u);
    const lv = norm(v);
    const angle = lu > 0 && lv > 0 ? Math.acos(Math.min(1, Math.max(-1, (u[0] * v[0] + u[1] * v[1] + u[2] * v[2]) / (lu * lv)))) : 0;

    return {
      restyle: [
        ...moveArrow(0, [0, 0, 0], u),
        ...moveArrow(2, [0, 0, 0], v),
        ...moveArrow(4, [0, 0, 0], w),
        {
          trace: 6,
          data: {
            x: [[0, u[0], u[0] + v[0], v[0]]],
            y: [[0, u[1], u[1] + v[1], v[1]]],
            z: [[0, u[2], u[2] + v[2], v[2]]]
          }
        }
      ],
      annotations: [label3d(u, "u", BLUE), label3d(v, "v", RED), label3d(w, "w", MAGENTA)],
      readout:
        `|<span class="k-blue">u</span>| = ${fmt(lu, 2)}   ` +
        `|<span class="k-red">v</span>| = ${fmt(lv, 2)}   ` +
        `\u03B8 = ${fmt((angle * 180) / Math.PI, 1)}\u00B0   ` +
        `|<span class="k-magenta">w</span>| = ${fmt(norm(w), 3)} = |u||v| sin \u03B8 = ${fmt(lu * lv * Math.sin(angle), 3)}`,
      formula:
        `\\mathbf{u} \\times \\mathbf{v} = ${texVec(u)} \\times ${texVec(v)} = ${texVec(w)}`
    };
  },
  sections: [
    {
      heading: "The formula",
      body: "<p>In components,</p>\\[ \\mathbf{u} \\times \\mathbf{v} = \\left( u_y v_z - u_z v_y,\\ u_z v_x - u_x v_z,\\ u_x v_y - u_y v_x \\right) \\]<p>which is easier to remember as a determinant:</p>\\[ \\mathbf{u} \\times \\mathbf{v} = \\begin{vmatrix} \\mathbf{i} & \\mathbf{j} & \\mathbf{k} \\\\ u_x & u_y & u_z \\\\ v_x & v_y & v_z \\end{vmatrix} \\]<p>Swapping the two rows flips the sign, so \\(\\mathbf{u}\\times\\mathbf{v} = -\\,\\mathbf{v}\\times\\mathbf{u}\\). Order matters, unlike the dot product.</p>"
    },
    {
      heading: "Length is an area",
      body: "<p>The magnitude is</p>\\[ |\\mathbf{u} \\times \\mathbf{v}| = |\\mathbf{u}||\\mathbf{v}|\\sin\\theta \\]<p>the area of the parallelogram spanned by the two vectors, shaded in the figure. Drag \\(\\mathbf{v}\\) until it is parallel to \\(\\mathbf{u}\\) and both the patch and \\(\\mathbf{w}\\) vanish: parallel vectors span no area, and \\(\\mathbf{u}\\times\\mathbf{u} = \\mathbf{0}\\).</p><p>The direction follows the right-hand rule. Point your fingers along \\(\\mathbf{u}\\), curl them towards \\(\\mathbf{v}\\), and your thumb points along \\(\\mathbf{w}\\).</p>"
    }
  ]
};
