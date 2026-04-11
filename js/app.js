// ════════════════════════════════════════════════════════════════════
//  STATE & UTILS
// ════════════════════════════════════════════════════════════════════
let state = [];

const defaultNodeColors = {
  t1: { bg: "#334155", bd: "#1e293b", c: "#ffffff" },
  t2: { bg: "#6366f1", bd: "#4338ca", c: "#ffffff" },
  p: { bg: "#f0f9ff", bd: "#0284c7", c: "#0f172a" },
  s: { bg: "#fffbeb", bd: "#f59e0b", c: "#0f172a" },
  t: { bg: "#fef2f2", bd: "#ef4444", c: "#0f172a" },
  q: { bg: "#f3e8ff", bd: "#a855f7", c: "#0f172a" },
  qi: { bg: "#ecfdf5", bd: "#10b981", c: "#0f172a" },
  root: { bg: "#ffffff", bd: "#333333", c: "#000000" },
};

// FITUR SUB TAB (Bagan Alir Multi Versi beserta legend, filter, dan settings ekslusif)
let flowcharts = [
  {
    name: "Bagan Alir 1",
    positions: {},
    conns: {},
    customLegends: [],
    filters: { tahap: null, kegiatan: null, labels: null, opacity: 0.08 },
    settings: {
      bgColor: "#ffffff",
      bgPattern: "plain",
      fontFamily: "Arial, sans-serif",
      labelOrient: "horizontal",
      labelDist: 28,
      nodeColors: JSON.parse(JSON.stringify(defaultNodeColors)),
      traceColors: [],
    },
    zoom: 1,
    scrollX: 0,
    scrollY: 0,
  },
];
let currentFlowchartIndex = 0;
let nodePositions = flowcharts[0].positions;
let connData = flowcharts[0].conns;

// Variabel aktif untuk settings, trace, dsb
let nodeColors = JSON.parse(JSON.stringify(defaultNodeColors));
let traceColors = [];
let selectedOrder = [];

// GLOBAL FILTER STATES (Supaya Canvas & Summary Ekslusif)
let currentMainTab = "canvas";
let summaryFilters = { tahap: null, kegiatan: null, labels: null };

function getCanvasFilters() {
  if (!flowcharts[currentFlowchartIndex].filters) {
    flowcharts[currentFlowchartIndex].filters = {
      tahap: null,
      kegiatan: null,
      labels: null,
      opacity: 0.08,
    };
  }
  return flowcharts[currentFlowchartIndex].filters;
}

function getCurrentTabFilters() {
  if (currentMainTab === "summary") {
    return summaryFilters;
  }
  return getCanvasFilters();
}

function getCustomLegends() {
  if (!flowcharts[currentFlowchartIndex].customLegends) {
    flowcharts[currentFlowchartIndex].customLegends = [];
  }
  return flowcharts[currentFlowchartIndex].customLegends;
}

let currentZoom = 1;

Chart.Tooltip.positioners.sideEdge = function (elements, eventPosition) {
  if (!elements.length) return false;
  const chart = this.chart;
  const el = elements[0].element;
  const barWidth = el.width || 30;

  if (barWidth > chart.width * 0.4) {
    return {
      x: eventPosition.x,
      y: eventPosition.y,
    };
  }

  const isLeftHalf = el.x < chart.width / 2;
  return {
    x: isLeftHalf ? el.x + barWidth / 2 : el.x - barWidth / 2,
    y: eventPosition.y,
  };
};
Chart.Tooltip.positioners.cursor = function (elements, eventPosition) {
  if (!elements.length || !eventPosition) return false;
  return {
    x: eventPosition.x,
    y: eventPosition.y,
  };
};
function escapeHtml(text) {
  if (text === null || text === undefined) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function toggleSidebar() {
  document.querySelector(".sidebar").classList.toggle("minimized");
  setTimeout(rebuildAllPaths, 300);
}

function switchTab(tabName) {
  currentMainTab = tabName;
  document
    .querySelectorAll(".tab-panel")
    .forEach((p) => p.classList.remove("active"));
  document
    .querySelectorAll(".tab-btn")
    .forEach((b) => b.classList.remove("active"));
  document.getElementById("tab-" + tabName).classList.add("active");
  document.getElementById("tab-btn-" + tabName).classList.add("active");
  if (tabName === "summary") renderSummary();
}

// Fungsi untuk toggle Settings Widget Kanvas
function toggleCanvasSettingsWidget() {
  const w = document.getElementById("canvas-settings-widget");
  const f = document.getElementById("canvas-filter-widget");
  if (!w) return;
  if (w.style.display === "none" || w.style.display === "") {
    w.style.display = "block";
    if (f) f.style.display = "none";
  } else {
    w.style.display = "none";
  }
}

function toggleCanvasFilterWidget() {
  const w = document.getElementById("canvas-filter-widget");
  const s = document.getElementById("canvas-settings-widget");
  if (!w) return;
  if (w.style.display === "none" || w.style.display === "") {
    w.style.display = "block";
    renderCanvasSlicerUI();
    if (s) s.style.display = "none";
  } else {
    w.style.display = "none";
  }
}

// MULTI-VERSION CANVAS FUNCTIONS
function renderSubTabs() {
  const container = document.getElementById("sub-tab-bar-container");
  if (!container) return;
  let html = "";
  flowcharts.forEach((fc, idx) => {
    html += `<button class="sub-tab-btn ${idx === currentFlowchartIndex ? "active" : ""}" onclick="switchSubTab(${idx})">${escapeHtml(fc.name)}</button>`;
  });
  html += `<button class="btn-add-sub-tab" onclick="addSubTab()" title="Tambah Versi Bagan">+</button>`;
  container.innerHTML = html;
}

function switchSubTab(idx) {
  // Simpan state saat ini sebelum pindah
  flowcharts[currentFlowchartIndex].positions = nodePositions;
  flowcharts[currentFlowchartIndex].conns = connData;
  flowcharts[currentFlowchartIndex].zoom = currentZoom;
  flowcharts[currentFlowchartIndex].scrollX = wrap.scrollLeft;
  flowcharts[currentFlowchartIndex].scrollY = wrap.scrollTop;
  flowcharts[currentFlowchartIndex].settings = {
    bgColor: document.getElementById("conf-bg").value,
    bgPattern: document.getElementById("conf-pat").value,
    fontFamily: document.getElementById("conf-font").value,
    labelOrient: document.getElementById("conf-label-orient").value,
    labelDist: document.getElementById("conf-label-dist").value,
    nodeColors: JSON.parse(JSON.stringify(nodeColors)),
    traceColors: [...traceColors],
  };

  // Pindah ke index baru
  currentFlowchartIndex = idx;
  nodePositions = flowcharts[currentFlowchartIndex].positions;
  connData = flowcharts[currentFlowchartIndex].conns;
  currentZoom =
    flowcharts[currentFlowchartIndex].zoom !== undefined
      ? flowcharts[currentFlowchartIndex].zoom
      : 1;

  // Restore pengaturan kanvas
  const curSet = flowcharts[currentFlowchartIndex].settings;
  if (curSet) {
    document.getElementById("conf-bg").value = curSet.bgColor || "#ffffff";
    document.getElementById("conf-pat").value = curSet.bgPattern || "plain";
    document.getElementById("conf-font").value =
      curSet.fontFamily || "Arial, sans-serif";
    document.getElementById("conf-label-orient").value =
      curSet.labelOrient || "horizontal";
    const distEl = document.getElementById("conf-label-dist");
    const distVal = document.getElementById("label-dist-val");
    if (distEl)
      distEl.value = curSet.labelDist !== undefined ? curSet.labelDist : 28;
    if (distVal)
      distVal.innerText =
        curSet.labelDist !== undefined ? curSet.labelDist : 28;

    nodeColors = curSet.nodeColors
      ? JSON.parse(JSON.stringify(curSet.nodeColors))
      : JSON.parse(JSON.stringify(defaultNodeColors));
    traceColors = curSet.traceColors ? [...curSet.traceColors] : [];

    inner.style.backgroundColor = document.getElementById("conf-bg").value;
    wrap.style.fontFamily = document.getElementById("conf-font").value;
    setPattern(document.getElementById("conf-pat").value);
    applyNodeColors();
    loadNodeColorPickers();
  }

  renderSubTabs();
  renderCustomLegendsUI();
  renderCanvasLegends();
  renderCanvas();
  applyZoom();

  // Restore scroll after layout stabilizes
  setTimeout(() => {
    wrap.scrollLeft = flowcharts[currentFlowchartIndex].scrollX || 0;
    wrap.scrollTop = flowcharts[currentFlowchartIndex].scrollY || 0;
  }, 100);

  if (
    document.getElementById("canvas-filter-widget") &&
    document.getElementById("canvas-filter-widget").style.display === "block"
  ) {
    renderCanvasSlicerUI();
  }
}

function addSubTab() {
  const newIdx = flowcharts.length;

  // Deep clone dari layout yang sedang aktif
  const clonedPositions = JSON.parse(JSON.stringify(nodePositions));
  const clonedConns = JSON.parse(JSON.stringify(connData));
  const clonedLegends = JSON.parse(JSON.stringify(getCustomLegends()));
  const clonedFilters = JSON.parse(JSON.stringify(getCanvasFilters()));
  const clonedSettings = {
    bgColor: document.getElementById("conf-bg").value,
    bgPattern: document.getElementById("conf-pat").value,
    fontFamily: document.getElementById("conf-font").value,
    labelOrient: document.getElementById("conf-label-orient").value,
    labelDist: document.getElementById("conf-label-dist").value,
    nodeColors: JSON.parse(JSON.stringify(nodeColors)),
    traceColors: [...traceColors],
  };

  flowcharts.push({
    name: "Bagan Alir " + (newIdx + 1),
    positions: clonedPositions,
    conns: clonedConns,
    customLegends: clonedLegends,
    filters: clonedFilters,
    settings: clonedSettings,
    zoom: currentZoom,
    scrollX: wrap.scrollLeft,
    scrollY: wrap.scrollTop,
  });

  switchSubTab(newIdx);
}

function addCustomLegend() {
  const input = document.getElementById("custom-legend-input");
  const val = input.value.trim();
  if (val) {
    getCustomLegends().push(val);
    input.value = "";
    renderCustomLegendsUI();
    renderCanvasLegends();
  }
}
function removeCustomLegend(idx) {
  getCustomLegends().splice(idx, 1);
  renderCustomLegendsUI();
  renderCanvasLegends();
}
function renderCustomLegendsUI() {
  const list = document.getElementById("custom-legend-list");
  if (list)
    list.innerHTML = getCustomLegends()
      .map(
        (leg, i) => `
                <div style="display:flex;justify-content:space-between;align-items:center;background:#f8fafc;border:1px solid #e2e8f0;padding:6px 10px;border-radius:4px;font-size:0.8em;color:#475569;">
                  <span>${escapeHtml(leg)}</span>
                  <button onclick="removeCustomLegend(${i})" style="background:#ef4444;color:white;border:none;border-radius:4px;padding:2px 6px;cursor:pointer;font-size:10px;width:auto;height:auto;">✖</button>
                </div>`,
      )
      .join("");
}
function renderCanvasLegends() {
  const container = document.getElementById("custom-legends-container");
  if (container)
    container.innerHTML = getCustomLegends()
      .map((leg) => `<span style="margin-left:2px">${escapeHtml(leg)}</span>`)
      .join("");
}

function countTotalKegiatan() {
  let n = 0;
  state.forEach((t1) => {
    n += t1.t2.length;
  });
  return Math.max(n, 1);
}

function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x) =>
    Math.round(x * 255)
      .toString(16)
      .padStart(2, "0");
  return "#" + toHex(f(0)) + toHex(f(8)) + toHex(f(4));
}

function generateDistinctColors(n) {
  if (n === 0) return [];
  const lightTiers = [42, 65, 54];
  const satTiers = [90, 78, 84];
  const bits = Math.ceil(Math.log2(Math.max(n, 2)));
  const total = Math.pow(2, bits);
  function bitRev(i) {
    let r = 0;
    for (let b = 0; b < bits; b++) {
      if (i & (1 << b)) r |= 1 << (bits - 1 - b);
    }
    return r;
  }
  return Array.from({ length: n }, (_, i) => {
    const h = (bitRev(i) / total) * 360;
    return hslToHex(Math.round(h), satTiers[i % 3], lightTiers[i % 3]);
  });
}

function syncTraceColors() {
  const n = countTotalKegiatan();
  const prev = traceColors.slice();
  if (prev.length !== n) {
    traceColors = generateDistinctColors(n);
    for (let i = 0; i < Math.min(prev.length, n); i++) traceColors[i] = prev[i];
  }
}

const getColor = (i) => traceColors[i % traceColors.length];

function renderTraceColorGrid() {
  const grid = document.getElementById("trace-color-grid");
  if (!grid) return;
  grid.innerHTML = "";
  if (traceColors.length === 0) {
    grid.innerHTML = `<p style="font-size:0.78em;color:#94a3b8;grid-column:1/-1;text-align:center;margin:4px 0">Tekan Generate Bagan untuk memuat warna.</p>`;
    return;
  }
  traceColors.forEach((col, i) => {
    const item = document.createElement("div");
    item.className = "trace-color-item";
    item.innerHTML = `<input type="color" value="${col}" title="Kegiatan ${i + 1}" onchange="updateTraceColor(${i}, this.value)" /><label>Kegiatan ${i + 1}</label>`;
    grid.appendChild(item);
  });
}

function updateTraceColor(idx, newColor) {
  const oldColor = traceColors[idx];
  traceColors[idx] = newColor;
  Object.keys(connectors).forEach((key) => {
    const c = connectors[key];
    if (c.color === oldColor) {
      c.color = newColor;
      c.pathEl.setAttribute("stroke", newColor);
      c.pathEl.setAttribute("marker-end", `url(#${ensureMarker(newColor)})`);
    }
  });
  rebuildAllPaths();
}

function resetTraceColors() {
  traceColors = [];
  renderCanvas();
}

function toggleAccordion(headerEl) {
  headerEl.classList.toggle("collapsed");
  headerEl.nextElementSibling.classList.toggle("collapsed");
}

const wrap = document.getElementById("canvas-wrap");
const inner = document.getElementById("canvas-inner");
const svgEl = document.getElementById("svg-layer");
const hint = document.getElementById("hint");
const bgIn = document.getElementById("conf-bg");
const patIn = document.getElementById("conf-pat");
const fontIn = document.getElementById("conf-font");
const zoomValEl = document.getElementById("zoom-val");

function applyZoom() {
  inner.style.transform = `scale(${currentZoom})`;
  zoomValEl.innerText = Math.round(currentZoom * 100) + "%";
}
function changeZoom(delta) {
  currentZoom = Math.min(3, Math.max(0.2, currentZoom + delta));
  applyZoom();
}
function resetZoom() {
  currentZoom = 1;
  applyZoom();
}

const nodeResizeObserver = window.ResizeObserver
  ? new ResizeObserver((entries) => {
      let changed = false;
      for (let entry of entries) {
        const el = entry.target;
        if (nodePositions[el.id]) {
          nodePositions[el.id].w = el.offsetWidth;
          nodePositions[el.id].h = el.offsetHeight;
          changed = true;
        }
      }
      if (changed) refreshAllConns();
    })
  : { observe: () => {}, unobserve: () => {} };

fontIn.addEventListener(
  "change",
  (e) => (wrap.style.fontFamily = e.target.value),
);
bgIn.addEventListener(
  "input",
  (e) => (inner.style.backgroundColor = e.target.value),
);
patIn.addEventListener("change", (e) => setPattern(e.target.value));

function setPattern(p) {
  inner.classList.remove("bg-box", "bg-dot");
  if (p === "box") inner.classList.add("bg-box");
  else if (p === "dot") inner.classList.add("bg-dot");
}

const labelOrientEl = document.getElementById("conf-label-orient");
function getLabelOrient() {
  return labelOrientEl ? labelOrientEl.value : "horizontal";
}
labelOrientEl.addEventListener("change", () => {
  Object.keys(connectors).forEach((key) => {
    const conn = connectors[key];
    if (conn.labelEl)
      applyLabelOrient(conn.labelEl, conn.pts, connData[key]?.labelOffset);
  });
});

const labelDistEl = document.getElementById("conf-label-dist");
const labelDistVal = document.getElementById("label-dist-val");
if (labelDistEl)
  labelDistEl.addEventListener("input", (e) => {
    if (labelDistVal) labelDistVal.innerText = e.target.value;
    Object.keys(connectors).forEach((key) => refreshConn(key));
  });

function resetLabelPositions() {
  const distEl = document.getElementById("conf-label-dist"),
    distVal = document.getElementById("label-dist-val");
  if (distEl) {
    distEl.value = 28;
    if (distVal) distVal.innerText = 28;
  }
  Object.keys(connectors).forEach((key) => {
    if (connData[key]) connData[key].labelOffset = { dx: 0, dy: 0 };
    refreshConn(key);
  });
}

function adjustLabelDist(delta) {
  const distEl = document.getElementById("conf-label-dist"),
    distVal = document.getElementById("label-dist-val");
  if (distEl) {
    let val = Math.max(0, Math.min(800, parseInt(distEl.value, 10) + delta));
    distEl.value = val;
    if (distVal) distVal.innerText = val;
    Object.keys(connectors).forEach((key) => refreshConn(key));
  }
}

function applyLabelOrient(el, pts, off) {
  const lpos = getMidLabelPos(pts),
    ox = lpos.x + (off ? off.dx : 0),
    oy = lpos.y + (off ? off.dy : 0);
  if (getLabelOrient() === "vertical") {
    el.setAttribute(
      "transform",
      `rotate(-90,${ox.toFixed(1)},${oy.toFixed(1)})`,
    );
  } else {
    el.removeAttribute("transform");
  }
}

function applyNodeColors() {
  const rs = document.documentElement.style;
  for (let key in nodeColors) {
    rs.setProperty(`--bg-${key}`, nodeColors[key].bg);
    rs.setProperty(`--bd-${key}`, nodeColors[key].bd);
    rs.setProperty(`--c-${key}`, nodeColors[key].c);
  }
}
function loadNodeColorPickers() {
  const sel = document.getElementById("sel-node-type");
  if (!sel) return;
  const type = sel.value;
  if (nodeColors && nodeColors[type]) {
    document.getElementById("col-bg").value = nodeColors[type].bg;
    document.getElementById("col-bd").value = nodeColors[type].bd;
    document.getElementById("col-c").value = nodeColors[type].c;
  }
}
function updateNodeColors() {
  const type = document.getElementById("sel-node-type").value;
  nodeColors[type].bg = document.getElementById("col-bg").value;
  nodeColors[type].bd = document.getElementById("col-bd").value;
  nodeColors[type].c = document.getElementById("col-c").value;
  applyNodeColors();
}

async function saveProject() {
  // Paksa simpan state settings sub-tab yang sedang aktif
  flowcharts[currentFlowchartIndex].positions = nodePositions;
  flowcharts[currentFlowchartIndex].conns = connData;
  flowcharts[currentFlowchartIndex].zoom = currentZoom;
  flowcharts[currentFlowchartIndex].scrollX = wrap.scrollLeft;
  flowcharts[currentFlowchartIndex].scrollY = wrap.scrollTop;
  flowcharts[currentFlowchartIndex].settings = {
    bgColor: bgIn.value,
    bgPattern: patIn.value,
    fontFamily: fontIn.value,
    labelOrient: getLabelOrient(),
    labelDist: document.getElementById("conf-label-dist").value,
    nodeColors: JSON.parse(JSON.stringify(nodeColors)),
    traceColors: [...traceColors],
  };

  const d = {
    title: document.getElementById("project_title").value,
    settings: {
      summaryFilters: summaryFilters,
    },
    data: state,
    flowcharts: flowcharts,
    currentFlowchartIndex: currentFlowchartIndex,
  };

  const jsonString = JSON.stringify(d, null, 2);
  const defaultFileName =
    (d.title.replace(/[^a-z0-9]/gi, "_").toLowerCase() || "amdal") +
    "_" +
    Date.now() +
    ".json";

  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: defaultFileName,
        types: [
          {
            description: "JSON File",
            accept: { "application/json": [".json"] },
          },
        ],
      });
      const writable = await handle.createWritable();
      await writable.write(jsonString);
      await writable.close();
      return;
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Gagal menggunakan showSaveFilePicker:", err);
        fallbackSaveProject(jsonString, defaultFileName);
      }
      return;
    }
  }
  fallbackSaveProject(jsonString, defaultFileName);
}

function fallbackSaveProject(jsonString, fileName) {
  const a = document.createElement("a");
  a.href = "data:text/json;charset=utf-8," + encodeURIComponent(jsonString);
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function loadProject(inp) {
  const f = inp.files[0];
  if (!f) return;
  const r = new FileReader();
  r.onload = (e) => {
    try {
      const d = JSON.parse(e.target.result);
      if (d.title) document.getElementById("project_title").value = d.title;

      if (d.settings && d.settings.summaryFilters) {
        summaryFilters = d.settings.summaryFilters;
      } else {
        summaryFilters = { tahap: null, kegiatan: null, labels: null };
      }

      if (d.data) {
        state = d.data;

        if (d.flowcharts) {
          flowcharts = d.flowcharts;
          currentFlowchartIndex = d.currentFlowchartIndex || 0;

          // Backward compatibility
          flowcharts.forEach((fc) => {
            if (!fc.customLegends)
              fc.customLegends = d.settings?.customLegends
                ? [...d.settings.customLegends]
                : [];
            if (!fc.filters)
              fc.filters = {
                tahap: null,
                kegiatan: null,
                labels: null,
                opacity:
                  d.settings?.filterOpacity !== undefined
                    ? parseFloat(d.settings.filterOpacity)
                    : 0.08,
              };
            if (fc.zoom === undefined) fc.zoom = 1;
            if (fc.scrollX === undefined) fc.scrollX = 0;
            if (fc.scrollY === undefined) fc.scrollY = 0;

            if (!fc.settings) {
              fc.settings = {
                bgColor: d.settings?.bgColor || "#ffffff",
                bgPattern: d.settings?.bgPattern || "plain",
                fontFamily: d.settings?.fontFamily || "Arial, sans-serif",
                labelOrient: d.settings?.labelOrient || "horizontal",
                labelDist:
                  d.settings?.labelDist !== undefined
                    ? d.settings.labelDist
                    : 28,
                nodeColors: d.settings?.nodeColors
                  ? JSON.parse(JSON.stringify(d.settings.nodeColors))
                  : JSON.parse(JSON.stringify(defaultNodeColors)),
                traceColors: d.settings?.traceColors
                  ? [...d.settings.traceColors]
                  : [],
              };
            }
          });
        } else {
          // Backward compatibility untuk file lama tanpa array flowcharts
          flowcharts = [
            {
              name: "Bagan Alir 1",
              positions: d.positions || {},
              conns: d.conns || {},
              customLegends: d.settings?.customLegends || [],
              filters: {
                tahap: null,
                kegiatan: null,
                labels: null,
                opacity:
                  d.settings?.filterOpacity !== undefined
                    ? parseFloat(d.settings.filterOpacity)
                    : 0.08,
              },
              settings: {
                bgColor: d.settings?.bgColor || "#ffffff",
                bgPattern: d.settings?.bgPattern || "plain",
                fontFamily: d.settings?.fontFamily || "Arial, sans-serif",
                labelOrient: d.settings?.labelOrient || "horizontal",
                labelDist:
                  d.settings?.labelDist !== undefined
                    ? d.settings.labelDist
                    : 28,
                nodeColors: d.settings?.nodeColors
                  ? JSON.parse(JSON.stringify(d.settings.nodeColors))
                  : JSON.parse(JSON.stringify(defaultNodeColors)),
                traceColors: d.settings?.traceColors
                  ? [...d.settings.traceColors]
                  : [],
              },
              zoom: 1,
              scrollX: 0,
              scrollY: 0,
            },
          ];
          currentFlowchartIndex = 0;
        }

        nodePositions = flowcharts[currentFlowchartIndex].positions;
        connData = flowcharts[currentFlowchartIndex].conns;
        currentZoom = flowcharts[currentFlowchartIndex].zoom;

        // Restore pengaturan kanvas untuk tab aktif
        let currentSet = flowcharts[currentFlowchartIndex].settings;
        if (currentSet) {
          bgIn.value = currentSet.bgColor;
          patIn.value = currentSet.bgPattern;
          fontIn.value = currentSet.fontFamily;
          labelOrientEl.value = currentSet.labelOrient;
          const distEl = document.getElementById("conf-label-dist");
          if (distEl) distEl.value = currentSet.labelDist;
          const distVal = document.getElementById("label-dist-val");
          if (distVal) distVal.innerText = currentSet.labelDist;
          nodeColors = JSON.parse(JSON.stringify(currentSet.nodeColors));
          traceColors = [...currentSet.traceColors];

          inner.style.backgroundColor = currentSet.bgColor;
          wrap.style.fontFamily = currentSet.fontFamily;
          setPattern(currentSet.bgPattern);
          applyNodeColors();
          loadNodeColorPickers();
        }

        renderCustomLegendsUI();
        renderCanvasLegends();
        renderInputs();
        renderSubTabs();
        renderCanvas();
        applyZoom();

        setTimeout(() => {
          wrap.scrollLeft = flowcharts[currentFlowchartIndex].scrollX || 0;
          wrap.scrollTop = flowcharts[currentFlowchartIndex].scrollY || 0;
        }, 150);

        alert("Project berhasil dimuat!");
      }
    } catch (err) {
      alert("Gagal membaca file.");
      console.error(err);
    }
    inp.value = "";
  };
  r.readAsText(f);
}

function resetProject() {
  if (!confirm("Hapus semua data dan warna akan kembali default?")) return;
  state = [];

  flowcharts = [
    {
      name: "Bagan Alir 1",
      positions: {},
      conns: {},
      customLegends: [],
      filters: {
        tahap: null,
        kegiatan: null,
        labels: null,
        opacity: 0.08,
      },
      settings: {
        bgColor: "#ffffff",
        bgPattern: "plain",
        fontFamily: "Arial, sans-serif",
        labelOrient: "horizontal",
        labelDist: 28,
        nodeColors: JSON.parse(JSON.stringify(defaultNodeColors)),
        traceColors: [],
      },
      zoom: 1,
      scrollX: 0,
      scrollY: 0,
    },
  ];
  currentFlowchartIndex = 0;
  nodePositions = flowcharts[0].positions;
  connData = flowcharts[0].conns;
  summaryFilters = { tahap: null, kegiatan: null, labels: null };

  selectedOrder = [];
  document.getElementById("project_title").value = "Proyek Baru";
  nodeColors = JSON.parse(JSON.stringify(defaultNodeColors));
  traceColors = [];

  resetZoom();
  setTimeout(() => {
    wrap.scrollLeft = 0;
    wrap.scrollTop = 0;
  }, 100);

  bgIn.value = "#ffffff";
  patIn.value = "plain";
  fontIn.value = "Arial, sans-serif";
  inner.style.backgroundColor = "#ffffff";
  wrap.style.fontFamily = "Arial, sans-serif";
  setPattern("plain");

  applyNodeColors();
  loadNodeColorPickers();
  renderTraceColorGrid();
  renderInputs();
  renderCustomLegendsUI();
  renderCanvasLegends();
  renderSubTabs();
  renderCanvas();
}

window.exportChartJS = function (canvasId, fileName) {
  const chart = Chart.getChart(canvasId);
  if (!chart) return;

  const btn = event ? event.target : null;
  const oldText = btn ? btn.innerText : "";
  if (btn) {
    btn.innerText = "⏳ Memproses...";
    btn.disabled = true;
  }

  const originalRatio =
    chart.options.devicePixelRatio || window.devicePixelRatio;
  const originalAnimation = chart.options.animation;

  chart.options.devicePixelRatio = 3;
  chart.options.animation = false;
  chart.update();

  setTimeout(() => {
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = chart.canvas.width;
    tempCanvas.height = chart.canvas.height;
    const ctx = tempCanvas.getContext("2d");

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    ctx.drawImage(chart.canvas, 0, 0);

    const link = document.createElement("a");
    link.download = fileName + "_HD.png";
    link.href = tempCanvas.toDataURL("image/png", 1.0);
    link.click();

    chart.options.devicePixelRatio = originalRatio;
    chart.options.animation = originalAnimation;
    chart.update();

    if (btn) {
      btn.innerText = oldText;
      btn.disabled = false;
    }
  }, 150);
};

function exportPNG() {
  deselectAll();
  const oldZoom = currentZoom;
  currentZoom = 1;
  applyZoom();
  let minX = Infinity,
    maxX = 0,
    maxY = 0;
  document.querySelectorAll(".node").forEach((n) => {
    if (n.style.pointerEvents === "none") return;
    const x = parseFloat(n.style.left) || 0,
      y = parseFloat(n.style.top) || 0;
    const right = x + n.offsetWidth,
      bottom = y + n.offsetHeight;
    if (x < minX) minX = x;
    if (right > maxX) maxX = right;
    if (bottom > maxY) maxY = bottom;
  });
  if (minX === Infinity) {
    minX = 0;
    maxX = 800;
    maxY = 600;
  }

  const legendEl = document.querySelector(".canvas-legend");
  const originalLegendCSS = legendEl.style.cssText;
  const legendParent = legendEl.parentNode;

  wrap.appendChild(legendEl);

  legendEl.style.cssText =
    originalLegendCSS +
    "; position:absolute !important; display:flex !important; flex-wrap:nowrap !important; white-space:nowrap !important; width:max-content !important; visibility:hidden !important;";
  const idealLegendWidth = legendEl.offsetWidth;

  const chartWidth = Math.max(800, maxX + 100, idealLegendWidth + 60);

  const chartCenter = chartWidth / 2;
  let legendStyle =
    chartWidth >= idealLegendWidth
      ? "; position:absolute !important; display:flex !important; flex-wrap:nowrap !important; white-space:nowrap !important; width:max-content !important; align-items:center !important; justify-content:center !important; padding:10px 20px !important;"
      : `; position:absolute !important; display:flex !important; flex-wrap:wrap !important; white-space:normal !important; width:${chartWidth - 40}px !important; align-items:center !important; justify-content:center !important; padding:10px 20px !important; text-align:center !important;`;
  legendEl.style.cssText = originalLegendCSS + legendStyle;
  const legendHeight = legendEl.offsetHeight;
  const finalHeight = maxY + 50 + legendHeight + 50;
  legendEl.style.top = maxY + 50 + "px";
  legendEl.style.left = chartCenter + "px";
  legendEl.style.transform = "translateX(-50%)";
  const originalStyle = wrap.getAttribute("style") || "";
  const osl = wrap.scrollLeft,
    ost = wrap.scrollTop;
  wrap.style.cssText = `position:absolute;top:0;left:0;width:${chartWidth}px;height:${finalHeight}px;overflow:visible;z-index:9999`;
  const safeTitle =
    document
      .getElementById("project_title")
      .value.replace(/[^a-zA-Z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "_") || "Bagan_AMDAL";

  const btnPng = document.querySelector(".btn-export-float");
  const oldText = btnPng.innerText;
  btnPng.innerText = "Memproses...";
  btnPng.disabled = true;

  html2canvas(wrap, {
    scale: 3,
    backgroundColor: bgIn.value,
    width: chartWidth,
    height: finalHeight,
    windowWidth: chartWidth,
    windowHeight: finalHeight,
    scrollX: 0,
    scrollY: 0,
    useCORS: true,
    logging: false,
    ignoreElements: (el) => {
      if (!el || !el.classList) return el && el.id === "hint";
      return (
        el.classList.contains("zoom-controls") ||
        el.classList.contains("btn-export-float") ||
        el.classList.contains("btn-filter-float") ||
        el.classList.contains("btn-settings-float") ||
        el.classList.contains("sub-tab-bar") ||
        el.id === "hint" ||
        el.id === "canvas-filter-widget" ||
        el.id === "canvas-settings-widget" ||
        el.classList.contains("tab-bar")
      );
    },
  })
    .then((canvas) => {
      wrap.setAttribute("style", originalStyle);
      wrap.scrollLeft = osl;
      wrap.scrollTop = ost;
      legendEl.style.cssText = originalLegendCSS;
      legendParent.appendChild(legendEl);
      btnPng.innerText = oldText;
      btnPng.disabled = false;
      currentZoom = oldZoom;
      applyZoom();
      const link = document.createElement("a");
      link.download = safeTitle + "_HD.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    })
    .catch((err) => {
      console.error(err);
      alert("Gagal export PNG.");
      wrap.setAttribute("style", originalStyle);
      legendEl.style.cssText = originalLegendCSS;
      legendParent.appendChild(legendEl);
      btnPng.innerText = oldText;
      btnPng.disabled = false;
      currentZoom = oldZoom;
      applyZoom();
    });
}

function importExcel(inp) {
  const f = inp.files[0];
  if (!f) return;
  if (
    !confirm(
      "Peringatan: Import data excel akan MENIMPA semua data saat ini. Lanjutkan?",
    )
  ) {
    inp.value = "";
    return;
  }
  const r = new FileReader();
  r.onload = (e) => {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const rows = XLSX.utils.sheet_to_json(
        workbook.Sheets[workbook.SheetNames[0]],
      );
      if (rows.length === 0) {
        alert("File Excel kosong.");
        return;
      }
      let newState = [],
        t1Map = {},
        t2Map = {};
      rows.forEach((row, idx) => {
        const tn = row["Tahap"]
          ? String(row["Tahap"]).trim()
          : `Tahap Kosong (${idx + 1})`;
        const kn = row["Kegiatan"]
          ? String(row["Kegiatan"]).trim()
          : `Kegiatan Kosong (${idx + 1})`;
        if (!t1Map[tn]) {
          const newT1 = {
            id: Date.now() + Math.random(),
            text: tn,
            t2: [],
          };
          newState.push(newT1);
          t1Map[tn] = newT1;
          t2Map[tn] = {};
        }
        if (!t2Map[tn][kn]) {
          const newT2 = {
            id: Date.now() + Math.random(),
            text: kn,
            taps: [],
            impacts: [],
          };
          t1Map[tn].t2.push(newT2);
          t2Map[tn][kn] = newT2;
        }
        t2Map[tn][kn].impacts.push({
          id: Date.now() + Math.random(),
          p: row["Primer"] || "",
          l_p: row["Label_P"] || "",
          s: row["Sekunder"] || "",
          l_s: row["Label_S"] || "",
          t: row["Tersier"] || "",
          l_t: row["Label_T"] || "",
          q: row["Kuartier"] || "",
          l_q: row["Label_Q"] || "",
          qi: row["Kuintier"] || "",
          l_qi: row["Label_Qi"] || "",
        });
      });
      state = newState;

      // Reset Layout for Import
      flowcharts = [
        {
          name: "Bagan Alir 1",
          positions: {},
          conns: {},
          customLegends: [],
          filters: {
            tahap: null,
            kegiatan: null,
            labels: null,
            opacity: 0.08,
          },
          settings: {
            bgColor: "#ffffff",
            bgPattern: "plain",
            fontFamily: "Arial, sans-serif",
            labelOrient: "horizontal",
            labelDist: 28,
            nodeColors: JSON.parse(JSON.stringify(defaultNodeColors)),
            traceColors: [],
          },
          zoom: 1,
          scrollX: 0,
          scrollY: 0,
        },
      ];
      currentFlowchartIndex = 0;
      nodePositions = flowcharts[0].positions;
      connData = flowcharts[0].conns;
      summaryFilters = { tahap: null, kegiatan: null, labels: null };

      renderCustomLegendsUI();
      renderCanvasLegends();
      renderInputs();
      renderSubTabs();
      renderCanvas();
      alert("Data berhasil diimport!");
    } catch (err) {
      console.error(err);
      alert("Gagal membaca Excel.");
    }
    inp.value = "";
  };
  r.readAsArrayBuffer(f);
}

function addT1() {
  state.push({ id: Date.now(), text: "Tahap Baru", t2: [] });
  renderInputs();
}
function addT2(i) {
  state[i].t2.push({
    id: Date.now() + 1,
    text: "Kegiatan Baru",
    impacts: [],
  });
  renderInputs();
}
function addImpact(i, j) {
  state[i].t2[j].impacts.push({
    id: Date.now() + 2,
    p: "",
    s: "",
    t: "",
    q: "",
    qi: "",
    l_p: "",
    l_s: "",
    l_t: "",
    l_q: "",
    l_qi: "",
  });
  renderInputs();
}

function renderInputs() {
  const c = document.getElementById("input-container");
  c.innerHTML = "";
  state.forEach((t1, t1i) => {
    c.innerHTML += `<div class="card">
                  <button class="btn-del" onclick="state.splice(${t1i},1);renderInputs()">×</button>
                  <label class="settings-label" style="color:#1e293b;margin-top:0;">Nama Tahap</label>
                  <input value="${escapeHtml(t1.text)}" oninput="state[${t1i}].text=this.value" style="font-weight:bold;font-size:1em;">
                  ${t1.t2
                    .map(
                      (t2, t2i) => `
                  <div class="t2-box">
                      <button class="btn-del" style="width:20px;height:20px;font-size:12px;top:12px;" onclick="state[${t1i}].t2.splice(${t2i},1);renderInputs()">×</button>
                      <label class="settings-label" style="margin-top:0;">Nama Kegiatan</label>
                      <input value="${escapeHtml(t2.text)}" oninput="state[${t1i}].t2[${t2i}].text=this.value" style="font-weight:600;">
                      <div class="impact-list">
                      ${t2.impacts
                        .map(
                          (imp, ii) => `
                          <div class="impact-item">
                              <button class="btn-del" style="width:18px;height:18px;font-size:10px;top:8px;right:8px;" onclick="state[${t1i}].t2[${t2i}].impacts.splice(${ii},1);renderInputs()">×</button>
                              <div class="impact-row"><input class="val-input" placeholder="Dampak Primer" value="${escapeHtml(imp.p)}" oninput="state[${t1i}].t2[${t2i}].impacts[${ii}].p=this.value"><input class="lbl-input" placeholder="Label" value="${escapeHtml(imp.l_p)}" oninput="state[${t1i}].t2[${t2i}].impacts[${ii}].l_p=this.value"></div>
                              <div class="impact-row"><input class="val-input" placeholder="Dampak Sekunder" value="${escapeHtml(imp.s)}" oninput="state[${t1i}].t2[${t2i}].impacts[${ii}].s=this.value"><input class="lbl-input" placeholder="Label" value="${escapeHtml(imp.l_s)}" oninput="state[${t1i}].t2[${t2i}].impacts[${ii}].l_s=this.value"></div>
                              <div class="impact-row"><input class="val-input" placeholder="Dampak Tersier" value="${escapeHtml(imp.t)}" oninput="state[${t1i}].t2[${t2i}].impacts[${ii}].t=this.value"><input class="lbl-input" placeholder="Label" value="${escapeHtml(imp.l_t)}" oninput="state[${t1i}].t2[${t2i}].impacts[${ii}].l_t=this.value"></div>
                              <div class="impact-row"><input class="val-input" placeholder="Dampak Kuartier" value="${escapeHtml(imp.q)}" oninput="state[${t1i}].t2[${t2i}].impacts[${ii}].q=this.value"><input class="lbl-input" placeholder="Label" value="${escapeHtml(imp.l_q)}" oninput="state[${t1i}].t2[${t2i}].impacts[${ii}].l_q=this.value"></div>
                              <div class="impact-row"><input class="val-input" placeholder="Dampak Kuintier" value="${escapeHtml(imp.qi)}" oninput="state[${t1i}].t2[${t2i}].impacts[${ii}].qi=this.value"><input class="lbl-input" placeholder="Label" value="${escapeHtml(imp.l_qi)}" oninput="state[${t1i}].t2[${t2i}].impacts[${ii}].l_qi=this.value"></div>
                          </div>`,
                        )
                        .join("")}
                      </div>
                      <button class="btn-add" style="background:#e0e7ff;color:#4338ca;border:1px dashed #a5b4fc;" onclick="addImpact(${t1i},${t2i})">+ Tambah Dampak</button>
                  </div>`,
                    )
                    .join("")}
                  <button class="btn-add" style="border:1px dashed #cbd5e1;font-weight:600;" onclick="addT2(${t1i})">+ Tambah Kegiatan</button>
                </div>`;
  });
}

function cleanId(t) {
  return t
    ? t
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_]/g, "")
    : null;
}

// ════════════════════════════════════════════════════════════════════
//  TABEL RINGKASAN, CHART & KONTROL FILTER (SLICER)
// ════════════════════════════════════════════════════════════════════
let chartInstances = [];

const extendedChartColors = [
  "#3b82f6",
  "#14b8a6",
  "#ec4899",
  "#06b6d4",
  "#6366f1",
  "#eab308",
  "#f43f5e",
  "#84cc16",
  "#64748b",
  "#d946ef",
];

function getLabelColorHex(lbl) {
  const l = lbl.trim().toUpperCase();
  if (l === "TANPA LABEL") return "#cbd5e1";
  if (l === "+P") return "#22c55e";
  if (l === "+TP") return "#86efac";
  if (l === "-P") return "#ef4444";
  if (l === "-TP") return "#fca5a5";
  if (l === "DL") return "#8b5cf6";
  if (l === "DPH") return "#f97316";
  if (l === "DTPHKP") return "#fb923c";
  if (l === "DTPH") return "#fed7aa";

  if (l.startsWith("+")) return "#10b981";
  if (l.startsWith("-")) return "#f43f5e";

  let hash = 0;
  for (let i = 0; i < l.length; i++) {
    hash = l.charCodeAt(i) + ((hash << 5) - hash);
  }
  return extendedChartColors[Math.abs(hash) % extendedChartColors.length];
}

function calcSummaryData(filtersArg) {
  const filters = filtersArg || getCurrentTabFilters();
  const byTahap = {};
  const byKegiatan = {};
  const byKomponen = {};
  const byLabel = {};
  const uniqueLabels = new Set();
  const allAvailableLabels = new Set();
  const allAvailableTahap = new Set();
  const allAvailableKegiatan = new Set();

  const labelPriority = [
    "+P",
    "-P",
    "+TP",
    "-TP",
    "DL",
    "DPH",
    "DTPHKP",
    "DTPH",
    "TANPA LABEL",
  ];

  state.forEach((t1) => {
    const t1Text = t1.text || "Tahap Kosong";
    allAvailableTahap.add(t1Text);
    t1.t2.forEach((t2) => {
      const t2Text = t2.text || "Kegiatan Kosong";
      allAvailableKegiatan.add(t2Text);
      t2.impacts.forEach((imp) => {
        const pairs = [
          { val: imp.p, lbl: imp.l_p },
          { val: imp.s, lbl: imp.l_s },
          { val: imp.t, lbl: imp.l_t },
          { val: imp.q, lbl: imp.l_q },
          { val: imp.qi, lbl: imp.l_qi },
        ];
        pairs.forEach(({ val, lbl }) => {
          if (val && val.trim()) {
            const l = lbl && lbl.trim() !== "" ? lbl.trim() : "Tanpa Label";
            allAvailableLabels.add(l);
          }
        });
      });
    });
  });

  state.forEach((t1) => {
    const t1Text = t1.text || "Tahap Kosong";
    if (filters.tahap !== null && !filters.tahap.includes(t1Text)) return;
    if (!byTahap[t1Text]) byTahap[t1Text] = { total: 0, labels: {} };

    t1.t2.forEach((t2) => {
      const t2Text = t2.text || "Kegiatan Kosong";
      if (filters.kegiatan !== null && !filters.kegiatan.includes(t2Text))
        return;

      const kKey = t2Text + "||" + t1Text;
      if (!byKegiatan[kKey])
        byKegiatan[kKey] = {
          total: 0,
          kegiatan: t2Text,
          tahap: t1Text,
          labels: {},
          komponenTerdampak: {},
        };

      t2.impacts.forEach((imp) => {
        const pairs = [
          { val: imp.p, lbl: imp.l_p },
          { val: imp.s, lbl: imp.l_s },
          { val: imp.t, lbl: imp.l_t },
          { val: imp.q, lbl: imp.l_q },
          { val: imp.qi, lbl: imp.l_qi },
        ];
        pairs.forEach(({ val, lbl }) => {
          if (val && val.trim()) {
            const l = lbl && lbl.trim() !== "" ? lbl.trim() : "Tanpa Label";
            if (filters.labels !== null && !filters.labels.includes(l)) return;

            const compName = val.trim();
            byTahap[t1Text].total++;
            byKegiatan[kKey].total++;

            const compLabelKey = compName + "|||" + l;
            if (!byKegiatan[kKey].komponenTerdampak[compLabelKey]) {
              byKegiatan[kKey].komponenTerdampak[compLabelKey] = {
                name: compName,
                label: l,
                count: 0,
              };
            }
            byKegiatan[kKey].komponenTerdampak[compLabelKey].count++;

            if (!byKomponen[compName])
              byKomponen[compName] = {
                total: 0,
                labels: {},
                kegiatanPemicu: {},
              };

            byKomponen[compName].total++;

            const kegLabelKey = t2Text + "|||" + l;
            if (!byKomponen[compName].kegiatanPemicu[kegLabelKey]) {
              byKomponen[compName].kegiatanPemicu[kegLabelKey] = {
                name: t2Text,
                label: l,
                count: 0,
              };
            }
            byKomponen[compName].kegiatanPemicu[kegLabelKey].count++;

            uniqueLabels.add(l);
            byLabel[l] = (byLabel[l] || 0) + 1;
            byTahap[t1Text].labels[l] = (byTahap[t1Text].labels[l] || 0) + 1;
            byKegiatan[kKey].labels[l] = (byKegiatan[kKey].labels[l] || 0) + 1;
            byKomponen[compName].labels[l] =
              (byKomponen[compName].labels[l] || 0) + 1;
          }
        });
      });
    });
  });

  const compareLabels = (labelsA, labelsB) => {
    for (const p of labelPriority) {
      let countA = 0,
        countB = 0;
      for (const k in labelsA) if (k.toUpperCase() === p) countA += labelsA[k];
      for (const k in labelsB) if (k.toUpperCase() === p) countB += labelsB[k];
      if (countA !== countB) return countB - countA;
    }
    return 0;
  };

  const sortDesc = (obj) =>
    Object.entries(obj)
      .filter((x) => x[1].total > 0)
      .sort((a, b) => {
        if (b[1].total !== a[1].total) return b[1].total - a[1].total;
        return compareLabels(a[1].labels, b[1].labels);
      });

  const sortDescObj = (arr) =>
    arr
      .filter((x) => x.total > 0)
      .sort((a, b) => {
        if (b.total !== a.total) return b.total - a.total;
        return compareLabels(a.labels, b.labels);
      });

  const sortDescLabel = (obj) =>
    Object.entries(obj).sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      const rankA = labelPriority.indexOf(a[0].toUpperCase());
      const rankB = labelPriority.indexOf(b[0].toUpperCase());
      const rA = rankA === -1 ? 999 : rankA;
      const rB = rankB === -1 ? 999 : rankB;
      if (rA !== rB) return rA - rB;
      return a[0].localeCompare(b[0]);
    });

  return {
    tahap: sortDesc(byTahap),
    kegiatan: sortDescObj(Object.values(byKegiatan)),
    komponen: sortDesc(byKomponen),
    label: sortDescLabel(byLabel),
    uniqueLabels: Array.from(uniqueLabels).sort(),
    allAvailableLabels: Array.from(allAvailableLabels).sort(),
    allAvailableTahap: Array.from(allAvailableTahap),
    allAvailableKegiatan: Array.from(allAvailableKegiatan),
  };
}

function updateActiveTabSlicers() {
  if (currentMainTab === "summary") {
    renderSummary();
  } else {
    applyCanvasFilters();
    if (
      document.getElementById("canvas-filter-widget") &&
      document.getElementById("canvas-filter-widget").style.display === "block"
    ) {
      renderCanvasSlicerUI();
    }
  }
}

window.toggleSlicer = function (lbl) {
  const filters = getCurrentTabFilters();
  if (filters.labels === null) {
    filters.labels = [lbl];
  } else {
    if (filters.labels.includes(lbl)) {
      filters.labels = filters.labels.filter((x) => x !== lbl);
      if (filters.labels.length === 0) filters.labels = null;
    } else {
      filters.labels.push(lbl);
    }
  }
  updateActiveTabSlicers();
};
window.resetSlicer = function () {
  getCurrentTabFilters().labels = null;
  updateActiveTabSlicers();
};

window.toggleTahapSlicer = function (thp) {
  const filters = getCurrentTabFilters();
  if (filters.tahap === null) {
    filters.tahap = [thp];
  } else {
    if (filters.tahap.includes(thp)) {
      filters.tahap = filters.tahap.filter((x) => x !== thp);
      if (filters.tahap.length === 0) filters.tahap = null;
    } else {
      filters.tahap.push(thp);
    }
  }
  updateActiveTabSlicers();
};
window.resetTahapSlicer = function () {
  getCurrentTabFilters().tahap = null;
  updateActiveTabSlicers();
};

window.toggleKegiatanSlicer = function (keg) {
  const filters = getCurrentTabFilters();
  if (filters.kegiatan === null) {
    filters.kegiatan = [keg];
  } else {
    if (filters.kegiatan.includes(keg)) {
      filters.kegiatan = filters.kegiatan.filter((x) => x !== keg);
      if (filters.kegiatan.length === 0) filters.kegiatan = null;
    } else {
      filters.kegiatan.push(keg);
    }
  }
  updateActiveTabSlicers();
};
window.resetKegiatanSlicer = function () {
  getCurrentTabFilters().kegiatan = null;
  updateActiveTabSlicers();
};

window.updateFilterOpacity = function (val) {
  const filters = getCanvasFilters();
  filters.opacity = parseFloat(val);
  const valEl = document.getElementById("val-filter-opacity");
  if (valEl) valEl.innerText = Math.round(filters.opacity * 100) + "%";
  applyCanvasFilters();
};

function renderCanvasSlicerUI() {
  const w = document.getElementById("canvas-filter-widget");
  if (!w) return;
  const filters = getCanvasFilters();
  const data = calcSummaryData(filters);
  const escapeStr = (str) =>
    String(str).replace(/'/g, "\\'").replace(/"/g, "&quot;");

  let html = `<div style="font-size:0.95em; font-weight:800; color:#1e293b; margin-bottom:12px; border-bottom:2px solid #e2e8f0; padding-bottom:8px;">🎛️ Filter Bagan Alir</div>`;

  html += `<div style="margin-bottom:12px;">
              <div style="font-size:0.8em; color:#64748b; font-weight:700; margin-bottom:6px;">📌 Filter Tahap</div>
              <div style="display:flex; flex-wrap:wrap; gap:5px;">
                  <button class="slicer-btn ${filters.tahap === null ? "active" : ""}" style="padding:5px 10px; font-size:0.8em;" onclick="resetTahapSlicer()">Semua</button>
                  ${data.allAvailableTahap.map((t) => `<button class="slicer-btn ${filters.tahap !== null && filters.tahap.includes(t) ? "active" : ""}" style="padding:5px 10px; font-size:0.8em;" onclick="toggleTahapSlicer('${escapeStr(t)}')">${escapeHtml(t)}</button>`).join("")}
              </div>
          </div>`;

  html += `<div style="margin-bottom:12px;">
              <div style="font-size:0.8em; color:#64748b; font-weight:700; margin-bottom:6px;">⚙️ Filter Kegiatan</div>
              <div style="display:flex; flex-wrap:wrap; gap:5px;">
                  <button class="slicer-btn ${filters.kegiatan === null ? "active" : ""}" style="padding:5px 10px; font-size:0.8em;" onclick="resetKegiatanSlicer()">Semua</button>
                  ${data.allAvailableKegiatan.map((k) => `<button class="slicer-btn ${filters.kegiatan !== null && filters.kegiatan.includes(k) ? "active" : ""}" style="padding:5px 10px; font-size:0.8em;" onclick="toggleKegiatanSlicer('${escapeStr(k)}')">${escapeHtml(k)}</button>`).join("")}
              </div>
          </div>`;

  html += `<div style="margin-bottom:8px;">
              <div style="font-size:0.8em; color:#64748b; font-weight:700; margin-bottom:6px;">⚗️ Filter Sifat Dampak</div>
              <div style="display:flex; flex-wrap:wrap; gap:5px;">
                  <button class="slicer-btn ${filters.labels === null ? "active" : ""}" style="padding:5px 10px; font-size:0.8em;" onclick="resetSlicer()">Semua</button>
                  ${data.allAvailableLabels.map((l) => `<button class="slicer-btn ${filters.labels !== null && filters.labels.includes(l) ? "active" : ""}" style="padding:5px 10px; font-size:0.8em;" onclick="toggleSlicer('${escapeStr(l)}')">${escapeHtml(l)}</button>`).join("")}
              </div>
          </div>`;

  html += `<div style="margin-top:12px; border-top:1px solid #e2e8f0; padding-top:12px;">
              <div style="font-size:0.8em; color:#64748b; font-weight:700; margin-bottom:6px;">👻 Transparansi Filter</div>
              <div style="display:flex; align-items:center; gap:8px;">
                  <input type="range" min="0" max="1" step="0.01" value="${filters.opacity}"
                      oninput="updateFilterOpacity(this.value)"
                      style="flex:1; cursor:pointer;" />
                  <span id="val-filter-opacity" style="font-size:0.85em; font-weight:bold; width:35px; text-align:right;">${Math.round(filters.opacity * 100)}%</span>
              </div>
          </div>`;

  html += `<div style="font-size: 0.75em; color: #94a3b8; margin-top: 10px; text-align: center;">Node dan garis yang tidak masuk kriteria akan mengikuti transparansi di atas.</div>`;
  w.innerHTML = html;
}

function applyCanvasFilters() {
  const filters = getCanvasFilters();
  const visibleNodes = new Set(["root"]);
  const visibleConns = new Set();

  Object.keys(connectors).forEach((key) => {
    const c = connectors[key];
    const m = c.meta;
    if (!m) return;

    if (filters.tahap && m.tahap && !filters.tahap.includes(m.tahap)) return;
    if (
      filters.kegiatan &&
      m.kegiatan &&
      !filters.kegiatan.includes(m.kegiatan)
    )
      return;

    if (filters.labels && m.ds) {
      const hasMatch = m.ds.some((lbl) => filters.labels.includes(lbl));
      if (!hasMatch) return;
    }

    visibleConns.add(key);
  });

  visibleConns.forEach((key) => {
    const c = connectors[key];
    visibleNodes.add(c.srcEl.id);
    visibleNodes.add(c.tgtEl.id);
  });

  Object.keys(connectors).forEach((key) => {
    const c = connectors[key];
    if (visibleConns.has(key)) {
      c.group.style.opacity = "1";
      c.group.style.pointerEvents = "all";
    } else {
      c.group.style.opacity = filters.opacity.toString();
      c.group.style.pointerEvents = "none";
    }
  });

  document.querySelectorAll(".node").forEach((n) => {
    if (visibleNodes.has(n.id)) {
      n.style.opacity = "1";
      n.style.pointerEvents = "all";
    } else {
      n.style.opacity = filters.opacity.toString();
      n.style.pointerEvents = "none";
    }
  });
}

function createStackedBarChart(canvasId, labels, datasetsData, dataLabels) {
  const ctx = document.getElementById(canvasId).getContext("2d");
  const datasets = dataLabels.map((l) => ({
    label: l,
    data: datasetsData.map((d) => d.labels[l] || 0),
    backgroundColor: getLabelColorHex(l),
    borderRadius: 3,
    maxBarThickness: 200,
  }));

  const topTotalPlugin = {
    id: "topTotalPlugin",
    afterDatasetsDraw(chart) {
      const {
        ctx,
        data,
        scales: { x, y },
      } = chart;
      ctx.save();
      ctx.font = 'normal 12px "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = "#334155";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";

      const totals = new Array(data.labels.length).fill(0);
      data.datasets.forEach((dataset, datasetIndex) => {
        const meta = chart.getDatasetMeta(datasetIndex);
        if (!meta.hidden) {
          dataset.data.forEach((val, i) => {
            totals[i] += val || 0;
          });
        }
      });

      totals.forEach((total, i) => {
        if (total > 0) {
          const xPos = x.getPixelForValue(i);
          const yPos = y.getPixelForValue(total);
          ctx.fillText(total, xPos, yPos - 4);
        }
      });
      ctx.restore();
    },
  };

  chartInstances.push(
    new Chart(ctx, {
      type: "bar",
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 25 } },
        interaction: { mode: "index", intersect: false },
        plugins: {
          tooltip: {
            enabled: true,
            position: "sideEdge",
            yAlign: "center",
            xAlign: function (context) {
              const tooltip = context.tooltip;
              if (!tooltip || !tooltip.dataPoints || !tooltip.dataPoints.length)
                return "auto";
              const el = tooltip.dataPoints[0].element;
              const chart = context.chart;
              const barWidth = el.width || 30;
              if (barWidth > chart.width * 0.4) return "auto";
              return el.x < chart.width / 2 ? "left" : "right";
            },
          },
          legend: {
            position: "bottom",
            labels: {
              usePointStyle: true,
              pointStyle: "rectRounded",
              boxWidth: 8,
            },
          },
        },
        scales: {
          x: { stacked: true, grid: { display: false } },
          y: {
            stacked: true,
            beginAtZero: true,
            ticks: { precision: 0 },
            title: {
              display: true,
              text: "Jumlah Dampak",
              font: { weight: "normal", size: 12 },
              color: "#475569",
            },
          },
        },
      },
      plugins: [topTotalPlugin],
    }),
  );
}

function createPieChart(canvasId, labels, dataCounts) {
  const ctx = document.getElementById(canvasId).getContext("2d");

  const doughnutLabelPlugin = {
    id: "doughnutLabelPlugin",
    afterDatasetsDraw(chart) {
      const { ctx, data } = chart;
      ctx.save();
      ctx.font = 'bold 11px "Segoe UI", Arial, sans-serif';
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
      ctx.shadowBlur = 3;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 1;

      const meta = chart.getDatasetMeta(0);
      let total = 0;
      meta.data.forEach((arc, i) => {
        if (!arc.hidden) total += data.datasets[0].data[i] || 0;
      });

      meta.data.forEach((arc, i) => {
        const val = data.datasets[0].data[i];
        if (val > 0 && !arc.hidden) {
          const center = arc.tooltipPosition();
          const percentage = total > 0 ? Math.round((val / total) * 100) : 0;
          ctx.fillText(`${val}`, center.x, center.y - 6);
          ctx.fillText(`(${percentage}%)`, center.x, center.y + 8);
        }
      });
      ctx.restore();
    },
  };

  chartInstances.push(
    new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: labels,
        datasets: [
          {
            data: dataCounts,
            backgroundColor: labels.map((l) => getLabelColorHex(l)),
            borderWidth: 2,
            borderColor: "#ffffff",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          tooltip: {
            enabled: true,
            position: "cursor",
            yAlign: "center",
            xAlign: function (context) {
              const tooltip = context.tooltip;
              if (!tooltip) return "auto";
              const chart = context.chart;
              return tooltip.caretX < chart.width / 2 ? "left" : "right";
            },
          },
          legend: {
            position: "bottom",
            labels: {
              usePointStyle: true,
              pointStyle: "rectRounded",
              boxWidth: 8,
            },
          },
        },
        cutout: "55%",
      },
      plugins: [doughnutLabelPlugin],
    }),
  );
}

function rankBadge(index) {
  const rank = index + 1;
  if (rank === 1) return `<span class="rank-badge rank-1">1</span>`;
  if (rank === 2) return `<span class="rank-badge rank-2">2</span>`;
  if (rank === 3) return `<span class="rank-badge rank-3">3</span>`;
  return `<span class="rank-badge rank-n">${rank}</span>`;
}

function renderSummary() {
  chartInstances.forEach((c) => c.destroy());
  chartInstances = [];

  const container = document.getElementById("summary-content");
  const filters = summaryFilters;

  if (state.length === 0 || state.every((t1) => t1.t2.length === 0)) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><div>Klik <b>Perbarui</b> atau <b>Generate Bagan</b> untuk menampilkan ringkasan.</div></div>`;
    return;
  }

  const data = calcSummaryData(summaryFilters);
  const totalTahap = data.tahap.reduce((s, [, v]) => s + v.total, 0);
  const totalKegiatan = data.kegiatan.reduce((s, r) => s + r.total, 0);
  const totalKomponen = data.komponen.reduce((s, [, v]) => s + v.total, 0);
  const totalLabel = data.label.reduce((s, [, v]) => s + v, 0);
  const maxLabel = data.label.length > 0 ? data.label[0][1] : 1;

  const escapeStr = (str) =>
    String(str).replace(/'/g, "\\'").replace(/"/g, "&quot;");

  let slicerHtml = `
          <div class="settings-section summary-card" style="margin-bottom: 24px;">
            <div class="accordion-header" onclick="toggleAccordion(this)" style="margin: 0; border: none; border-bottom: 1px solid #e2e8f0; background: #fff;">
              🎛️ Filter Data
            </div>
            <div class="accordion-content" style="padding: 16px; background: #f8fafc;">
              <div style="display: flex; flex-direction: column; gap: 8px;">
                <div class="slicer-wrap" style="margin-bottom: 0; border: none; box-shadow: none;">
                  <span class="slicer-title">📌 Tahap:</span>
                  <button class="slicer-btn ${filters.tahap === null ? "active" : ""}" onclick="resetTahapSlicer()">Semua</button>
                  ${data.allAvailableTahap.map((t) => `<button class="slicer-btn ${filters.tahap !== null && filters.tahap.includes(t) ? "active" : ""}" onclick="toggleTahapSlicer('${escapeStr(t)}')">${escapeHtml(t)}</button>`).join("")}
                </div>
                <div class="slicer-wrap" style="margin-bottom: 0; border: none; box-shadow: none;">
                  <span class="slicer-title">⚙️ Kegiatan:</span>
                  <button class="slicer-btn ${filters.kegiatan === null ? "active" : ""}" onclick="resetKegiatanSlicer()">Semua</button>
                  ${data.allAvailableKegiatan.map((k) => `<button class="slicer-btn ${filters.kegiatan !== null && filters.kegiatan.includes(k) ? "active" : ""}" onclick="toggleKegiatanSlicer('${escapeStr(k)}')">${escapeHtml(k)}</button>`).join("")}
                </div>
                <div class="slicer-wrap" style="margin-bottom: 0; border: none; box-shadow: none;">
                  <span class="slicer-title">⚗️ Dampak:</span>
                  <button class="slicer-btn ${filters.labels === null ? "active" : ""}" onclick="resetSlicer()">Semua</button>
                  ${data.allAvailableLabels.map((l) => `<button class="slicer-btn ${filters.labels !== null && filters.labels.includes(l) ? "active" : ""}" onclick="toggleSlicer('${escapeStr(l)}')">${escapeHtml(l)}</button>`).join("")}
                </div>
              </div>
            </div>
          </div>`;

  if (totalTahap === 0) {
    container.innerHTML =
      slicerHtml +
      `<div class="empty-state"><div class="empty-icon">🔍</div><div>Tidak ada data untuk filter yang dipilih.</div></div>`;
    return;
  }

  const top5Kegiatan = data.kegiatan.slice(0, 5);
  const top5Komponen = data.komponen
    .map((x) => ({ name: x[0], ...x[1] }))
    .slice(0, 5);

  const top5KegiatanHtml = top5Kegiatan
    .map((row, i) => {
      const komponenHtml = Object.values(row.komponenTerdampak)
        .sort((a, b) => {
          if (a.name !== b.name) return a.name.localeCompare(b.name);
          return b.count - a.count;
        })
        .map(
          (item) =>
            `<span style="display:inline-block; padding:3px 8px; background:${getLabelColorHex(item.label)}; border-radius:12px; font-size:0.8em; margin:2px 2px 2px 0; color:#fff; font-weight:600; text-shadow:0 1px 1px rgba(0,0,0,0.3)" title="Label: ${escapeHtml(item.label)}">${escapeHtml(item.name)}${item.count > 1 ? ` (${item.count})` : ""}</span>`,
        )
        .join("");
      const labelsHtml = Object.entries(row.labels)
        .sort((a, b) => b[1] - a[1])
        .map(
          ([lbl, val]) =>
            `<span style="display:inline-block; padding:2px 6px; background:${getLabelColorHex(lbl)}; border-radius:4px; font-size:0.75em; margin:2px; color:#fff; font-weight:bold; text-shadow:0 1px 1px rgba(0,0,0,0.3)">${escapeHtml(lbl)}: ${val}</span>`,
        )
        .join("");
      return `<tr>
            <td class="num">${rankBadge(i)}</td>
            <td><b>${escapeHtml(row.kegiatan)}</b><br><span style="font-size:0.8em;color:#64748b">${escapeHtml(row.tahap)}</span></td>
            <td class="num" style="font-size:1.1em; font-weight:bold; color:#0f172a;">${row.total}</td>
            <td>${komponenHtml}</td>
            <td>${labelsHtml}</td>
          </tr>`;
    })
    .join("");

  const tabelTop5Kegiatan = `<div class="summary-card" style="margin-bottom: 24px; border: 2px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
          <div class="summary-card-title accordion-header" onclick="toggleAccordion(this)" style="margin: 0; border: none; border-bottom: 1px solid #e2e8f0; background: #fff;">📋 Kegiatan Paling Berdampak </div>
          <div class="accordion-content" style="padding: 0;">
            <div style="overflow-x: auto; padding: 10px;">
              <table class="sumtable">
                <thead><tr><th class="num" style="width:40px">NO</th><th>Nama Kegiatan</th><th class="num" style="width:100px">Jumlah Dampak</th><th>Komponen Lingkungan Terdampak</th><th>Rincian Sifat Dampak</th></tr></thead>
                <tbody>${top5KegiatanHtml || '<tr><td colspan="5" class="num">Tidak ada data</td></tr>'}</tbody>
              </table>
            </div>
          </div>
        </div>`;

  const top5KomponenHtml = top5Komponen
    .map((row, i) => {
      const kegiatanHtml = Object.values(row.kegiatanPemicu)
        .sort((a, b) => {
          if (a.name !== b.name) return a.name.localeCompare(b.name);
          return b.count - a.count;
        })
        .map(
          (item) =>
            `<span style="display:inline-block; padding:3px 8px; background:${getLabelColorHex(item.label)}; border-radius:12px; font-size:0.8em; margin:2px 2px 2px 0; color:#fff; font-weight:600; text-shadow:0 1px 1px rgba(0,0,0,0.3)" title="Label: ${escapeHtml(item.label)}">${escapeHtml(item.name)}${item.count > 1 ? ` (${item.count})` : ""}</span>`,
        )
        .join("");
      const labelsHtml = Object.entries(row.labels)
        .sort((a, b) => b[1] - a[1])
        .map(
          ([lbl, val]) =>
            `<span style="display:inline-block; padding:2px 6px; background:${getLabelColorHex(lbl)}; border-radius:4px; font-size:0.75em; margin:2px; color:#fff; font-weight:bold; text-shadow:0 1px 1px rgba(0,0,0,0.3)">${escapeHtml(lbl)}: ${val}</span>`,
        )
        .join("");
      return `<tr>
            <td class="num">${rankBadge(i)}</td>
            <td><b>${escapeHtml(row.name)}</b></td>
            <td class="num" style="font-size:1.1em; font-weight:bold; color:#0f172a;">${row.total}</td>
            <td>${kegiatanHtml}</td>
            <td>${labelsHtml}</td>
          </tr>`;
    })
    .join("");

  const tabelTop5Komponen = `<div class="summary-card" style="margin-bottom: 24px; border: 2px solid #e2e8f0; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
          <div class="summary-card-title accordion-header" onclick="toggleAccordion(this)" style="margin: 0; border: none; border-bottom: 1px solid #e2e8f0; background: #fff;">📋 Komponen Lingkungan Paling Terdampak</div>
          <div class="accordion-content" style="padding: 0;">
            <div style="overflow-x: auto; padding: 10px;">
              <table class="sumtable">
                <thead><tr><th class="num" style="width:40px">NO</th><th>Komponen Lingkungan</th><th class="num" style="width:100px">Jumlah Dampak</th><th>Sumber Dampak</th><th>Rincian Sifat Dampak</th></tr></thead>
                <tbody>${top5KomponenHtml || '<tr><td colspan="5" class="num">Tidak ada data</td></tr>'}</tbody>
              </table>
            </div>
          </div>
        </div>`;

  const labelHeaders = data.uniqueLabels
    .map(
      (l) =>
        `<th class="num" style="border-left:1px solid #e2e8f0;">${escapeHtml(l)}</th><th class="num">%</th>`,
    )
    .join("");
  const labelFooters = data.uniqueLabels
    .map((l) => {
      const count = data.label.find((x) => x[0] === l)?.[1] || 0;
      const pct = totalLabel > 0 ? Math.round((count / totalLabel) * 100) : 0;
      return `<td class="pct" style="border-left:1px solid #e2e8f0;">${count}</td><td class="pct">${pct}%</td>`;
    })
    .join("");

  const buildLabelCols = (labelsObj, rowTotal) => {
    return data.uniqueLabels
      .map((l) => {
        const count = labelsObj[l];
        if (count) {
          const pct = Math.round((count / rowTotal) * 100);
          return `<td class="pct" style="border-left:1px solid #e2e8f0;font-weight:bold;">${count}</td><td class="pct">${pct}%</td>`;
        }
        return `<td class="pct" style="border-left:1px solid #e2e8f0;">-</td><td class="pct">-</td>`;
      })
      .join("");
  };

  const t1aRows = data.tahap
    .map(
      ([name, obj], i) => `
            <tr class="${i === 0 ? "top-row" : ""}">
              <td class="num">${rankBadge(i)}</td>
              <td>${escapeHtml(name)}</td><td class="num">${obj.total}</td>
              <td class="pct">${totalTahap > 0 ? Math.round((obj.total / totalTahap) * 100) + "%" : "-"}</td>
              ${buildLabelCols(obj.labels, obj.total)}
            </tr>`,
    )
    .join("");
  const tabel1a = `<div class="summary-card" style="margin-bottom: 24px;">
            <div class="summary-card-title accordion-header" onclick="toggleAccordion(this)" style="margin: 0; border: none; border-bottom: 1px solid #e2e8f0; background: #fff;">📋 REKAPITULASI DAMPAK PER TAHAP</div>
            <div class="accordion-content" style="padding: 0;">
              <div style="overflow-x: auto;">
                  <table class="sumtable">
                  <thead><tr><th class="num" style="width:40px">No</th><th>Tahap</th><th class="num">Jumlah</th><th class="num">%</th>${labelHeaders}</tr></thead>
                  <tbody>${t1aRows}</tbody>
                  <tfoot><tr><td colspan="2"><b>Total</b></td><td class="num">${totalTahap}</td><td class="pct">100%</td>${labelFooters}</tr></tfoot>
                  </table>
              </div>
              <div class="chart-container">
                <button class="btn-export-chart" style="position:absolute; top:10px; right:20px; z-index:10;" onclick="exportChartJS('chart-tahap', 'Chart_Tahap')">📥 Export Chart</button>
                <canvas id="chart-tahap"></canvas>
              </div>
            </div>
          </div>`;

  const t1bRows = data.kegiatan
    .map(
      (row, i) => `
            <tr class="${i === 0 ? "top-row" : ""}">
              <td class="num">${rankBadge(i)}</td>
              <td>${escapeHtml(row.kegiatan)}</td><td style="font-size:0.8em;color:#64748b">${escapeHtml(row.tahap)}</td>
              <td class="num">${row.total}</td>
              <td class="pct">${totalKegiatan > 0 ? Math.round((row.total / totalKegiatan) * 100) + "%" : "-"}</td>
              ${buildLabelCols(row.labels, row.total)}
            </tr>`,
    )
    .join("");
  const tabel1b = `<div class="summary-card" style="margin-bottom: 24px;">
            <div class="summary-card-title accordion-header" onclick="toggleAccordion(this)" style="margin: 0; border: none; border-bottom: 1px solid #e2e8f0; background: #fff;">📋 REKAPITULASI DAMPAK PER KEGIATAN</div>
            <div class="accordion-content" style="padding: 0;">
              <div style="overflow-x: auto;">
                  <table class="sumtable">
                  <thead><tr><th class="num" style="width:40px">No</th><th>Kegiatan</th><th>Tahap</th><th class="num">Jumlah</th><th class="num">%</th>${labelHeaders}</tr></thead>
                  <tbody>${t1bRows}</tbody>
                  <tfoot><tr><td colspan="3"><b>Total</b></td><td class="num">${totalKegiatan}</td><td class="pct">100%</td>${labelFooters}</tr></tfoot>
                  </table>
              </div>
              <div class="chart-container">
                <button class="btn-export-chart" style="position:absolute; top:10px; right:20px; z-index:10;" onclick="exportChartJS('chart-kegiatan', 'Chart_Kegiatan')">📥 Export Chart</button>
                <canvas id="chart-kegiatan"></canvas>
              </div>
            </div>
          </div>`;

  const t1cRows = data.komponen
    .map(
      ([name, obj], i) => `
            <tr class="${i === 0 ? "top-row" : ""}">
              <td class="num">${rankBadge(i)}</td>
              <td>${escapeHtml(name)}</td><td class="num">${obj.total}</td>
              <td class="pct">${totalKomponen > 0 ? Math.round((obj.total / totalKomponen) * 100) + "%" : "-"}</td>
              ${buildLabelCols(obj.labels, obj.total)}
            </tr>`,
    )
    .join("");
  const tabel1c = `<div class="summary-card" style="margin-bottom: 24px;">
            <div class="summary-card-title accordion-header" onclick="toggleAccordion(this)" style="margin: 0; border: none; border-bottom: 1px solid #e2e8f0; background: #fff;">📋 REKAPITULASI DAMPAK PER KOMPONEN LINGKUNGAN</div>
            <div class="accordion-content" style="padding: 0;">
              <div style="overflow-x: auto;">
                  <table class="sumtable">
                  <thead><tr><th class="num" style="width:40px">No</th><th>Komponen Lingkungan</th><th class="num">Jumlah</th><th class="num">%</th>${labelHeaders}</tr></thead>
                  <tbody>${t1cRows}</tbody>
                  <tfoot><tr><td colspan="2"><b>Total</b></td><td class="num">${totalKomponen}</td><td class="pct">100%</td>${labelFooters}</tr></tfoot>
                  </table>
              </div>
              <div class="chart-container">
                <button class="btn-export-chart" style="position:absolute; top:10px; right:20px; z-index:10;" onclick="exportChartJS('chart-komponen', 'Chart_Komponen')">📥 Export Chart</button>
                <canvas id="chart-komponen"></canvas>
              </div>
            </div>
          </div>`;

  const tabel2Rows = data.label
    .map(([lbl, count], i) => {
      const hexColor = getLabelColorHex(lbl);
      const barW = Math.round((count / maxLabel) * 100);
      return `<tr class="${i === 0 ? "top-row" : ""}">
              <td class="num">${rankBadge(i)}</td>
              <td><span class="label-pill" style="background:${hexColor}; color: white; text-shadow: 0 1px 2px rgba(0,0,0,0.3);">${escapeHtml(lbl)}</span></td><td class="num">${count}</td>
              <td style="padding:9px 14px"><div class="label-bar-wrap">
                  <div class="label-bar-bg"><div class="label-bar-fill" style="width:${barW}%; background:${hexColor};"></div></div>
                  <span style="font-size:0.78em;color:#64748b;min-width:32px;text-align:right">${totalLabel > 0 ? Math.round((count / totalLabel) * 100) + "%" : "-"}</span>
                </div></td></tr>`;
    })
    .join("");
  const tabel4 = `<div class="summary-card" style="margin-bottom:0">
            <div class="summary-card-title accordion-header" onclick="toggleAccordion(this)" style="margin: 0; border: none; border-bottom: 1px solid #e2e8f0; background: #fff;">📋 REKAPITULASI PER SIFAT DAMPAK</div>
            <div class="accordion-content" style="padding: 0;">
              <table class="sumtable">
                <thead><tr><th class="num" style="width:40px">No</th><th>Sifat Dampak</th><th class="num">Jumlah</th><th>Proporsi</th></tr></thead>
                <tbody>${tabel2Rows}</tbody>
                <tfoot><tr><td colspan="2"><b>Total</b></td><td class="num">${totalLabel}</td><td></td></tr></tfoot>
              </table>
              <div class="chart-container" style="height: 350px;">
                <button class="btn-export-chart" style="position:absolute; top:10px; right:20px; z-index:10;" onclick="exportChartJS('chart-label', 'Chart_Label_Sifat')">📥 Export Chart</button>
                <canvas id="chart-label"></canvas>
              </div>
            </div>
          </div>`;

  container.innerHTML =
    slicerHtml +
    tabelTop5Kegiatan +
    tabelTop5Komponen +
    tabel1a +
    tabel1b +
    tabel1c +
    tabel4 +
    `<div style="height:32px"></div>`;

  const dataLabels = data.uniqueLabels;

  createStackedBarChart(
    "chart-tahap",
    data.tahap.map((x) => x[0]),
    data.tahap.map((x) => x[1]),
    dataLabels,
  );
  createStackedBarChart(
    "chart-kegiatan",
    data.kegiatan.map((x) => x.kegiatan),
    data.kegiatan,
    dataLabels,
  );
  createStackedBarChart(
    "chart-komponen",
    data.komponen.map((x) => x[0]),
    data.komponen.map((x) => x[1]),
    dataLabels,
  );
  createPieChart(
    "chart-label",
    data.label.map((x) => x[0]),
    data.label.map((x) => x[1]),
  );
}

// ════════════════════════════════════════════════════════════════════
//  SVG CONNECTOR ENGINE
// ════════════════════════════════════════════════════════════════════
let selectedConn = null;
const connectors = {};
const STRAIGHT_THRESHOLD = 4;
const markerIds = {};

function ensureMarker(color) {
  if (markerIds[color]) return markerIds[color];
  const id = "arrow_" + color.replace("#", ""),
    defs = svgEl.querySelector("defs");
  const marker = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "marker",
  );
  marker.setAttribute("id", id);
  marker.setAttribute("markerWidth", "8");
  marker.setAttribute("markerHeight", "8");
  marker.setAttribute("refX", "7");
  marker.setAttribute("refY", "3");
  marker.setAttribute("orient", "auto");
  marker.setAttribute("markerUnits", "strokeWidth");
  const poly = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "polygon",
  );
  poly.setAttribute("points", "0,0 8,3 0,6");
  poly.setAttribute("fill", color);
  marker.appendChild(poly);
  defs.appendChild(marker);
  markerIds[color] = id;
  return id;
}

function ptsTod(pts) {
  return pts
    .map(
      (p, i) => (i === 0 ? "M" : "L") + p.x.toFixed(1) + " " + p.y.toFixed(1),
    )
    .join(" ");
}

function segIntersect(a1, a2, b1, b2) {
  const dx1 = a2.x - a1.x,
    dy1 = a2.y - a1.y,
    dx2 = b2.x - b1.x,
    dy2 = b2.y - b1.y,
    denom = dx1 * dy2 - dy1 * dx2;
  if (Math.abs(denom) < 0.001) return null;
  const t = ((b1.x - a1.x) * dy2 - (b1.y - a1.y) * dx2) / denom,
    u = ((b1.x - a1.x) * dy1 - (b1.y - a1.y) * dx1) / denom;
  return t > 0.01 && t < 0.99 && u > 0.01 && u < 0.99 ? t : null;
}

const JUMP_R = 8;
function ptsTodWithJumps(pts, myKey) {
  const crossings = pts.map(() => []);
  Object.keys(connectors).forEach((oKey) => {
    if (oKey === myKey) return;
    const o = connectors[oKey];
    if (!o || !o.pts || o.group.style.pointerEvents === "none") return;
    const op = o.pts;
    for (let i = 0; i < pts.length - 1; i++) {
      if (Math.abs(pts[i].y - pts[i + 1].y) >= 1) continue;
      for (let j = 0; j < op.length - 1; j++) {
        if (Math.abs(op[j].x - op[j + 1].x) >= 1) continue;
        const t = segIntersect(pts[i], pts[i + 1], op[j], op[j + 1]);
        if (t !== null) crossings[i].push(t);
      }
    }
  });
  let d = "M" + pts[0].x.toFixed(1) + " " + pts[0].y.toFixed(1);
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i],
      p1 = pts[i + 1],
      dx = p1.x - p0.x,
      dy = p1.y - p0.y,
      len = Math.sqrt(dx * dx + dy * dy);
    if (len < 0.001) {
      d += " L" + p1.x.toFixed(1) + " " + p1.y.toFixed(1);
      continue;
    }
    const ts = crossings[i].slice().sort((a, b) => a - b);
    let cur = 0;
    for (const t of ts) {
      const jt = JUMP_R / len;
      if (t - jt < cur || t + jt > 1) continue;
      d +=
        " L" +
        (p0.x + dx * (t - jt)).toFixed(1) +
        " " +
        (p0.y + dy * (t - jt)).toFixed(1);
      d +=
        " A" +
        JUMP_R +
        " " +
        JUMP_R +
        " 0 0 1 " +
        (p0.x + dx * (t + jt)).toFixed(1) +
        " " +
        (p0.y + dy * (t + jt)).toFixed(1);
      cur = t + jt;
    }
    d += " L" + p1.x.toFixed(1) + " " + p1.y.toFixed(1);
  }
  return d;
}

function rebuildAllPaths() {
  Object.keys(connectors).forEach((k) => {
    const c = connectors[k];
    if (!c || !c.pathEl) return;
    c.pathEl.setAttribute("d", ptsTodWithJumps(c.pts, k));
    c.hitEl.setAttribute("d", ptsTod(c.pts));
  });
}
function getAnchor(n, side, off = 0) {
  const l = parseFloat(n.style.left) || 0,
    t = parseFloat(n.style.top) || 0,
    w = n.offsetWidth,
    h = n.offsetHeight || 44,
    cx = l + w / 2 + off;
  return side === "bottom" ? { x: cx, y: t + h } : { x: cx, y: t };
}

function buildConnector(
  key,
  srcEl,
  tgtEl,
  color,
  label,
  srcOffX = 0,
  tgtOffX = 0,
  meta = {},
) {
  const markerId = ensureMarker(color),
    s = getAnchor(srcEl, "bottom", srcOffX),
    e = getAnchor(tgtEl, "top", tgtOffX);
  if (!connData[key]) connData[key] = {};
  if (connData[key].midRatio === undefined) connData[key].midRatio = 0.5;
  const snap = Math.abs(s.x - e.x) <= STRAIGHT_THRESHOLD,
    effEX = snap ? s.x : e.x,
    midY = s.y + connData[key].midRatio * (e.y - s.y);
  const pts = [
    { x: s.x, y: s.y },
    { x: s.x, y: midY },
    { x: effEX, y: midY },
    { x: effEX, y: e.y },
  ];
  if (connectors[key]) connectors[key].group.remove();

  const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
  g.setAttribute("data-key", key);
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("class", "conn-path");
  path.setAttribute("stroke", color);
  path.setAttribute("marker-end", `url(#${markerId})`);
  path.setAttribute("d", ptsTod(pts));
  const hit = document.createElementNS("http://www.w3.org/2000/svg", "path");
  hit.setAttribute("class", "conn-hit");
  hit.setAttribute("d", ptsTod(pts));
  hit.style.pointerEvents = "stroke";
  g.appendChild(path);
  g.appendChild(hit);

  let labelEl = null,
    labelHandleEl = null;
  if (label) {
    if (!connData[key].labelOffset)
      connData[key].labelOffset = { dx: 0, dy: 0 };
    const off = connData[key].labelOffset,
      lpos = getMidLabelPos(pts);
    labelEl = document.createElementNS("http://www.w3.org/2000/svg", "text");
    labelEl.setAttribute("class", "conn-label");
    labelEl.setAttribute("x", lpos.x + off.dx);
    labelEl.setAttribute("y", lpos.y + off.dy);
    labelEl.textContent = label;
    applyLabelOrient(labelEl, pts, off);
    g.appendChild(labelEl);
    labelHandleEl = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "circle",
    );
    labelHandleEl.setAttribute("class", "label-handle");
    labelHandleEl.setAttribute("r", "5");
    labelHandleEl.setAttribute("cx", lpos.x + off.dx - 14);
    labelHandleEl.setAttribute("cy", lpos.y + off.dy);
    labelHandleEl.style.display = "none";
    g.appendChild(labelHandleEl);
  }

  const handles = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const isH = Math.abs(pts[i].y - pts[i + 1].y) < 1,
      mx = (pts[i].x + pts[i + 1].x) / 2,
      my = (pts[i].y + pts[i + 1].y) / 2;
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("class", "seg-handle");
    rect.setAttribute("width", "10");
    rect.setAttribute("height", "10");
    rect.setAttribute("x", mx - 5);
    rect.setAttribute("y", my - 5);
    rect.setAttribute("rx", "2");
    rect.style.display = "none";
    rect.style.cursor = isH ? "ns-resize" : "ew-resize";
    rect.style.pointerEvents = "all";
    g.appendChild(rect);
    handles.push({ el: rect, segIdx: i, mx, my, isH, draggable: true });
    attachSegDrag(rect, key, i, isH, !isH);
  }

  [pts[0], pts[pts.length - 1]].forEach((p) => {
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("class", "endpt");
    c.setAttribute("r", "5");
    c.setAttribute("cx", p.x);
    c.setAttribute("cy", p.y);
    c.style.display = "none";
    g.appendChild(c);
  });

  const defs = svgEl.querySelector("defs");
  if (defs && defs.nextSibling) {
    svgEl.insertBefore(g, defs.nextSibling);
  } else {
    svgEl.appendChild(g);
  }

  connectors[key] = {
    pts,
    group: g,
    pathEl: path,
    hitEl: hit,
    handles,
    labelEl,
    labelHandleEl,
    srcEl,
    tgtEl,
    color,
    label,
    srcOffX,
    tgtOffX,
    meta,
  };

  hit.addEventListener("mousedown", (e) => {
    e.stopPropagation();
    if (selectedConn && selectedConn !== key) return;
    selectConn(key);
  });
  path.addEventListener("mousedown", (e) => {
    e.stopPropagation();
    if (selectedConn && selectedConn !== key) return;
    selectConn(key);
  });
  if (labelEl) {
    labelEl.addEventListener("mousedown", (e) => {
      e.stopPropagation();
      if (selectedConn && selectedConn !== key) return;
      selectConn(key);
      attachLabelDrag(e, key);
    });
    if (labelHandleEl)
      labelHandleEl.addEventListener("mousedown", (e) => {
        e.stopPropagation();
        if (selectedConn && selectedConn !== key) return;
        attachLabelDrag(e, key);
      });
  }
}

function attachLabelDrag(ev, key) {
  const c = connectors[key];
  if (!c.labelEl) return;
  const startX = ev.clientX,
    startY = ev.clientY,
    origOff = { ...connData[key].labelOffset };
  function onMove(e) {
    const newOff = {
      dx: origOff.dx + (e.clientX - startX) / currentZoom,
      dy: origOff.dy + (e.clientY - startY) / currentZoom,
    };
    connData[key].labelOffset = newOff;
    const lpos = getMidLabelPos(c.pts);
    c.labelEl.setAttribute("x", lpos.x + newOff.dx);
    c.labelEl.setAttribute("y", lpos.y + newOff.dy);
    applyLabelOrient(c.labelEl, c.pts, newOff);
    if (c.labelHandleEl) {
      c.labelHandleEl.setAttribute("cx", lpos.x + newOff.dx - 14);
      c.labelHandleEl.setAttribute("cy", lpos.y + newOff.dy);
    }
  }
  function onUp() {
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("mouseup", onUp);
  }
  window.addEventListener("mousemove", onMove);
  window.addEventListener("mouseup", onUp);
}

function getMidLabelPos(pts) {
  if (!pts || pts.length < 2) return { x: 0, y: 0 };
  const distEl = document.getElementById("conf-label-dist");
  let distLeft = distEl ? parseFloat(distEl.value) : 28;
  for (let i = pts.length - 1; i > 0; i--) {
    const p2 = pts[i],
      p1 = pts[i - 1],
      dx = p1.x - p2.x,
      dy = p1.y - p2.y,
      len = Math.sqrt(dx * dx + dy * dy);
    if (distLeft <= len) {
      const t = len === 0 ? 0 : distLeft / len;
      return { x: p2.x + dx * t, y: p2.y + dy * t };
    } else distLeft -= len;
  }
  return { x: pts[0].x, y: pts[0].y };
}

function selectConn(key) {
  if (selectedConn && selectedConn !== key) deselectConn(selectedConn);
  selectedConn = key;
  const c = connectors[key];
  c.pathEl.classList.add("selected");
  c.handles.forEach((h) => (h.el.style.display = "block"));
  c.group
    .querySelectorAll(".endpt")
    .forEach((n) => (n.style.display = "block"));
  if (c.labelHandleEl) c.labelHandleEl.style.display = "block";
  hint.classList.add("show");
  Object.keys(connectors).forEach((k) => {
    if (k !== key) {
      connectors[k].hitEl.style.pointerEvents = "none";
      connectors[k].pathEl.style.pointerEvents = "none";
      if (connectors[k].labelEl)
        connectors[k].labelEl.style.pointerEvents = "none";
    }
  });
}

function deselectConn(key) {
  if (!key || !connectors[key]) return;
  const c = connectors[key];
  c.pathEl.classList.remove("selected");
  c.handles.forEach((h) => (h.el.style.display = "none"));
  c.group.querySelectorAll(".endpt").forEach((n) => (n.style.display = "none"));
  if (c.labelHandleEl) c.labelHandleEl.style.display = "none";
  Object.keys(connectors).forEach((k) => {
    if (connectors[k].group.style.pointerEvents !== "none") {
      connectors[k].hitEl.style.pointerEvents = "stroke";
      connectors[k].pathEl.style.pointerEvents = "stroke";
      if (connectors[k].labelEl)
        connectors[k].labelEl.style.pointerEvents = "all";
    }
  });
}

function deselectAll() {
  if (selectedConn) {
    deselectConn(selectedConn);
    selectedConn = null;
  }
  document
    .querySelectorAll(".node.sel")
    .forEach((n) => n.classList.remove("sel"));
  selectedOrder = [];
  hint.classList.remove("show");
}

const lassoBox = document.getElementById("lasso-box");
let isLasso = false,
  lassoStart = { x: 0, y: 0 };

wrap.addEventListener("mousedown", (e) => {
  if (e.target !== wrap && e.target !== inner && e.target !== svgEl) return;
  deselectAll();
  isLasso = true;
  const rect = inner.getBoundingClientRect();
  lassoStart = {
    x: (e.clientX - rect.left) / currentZoom,
    y: (e.clientY - rect.top) / currentZoom,
  };
  lassoBox.style.left = lassoStart.x + "px";
  lassoBox.style.top = lassoStart.y + "px";
  lassoBox.style.width = "0px";
  lassoBox.style.height = "0px";
  lassoBox.style.display = "block";
  e.preventDefault();
  wrap.focus();
});

window.addEventListener("mousemove", (e) => {
  if (!isLasso) return;
  const rect = inner.getBoundingClientRect();
  const curX = (e.clientX - rect.left) / currentZoom,
    curY = (e.clientY - rect.top) / currentZoom;
  const x = Math.min(lassoStart.x, curX),
    y = Math.min(lassoStart.y, curY),
    w = Math.abs(curX - lassoStart.x),
    h = Math.abs(curY - lassoStart.y);
  lassoBox.style.left = x + "px";
  lassoBox.style.top = y + "px";
  lassoBox.style.width = w + "px";
  lassoBox.style.height = h + "px";
  document.querySelectorAll(".node").forEach((n) => {
    const isVisible = n.style.pointerEvents !== "none";
    const nx = parseFloat(n.style.left) || 0,
      ny = parseFloat(n.style.top) || 0,
      nw = n.offsetWidth,
      nh = n.offsetHeight;
    const hit =
      isVisible && nx < x + w && nx + nw > x && ny < y + h && ny + nh > y;
    if (hit) {
      if (!n.classList.contains("sel")) {
        n.classList.add("sel");
        selectedOrder.push(n);
      }
    } else {
      if (n.classList.contains("sel")) {
        n.classList.remove("sel");
        selectedOrder = selectedOrder.filter((s) => s !== n);
      }
    }
  });
});

window.addEventListener("mouseup", (e) => {
  if (!isLasso) return;
  isLasso = false;
  lassoBox.style.display = "none";
});

function attachSegDrag(hEl, key, sIdx, isH, isV) {
  hEl.addEventListener("mousedown", (e) => {
    e.stopPropagation();
    const startX = e.clientX,
      startY = e.clientY,
      c = connectors[key],
      orig = c.pts.map((p) => ({ ...p })),
      lastIdx = c.pts.length - 1;
    function onMove(ev) {
      const dx = (ev.clientX - startX) / currentZoom,
        dy = (ev.clientY - startY) / currentZoom,
        pts = c.pts;
      if (isH) {
        const s = getAnchor(c.srcEl, "bottom", c.srcOffX),
          t = getAnchor(c.tgtEl, "top", c.tgtOffX);
        let newY = Math.max(s.y + 10, Math.min(t.y - 10, orig[sIdx].y + dy));
        if (!ev.shiftKey) {
          for (let k in connectors) {
            if (k === key) continue;
            for (let j = 0; j < connectors[k].pts.length - 1; j++) {
              if (
                Math.abs(connectors[k].pts[j].y - connectors[k].pts[j + 1].y) <
                  1 &&
                Math.abs(newY - connectors[k].pts[j].y) <= 10
              ) {
                newY = connectors[k].pts[j].y;
                break;
              }
            }
          }
        }
        pts[sIdx].y = pts[sIdx + 1].y = newY;
        if (sIdx > 0) pts[sIdx - 1].y = newY;
        if (sIdx + 2 < pts.length) pts[sIdx + 2].y = newY;
        pts[0] = { x: s.x, y: s.y };
        pts[lastIdx] = { x: t.x, y: t.y };
        connData[key].midRatio = (pts[1].y - s.y) / (t.y - s.y || 1);
      } else if (isV) {
        let newX = orig[sIdx].x + dx;
        if (!ev.shiftKey) {
          for (let k in connectors) {
            if (k === key) continue;
            for (let j = 0; j < connectors[k].pts.length - 1; j++) {
              if (
                Math.abs(connectors[k].pts[j].x - connectors[k].pts[j + 1].x) <
                  1 &&
                Math.abs(newX - connectors[k].pts[j].x) <= 10
              ) {
                newX = connectors[k].pts[j].x;
                break;
              }
            }
          }
        }
        if (pts.length === 4 && sIdx === 0) {
          c.srcOffX = connData[key].srcOffX =
            newX - getAnchor(c.srcEl, "bottom", 0).x;
          const s = getAnchor(c.srcEl, "bottom", c.srcOffX),
            t = getAnchor(c.tgtEl, "top", c.tgtOffX);
          pts[0] = { x: s.x, y: s.y };
          pts[1] = { x: s.x, y: pts[1].y };
          pts[2] = { x: t.x, y: pts[1].y };
          pts[3] = { x: t.x, y: t.y };
        } else if (pts.length === 4 && sIdx === lastIdx - 1) {
          c.tgtOffX = connData[key].tgtOffX =
            newX - getAnchor(c.tgtEl, "top", 0).x;
          const s = getAnchor(c.srcEl, "bottom", c.srcOffX),
            t = getAnchor(c.tgtEl, "top", c.tgtOffX);
          pts[0] = { x: s.x, y: s.y };
          pts[1] = { x: s.x, y: pts[1].y };
          pts[2] = { x: t.x, y: pts[1].y };
          pts[3] = { x: t.x, y: t.y };
        } else {
          pts[sIdx].x = pts[sIdx + 1].x = newX;
          if (sIdx > 0) pts[sIdx - 1].x = newX;
          if (sIdx + 2 < pts.length) pts[sIdx + 2].x = newX;
          pts[0] = getAnchor(c.srcEl, "bottom", c.srcOffX);
          pts[lastIdx] = getAnchor(c.tgtEl, "top", c.tgtOffX);
        }
      }
      refreshConn(key);
    }
    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  });
}

function refreshConn(key) {
  const c = connectors[key],
    pts = c.pts;
  c.hitEl.setAttribute("d", ptsTod(pts));
  setTimeout(rebuildAllPaths, 0);
  const crc = c.group.querySelectorAll(".endpt");
  if (crc[0]) {
    crc[0].setAttribute("cx", pts[0].x);
    crc[0].setAttribute("cy", pts[0].y);
  }
  if (crc[1]) {
    crc[1].setAttribute("cx", pts[pts.length - 1].x);
    crc[1].setAttribute("cy", pts[pts.length - 1].y);
  }
  c.handles.forEach((h, i) => {
    if (i >= pts.length - 1) return;
    const mx = (pts[i].x + pts[i + 1].x) / 2,
      my = (pts[i].y + pts[i + 1].y) / 2;
    h.el.setAttribute("x", mx - 5);
    h.el.setAttribute("y", my - 5);
    h.mx = mx;
    h.my = my;
  });
  if (c.labelEl) {
    const lpos = getMidLabelPos(pts),
      off = connData[key]?.labelOffset || { dx: 0, dy: 0 };
    c.labelEl.setAttribute("x", lpos.x + off.dx);
    c.labelEl.setAttribute("y", lpos.y + off.dy);
    applyLabelOrient(c.labelEl, pts, off);
    if (c.labelHandleEl) {
      c.labelHandleEl.setAttribute("cx", lpos.x + off.dx - 14);
      c.labelHandleEl.setAttribute("cy", lpos.y + off.dy);
    }
  }
}

function refreshAllConns() {
  Object.keys(connectors).forEach((key) => {
    const c = connectors[key],
      s = getAnchor(c.srcEl, "bottom", c.srcOffX),
      t = getAnchor(c.tgtEl, "top", c.tgtOffX);
    const effTX = Math.abs(s.x - t.x) <= STRAIGHT_THRESHOLD ? s.x : t.x,
      midY = s.y + (connData[key]?.midRatio ?? 0.5) * (t.y - s.y);
    c.pts = [
      { x: s.x, y: s.y },
      { x: s.x, y: midY },
      { x: effTX, y: midY },
      { x: effTX, y: t.y },
    ];
    c.pts.length !== c.handles.length + 1
      ? buildConnector(
          key,
          c.srcEl,
          c.tgtEl,
          c.color,
          c.label,
          c.srcOffX,
          c.tgtOffX,
          c.meta,
        )
      : refreshConn(key);
  });
}

function alignSelected(type) {
  if (selectedOrder.length < 2)
    return alert("Pilih minimal 2 kotak (tahan Ctrl saat klik).");
  const refPos = {
    x: parseFloat(selectedOrder[0].style.left) || 0,
    y: parseFloat(selectedOrder[0].style.top) || 0,
    w: selectedOrder[0].offsetWidth,
    h: selectedOrder[0].offsetHeight,
  };
  for (let i = 1; i < selectedOrder.length; i++) {
    const el = selectedOrder[i];
    let x = parseFloat(el.style.left) || 0,
      y = parseFloat(el.style.top) || 0,
      w = el.offsetWidth,
      h = el.offsetHeight;
    if (type === "top") y = refPos.y;
    else if (type === "bottom") y = refPos.y + refPos.h - h;
    else if (type === "left") x = refPos.x;
    else if (type === "right") x = refPos.x + refPos.w - w;
    else if (type === "center-h") x = refPos.x + (refPos.w - w) / 2;
    else if (type === "center-v") y = refPos.y + (refPos.h - h) / 2;
    el.style.left = x + "px";
    el.style.top = y + "px";
    nodePositions[el.id] = { x, y, w, h };
  }
  refreshAllConns();
}

let isNodeDragging = false,
  dragStartX = 0,
  dragStartY = 0,
  activeNodeDrags = [];

function createNode(id, text, cls, defX, defY, width) {
  const div = document.createElement("div");
  div.id = id;
  div.className = "node " + cls;
  div.innerText = text;
  const p = nodePositions[id];
  div.style.left = (p?.x ?? defX) + "px";
  div.style.top = (p?.y ?? defY) + "px";
  div.style.width = (p?.w ?? width) + "px";
  if (p?.h) div.style.height = p.h + "px";
  if (!p) nodePositions[id] = { x: defX, y: defY, w: width, h: 44 };
  makeDraggable(div);
  inner.appendChild(div);
  nodeResizeObserver.observe(div);
  return div;
}

function makeDraggable(el) {
  el.addEventListener("mousedown", (e) => {
    if (
      e.target !== el ||
      (e.offsetX >= el.offsetWidth - 18 && e.offsetY >= el.offsetHeight - 18)
    )
      return;
    isLasso = false;
    lassoBox.style.display = "none";
    if (e.ctrlKey || e.metaKey) {
      if (el.classList.contains("sel")) {
        el.classList.remove("sel");
        selectedOrder = selectedOrder.filter((n) => n !== el);
      } else {
        el.classList.add("sel");
        selectedOrder.push(el);
      }
    } else {
      if (!el.classList.contains("sel")) {
        document
          .querySelectorAll(".node.sel")
          .forEach((n) => n.classList.remove("sel"));
        selectedOrder = [el];
        el.classList.add("sel");
      }
    }
    if (selectedConn) {
      deselectConn(selectedConn);
      selectedConn = null;
      hint.classList.remove("show");
    }
    isNodeDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    activeNodeDrags = Array.from(document.querySelectorAll(".node.sel")).map(
      (n) => ({ el: n, il: n.offsetLeft, it: n.offsetTop }),
    );
    activeNodeDrags.forEach((d) => (d.el.style.cursor = "grabbing"));
    e.preventDefault();
    wrap.focus();
  });
}

window.addEventListener("mousemove", (e) => {
  if (!isNodeDragging) return;
  let dx = (e.clientX - dragStartX) / currentZoom,
    dy = (e.clientY - dragStartY) / currentZoom;
  if (e.shiftKey) Math.abs(dx) > Math.abs(dy) ? (dy = 0) : (dx = 0);
  activeNodeDrags.forEach((d) => {
    d.el.style.left = `${d.il + dx}px`;
    d.el.style.top = `${d.it + dy}px`;
  });
  refreshAllConns();
});

window.addEventListener("mouseup", () => {
  if (!isNodeDragging) return;
  isNodeDragging = false;
  activeNodeDrags.forEach((d) => {
    d.el.style.cursor = "move";
    nodePositions[d.el.id] = {
      x: parseInt(d.el.style.left, 10),
      y: parseInt(d.el.style.top, 10),
      w: d.el.offsetWidth,
      h: d.el.offsetHeight,
    };
  });
  activeNodeDrags = [];
});

window.addEventListener("keydown", (e) => {
  if (["INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName)) return;
  const sel = document.querySelectorAll(".node.sel");
  if (sel.length === 0) return;
  let dx = 0,
    dy = 0,
    step = e.shiftKey ? 10 : 2;
  if (e.key === "ArrowUp") dy = -step;
  else if (e.key === "ArrowDown") dy = step;
  else if (e.key === "ArrowLeft") dx = -step;
  else if (e.key === "ArrowRight") dx = step;
  else return;
  e.preventDefault();
  sel.forEach((el) => {
    el.style.left = (parseFloat(el.style.left) || 0) + dx + "px";
    el.style.top = (parseFloat(el.style.top) || 0) + dy + "px";
    nodePositions[el.id] = {
      x: parseInt(el.style.left, 10),
      y: parseInt(el.style.top, 10),
      w: el.offsetWidth,
      h: el.offsetHeight,
    };
  });
  refreshAllConns();
});

// ════════ MAIN RENDER ════════
function renderCanvas() {
  deselectAll();
  Array.from(svgEl.children).forEach((c) => {
    if (c.tagName !== "defs") c.remove();
  });
  inner.querySelectorAll(".node").forEach((n) => {
    nodeResizeObserver.unobserve(n);
    n.remove();
  });
  Object.keys(connectors).forEach((k) => delete connectors[k]);

  syncTraceColors();
  renderTraceColorGrid();

  const outCount = {},
    inCount = {},
    outTotal = {},
    inTotal = {};
  function regConn(s, t) {
    outTotal[s] = (outTotal[s] || 0) + 1;
    inTotal[t] = (inTotal[t] || 0) + 1;
  }
  function nid(text, pre) {
    return pre + "_" + cleanId(text);
  }
  let hasQ = false,
    hasQi = false;

  const LAYOUT = {
    nodeWidth: 180,
    nodeHeight: 44,
    baseVerticalGap: 80,
    laneSpacing: 14,
    horizontalGap: 40,
  };

  let totalKegiatan = 0;
  state.forEach((t1) => {
    totalKegiatan += t1.t2.length;
  });
  totalKegiatan = Math.max(1, totalKegiatan);

  const dynamicVerticalGap = Math.max(
    LAYOUT.baseVerticalGap,
    totalKegiatan * LAYOUT.laneSpacing + 30,
  );
  const stepY = LAYOUT.nodeHeight + dynamicVerticalGap;

  const levelY = {
    root: 40,
    tahap: 40 + stepY,
    kegiatan: 40 + stepY * 2,
    p: 40 + stepY * 3,
    s: 40 + stepY * 4,
    t: 40 + stepY * 5,
    q: 40 + stepY * 6,
    qi: 40 + stepY * 7,
  };

  state.forEach((t1) => {
    regConn("root", "t1_" + t1.id);
    t1.t2.forEach((t2) => {
      regConn("t1_" + t1.id, "t2_" + t2.id);
      t2.impacts.forEach((imp) => {
        if (imp.q && imp.q.trim() !== "") hasQ = true;
        if (imp.qi && imp.qi.trim() !== "") hasQi = true;
        if (imp.p) {
          const pId = nid(imp.p, "p");
          regConn("t2_" + t2.id, pId);
          if (imp.s) {
            const sId = nid(imp.s, "s");
            regConn(pId, sId);
            if (imp.t) {
              const tId = nid(imp.t, "t");
              regConn(sId, tId);
              if (imp.q) {
                const qId = nid(imp.q, "q");
                regConn(tId, qId);
                if (imp.qi) regConn(qId, nid(imp.qi, "qi"));
              }
            }
          }
        }
      });
    });
  });

  const legQ = document.getElementById("leg-q"),
    legQi = document.getElementById("leg-qi");
  if (legQ) legQ.style.display = hasQ ? "" : "none";
  if (legQi) legQi.style.display = hasQi ? "" : "none";

  const created = {};
  function getOrCreate(text, pre, cls, dx, dy) {
    if (!text) return null;
    const uid = nid(text, pre);
    if (created[uid]) return created[uid];
    const meta = { in: inTotal[uid] || 1, out: outTotal[uid] || 1 };
    const w =
      Math.max(meta.in, meta.out) > 4
        ? LAYOUT.nodeWidth + (Math.max(meta.in, meta.out) - 4) * 30
        : LAYOUT.nodeWidth;
    const el = createNode(uid, text, cls, dx, dy, w);
    created[uid] = el;
    return el;
  }

  function connect(
    srcEl,
    tgtEl,
    color,
    label = "",
    laneIndex = 0,
    totalLanes = 1,
    meta = {},
  ) {
    if (!srcEl || !tgtEl) return;
    const si = srcEl.id,
      ti = tgtEl.id;
    const soN = (outCount[si] = (outCount[si] || 0) + 1),
      soT = outTotal[si] || 1;
    const tiN = (inCount[ti] = (inCount[ti] || 0) + 1),
      tiT = inTotal[ti] || 1;
    const srcW = srcEl.offsetWidth || LAYOUT.nodeWidth,
      tgtW = tgtEl.offsetWidth || LAYOUT.nodeWidth;

    let sOff = 0,
      tOff = 0;
    if (si === "root" || si.startsWith("t1_") || si.startsWith("t2_")) {
      sOff = 0;
    } else {
      sOff = (soN / (soT + 1) - 0.5) * srcW * 0.7;
    }
    tOff = (tiN / (tiT + 1) - 0.5) * tgtW * 0.7;

    const key = `${si}__${ti}__${soN}`;

    if (!connData[key]) connData[key] = {};

    if (connData[key].midRatio === undefined) {
      connData[key].midRatio = (laneIndex + 1) / (totalLanes + 1);
    }
    if (connData[key].srcOffX !== undefined) {
      sOff = connData[key].srcOffX;
    } else {
      connData[key].srcOffX = sOff;
    }
    if (connData[key].tgtOffX !== undefined) {
      tOff = connData[key].tgtOffX;
    } else {
      connData[key].tgtOffX = tOff;
    }

    buildConnector(key, srcEl, tgtEl, color, label, sOff, tOff, meta);
  }

  const rootEl = createNode(
    "root",
    document.getElementById("project_title").value,
    "n-root",
    0,
    levelY.root,
    LAYOUT.nodeWidth + 40,
  );

  let currentX = 50,
    g2c = 0;

  state.forEach((t1) => {
    let t1StartX = currentX,
      t2Nodes = [],
      t2XPositions = [];

    if (t1.t2.length === 0) {
      currentX += LAYOUT.nodeWidth + LAYOUT.horizontalGap;
    } else {
      t1.t2.forEach((t2) => {
        const color = getColor(g2c);
        const currentLane = g2c;
        g2c++;

        let branchXs = [];
        if (t2.impacts.length === 0) {
          branchXs.push(currentX);
          currentX += LAYOUT.nodeWidth + LAYOUT.horizontalGap;
        } else {
          t2.impacts.forEach(() => {
            branchXs.push(currentX);
            currentX += LAYOUT.nodeWidth + LAYOUT.horizontalGap;
          });
        }

        let t2X = (branchXs[0] + branchXs[branchXs.length - 1]) / 2;
        const t2El = createNode(
          "t2_" + t2.id,
          t2.text,
          "n-t2",
          t2X,
          levelY.kegiatan,
          LAYOUT.nodeWidth,
        );
        t2Nodes.push(t2El);
        t2XPositions.push(t2X);

        t2.impacts.forEach((imp, j) => {
          let impX = branchXs[j];
          const t1Text = t1.text || "Tahap Kosong";
          const t2Text = t2.text || "Kegiatan Kosong";

          const l_p = imp.l_p?.trim() || "Tanpa Label";
          const l_s = imp.l_s?.trim() || "Tanpa Label";
          const l_t = imp.l_t?.trim() || "Tanpa Label";
          const l_q = imp.l_q?.trim() || "Tanpa Label";
          const l_qi = imp.l_qi?.trim() || "Tanpa Label";

          const dsP = [];
          if (imp.p) dsP.push(l_p);
          if (imp.s) dsP.push(l_s);
          if (imp.t) dsP.push(l_t);
          if (imp.q) dsP.push(l_q);
          if (imp.qi) dsP.push(l_qi);
          const dsS = [];
          if (imp.s) dsS.push(l_s);
          if (imp.t) dsS.push(l_t);
          if (imp.q) dsS.push(l_q);
          if (imp.qi) dsS.push(l_qi);
          const dsT = [];
          if (imp.t) dsT.push(l_t);
          if (imp.q) dsT.push(l_q);
          if (imp.qi) dsT.push(l_qi);
          const dsQ = [];
          if (imp.q) dsQ.push(l_q);
          if (imp.qi) dsQ.push(l_qi);
          const dsQi = [];
          if (imp.qi) dsQi.push(l_qi);

          if (imp.p) {
            const pEl = getOrCreate(imp.p, "p", "n-p", impX, levelY.p);
            connect(t2El, pEl, color, imp.l_p, currentLane, totalKegiatan, {
              type: "imp",
              tahap: t1Text,
              kegiatan: t2Text,
              ds: dsP,
            });
            if (imp.s) {
              const sEl = getOrCreate(imp.s, "s", "n-s", impX, levelY.s);
              connect(pEl, sEl, color, imp.l_s, currentLane, totalKegiatan, {
                type: "imp",
                tahap: t1Text,
                kegiatan: t2Text,
                ds: dsS,
              });
              if (imp.t) {
                const tEl = getOrCreate(imp.t, "t", "n-t", impX, levelY.t);
                connect(sEl, tEl, color, imp.l_t, currentLane, totalKegiatan, {
                  type: "imp",
                  tahap: t1Text,
                  kegiatan: t2Text,
                  ds: dsT,
                });
                if (imp.q) {
                  const qEl = getOrCreate(imp.q, "q", "n-q", impX, levelY.q);
                  connect(
                    tEl,
                    qEl,
                    color,
                    imp.l_q,
                    currentLane,
                    totalKegiatan,
                    {
                      type: "imp",
                      tahap: t1Text,
                      kegiatan: t2Text,
                      ds: dsQ,
                    },
                  );
                  if (imp.qi) {
                    const qiEl = getOrCreate(
                      imp.qi,
                      "qi",
                      "n-qi",
                      impX,
                      levelY.qi,
                    );
                    connect(
                      qEl,
                      qiEl,
                      color,
                      imp.l_qi,
                      currentLane,
                      totalKegiatan,
                      {
                        type: "imp",
                        tahap: t1Text,
                        kegiatan: t2Text,
                        ds: dsQi,
                      },
                    );
                  }
                }
              }
            }
          }
        });
      });
    }

    let t1X =
      t2XPositions.length > 0
        ? (t2XPositions[0] + t2XPositions[t2XPositions.length - 1]) / 2
        : t1StartX;
    const t1Text = t1.text || "Tahap Kosong";
    const t1El = createNode(
      "t1_" + t1.id,
      t1.text,
      "n-t1",
      t1X,
      levelY.tahap,
      LAYOUT.nodeWidth,
    );

    connect(rootEl, t1El, "#64748b", "", 0, 1, {
      type: "t1",
      tahap: t1Text,
    });
    t2Nodes.forEach((t2El, i) => {
      const t2Text = t1.t2[i].text || "Kegiatan Kosong";
      connect(t1El, t2El, "#64748b", "", i, t2Nodes.length, {
        type: "t2",
        tahap: t1Text,
        kegiatan: t2Text,
      });
    });
    currentX += LAYOUT.horizontalGap;
  });

  if (!nodePositions["root"] || nodePositions["root"].x === 0) {
    let cx = Math.max(
      currentX / 2 - LAYOUT.nodeWidth / 2,
      wrap.offsetWidth / 2 - LAYOUT.nodeWidth / 2,
    );
    rootEl.style.left = cx + "px";
    nodePositions["root"] = { ...nodePositions["root"], x: cx };
  }
  setTimeout(() => {
    rebuildAllPaths();
    applyCanvasFilters();
  }, 80);
}

wrap.addEventListener("scroll", () => setTimeout(rebuildAllPaths, 0));

window.addEventListener("load", () => {
  state.push({
    id: 1,
    text: "Pra Konstruksi",
    t2: [
      {
        id: 11,
        text: "Pengadaan Lahan",
        impacts: [
          {
            id: 111,
            p: "Kepemilikan Lahan",
            s: "Persepsi",
            t: "Konflik",
            q: "",
            qi: "",
            l_p: "-P",
            l_s: "-P",
            l_t: "DPH",
            l_q: "",
            l_qi: "",
          },
        ],
      },
      {
        id: 12,
        text: "Penerimaan Tenaga Kerja",
        impacts: [
          {
            id: 121,
            p: "Kesempatan Kerja",
            s: "Persepsi",
            t: "",
            q: "",
            qi: "",
            l_p: "+TP",
            l_s: "+P",
            l_t: "",
            l_q: "",
            l_qi: "",
          },
        ],
      },
    ],
  });
  applyNodeColors();
  loadNodeColorPickers();
  renderTraceColorGrid();
  renderInputs();
  renderCustomLegendsUI();
  renderCanvasLegends();
  renderSubTabs();
  setTimeout(() => {
    renderCanvas();
  }, 100);
});
