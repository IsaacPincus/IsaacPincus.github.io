import {
  COLOUR, compile1, linspace, span, pad, norm, squareRanges,
  axis, layout3d, arrow, moveArrow, label3d, fmt, tex
} from "../helpers.js";

const N = 900; // samples along the curve

export default {
  id: "curve",
  title: "Parametrised curves",
  blurb: "A curve in space is a map \\(t \\mapsto \\varphi(t) = (x(t), y(t), z(t))\\). Drag the slider to move along it. The green arrow is the position φ(t), the red arrow the velocity φ′(t), and the purple arrow the unit tangent T(t).",
  note: "Enter expressions using sin, cos, exp, sqrt, abs, pi, and ^ for powers. Choose whether the velocity is worked out numerically or from the derivatives you type.",
  drawLabel: "Draw curve",
  sliders: [{ name: "t", label: "t", aria: "parameter t" }],

  presets: {
    helix: {
      label: "Helix",
      values: {
        fx: "sin(2 pi t)", fy: "cos(2 pi t)", fz: "t/3", t0: 0, t1: 3,
        dx: "2 pi cos(2 pi t)", dy: "-2 pi sin(2 pi t)", dz: "1/3"
      }
    },
    circle: {
      label: "Circle in the plane",
      values: { fx: "cos(t)", fy: "sin(t)", fz: "0", t0: 0, t1: 6.2832, dx: "-sin(t)", dy: "cos(t)", dz: "0" }
    },
    lissajous: {
      label: "Lissajous knot",
      values: {
        fx: "cos(3 t)", fy: "sin(2 t)", fz: "sin(3 t)/2", t0: 0, t1: 6.2832,
        dx: "-3 sin(3 t)", dy: "2 cos(2 t)", dz: "3 cos(3 t)/2"
      }
    },
    spiral: {
      label: "Conical spiral",
      values: {
        fx: "t cos(4 t)/6", fy: "t sin(4 t)/6", fz: "t/6", t0: 0, t1: 6,
        dx: "cos(4 t)/6 - 2 t sin(4 t)/3", dy: "sin(4 t)/6 + 2 t cos(4 t)/3", dz: "1/6"
      }
    }
  },

  controls: [
    { kind: "text", name: "fx", label: "x(t)" },
    { kind: "text", name: "fy", label: "y(t)" },
    { kind: "text", name: "fz", label: "z(t)" },
    { kind: "pair", label: "t from / to", names: ["t0", "t1"] },
    {
      kind: "select",
      name: "source",
      label: "Velocity from",
      options: [
        { value: "numeric", label: "Numerical difference" },
        { value: "analytic", label: "The derivatives below" }
      ]
    },
    { kind: "text", name: "dx", label: "x\u2032(t)" },
    { kind: "text", name: "dy", label: "y\u2032(t)" },
    { kind: "text", name: "dz", label: "z\u2032(t)" },
    {
      kind: "checks",
      label: "Arrows at the point",
      items: [
        { name: "vel", label: "Velocity \u03C6\u2032(t)", checked: true },
        { name: "tan", label: "Unit tangent T(t)" }
      ]
    },
    {
      kind: "select",
      name: "scale",
      label: "Velocity arrow length",
      options: [
        { value: "fit", label: "Scaled to fit the view" },
        { value: "true", label: "True scale" }
      ]
    }
  ],

  build(v) {
    const t0 = Number(v.t0);
    const t1 = Number(v.t1);
    if (!isFinite(t0) || !isFinite(t1) || t1 <= t0) throw new Error("Need a t-range with start < end");

    const x = compile1(v.fx, "t", "x(t)");
    const y = compile1(v.fy, "t", "y(t)");
    const z = compile1(v.fz, "t", "z(t)");

    const h = (t1 - t0) * 1e-5;
    const tt = linspace(t0, t1, N);
    const cx = tt.map(x);
    const cy = tt.map(y);
    const cz = tt.map(z);
    if (!cx.some(isFinite) || !cy.some(isFinite) || !cz.some(isFinite)) {
      throw new Error("The curve is undefined over this range");
    }

    const numeric = (t) => [
      (x(t + h) - x(t - h)) / (2 * h),
      (y(t + h) - y(t - h)) / (2 * h),
      (z(t + h) - z(t - h)) / (2 * h)
    ];

    let derivative = numeric;
    const analytic = v.source === "analytic";
    if (analytic) {
      if (!String(v.dx).trim() || !String(v.dy).trim() || !String(v.dz).trim()) {
        throw new Error("Fill in x\u2032, y\u2032 and z\u2032, or switch back to numerical");
      }
      const dx = compile1(v.dx, "t", "x\u2032(t)");
      const dy = compile1(v.dy, "t", "y\u2032(t)");
      const dz = compile1(v.dz, "t", "z\u2032(t)");
      derivative = (t) => [dx(t), dy(t), dz(t)];
    }

    // how far the typed derivative strays from the numerical one, as a check
    let mismatch = 0;
    if (analytic) {
      for (let i = 5; i < N - 5; i += 37) {
        const a = derivative(tt[i]);
        const b = numeric(tt[i]);
        mismatch = Math.max(mismatch, norm([a[0] - b[0], a[1] - b[1], a[2] - b[2]]));
      }
    }

    const velocities = tt.map(derivative);
    const speedMax = velocities.reduce((m, d) => {
      const s = norm(d);
      return isFinite(s) && s > m ? s : m;
    }, 0);

    // Frame the view on the curve and the origin, never on the arrows: a fast
    // curve would otherwise shrink to nothing inside its own velocity vectors.
    const base = { x: cx.concat([0]), y: cy.concat([0]), z: cz.concat([0]) };
    const extent = Math.max(...["x", "y", "z"].map((a) => { const s = span(base[a]); return s[1] - s[0]; })) || 1;

    const showVel = !!v.vel;
    const showTan = !!v.tan;
    const vScale = showVel && v.scale !== "true" && speedMax > 0 ? (0.32 * extent) / speedMax : 1;

    const points = { x: base.x.slice(), y: base.y.slice(), z: base.z.slice() };
    const addTips = (factorAt) => {
      for (let i = 0; i < N; i += 6) {
        const f = factorAt(i);
        if (!f) continue;
        points.x.push(cx[i] + velocities[i][0] * f);
        points.y.push(cy[i] + velocities[i][1] * f);
        points.z.push(cz[i] + velocities[i][2] * f);
      }
    };
    if (showVel) addTips(() => vScale);
    if (showTan) addTips((i) => { const s = norm(velocities[i]); return s > 0 ? 1 / s : 0; });

    const [rx, ry, rz] = squareRanges(["x", "y", "z"].map((a) => pad(span(points[a]))));
    const sizeref = 0.09 * (rx[1] - rx[0]);

    const start = [x(t0), y(t0), z(t0)];
    const traces = [
      {
        type: "scatter3d", mode: "lines", hoverinfo: "skip", showlegend: false,
        x: cx, y: cy, z: cz, line: { color: COLOUR.curve, width: 4 }
      },
      ...arrow([0, 0, 0], start, COLOUR.position, sizeref),
      ...arrow(start, [0, 0, 0], COLOUR.velocity, sizeref),
      ...arrow(start, [0, 0, 0], COLOUR.tangent, sizeref)
    ];
    traces[3].visible = showVel;
    traces[4].visible = showVel;
    traces[5].visible = showTan;
    traces[6].visible = showTan;

    return {
      traces,
      layout: layout3d({
        xaxis: axis("x", rx),
        yaxis: axis("y", ry),
        zaxis: axis("z", rz),
        aspectmode: "cube",
        camera: { eye: { x: 1.5, y: -1.7, z: 1.0 } }
      }),
      sliders: { t: { min: t0, max: t1, step: (t1 - t0) / 600, value: t0 } },
      formula:
        `\\vec{\\varphi}(t) = \\left(${tex(v.fx)},\\ ${tex(v.fy)},\\ ${tex(v.fz)}\\right),` +
        `\\qquad t \\in [${fmt(t0, 2)},\\ ${fmt(t1, 2)}]`,
      state: { x, y, z, h, showVel, showTan, vScale, derivative, analytic, mismatch }
    };
  },

  update(S, at) {
    const t = at.t;
    const p = [S.x(t), S.y(t), S.z(t)];
    const restyle = moveArrow(1, [0, 0, 0], p);
    const annotations = [label3d(p, "\u03C6(t)", COLOUR.position)];
    let readout =
      `\u03C6(${t.toFixed(2)}) = <span class="k-green">(${fmt(p[0])}, ${fmt(p[1])}, ${fmt(p[2])})</span>`;

    if (S.showVel || S.showTan) {
      const d = S.derivative(t);
      const speed = norm(d);

      if (S.showVel) {
        const drawn = d.map((c) => c * S.vScale);
        restyle.push(...moveArrow(3, p, drawn));
        annotations.push(label3d(p.map((c, i) => c + drawn[i]), "\u03C6\u2032(t)", COLOUR.velocity));
        readout +=
          `   \u03C6\u2032(${t.toFixed(2)}) = <span class="k-red">(${fmt(d[0])}, ${fmt(d[1])}, ${fmt(d[2])})</span>` +
          `   |\u03C6\u2032| = ${speed.toFixed(2)}`;
        if (Math.abs(S.vScale - 1) > 1e-9) readout += ` (arrow at ${S.vScale.toFixed(2)}\u00D7)`;
      }

      if (S.showTan) {
        const u = speed > 0 ? 1 / speed : 0;
        const unit = d.map((c) => c * u);
        restyle.push(...moveArrow(5, p, unit));
        annotations.push(label3d(p.map((c, i) => c + unit[i]), "T(t)", COLOUR.tangent));
        readout += `   T(${t.toFixed(2)}) = <span class="k-violet">(${fmt(unit[0])}, ${fmt(unit[1])}, ${fmt(unit[2])})</span>`;
      }
    }

    if (S.analytic && S.mismatch > 1e-3) {
      readout += `   <span class="k-red">typed derivative differs from the numerical one by up to ${fmt(S.mismatch, 3)}</span>`;
    }

    return { labels: { t: t.toFixed(2) }, readout, restyle, annotations };
  },
  sections: [
    {
      heading: "Velocity, speed and length",
      body: "<p>The velocity is the derivative of the position, component by component:</p>\\[ \\vec{\\varphi}\\,'(t) = \\left( x'(t),\\ y'(t),\\ z'(t) \\right) \\]<p>It is always tangent to the curve. Its magnitude is the speed, and integrating the speed gives the length of the curve:</p>\\[ L = \\int_{t_0}^{t_1} \\left| \\vec{\\varphi}\\,'(t) \\right| dt \\]"
    },
    {
      heading: "The curve is not the parametrisation",
      body: "<p>Replacing \\(t\\) by \\(2t\\) traces the same points twice as fast. The path is unchanged but the velocity doubles, so the velocity describes how you move along the curve, not the curve itself.</p><p>The unit tangent</p>\\[ \\mathbf{T}(t) = \\frac{\\vec{\\varphi}\\,'(t)}{|\\vec{\\varphi}\\,'(t)|} \\]<p>discards the speed and keeps only the direction, so it is the same whichever parametrisation you choose.</p>"
    }
  ]
};
