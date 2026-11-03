import {
  COLOUR, compileExpr, jacobian, divergence, curl, grid3d, axis, layout3d,
  arrow, moveArrow, label3d, norm, fmt, tex, texVec
} from "../helpers.js";

export default {
  id: "vector-field",
  title: "Vector fields, divergence and curl",
  blurb: "A vector field puts an arrow at every point of space: a velocity, a force, an electric field. The grey arrows show the field on a grid and the green arrow is the field at the probe. The readout gives the divergence and curl there.",
  drawLabel: "Draw field",
  presets: {
    radial: { label: "F = (x, y, z)", values: { fx: "x", fy: "y", fz: "z", lo: -2, hi: 2, n: 5 } },
    shear: { label: "F = (y, 0, 0)", values: { fx: "y", fy: "0", fz: "0", lo: -2, hi: 2, n: 5 } },
    rotation: { label: "F = (-y, x, 0)", values: { fx: "-y", fy: "x", fz: "0", lo: -2, hi: 2, n: 5 } },
    saddle: { label: "F = (x, -y, 0)", values: { fx: "x", fy: "-y", fz: "0", lo: -2, hi: 2, n: 5 } }
  },
  controls: [
    { kind: "text", name: "fx", label: "F\u2093(x, y, z)" },
    { kind: "text", name: "fy", label: "F\u1D67(x, y, z)" },
    { kind: "text", name: "fz", label: "F_z(x, y, z)" },
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

    return {
      traces: [
        {
          type: "cone", hoverinfo: "skip", showscale: false,
          x: points.map((p) => p[0]), y: points.map((p) => p[1]), z: points.map((p) => p[2]),
          u: vectors.map((w) => (isFinite(w[0]) ? w[0] : 0)),
          v: vectors.map((w) => (isFinite(w[1]) ? w[1] : 0)),
          w: vectors.map((w) => (isFinite(w[2]) ? w[2] : 0)),
          sizemode: "absolute", sizeref: (0.75 * spacing) / fastest, anchor: "tail",
          colorscale: [[0, "#9fb2c1"], [1, "#2b5c8a"]], opacity: 0.75,
          lighting: { ambient: 0.9 }
        },
        {
          type: "scatter3d", mode: "markers", hoverinfo: "skip", showlegend: false,
          x: [probe[0]], y: [probe[1]], z: [probe[2]], marker: { size: 6, color: "#15233a" }
        },
        ...arrow(probe, [0, 0, 0], COLOUR.position, 0.07 * span)
      ],
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
      state: { F, h: span * 1e-4, arrowScale: (1.4 * spacing) / fastest },
      formula: `\\mathbf{F} = \\left(${tex(v.fx)},\\ ${tex(v.fy)},\\ ${tex(v.fz)}\\right)`
    };
  },

  update(S, at) {
    const p = [at.x, at.y, at.z];
    const field = S.F(p);
    const J = jacobian(S.F, p, S.h);
    const div = divergence(J);
    const rot = curl(J);
    const drawn = field.map((c) => c * S.arrowScale);

    return {
      restyle: [
        { trace: 1, data: { x: [[p[0]]], y: [[p[1]]], z: [[p[2]]] } },
        ...moveArrow(2, p, drawn)
      ],
      annotations: [label3d(p.map((c, i) => c + drawn[i]), "F", COLOUR.position)],
      readout:
        `F = <span class="k-green">(${fmt(field[0])}, ${fmt(field[1])}, ${fmt(field[2])})</span>   ` +
        `\u2207\u00B7F = <span class="k-red">${fmt(div, 3)}</span>   ` +
        `\u2207\u00D7F = <span class="k-violet">(${fmt(rot[0])}, ${fmt(rot[1])}, ${fmt(rot[2])})</span>`,
      formula:
        `\\nabla \\cdot \\mathbf{F} = ${fmt(div, 3)}, \\qquad ` +
        `\\nabla \\times \\mathbf{F} = ${texVec(rot)}`
    };
  },

  sections: [
    {
      heading: "Divergence",
      body: "<p>The divergence measures how much the field carries away from a point:</p>\\[ \\nabla \\cdot \\mathbf{F} = \\frac{\\partial F_x}{\\partial x} + \\frac{\\partial F_y}{\\partial y} + \\frac{\\partial F_z}{\\partial z} \\]<p>Picture a small balloon carried along by the field. If the arrows leaving it are bigger than the arrows entering, the balloon inflates and the divergence is positive. If it holds its volume the divergence is zero and the field is incompressible.</p><p>The divergence theorem adds these up over a volume \\(V\\) bounded by a closed surface \\(S\\):</p>\\[ \\iiint_V (\\nabla \\cdot \\mathbf{F})\\, dV = \\iint_S \\mathbf{F} \\cdot \\mathbf{n}\\, dS \\]<p>For \\(\\mathbf{F} = (x,y,z)\\) the divergence is 3 everywhere, so the left side is three times the volume. On a sphere of radius \\(r\\) the right side is \\(r \\cdot 4\\pi r^2\\), since the field has magnitude \\(r\\) and points straight out. Both come to \\(4\\pi r^3\\).</p>"
    },
    {
      heading: "Curl",
      body: "<p>The curl measures how much the field rotates a body at a point:</p>\\[ \\nabla \\times \\mathbf{F} = \\left( \\frac{\\partial F_z}{\\partial y} - \\frac{\\partial F_y}{\\partial z},\\ \\frac{\\partial F_x}{\\partial z} - \\frac{\\partial F_z}{\\partial x},\\ \\frac{\\partial F_y}{\\partial x} - \\frac{\\partial F_x}{\\partial y} \\right) \\]<p>Drop a tiny paddle wheel into the flow. The curl points along the axis it turns about, by the right-hand rule, and its magnitude is twice the angular velocity.</p><p>The shear field \\(\\mathbf{F} = (y,0,0)\\) is worth testing. Nothing circulates, since every arrow points along \\(x\\), yet the curl is \\((0,0,-1)\\) everywhere, because the flow is faster on one side of the paddle wheel than the other. Curl measures local shear, not going round in circles.</p><p>Stokes' theorem says these local rotations add up to the circulation around the boundary of a surface:</p>\\[ \\iint_S (\\nabla \\times \\mathbf{F}) \\cdot \\mathbf{n}\\, dS = \\oint_{\\partial S} \\mathbf{F} \\cdot d\\boldsymbol{\\ell} \\]"
    }
  ]
};
