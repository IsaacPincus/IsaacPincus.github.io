import {
  COLOUR, compileExpr, linspace, span, pad, squareRanges, cross, norm,
  axis, layout3d, arrow, moveArrow, label3d, joinPaths, fmt, tex
} from "../helpers.js";

const NU = 48;
const NV = 48;

export default {
  id: "surface",
  title: "Parametrised surfaces",
  blurb: "A surface is a map from a patch of the plane into space: two parameters in, a point out. The sliders move you over the patch. The green arrow is the position ψ(u,v), the blue and red arrows are the tangents ψᵤ and ψᵥ, and the purple arrow is the normal.",
  drawLabel: "Draw surface",

  presets: {
    sphere: {
      label: "Sphere",
      values: { fx: "sin(u) cos(v)", fy: "sin(u) sin(v)", fz: "cos(u)", u0: 0, u1: 3.1416, v0: 0, v1: 6.2832 }
    },
    cylinder: {
      label: "Cylinder",
      values: { fx: "cos(v)", fy: "sin(v)", fz: "u", u0: -1, u1: 1, v0: 0, v1: 6.2832 }
    },
    saddle: {
      label: "Saddle",
      values: { fx: "u", fy: "v", fz: "u^2 - v^2", u0: -1, u1: 1, v0: -1, v1: 1 }
    },
    torus: {
      label: "Torus",
      values: {
        fx: "(2 + cos(v)) cos(u)", fy: "(2 + cos(v)) sin(u)", fz: "sin(v)",
        u0: 0, u1: 6.2832, v0: 0, v1: 6.2832
      }
    }
  },

  controls: [
    { kind: "text", name: "fx", label: "x(u, v)" },
    { kind: "text", name: "fy", label: "y(u, v)" },
    { kind: "text", name: "fz", label: "z(u, v)" },
    { kind: "pair", label: "u from / to", names: ["u0", "u1"] },
    { kind: "pair", label: "v from / to", names: ["v0", "v1"] },
    {
      kind: "checks",
      label: "Arrows at the point",
      items: [
        { name: "pos", label: "Position \u03C8(u,v)", checked: true },
        { name: "tang", label: "Tangents \u03C8\u1D64, \u03C8\u1D65", checked: true },
        { name: "nrm", label: "Unit normal n", checked: true },
        { name: "grid", label: "Coordinate grid", checked: true }
      ]
    }
  ],

  sliders: [
    { name: "u", label: "u" },
    { name: "v", label: "v" }
  ],

  build(vals) {
    const u0 = Number(vals.u0), u1 = Number(vals.u1);
    const v0 = Number(vals.v0), v1 = Number(vals.v1);
    if (!isFinite(u0) || !isFinite(u1) || u1 <= u0) throw new Error("Need a u-range with start < end");
    if (!isFinite(v0) || !isFinite(v1) || v1 <= v0) throw new Error("Need a v-range with start < end");

    const fx = compileExpr(vals.fx, "x(u,v)");
    const fy = compileExpr(vals.fy, "y(u,v)");
    const fz = compileExpr(vals.fz, "z(u,v)");
    const at = (u, v) => [fx({ u, v }), fy({ u, v }), fz({ u, v })];

    const us = linspace(u0, u1, NU);
    const vs = linspace(v0, v1, NV);
    const X = [], Y = [], Z = [];
    us.forEach((u) => {
      const rowX = [], rowY = [], rowZ = [];
      vs.forEach((v) => {
        const p = at(u, v);
        rowX.push(isFinite(p[0]) ? p[0] : null);
        rowY.push(isFinite(p[1]) ? p[1] : null);
        rowZ.push(isFinite(p[2]) ? p[2] : null);
      });
      X.push(rowX); Y.push(rowY); Z.push(rowZ);
    });
    const flat = (G) => G.flat().filter((c) => c !== null);
    if (!flat(X).length) throw new Error("The surface is undefined over this patch");

    const hu = (u1 - u0) * 1e-5;
    const hv = (v1 - v0) * 1e-5;
    const partials = (u, v) => {
      const pu = at(u + hu, v), mu = at(u - hu, v);
      const pv = at(u, v + hv), mv = at(u, v - hv);
      return [
        pu.map((c, i) => (c - mu[i]) / (2 * hu)),
        pv.map((c, i) => (c - mv[i]) / (2 * hv))
      ];
    };

    const points = { x: flat(X).concat([0]), y: flat(Y).concat([0]), z: flat(Z).concat([0]) };
    const [rx, ry, rz] = squareRanges(["x", "y", "z"].map((a) => pad(span(points[a]))));
    const sizeref = 0.07 * (rx[1] - rx[0]);
    const arrowScale = 0.25 * (rx[1] - rx[0]);

    const show = { pos: !!vals.pos, tang: !!vals.tang, nrm: !!vals.nrm, grid: !!vals.grid };
    const start = at(u0, v0);

    const traces = [
      {
        type: "surface", x: X, y: Y, z: Z, opacity: 0.55, showscale: false,
        colorscale: [[0, "#8fb4d4"], [1, "#8fb4d4"]], surfacecolor: X.map((row) => row.map(() => 0)),
        hoverinfo: "skip",
        contours: { x: { highlight: false }, y: { highlight: false }, z: { highlight: false } },
        lighting: { ambient: 0.7, diffuse: 0.6, specular: 0.15 }
      },
      ...arrow([0, 0, 0], start, COLOUR.position, sizeref),
      ...arrow(start, [0, 0, 0], "#2b5c8a", sizeref),
      ...arrow(start, [0, 0, 0], COLOUR.velocity, sizeref),
      ...arrow(start, [0, 0, 0], COLOUR.tangent, sizeref)
    ];
    traces[1].visible = show.pos; traces[2].visible = show.pos;
    traces[3].visible = show.tang; traces[4].visible = show.tang;
    traces[5].visible = show.tang; traces[6].visible = show.tang;
    traces[7].visible = show.nrm; traces[8].visible = show.nrm;

    // The u-v grid, drawn on the surface itself: every EVERY-th parameter line,
    // strung together into one null-separated polyline.
    const EVERY = 6;
    const wires = [];
    for (let i = 0; i < NU; i += EVERY) wires.push(vs.map((v) => at(us[i], v)));
    for (let j = 0; j < NV; j += EVERY) wires.push(us.map((u) => at(u, vs[j])));
    const mesh = joinPaths(wires);
    traces.push({
      type: "scatter3d", mode: "lines", hoverinfo: "skip", showlegend: false,
      x: mesh.x, y: mesh.y, z: mesh.z,
      line: { color: "#4a7ba7", width: 1.5 }, opacity: 0.55,
      visible: show.grid
    });

    // and the two coordinate curves through the probe, highlighted
    traces.push(
      {
        type: "scatter3d", mode: "lines", hoverinfo: "skip", showlegend: false,
        x: [], y: [], z: [], line: { color: "#2b5c8a", width: 5 }, visible: show.grid
      },
      {
        type: "scatter3d", mode: "lines", hoverinfo: "skip", showlegend: false,
        x: [], y: [], z: [], line: { color: COLOUR.velocity, width: 5 }, visible: show.grid
      }
    );

    return {
      traces,
      layout: layout3d({
        xaxis: axis("x", rx), yaxis: axis("y", ry), zaxis: axis("z", rz),
        aspectmode: "cube",
        camera: { eye: { x: 1.6, y: -1.7, z: 0.9 } }
      }),
      sliders: {
        u: { min: u0, max: u1, step: (u1 - u0) / 400, value: u0 },
        v: { min: v0, max: v1, step: (v1 - v0) / 400, value: v0 }
      },
      state: { at, partials, show, arrowScale, us, vs },
      formula:
        `\\vec{\\psi}(u,v) = \\left(${tex(vals.fx)},\\ ${tex(vals.fy)},\\ ${tex(vals.fz)}\\right)`
    };
  },

  update(S, at) {
    const p = S.at(at.u, at.v);
    const restyle = [];
    const annotations = [];
    let readout = `\u03C8(${at.u.toFixed(2)}, ${at.v.toFixed(2)}) = ` +
      `<span class="k-green">(${fmt(p[0])}, ${fmt(p[1])}, ${fmt(p[2])})</span>`;

    if (S.show.pos) {
      restyle.push(...moveArrow(1, [0, 0, 0], p));
      annotations.push(label3d(p, "\u03C8", COLOUR.position));
    }

    if (S.show.grid) {
      // v held fixed, u varying: the curve whose velocity is the blue tangent
      const alongU = S.us.map((u) => S.at(u, at.v));
      const alongV = S.vs.map((v) => S.at(at.u, v));
      const a = joinPaths([alongU]);
      const b = joinPaths([alongV]);
      restyle.push(
        { trace: 10, data: { x: [a.x], y: [a.y], z: [a.z] } },
        { trace: 11, data: { x: [b.x], y: [b.y], z: [b.z] } }
      );
    }

    if (S.show.tang || S.show.nrm) {
      const [pu, pv] = S.partials(at.u, at.v);
      const n = cross(pu, pv);
      const area = norm(n);

      if (S.show.tang) {
        const su = S.arrowScale / Math.max(norm(pu), 1e-9);
        const sv = S.arrowScale / Math.max(norm(pv), 1e-9);
        const au = pu.map((c) => c * su);
        const av = pv.map((c) => c * sv);
        restyle.push(...moveArrow(3, p, au), ...moveArrow(5, p, av));
        annotations.push(
          label3d(p.map((c, i) => c + au[i]), "\u03C8_u", "#2b5c8a"),
          label3d(p.map((c, i) => c + av[i]), "\u03C8_v", COLOUR.velocity)
        );
      }

      if (S.show.nrm) {
        const unit = area > 0 ? n.map((c) => (c / area) * S.arrowScale) : [0, 0, 0];
        restyle.push(...moveArrow(7, p, unit));
        annotations.push(label3d(p.map((c, i) => c + unit[i]), "n", COLOUR.tangent));
      }

      readout += `   |\u03C8_u \u00D7 \u03C8_v| = <span class="k-violet">${fmt(area, 3)}</span>`;
    }

    return { readout, restyle, annotations };
  },
  sections: [
    {
      heading: "Coordinate curves and tangents",
      body: "<p>Hold \\(v\\) fixed and vary \\(u\\) and you trace a curve lying in the surface; its velocity is \\(\\boldsymbol{\\psi}_u = \\partial\\boldsymbol{\\psi}/\\partial u\\). Holding \\(u\\) fixed instead gives \\(\\boldsymbol{\\psi}_v\\). Turn on the coordinate grid to see both families of curves, with the two through the current point drawn heavily.</p><p>These two vectors span the tangent plane, so their cross product is perpendicular to the surface:</p>\\[ \\mathbf{n} = \\frac{\\boldsymbol{\\psi}_u \\times \\boldsymbol{\\psi}_v}{\\left| \\boldsymbol{\\psi}_u \\times \\boldsymbol{\\psi}_v \\right|} \\]"
    },
    {
      heading: "The area element",
      body: "<p>A small rectangle \\(du\\,dv\\) in the parameter plane maps to a small parallelogram on the surface, spanned by \\(\\boldsymbol{\\psi}_u du\\) and \\(\\boldsymbol{\\psi}_v dv\\). Its area is</p>\\[ dS = \\left| \\boldsymbol{\\psi}_u \\times \\boldsymbol{\\psi}_v \\right| du\\, dv \\]<p>which is the number in the readout. On the sphere it equals \\(\\sin u\\), and it drops to zero at the poles where the grid lines all meet.</p><p>With the area element, a surface integral becomes a double integral over the parameter patch:</p>\\[ \\iint_S f\\, dS = \\iint f\\big(\\boldsymbol{\\psi}(u,v)\\big) \\left| \\boldsymbol{\\psi}_u \\times \\boldsymbol{\\psi}_v \\right| du\\, dv \\]<p>and the flux of a vector field through the surface is</p>\\[ \\iint_S \\mathbf{F} \\cdot \\mathbf{n}\\, dS = \\iint \\mathbf{F} \\cdot \\left( \\boldsymbol{\\psi}_u \\times \\boldsymbol{\\psi}_v \\right) du\\, dv \\]<p>Swapping \\(u\\) and \\(v\\) reverses the cross product and flips the normal: a surface has two sides, and the parametrisation chooses one.</p>"
    }
  ]
};
