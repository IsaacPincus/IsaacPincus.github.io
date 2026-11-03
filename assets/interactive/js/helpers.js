// Shared helpers for the vector-analysis viewers.
// math.js and Plotly are loaded as globals by viewer.html.

export const COLOUR = {
  curve: "#2b5c8a",
  position: "#12795a",
  velocity: "#b03a2b",
  tangent: "#6a3d9a",
  surface: "Viridis",
  slice: "#b03a2b",
  sliceEdge: "#7d2418",
  plane: "#5b6b7c"
};

/** Compile a user-typed expression into f(scope). Throws a readable error. */
export function compileExpr(expr, label) {
  let compiled;
  try {
    compiled = math.compile(expr);
  } catch (e) {
    throw new Error(`Can't read ${label}: ${e.message}`);
  }
  return function (scope) {
    const v = compiled.evaluate(scope);
    return typeof v === "number" && isFinite(v) ? v : NaN;
  };
}

/** Compile an expression in one variable, returned as a plain f(value). */
export function compile1(expr, variable, label) {
  const f = compileExpr(expr, label);
  return (v) => f({ [variable]: v });
}

export function linspace(a, b, n) {
  const out = new Array(n);
  for (let i = 0; i < n; i++) out[i] = a + ((b - a) * i) / (n - 1);
  return out;
}

/** Simpson's rule over evenly spaced samples; needs an odd number of them. */
export function simpson(values, h) {
  const n = values.length;
  let s = values[0] + values[n - 1];
  for (let i = 1; i < n - 1; i++) s += (i % 2 ? 4 : 2) * values[i];
  return (s * h) / 3;
}

export function span(values) {
  const v = values.filter(isFinite);
  return [Math.min(...v), Math.max(...v)];
}

export function pad(range, fraction = 0.08, minimum = 0.1) {
  const p = fraction * (range[1] - range[0]) + minimum;
  return [range[0] - p, range[1] + p];
}

export function norm(v) {
  return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}

/**
 * Give every axis the same span, centred on its own midpoint, so one unit is
 * the same length on all of them. Combined with aspectmode "cube" this keeps
 * shapes and relative sizes true, whatever the function does.
 */
export function squareRanges(ranges) {
  const widest = Math.max(...ranges.map((r) => r[1] - r[0])) || 1;
  return ranges.map((r) => {
    const mid = (r[0] + r[1]) / 2;
    return [mid - widest / 2, mid + widest / 2];
  });
}

export function axis(title, range) {
  return {
    title: { text: title, font: { size: 15 } },
    range,
    gridcolor: "#dbe3ea",
    zerolinecolor: "#9fb2c1",
    backgroundcolor: "#fbfcfd",
    showbackground: true,
    tickfont: { size: 11 }
  };
}

export function layout3d(scene) {
  return {
    margin: { l: 0, r: 0, t: 6, b: 0 },
    paper_bgcolor: "#ffffff",
    // uirevision keeps the camera where the user put it across react/relayout
    scene: Object.assign({ uirevision: "keep" }, scene)
  };
}

/** An arrow as two traces: a shaft (scatter3d) and a head (cone). */
export function arrow(from, vec, colour, sizeref) {
  const tip = [from[0] + vec[0], from[1] + vec[1], from[2] + vec[2]];
  return [
    {
      type: "scatter3d",
      mode: "lines",
      hoverinfo: "skip",
      showlegend: false,
      x: [from[0], tip[0]],
      y: [from[1], tip[1]],
      z: [from[2], tip[2]],
      line: { color: colour, width: 6 }
    },
    {
      type: "cone",
      anchor: "tip",
      sizemode: "absolute",
      sizeref,
      showscale: false,
      hoverinfo: "skip",
      lighting: { ambient: 0.85 },
      colorscale: [
        [0, colour],
        [1, colour]
      ],
      x: [tip[0]],
      y: [tip[1]],
      z: [tip[2]],
      u: [vec[0]],
      v: [vec[1]],
      w: [vec[2]]
    }
  ];
}

/** Restyle instructions moving the arrow whose shaft is trace `index`. */
export function moveArrow(index, from, vec) {
  const tip = [from[0] + vec[0], from[1] + vec[1], from[2] + vec[2]];
  return [
    {
      trace: index,
      data: { x: [[from[0], tip[0]]], y: [[from[1], tip[1]]], z: [[from[2], tip[2]]] }
    },
    {
      trace: index + 1,
      data: {
        x: [[tip[0]]],
        y: [[tip[1]]],
        z: [[tip[2]]],
        u: [[vec[0]]],
        v: [[vec[1]]],
        w: [[vec[2]]]
      }
    }
  ];
}

/**
 * A floating label. These are drawn as points of a scatter3d text trace rather
 * than as scene annotations, because moving an annotation needs a relayout,
 * and a relayout re-renders the whole scene on every slider step.
 */
export function label3d(at, text, colour) {
  return { x: at[0], y: at[1], z: at[2], text, colour };
}

/** Round tiny values to zero so the readout doesn't show "-0.00". */
export function fmt(value, places = 2) {
  return (Math.abs(value) < 5e-3 ? 0 : value).toFixed(places);
}

/** Cross product, as a plain array. */
export function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

/** A user-typed expression as LaTeX, for the formula block. */
export function tex(expr) {
  try {
    return math
      .parse(expr)
      .toTex({ parenthesis: "auto", implicit: "hide" })
      .replace(/\\mathrm\{([a-zA-Z])\}/g, "$1"); // single letters read better upright-free
  } catch (e) {
    return "\\text{?}";
  }
}

/** A number as LaTeX-safe text. */
export function texNum(value, places = 2) {
  return fmt(value, places);
}

/** A vector as "(a,\ b,\ c)" in LaTeX. */
export function texVec(v, places = 2) {
  return `\\left(${v.map((c) => fmt(c, places)).join(",\\ ")}\\right)`;
}

/** Unit sphere as 2D grids, ready for a Plotly surface. */
export function sphereGrid(n = 36) {
  const X = [];
  const Y = [];
  const Z = [];
  for (let i = 0; i <= n; i++) {
    const theta = (Math.PI * i) / n;
    const rowX = [];
    const rowY = [];
    const rowZ = [];
    for (let j = 0; j <= 2 * n; j++) {
      const phi = (2 * Math.PI * j) / (2 * n);
      rowX.push(Math.sin(theta) * Math.cos(phi));
      rowY.push(Math.sin(theta) * Math.sin(phi));
      rowZ.push(Math.cos(theta));
    }
    X.push(rowX);
    Y.push(rowY);
    Z.push(rowZ);
  }
  return { X, Y, Z };
}

/** A flat quadrilateral as a mesh3d trace. */
export function quad(corners, colour, opacity = 0.28) {
  return {
    type: "mesh3d",
    x: corners.map((c) => c[0]),
    y: corners.map((c) => c[1]),
    z: corners.map((c) => c[2]),
    i: [0, 0],
    j: [1, 2],
    k: [2, 3],
    color: colour,
    opacity,
    flatshading: true,
    hoverinfo: "skip",
    lighting: { ambient: 0.95, diffuse: 0.2, specular: 0 }
  };
}

/** A cube of the same half-width on every axis, centred on the origin. */
export function cubeRanges(halfWidth) {
  const h = Math.max(halfWidth, 1e-6);
  return [
    [-h, h],
    [-h, h],
    [-h, h]
  ];
}

/** Numerical Jacobian J[i][j] = dF_i/dx_j of a field F(p) at a point. */
export function jacobian(F, p, h) {
  const J = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let j = 0; j < 3; j++) {
    const plus = p.slice();
    const minus = p.slice();
    plus[j] += h;
    minus[j] -= h;
    const a = F(plus);
    const b = F(minus);
    for (let i = 0; i < 3; i++) J[i][j] = (a[i] - b[i]) / (2 * h);
  }
  return J;
}

export function divergence(J) {
  return J[0][0] + J[1][1] + J[2][2];
}

export function curl(J) {
  return [J[2][1] - J[1][2], J[0][2] - J[2][0], J[1][0] - J[0][1]];
}

export function symmetric(J) {
  return J.map((row, i) => row.map((c, j) => (c + J[j][i]) / 2));
}

export function antisymmetric(J) {
  return J.map((row, i) => row.map((c, j) => (c - J[j][i]) / 2));
}

/** Numerical gradient of a scalar field f(p). */
export function gradient(f, p, h) {
  return [0, 1, 2].map((j) => {
    const plus = p.slice();
    const minus = p.slice();
    plus[j] += h;
    minus[j] -= h;
    return (f(plus) - f(minus)) / (2 * h);
  });
}

/** Every point of a cubic grid spanning [lo, hi] on each axis. */
export function grid3d(lo, hi, n) {
  const points = [];
  const step = n > 1 ? (hi - lo) / (n - 1) : 0;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++)
      for (let k = 0; k < n; k++) points.push([lo + i * step, lo + j * step, lo + k * step]);
  return { points, spacing: step || hi - lo };
}

/**
 * Three faces of a cube at `origin`, one perpendicular to each axis, with the
 * corners and centre of each. Used to draw a rank-2 tensor: row i is drawn as
 * an arrow on face i.
 */
export function tensorCube(origin, size) {
  const [a, b, c] = origin;
  const s = size;
  return [
    {
      axis: "x",
      corners: [[a, b, c], [a, b + s, c], [a, b + s, c + s], [a, b, c + s]],
      centre: [a, b + s / 2, c + s / 2]
    },
    {
      axis: "y",
      corners: [[a, b, c], [a + s, b, c], [a + s, b, c + s], [a, b, c + s]],
      centre: [a + s / 2, b, c + s / 2]
    },
    {
      axis: "z",
      corners: [[a, b, c], [a + s, b, c], [a + s, b + s, c], [a, b + s, c]],
      centre: [a + s / 2, b + s / 2, c]
    }
  ];
}

/** A 3x3 matrix as a LaTeX bmatrix. */
export function texMatrix(T, places = 2) {
  return (
    "\\begin{bmatrix}" +
    T.map((row) => row.map((c) => fmt(c, places)).join(" & ")).join(" \\\\ ") +
    "\\end{bmatrix}"
  );
}

/** Layout for a flat 2D figure, with x and y kept at the same scale. */
export function layout2d(xRange, yRange) {
  const ax = (title, range, extra) =>
    Object.assign(
      {
        title: { text: title, font: { size: 15 } },
        range,
        gridcolor: "#dbe3ea",
        zerolinecolor: "#9fb2c1",
        tickfont: { size: 11 }
      },
      extra
    );
  return {
    margin: { l: 48, r: 12, t: 10, b: 42 },
    paper_bgcolor: "#ffffff",
    plot_bgcolor: "#fbfcfd",
    showlegend: false,
    uirevision: "keep",
    xaxis: ax("x", xRange, { constrain: "domain" }),
    yaxis: ax("y", yRange, { scaleanchor: "x", scaleratio: 1 })
  };
}

/** One classical Runge-Kutta step of dp/dt = f(t, p). */
export function rk4(f, t, p, dt) {
  const add = (a, b, s) => a.map((c, i) => c + b[i] * s);
  const k1 = f(t, p);
  const k2 = f(t + dt / 2, add(p, k1, dt / 2));
  const k3 = f(t + dt / 2, add(p, k2, dt / 2));
  const k4 = f(t + dt, add(p, k3, dt));
  return p.map((c, i) => c + ((k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]) * dt) / 6);
}

/** Signed area of a closed polygon, by the shoelace formula. */
export function polygonArea(points) {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    sum += a[0] * b[1] - b[0] * a[1];
  }
  return sum / 2;
}

/** Rotate 2D points about a centre. */
export function rotate2d(points, centre, angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return points.map((p) => {
    const dx = p[0] - centre[0];
    const dy = p[1] - centre[1];
    return [centre[0] + c * dx - s * dy, centre[1] + s * dx + c * dy];
  });
}

export function centroid(points) {
  const n = points.length;
  return [points.reduce((s, p) => s + p[0], 0) / n, points.reduce((s, p) => s + p[1], 0) / n];
}

/**
 * Arrows for a 2D field, as one null-separated polyline: shaft plus two head
 * strokes per arrow. Plotly has no 2D quiver, and drawing them as annotations
 * would need a relayout on every frame.
 */
export function arrows2d(points, vectors, scale) {
  const x = [];
  const y = [];
  points.forEach((p, i) => {
    const v = vectors[i];
    if (!isFinite(v[0]) || !isFinite(v[1])) return;
    const tip = [p[0] + v[0] * scale, p[1] + v[1] * scale];
    const dx = tip[0] - p[0];
    const dy = tip[1] - p[1];
    const len = Math.hypot(dx, dy);
    if (len < 1e-12) return;
    const ux = dx / len;
    const uy = dy / len;
    const head = Math.min(0.3 * len, 0.35 * scale * len);
    const back = [tip[0] - ux * head, tip[1] - uy * head];
    const wing = 0.45 * head;
    x.push(p[0], tip[0], null, back[0] - uy * wing, tip[0], back[0] + uy * wing, null);
    y.push(p[1], tip[1], null, back[1] + ux * wing, tip[1], back[1] - ux * wing, null);
  });
  return { x, y };
}

/** A null-separated polyline through several separate paths. */
export function joinPaths(paths) {
  const x = [];
  const y = [];
  const z = [];
  paths.forEach((path) => {
    path.forEach((p) => {
      x.push(p[0]);
      y.push(p[1]);
      z.push(p.length > 2 ? p[2] : 0);
    });
    x.push(null);
    y.push(null);
    z.push(null);
  });
  return { x, y, z };
}

/**
 * Polar decomposition of a 2x2 deformation gradient, F = R U, with R a
 * rotation and U symmetric positive definite (the right stretch tensor).
 * Returns the principal stretches and the material directions they act along.
 */
export function polar2d(F) {
  // C = F^T F, symmetric, so its eigenvectors are the principal directions
  const a = F[0][0] * F[0][0] + F[1][0] * F[1][0];
  const b = F[0][0] * F[0][1] + F[1][0] * F[1][1];
  const d = F[0][1] * F[0][1] + F[1][1] * F[1][1];

  const mean = (a + d) / 2;
  const spread = Math.sqrt(Math.max(0, ((a - d) / 2) ** 2 + b * b));
  const c1 = Math.max(1e-14, mean + spread);
  const c2 = Math.max(1e-14, mean - spread);

  let e1;
  if (Math.abs(b) > 1e-12) e1 = [c1 - d, b];
  else e1 = a >= d ? [1, 0] : [0, 1];
  const n1 = Math.hypot(e1[0], e1[1]) || 1;
  e1 = [e1[0] / n1, e1[1] / n1];
  const e2 = [-e1[1], e1[0]];

  const l1 = Math.sqrt(c1);
  const l2 = Math.sqrt(c2);

  // U = l1 e1 e1^T + l2 e2 e2^T, and its inverse the same with 1/l
  const build = (s1, s2) => [
    [s1 * e1[0] * e1[0] + s2 * e2[0] * e2[0], s1 * e1[0] * e1[1] + s2 * e2[0] * e2[1]],
    [s1 * e1[1] * e1[0] + s2 * e2[1] * e2[0], s1 * e1[1] * e1[1] + s2 * e2[1] * e2[1]]
  ];
  const U = build(l1, l2);
  const Uinv = build(1 / l1, 1 / l2);
  const R = matMul2(F, Uinv);

  return { R, U, stretches: [l1, l2], axes: [e1, e2], angle: Math.atan2(R[1][0], R[0][0]) };
}

export function matMul2(A, B) {
  return [
    [A[0][0] * B[0][0] + A[0][1] * B[1][0], A[0][0] * B[0][1] + A[0][1] * B[1][1]],
    [A[1][0] * B[0][0] + A[1][1] * B[1][0], A[1][0] * B[0][1] + A[1][1] * B[1][1]]
  ];
}

export function matVec2(A, v) {
  return [A[0][0] * v[0] + A[0][1] * v[1], A[1][0] * v[0] + A[1][1] * v[1]];
}

export function det2(A) {
  return A[0][0] * A[1][1] - A[0][1] * A[1][0];
}

export function transpose2(A) {
  return [[A[0][0], A[1][0]], [A[0][1], A[1][1]]];
}

export function inv2(A) {
  const d = det2(A);
  if (Math.abs(d) < 1e-14) return [[1, 0], [0, 1]];
  return [[A[1][1] / d, -A[0][1] / d], [-A[1][0] / d, A[0][0] / d]];
}

/** Eigen-decomposition of a symmetric 2x2 matrix. */
export function eigSym2(A) {
  const a = A[0][0];
  const b = (A[0][1] + A[1][0]) / 2;
  const d = A[1][1];
  const mean = (a + d) / 2;
  const spread = Math.sqrt(Math.max(0, ((a - d) / 2) ** 2 + b * b));
  const values = [mean + spread, mean - spread];
  let e1;
  if (Math.abs(b) > 1e-12) e1 = [values[0] - d, b];
  else e1 = a >= d ? [1, 0] : [0, 1];
  const n = Math.hypot(e1[0], e1[1]) || 1;
  e1 = [e1[0] / n, e1[1] / n];
  return { values, vectors: [e1, [-e1[1], e1[0]]] };
}

/** Square root of a symmetric positive semi-definite 2x2 matrix. */
export function sqrtSym2(A) {
  const { values, vectors } = eigSym2(A);
  const s = values.map((v) => Math.sqrt(Math.max(0, v)));
  const [e1, e2] = vectors;
  return [
    [s[0] * e1[0] * e1[0] + s[1] * e2[0] * e2[0], s[0] * e1[0] * e1[1] + s[1] * e2[0] * e2[1]],
    [s[0] * e1[1] * e1[0] + s[1] * e2[1] * e2[0], s[0] * e1[1] * e1[1] + s[1] * e2[1] * e2[1]]
  ];
}

/**
 * The ellipse a symmetric tensor stands for: the image of the unit circle
 * under sqrt(A), so the semi-axes are the square roots of the eigenvalues,
 * along the eigenvectors.
 */
export function ellipseFromTensor(A, centre, scale = 1, n = 80) {
  const S = sqrtSym2(A);
  const x = [];
  const y = [];
  for (let i = 0; i <= n; i++) {
    const th = (2 * Math.PI * i) / n;
    const u = [Math.cos(th), Math.sin(th)];
    x.push(centre[0] + scale * (S[0][0] * u[0] + S[0][1] * u[1]));
    y.push(centre[1] + scale * (S[1][0] * u[0] + S[1][1] * u[1]));
  }
  return { x, y };
}
