// Turns a viewer spec into a working figure: controls, sliders, plot, readout,
// and a typeset formula. A viewer file describes its inputs and supplies
// build() and update(); everything below is shared.
//
//   spec = {
//     id, title, blurb, note,
//     presets:  { key: { label, values: {...} } },      // optional
//     controls: [ ...see control() below... ],          // may be empty
//     sliders:  [ { name, label } ],                    // may be empty
//     drawLabel,
//     build(values)      -> { traces, layout, sliders:{name:{min,max,step,value}},
//                             state, formula }
//     update(state, at)  -> { labels:{name:"1.00"}, readout, restyle:[{trace,data}],
//                             annotations:[], formula }
//   }
//
// `at` is an object of the current slider values, keyed by slider name.
// `formula` is a LaTeX string (no delimiters). Returning it from update() is
// fine: typesetting is throttled to one MathJax pass at a time.

const CONFIG = { responsive: true, displaylogo: false, modeBarButtonsToRemove: ["resetCameraLastSave3d"] };

/** The trace that carries every floating label, appended after a viewer's own. */
function labelTrace(flat) {
  const trace = {
    type: flat ? "scatter" : "scatter3d",
    mode: "text",
    x: [], y: [], text: [],
    cliponaxis: false,
    textposition: "top center",
    textfont: { size: 13, family: "IBM Plex Mono, monospace", color: [] },
    hoverinfo: "skip",
    showlegend: false
  };
  if (!flat) trace.z = [];
  return trace;
}

/**
 * One Plotly call per set of attributes rather than one per trace. Each redraw
 * re-renders the whole WebGL scene, so eight little restyles cost eight frames.
 */
function applyRestyles(plot, updates) {
  const groups = new Map();
  updates.forEach((u) => {
    const key = Object.keys(u.data).sort().join(",");
    if (!groups.has(key)) groups.set(key, { traces: [], data: {} });
    const group = groups.get(key);
    group.traces.push(u.trace);
    Object.keys(u.data).forEach((attr) => {
      if (!group.data[attr]) group.data[attr] = [];
      group.data[attr].push(u.data[attr][0]);
    });
  });
  groups.forEach((group) => Plotly.restyle(plot, group.data, group.traces));
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function makeTypesetter(node) {
  let latest = null;
  let busy = false;

  function run() {
    if (busy || latest === null) return;
    const tex = latest;
    latest = null;
    const mj = window.MathJax;
    if (!mj || !mj.typesetPromise || !mj.startup) {
      node.textContent = tex; // no MathJax: show the source rather than nothing
      return;
    }
    busy = true;
    node.innerHTML = "\\[" + tex + "\\]";
    mj.startup.promise
      .then(() => mj.typesetPromise([node]))
      .catch(() => {})
      .then(() => {
        busy = false;
        run();
      });
  }

  return function (tex) {
    if (tex == null) return;
    node.hidden = false;
    latest = tex;
    run();
  };
}

function control(spec, item) {
  const id = `${spec.id}-${item.name || (item.names && item.names[0]) || "group"}`;

  if (item.kind === "checks") {
    const set = el("fieldset", "checks");
    set.appendChild(el("legend", null, item.label));
    item.items.forEach((box) => {
      const row = el("label", "check");
      const input = el("input");
      input.type = "checkbox";
      input.dataset.name = box.name;
      input.checked = !!box.checked;
      row.appendChild(input);
      row.appendChild(document.createTextNode(" " + box.label));
      set.appendChild(row);
    });
    return set;
  }

  const wrap = el("div", "field");
  const label = el("label", null, item.label);
  label.htmlFor = id;
  wrap.appendChild(label);

  if (item.kind === "select") {
    const select = el("select");
    select.id = id;
    select.dataset.name = item.name;
    item.options.forEach((o) => {
      const option = el("option", null, o.label);
      option.value = o.value;
      select.appendChild(option);
    });
    wrap.appendChild(select);
    return wrap;
  }

  if (item.kind === "row" || item.kind === "pair") {
    const row = el("div", "row");
    row.style.gridTemplateColumns = `repeat(${item.names.length}, 1fr)`;
    item.names.forEach((name, i) => {
      const input = el("input");
      input.type = "number";
      input.step = "any";
      input.dataset.name = name;
      if (i === 0) input.id = id;
      row.appendChild(input);
    });
    wrap.appendChild(row);
    return wrap;
  }

  const input = el("input");
  input.type = item.kind === "number" ? "number" : "text";
  if (item.kind === "number") input.step = "any";
  input.spellcheck = false;
  input.id = id;
  input.dataset.name = item.name;
  if (item.placeholder) input.placeholder = item.placeholder;
  wrap.appendChild(input);
  return wrap;
}

export function mount(host, spec) {
  const sliderSpecs = spec.sliders || [];
  const controlSpecs = spec.controls || [];
  const hasPanel = controlSpecs.length > 0 || !!spec.presets;

  const root = el("section", "viewer");
  root.appendChild(el("h1", null, spec.title));

  const blurb = el("p", "lede");
  blurb.innerHTML = spec.blurb;
  root.appendChild(blurb);

  const formulaBox = el("div", "formula");
  formulaBox.hidden = true;
  root.appendChild(formulaBox);
  const typeset = makeTypesetter(formulaBox);

  const figure = el("div", "figure");
  const plot = el("div", "plot");
  figure.appendChild(plot);
  const controls = el("div", "controls");

  let presetSelect = null;
  if (spec.presets) {
    const field = control(spec, {
      kind: "select",
      name: "__preset",
      label: spec.presetLabel || "Example",
      options: Object.keys(spec.presets).map((k) => ({ value: k, label: spec.presets[k].label }))
    });
    controls.appendChild(field);
    presetSelect = field.querySelector("select");
  }
  controlSpecs.forEach((item) => controls.appendChild(control(spec, item)));

  const status = el("div", "status");
  status.setAttribute("role", "status");
  let draw = null;
  if (hasPanel) {
    const actions = el("div", "actions");
    draw = el("button", null, spec.drawLabel || "Redraw");
    actions.appendChild(draw);
    controls.appendChild(actions);
  }

  const sliders = {};
  const sliderLabels = {};
  const scrub = el("div", "scrub");
  sliderSpecs.forEach((s) => {
    const row = el("div", "scrub-row");
    const input = el("input");
    input.type = "range";
    input.setAttribute("aria-label", s.aria || s.label);
    const value = el("span", "scrub-value", "0.00");
    row.appendChild(el("span", "scrub-name", `${s.label} =`));
    row.appendChild(input);
    row.appendChild(value);
    scrub.appendChild(row);
    sliders[s.name] = input;
    sliderLabels[s.name] = value;
  });
  const readout = el("div", "readout");
  scrub.appendChild(readout);
  figure.appendChild(scrub);
  if (hasPanel) figure.appendChild(controls);
  figure.appendChild(status);

  root.appendChild(figure);

  // The written material: an optional heading and body per section, with
  // LaTeX in \( \) typeset once when the viewer is mounted.
  (spec.sections || []).forEach((section) => {
    const block = el("div", "prose");
    if (section.heading) block.appendChild(el("h2", null, section.heading));
    const text = el("div");
    text.innerHTML = section.body;
    block.appendChild(text);
    root.appendChild(block);
  });

  if (spec.note) {
    const note = el("p", "note");
    note.innerHTML = spec.note;
    root.appendChild(note);
  }
  host.appendChild(root);

  if (window.MathJax && window.MathJax.startup) {
    window.MathJax.startup.promise.then(() => window.MathJax.typesetPromise([root])).catch(() => {});
  }

  const inputs = () => Array.from(controls.querySelectorAll("[data-name]"));

  function readValues() {
    const values = {};
    inputs().forEach((node) => {
      values[node.dataset.name] = node.type === "checkbox" ? node.checked : node.value;
    });
    return values;
  }

  function sliderValues() {
    const at = {};
    Object.keys(sliders).forEach((k) => {
      at[k] = Number(sliders[k].value);
    });
    return at;
  }

  function applyPreset(key) {
    const preset = spec.presets && spec.presets[key];
    if (!preset) return;
    inputs().forEach((node) => {
      const v = preset.values[node.dataset.name];
      if (v === undefined) return;
      if (node.type === "checkbox") node.checked = !!v;
      else node.value = v;
    });
  }

  let state = null;
  let drawn = false;
  let labelIndex = null;

  // Plotly re-reads layout.scene.camera whenever it redraws the scene, and a
  // redraw can be triggered by a restyle, a resize or a react. Rather than
  // guess which of those fires, keep the layout's camera equal to wherever the
  // user last dragged it: then every redraw restores the view they chose.
  let camera = null;
  let watching = false;

  function watchCamera() {
    if (watching || typeof plot.on !== "function") return;
    watching = true;
    plot.on("plotly_relayout", (e) => {
      const moved = e["scene.camera"] || (e.scene && e.scene.camera);
      if (!moved) return;
      camera = moved;
      if (plot.layout && plot.layout.scene) plot.layout.scene.camera = moved;
    });
  }

  function refresh() {
    if (!state) return;
    const at = sliderValues();
    const out = spec.update(state, at);
    Object.keys(sliders).forEach((k) => {
      const label = out.labels && out.labels[k];
      sliderLabels[k].textContent = label !== undefined ? label : at[k].toFixed(2);
    });
    const updates = (out.restyle || []).slice();
    if (out.annotations && labelIndex !== null) {
      const marks = out.annotations;
      const data = {
        x: [marks.map((m) => m.x)],
        y: [marks.map((m) => m.y)],
        text: [marks.map((m) => m.text)],
        "textfont.color": [marks.map((m) => m.colour)]
      };
      if (spec.dim !== 2) data.z = [marks.map((m) => m.z)];
      updates.push({ trace: labelIndex, data });
    }
    applyRestyles(plot, updates);
    readout.innerHTML = out.readout || "";
    if (out.formula) typeset(out.formula);
  }

  function rebuild() {
    status.textContent = "";
    try {
      const out = spec.build(readValues());
      labelIndex = out.traces.length;
      if (camera && out.layout.scene) out.layout.scene.camera = camera;
      if (spec.dim === 2) delete out.layout.scene;
      Plotly.react(plot, out.traces.concat([labelTrace(spec.dim === 2)]), out.layout, CONFIG);
      watchCamera();
      Object.keys(sliders).forEach((k) => {
        const range = (out.sliders && out.sliders[k]) || { min: -5, max: 5, step: 0.05 };
        const input = sliders[k];
        const current = Number(input.value);
        const keep = drawn && isFinite(current) && current >= range.min && current <= range.max;
        input.min = range.min;
        input.max = range.max;
        input.step = range.step;
        if (!keep) input.value = range.value !== undefined ? range.value : range.min;
      });
      state = out.state;
      drawn = true;
      if (out.formula) typeset(out.formula);
      refresh();
    } catch (e) {
      status.textContent = e.message;
    }
  }

  // A slider fires faster than the screen refreshes; coalesce to one redraw
  // per frame so dragging can't queue up work the scene has to catch up on.
  let frame = null;
  function requestRefresh() {
    if (frame !== null) return;
    frame = requestAnimationFrame(() => {
      frame = null;
      refresh();
    });
  }

  Object.keys(sliders).forEach((k) => sliders[k].addEventListener("input", requestRefresh));
  if (draw) draw.addEventListener("click", rebuild);
  if (presetSelect) {
    presetSelect.addEventListener("change", () => {
      applyPreset(presetSelect.value);
      drawn = false; // a new example starts at the beginning of its range
      rebuild();
    });
  }
  inputs().forEach((node) => {
    if (node.type === "checkbox" || node.tagName === "SELECT") node.addEventListener("change", rebuild);
    else
      node.addEventListener("keydown", (e) => {
        if (e.key === "Enter") rebuild();
      });
  });

  if (presetSelect) applyPreset(presetSelect.value);

  return {
    element: root,
    show() {
      if (!drawn) rebuild();
      else Plotly.Plots.resize(plot);
    }
  };
}
