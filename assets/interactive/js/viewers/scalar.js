import { axis, layout3d, cubeRanges, sphereGrid, fmt } from "../helpers.js";

const LIMIT = 5;
const UNIT = sphereGrid(30);

export default {
  id: "scalar",
  title: "Scalars",
  blurb: "A scalar is a single number with no direction: a temperature, a density, a pressure. Drag the slider to change s. The sphere has radius |s| and its colour shows the sign.",
  controls: [],
  sliders: [{ name: "s", label: "s" }],

  build() {
    const [rx, ry, rz] = cubeRanges(LIMIT);
    return {
      traces: [
        {
          type: "surface",
          x: UNIT.X, y: UNIT.Y, z: UNIT.Z,
          surfacecolor: UNIT.Z.map((row) => row.map(() => 1)),
          cmin: -LIMIT, cmax: LIMIT, colorscale: "RdBu", reversescale: true,
          opacity: 0.85, hoverinfo: "skip",
          colorbar: { title: { text: "s", font: { size: 15 } }, thickness: 12, len: 0.6 },
          lighting: { ambient: 0.7, diffuse: 0.6, specular: 0.1 }
        },
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
      sliders: { s: { min: -LIMIT, max: LIMIT, step: 0.05, value: 1 } },
      state: {},
      formula: "s = 1"
    };
  },

  update(state, at) {
    const r = Math.abs(at.s);
    const colour = UNIT.Z.map((row) => row.map(() => at.s));
    return {
      restyle: [
        {
          trace: 0,
          data: {
            x: [UNIT.X.map((row) => row.map((c) => c * r))],
            y: [UNIT.Y.map((row) => row.map((c) => c * r))],
            z: [UNIT.Z.map((row) => row.map((c) => c * r))],
            surfacecolor: [colour]
          }
        }
      ],
      readout: `radius |s| = ${fmt(r, 3)}`,
      formula: `s = ${fmt(at.s, 3)}, \\qquad |s| = ${fmt(r, 3)}`
    };
  },
  sections: [
    {
      heading: "What makes a scalar a scalar",
      body: "<p>A scalar does not change when you rotate your coordinate axes. A temperature of 20&deg;C is still 20&deg;C from any angle, while the components of a velocity all take new values.</p><p>Scalars combine with other quantities freely. Multiplying a vector by a scalar, \\(s\\mathbf{v}\\), changes its length without turning it.</p>"
    }
  ]
};
