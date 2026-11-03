import {
  COLOUR, compileExpr, compile1, linspace, simpson, span, squareRanges,
  axis, layout3d, label3d, fmt, tex
} from "../helpers.js";

const NX = 91; // samples across a row of the surface
const NY = 91; // rows in y (odd, so Simpson applies in y too)
const NS = 121; // samples across the moving slice (odd, for Simpson)

function sliceAt(S, y) {
  const a = S.x0(y);
  const b = S.x1(y);
  const xs = linspace(a, b, NS);
  const zs = xs.map((x) => {
    const v = S.f({ x, y });
    return isFinite(v) ? v : 0;
  });
  const area = b === a ? 0 : simpson(zs, (b - a) / (NS - 1));
  return { xs, zs, area, a, b };
}

/** Vertical slab under the curve z = f(x, y) at fixed y, as explicit triangles. */
function sliceMesh(slice, y) {
  const n = slice.xs.length;
  const x = [];
  const yy = [];
  const z = [];
  const i = [];
  const j = [];
  const k = [];
  for (let p = 0; p < n; p++) { x.push(slice.xs[p]); yy.push(y); z.push(0); }
  for (let p = 0; p < n; p++) { x.push(slice.xs[p]); yy.push(y); z.push(slice.zs[p]); }
  for (let p = 0; p < n - 1; p++) {
    i.push(p, p + 1);
    j.push(p + 1, n + p + 1);
    k.push(n + p, n + p);
  }
  const ox = [slice.xs[0]];
  const oy = [y];
  const oz = [0];
  for (let p = 0; p < n; p++) { ox.push(slice.xs[p]); oy.push(y); oz.push(slice.zs[p]); }
  ox.push(slice.xs[n - 1], slice.xs[0]);
  oy.push(y, y);
  oz.push(0, 0);
  return { x, y: yy, z, i, j, k, ox, oy, oz };
}

function interpolate(xs, values, x) {
  const n = xs.length;
  if (x <= xs[0]) return values[0];
  if (x >= xs[n - 1]) return values[n - 1];
  const t = ((x - xs[0]) / (xs[n - 1] - xs[0])) * (n - 1);
  const lo = Math.floor(t);
  const w = t - lo;
  return values[lo] * (1 - w) + values[lo + 1] * w;
}

export default {
  id: "double-integral",
  title: "Double integrals",
  blurb: "The integral \\(\\iint f(x,y)\\,dx\\,dy\\) is the volume under the surface \\(z = f(x,y)\\). Drag the slider to move the red slice through the region.",
  note: "Enter the edges as functions of y: 0 and y for a triangle, or -sqrt(1-y^2) and sqrt(1-y^2) for a disc. Type A(y) if you know it and it is shown next to the computed value.",
  drawLabel: "Draw surface",
  sliders: [{ name: "y", label: "y", aria: "slice position y" }],

  presets: {
    xsinx: {
      label: "x sin(x) cos(y)",
      values: { f: "x sin(x) cos(y)", y0: 0, y1: 3, x0: "0", x1: "3", A: "(sin(3) - 3 cos(3)) cos(y)" }
    },
    paraboloid: {
      label: "Paraboloid on a square",
      values: { f: "x^2 + y^2", y0: -1, y1: 1, x0: "-1", x1: "1", A: "2/3 + 2 y^2" }
    },
    triangle: { label: "Triangular domain", values: { f: "x y", y0: 0, y1: 2, x0: "0", x1: "y", A: "y^3/2" } },
    disc: {
      label: "Half-disc domain",
      values: { f: "exp(-(x^2+y^2))", y0: 0, y1: 1, x0: "-sqrt(1-y^2)", x1: "sqrt(1-y^2)", A: "" }
    }
  },

  controls: [
    { kind: "text", name: "f", label: "f(x, y)" },
    { kind: "pair", label: "y from / to", names: ["y0", "y1"] },
    { kind: "text", name: "x0", label: "x\u2080(y), the left edge" },
    { kind: "text", name: "x1", label: "x\u2081(y), the right edge" },
    { kind: "text", name: "A", label: "A(y) if you know it", placeholder: "optional" }
  ],

  build(v) {
    const y0 = Number(v.y0);
    const y1 = Number(v.y1);
    if (!isFinite(y0) || !isFinite(y1) || y1 <= y0) throw new Error("Need a y-range with start < end");

    const S = {
      f: compileExpr(v.f, "f(x,y)"),
      x0: compile1(v.x0, "y", "x\u2080(y)"),
      x1: compile1(v.x1, "y", "x\u2081(y)"),
      A: String(v.A || "").trim() ? compile1(v.A, "y", "A(y)") : null
    };

    const ys = linspace(y0, y1, NY);
    const X = [];
    const Y = [];
    const Z = [];
    const Z0 = [];
    const areas = new Array(NY);
    let zmin = Infinity;
    let zmax = -Infinity;
    let xmin = Infinity;
    let xmax = -Infinity;

    ys.forEach((y, row) => {
      const a = S.x0(y);
      const b = S.x1(y);
      if (!isFinite(a) || !isFinite(b)) throw new Error(`The edges are undefined at y = ${y.toFixed(2)}`);
      const xr = linspace(a, b, NX);
      const zr = xr.map((x) => {
        const value = S.f({ x, y });
        if (!isFinite(value)) return null;
        if (value < zmin) zmin = value;
        if (value > zmax) zmax = value;
        return value;
      });
      xmin = Math.min(xmin, a, b);
      xmax = Math.max(xmax, a, b);
      X.push(xr);
      Y.push(xr.map(() => y));
      Z.push(zr);
      Z0.push(xr.map(() => 0));
      areas[row] = sliceAt(S, y).area;
    });
    if (!isFinite(zmin)) throw new Error("f(x,y) is undefined over this region");

    const dy = (y1 - y0) / (NY - 1);
    const cumulative = new Array(NY).fill(0);
    for (let i = 1; i < NY; i++) cumulative[i] = cumulative[i - 1] + 0.5 * (areas[i] + areas[i - 1]) * dy;

    // x and y share a scale so the domain keeps its shape; z is fitted to the
    // function, since its units have nothing to do with the ones in the plane.
    const [rx, ry] = squareRanges([[xmin, xmax], [y0, y1]]);
    const zlo = Math.min(0, zmin);
    const zhi = Math.max(0, zmax);
    const zpad = 0.08 * (zhi - zlo) + 1e-6;

    const yStart = (y0 + y1) / 2;
    const mesh = sliceMesh(sliceAt(S, yStart), yStart);

    const traces = [
      {
        type: "surface", x: X, y: Y, z: Z, opacity: 0.88, showscale: false,
        colorscale: COLOUR.surface, hoverinfo: "skip",
        contours: { x: { highlight: false }, y: { highlight: false }, z: { highlight: false } },
        lighting: { ambient: 0.75, diffuse: 0.55, specular: 0.12 }
      },
      {
        type: "surface", x: X, y: Y, z: Z0, opacity: 0.22, showscale: false, hoverinfo: "skip",
        surfacecolor: Z0, colorscale: [[0, COLOUR.plane], [1, COLOUR.plane]],
        lighting: { ambient: 1, diffuse: 0, specular: 0 }
      },
      {
        type: "mesh3d", x: mesh.x, y: mesh.y, z: mesh.z, i: mesh.i, j: mesh.j, k: mesh.k,
        color: COLOUR.slice, opacity: 0.72, flatshading: true, hoverinfo: "skip",
        lighting: { ambient: 0.9, diffuse: 0.3, specular: 0 }
      },
      {
        type: "scatter3d", mode: "lines", hoverinfo: "skip", showlegend: false,
        x: mesh.ox, y: mesh.oy, z: mesh.oz, line: { color: COLOUR.sliceEdge, width: 4 }
      }
    ];

    return {
      traces,
      layout: layout3d({
        xaxis: axis("x", rx),
        yaxis: axis("y", ry),
        zaxis: axis("z", [zlo - zpad, zhi + zpad]),
        aspectmode: "manual",
        aspectratio: { x: 1, y: 1, z: 0.7 },
        camera: { eye: { x: 1.75, y: -1.75, z: 0.95 } }
      }),
      sliders: { y: { min: y0, max: y1, step: (y1 - y0) / 600, value: yStart } },
      formula:
        `\\int_{${fmt(y0, 2)}}^{${fmt(y1, 2)}}\\!\\!\\int_{${tex(v.x0)}}^{${tex(v.x1)}} ` +
        `${tex(v.f)}\\; dx\\, dy`,
      state: { ...S, ys, areas, cumulative, total: simpson(areas, dy) }
    };
  },

  update(S, at) {
    const y = at.y;
    const slice = sliceAt(S, y);
    const mesh = sliceMesh(slice, y);
    const swept = interpolate(S.ys, S.cumulative, y);
    const top = Math.max(0, ...slice.zs);

    return {
      labels: { y: y.toFixed(2) },
      readout:
        `A(${y.toFixed(2)}) = <span class="k-red">${fmt(slice.area, 3)}</span>` +
        (S.A ? `   your A(y) gives <span class="k-red">${fmt(S.A(y), 3)}</span>` : "") +
        `   volume swept so far = <span class="k-ink">${fmt(swept, 3)}</span>` +
        `   full integral = <span class="k-ink">${fmt(S.total, 3)}</span>`,
      restyle: [
        { trace: 2, data: { x: [mesh.x], y: [mesh.y], z: [mesh.z], i: [mesh.i], j: [mesh.j], k: [mesh.k] } },
        { trace: 3, data: { x: [mesh.ox], y: [mesh.oy], z: [mesh.oz] } }
      ],
      annotations: [
        label3d([(slice.a + slice.b) / 2, y, top], `A(y) = ${fmt(slice.area, 3)}`, COLOUR.sliceEdge)
      ]
    };
  },
  sections: [
    {
      heading: "Slicing a volume",
      body: "<p>A double integral is done in two stages. Fix \\(y\\) and integrate over \\(x\\) alone:</p>\\[ A(y) = \\int_{x_0(y)}^{x_1(y)} f(x,y)\\, dx \\]<p>That is the area of the red slice. Then sweep the slice through the region and add up the areas:</p>\\[ \\iint_R f\\, dA = \\int_{y_0}^{y_1} A(y)\\, dy \\]<p>The inner limits may depend on \\(y\\), which is how regions that are not rectangles are handled: a triangle uses \\(x_1(y) = y\\), and a half-disc uses \\(x = \\pm\\sqrt{1-y^2}\\). The outer limits are always constants.</p><p>Where \\(f\\) is negative the slice hangs below the plane and contributes negative area, so the integral is a signed volume.</p>"
    },
    {
      heading: "Either order",
      body: "<p>Nothing forced us to integrate over \\(x\\) first. For a well-behaved \\(f\\), both orders give the same answer:</p>\\[ \\int_{y_0}^{y_1}\\!\\!\\int_{x_0(y)}^{x_1(y)} f\\, dx\\, dy = \\int_{x_0}^{x_1}\\!\\!\\int_{y_0(x)}^{y_1(x)} f\\, dy\\, dx \\]<p>They are rarely equally easy, so swapping the order is a standard move when the inner integral will not go through as written. The cost is redescribing the region: the triangle \\(0 \\le x \\le y \\le 2\\) becomes \\(x \\le y \\le 2\\) with \\(0 \\le x \\le 2\\).</p>"
    }
  ]
};
