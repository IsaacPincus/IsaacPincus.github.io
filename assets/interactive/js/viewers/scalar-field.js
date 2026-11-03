import {
  COLOUR, compileExpr, gradient, grid3d, axis, layout3d, arrow, moveArrow,
  label3d, cubeRanges, norm, fmt, tex
} from "../helpers.js";

export default {
  id: "scalar-field",
  title: "Scalar fields",
  blurb: "A scalar field puts a number at every point of space: a temperature, a pressure, a density. Each ball sits at a grid point, sized by |f| and coloured by sign. Move the probe to read the field and its gradient anywhere.",
  drawLabel: "Draw field",
  presets: {
    radial: { label: "f = x\u00B2 + y\u00B2 + z\u00B2", values: { f: "x^2 + y^2 + z^2", lo: -2, hi: 2, n: 5 } },
    plane: { label: "f = x + y", values: { f: "x + y", lo: -2, hi: 2, n: 5 } },
    well: { label: "Gaussian well", values: { f: "-exp(-(x^2+y^2+z^2)/2)", lo: -2, hi: 2, n: 5 } },
    wave: { label: "f = sin(x) cos(y)", values: { f: "sin(x) cos(y)", lo: -3, hi: 3, n: 5 } }
  },
  controls: [
    { kind: "text", name: "f", label: "f(x, y, z)" },
    { kind: "pair", label: "box from / to", names: ["lo", "hi"] },
    { kind: "number", name: "n", label: "points per axis" }
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

    const expr = compileExpr(v.f, "f(x,y,z)");
    const f = (p) => expr({ x: p[0], y: p[1], z: p[2] });

    const { points, spacing } = grid3d(lo, hi, n);
    const values = points.map(f);
    const finite = values.filter(isFinite);
    if (!finite.length) throw new Error("f is undefined over this box");
    const biggest = Math.max(...finite.map(Math.abs)) || 1;

    const h = (hi - lo) * 1e-4;
    const span = hi - lo;
    const [rx, ry, rz] = [[lo, hi], [lo, hi], [lo, hi]];
    const probe = [(lo + hi) / 2, (lo + hi) / 2, (lo + hi) / 2];

    return {
      traces: [
        {
          type: "scatter3d", mode: "markers", hoverinfo: "skip", showlegend: false,
          x: points.map((p) => p[0]), y: points.map((p) => p[1]), z: points.map((p) => p[2]),
          marker: {
            size: values.map((c) => (isFinite(c) ? 3 + (26 * Math.abs(c)) / biggest : 0)),
            color: values.map((c) => (isFinite(c) ? c : 0)),
            cmin: -biggest, cmax: biggest, colorscale: "RdBu", reversescale: true,
            opacity: 0.55,
            colorbar: { title: { text: "f", font: { size: 15 } }, thickness: 12, len: 0.6 }
          }
        },
        {
          type: "scatter3d", mode: "markers", hoverinfo: "skip", showlegend: false,
          x: [probe[0]], y: [probe[1]], z: [probe[2]],
          marker: { size: 6, color: "#15233a" }
        },
        ...arrow(probe, [0, 0, 0], COLOUR.position, 0.07 * span)
      ],
      layout: layout3d({
        xaxis: axis("x", rx), yaxis: axis("y", ry), zaxis: axis("z", rz),
        aspectmode: "cube",
        camera: { eye: { x: 1.6, y: -1.7, z: 0.9 } }
      }),
      sliders: {
        x: { min: lo, max: hi, step: span / 200, value: probe[0] },
        y: { min: lo, max: hi, step: span / 200, value: probe[1] },
        z: { min: lo, max: hi, step: span / 200, value: probe[2] }
      },
      state: { f, h, arrowScale: 0.35 * spacing * 2 },
      formula: `f(x,y,z) = ${tex(v.f)}`
    };
  },

  update(S, at) {
    const p = [at.x, at.y, at.z];
    const value = S.f(p);
    const g = gradient(S.f, p, S.h);
    const size = norm(g);
    const drawn = size > 0 ? g.map((c) => (c / size) * S.arrowScale) : [0, 0, 0];

    return {
      restyle: [
        { trace: 1, data: { x: [[p[0]]], y: [[p[1]]], z: [[p[2]]] } },
        ...moveArrow(2, p, drawn)
      ],
      annotations: [label3d(p.map((c, i) => c + drawn[i]), "\u2207f", COLOUR.position)],
      readout:
        `f(${fmt(p[0])}, ${fmt(p[1])}, ${fmt(p[2])}) = <span class="k-ink">${fmt(value, 3)}</span>   ` +
        `\u2207f = <span class="k-green">(${fmt(g[0])}, ${fmt(g[1])}, ${fmt(g[2])})</span>   ` +
        `|\u2207f| = ${fmt(size, 3)}`,
      formula: `\\nabla f = ${fmt(size, 3) === "0" ? "\\mathbf{0}" : `\\left(${g.map((c) => fmt(c)).join(",\\ ")}\\right)`}`
    };
  },

  sections: [
    {
      heading: "The gradient",
      body: "<p>A scalar field is a function \\(f:\\mathbb{R}^3 \\to \\mathbb{R}\\). Its gradient collects the three partial derivatives into a vector:</p>\\[ \\nabla f = \\left( \\frac{\\partial f}{\\partial x},\\ \\frac{\\partial f}{\\partial y},\\ \\frac{\\partial f}{\\partial z} \\right) \\]<p>The gradient points in the direction in which \\(f\\) increases fastest, and its length is the rate of that increase. The rate of change along any unit direction \\(\\mathbf{u}\\) is \\(\\nabla f \\cdot \\mathbf{u}\\), which is largest when \\(\\mathbf{u}\\) lines up with \\(\\nabla f\\) and zero when it is perpendicular.</p><p>Directions perpendicular to \\(\\nabla f\\) are those along which \\(f\\) does not change, so the gradient is perpendicular to the level surface \\(f = \\text{constant}\\) through each point.</p>"
    },
    {
      heading: "Two examples",
      body: "<p>For \\(f = x^2 + y^2 + z^2\\) the level surfaces are spheres and the gradient \\(2(x,y,z)\\) points straight out from the origin, perpendicular to them. At the origin the field is flat and the gradient is zero.</p><p>For \\(f = x + y\\) the gradient is \\((1,1,0)\\) everywhere, so the arrow is the same wherever you put the probe. A field with a constant gradient is a plane.</p>"
    }
  ],
  note: "The arrow is drawn at a fixed length in the direction of the gradient; the readout gives its true components and magnitude."
};
