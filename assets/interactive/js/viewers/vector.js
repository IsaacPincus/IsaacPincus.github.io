import { COLOUR, arrow, moveArrow, label3d, axis, layout3d, cubeRanges, norm, fmt, texVec } from "../helpers.js";

const BLUE = "#2b5c8a";
const LIMIT = 5;

export default {
  id: "vector",
  title: "Vectors",
  blurb: "A vector has a direction and a length. Drag the three components and watch the arrow and its magnitude change.",
  controls: [],
  sliders: [
    { name: "vx", label: "v\u2093" },
    { name: "vy", label: "v\u1D67" },
    { name: "vz", label: "v_z" }
  ],

  build() {
    const start = [1, 1, 1];
    const [rx, ry, rz] = cubeRanges(LIMIT);
    return {
      traces: [
        ...arrow([0, 0, 0], start, BLUE, 0.09 * 2 * LIMIT),
        {
          type: "scatter3d", mode: "markers", hoverinfo: "skip", showlegend: false,
          x: [0], y: [0], z: [0], marker: { size: 4, color: "#15233a" }
        }
      ],
      layout: layout3d({
        xaxis: axis("x", rx), yaxis: axis("y", ry), zaxis: axis("z", rz),
        aspectmode: "cube",
        camera: { eye: { x: 1.6, y: -1.6, z: 1.0 } }
      }),
      sliders: {
        vx: { min: -LIMIT, max: LIMIT, step: 0.05, value: 1 },
        vy: { min: -LIMIT, max: LIMIT, step: 0.05, value: 1 },
        vz: { min: -LIMIT, max: LIMIT, step: 0.05, value: 1 }
      },
      state: {},
      formula: "\\mathbf{v} = \\left(1,\\ 1,\\ 1\\right)"
    };
  },

  update(state, at) {
    const v = [at.vx, at.vy, at.vz];
    return {
      restyle: moveArrow(0, [0, 0, 0], v),
      annotations: [label3d(v, "v", BLUE)],
      readout: `|<span class="k-blue">v</span>| = ${fmt(norm(v), 3)}`,
      formula: `\\mathbf{v} = ${texVec(v)}, \\qquad |\\mathbf{v}| = ${fmt(norm(v), 3)}`
    };
  },
  sections: [
    {
      heading: "Length",
      body: "<p>The length of a vector is</p>\\[ |\\mathbf{v}| = \\sqrt{v_x^2 + v_y^2 + v_z^2} \\]<p>The three components change if you rotate your axes, but the length does not, so the length is a scalar.</p>"
    },
    {
      heading: "Adding and scaling",
      body: "<p>Vectors add component by component, \\((\\mathbf{u}+\\mathbf{v})_i = u_i + v_i\\), which geometrically means joining them tip to tail.</p><p>Dividing by the length gives the unit vector \\(\\hat{\\mathbf{v}} = \\mathbf{v}/|\\mathbf{v}|\\), which keeps the direction and discards the magnitude.</p>"
    }
  ]
};
