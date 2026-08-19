(function(){
"use strict";

/* ============================================================
   STATE
   ============================================================ */
const PALETTE = ["#22e0d0","#b98bff","#ff8a5c","#66d17a","#ffd166","#5cb8ff","#ff6bb3","#a3e635","#f97373","#38e5c0","#c084fc","#fbbf24"];

const DEFAULTS = {
  mode: "flex",
  flex: {
    flexDirection:"row", flexWrap:"nowrap", justifyContent:"flex-start",
    alignItems:"stretch", alignContent:"stretch", gap:12
  },
  grid: {
    gridTemplateColumns:"1fr 1fr 1fr", gridTemplateRows:"1fr 1fr",
    gridAutoFlow:"row", justifyItems:"stretch", alignItems:"stretch",
    justifyContent:"start", alignContent:"start", gap:12
  }
};

function freshItems(n){
  const arr = [];
  for(let i=0;i<n;i++){
    arr.push({
      id: "it-"+i+"-"+Date.now()+Math.floor(Math.random()*999),
      label: (i+1),
      color: PALETTE[i % PALETTE.length],
      order:0, flexGrow:0, flexShrink:1, flexBasis:"auto", alignSelf:"auto",
      gridColumn:"auto", gridRow:"auto", justifySelf:"auto"
    });
  }
  return arr;
}

let state = {
  mode: "flex",
  flex: {...DEFAULTS.flex},
  grid: {...DEFAULTS.grid},
  items: freshItems(6),
  selectedId: null,
  viewport: "desktop",
  gridLines: true
};

let challenge = null; // {mode, target:{...}, desc}

/* ============================================================
   DOM refs
   ============================================================ */
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
const playground = $("#playground");
const gridOverlay = $("#gridOverlay");
const axisIndicator = $("#axisIndicator");
const containerControls = $("#containerControls");
const itemControls = $("#itemControls");
const codeBody = $("#codeBody");

/* ============================================================
   TOASTS
   ============================================================ */
function toast(msg, type="info", icon){
  const stack = $("#toast-stack");
  const el = document.createElement("div");
  el.className = "toast "+type;
  const ic = icon || (type==="success"?"fa-circle-check":type==="warn"?"fa-triangle-exclamation":"fa-circle-info");
  el.innerHTML = `<i class="fa-solid ${ic}"></i><span>${msg}</span>`;
  stack.appendChild(el);
  setTimeout(()=>{ el.classList.add("out"); setTimeout(()=>el.remove(),260); }, 2600);
}

/* ============================================================
   PROPERTY DEFINITIONS (for control generation + tooltips)
   ============================================================ */
const FLEX_CONTAINER_PROPS = [
  { key:"flexDirection", label:"flex-direction", diff:"beg", type:"opt",
    options:[
      {v:"row", ic:"fa-arrow-right", tip:"Items placed left→right (default)"},
      {v:"row-reverse", ic:"fa-arrow-left", tip:"Items placed right→left"},
      {v:"column", ic:"fa-arrow-down", tip:"Items placed top→bottom"},
      {v:"column-reverse", ic:"fa-arrow-up", tip:"Items placed bottom→top"},
    ]},
  { key:"flexWrap", label:"flex-wrap", diff:"beg", type:"opt",
    options:[
      {v:"nowrap", ic:"fa-minus", tip:"Force items onto a single line"},
      {v:"wrap", ic:"fa-bars", tip:"Items wrap onto new lines as needed"},
      {v:"wrap-reverse", ic:"fa-bars", tip:"Wraps onto new lines in reverse order"},
    ]},
  { key:"justifyContent", label:"justify-content", diff:"beg", type:"opt", cols:3,
    options:[
      {v:"flex-start", ic:"fa-align-left", tip:"Pack items at the start of the main axis"},
      {v:"flex-end", ic:"fa-align-right", tip:"Pack items at the end of the main axis"},
      {v:"center", ic:"fa-align-center", tip:"Center items on the main axis"},
      {v:"space-between", ic:"fa-arrows-left-right-to-line", tip:"Even gaps between items, none at edges"},
      {v:"space-around", ic:"fa-arrows-left-right", tip:"Even space around each item"},
      {v:"space-evenly", ic:"fa-equals", tip:"Perfectly equal space between & around items"},
    ]},
  { key:"alignItems", label:"align-items", diff:"beg", type:"opt", cols:3,
    options:[
      {v:"stretch", ic:"fa-up-down", tip:"Stretch items to fill the cross axis (default)"},
      {v:"flex-start", ic:"fa-align-left fa-rotate-90", tip:"Align items to cross-axis start"},
      {v:"flex-end", ic:"fa-align-right fa-rotate-90", tip:"Align items to cross-axis end"},
      {v:"center", ic:"fa-align-center fa-rotate-90", tip:"Center items on the cross axis"},
      {v:"baseline", ic:"fa-text-height", tip:"Align items along their text baseline"},
    ]},
  { key:"alignContent", label:"align-content", diff:"int", type:"opt", cols:3,
    options:[
      {v:"stretch", ic:"fa-up-down", tip:"Stretch wrapped lines to fill container (default)"},
      {v:"flex-start", ic:"fa-align-left fa-rotate-90", tip:"Pack wrapped lines at start"},
      {v:"flex-end", ic:"fa-align-right fa-rotate-90", tip:"Pack wrapped lines at end"},
      {v:"center", ic:"fa-align-center fa-rotate-90", tip:"Center wrapped lines"},
      {v:"space-between", ic:"fa-arrows-left-right-to-line", tip:"Even gaps between wrapped lines"},
      {v:"space-around", ic:"fa-arrows-left-right", tip:"Even space around wrapped lines"},
    ], note:"Only visible effect when items wrap onto multiple lines."},
];

const GRID_CONTAINER_PROPS_TEXT = [
  { key:"gridTemplateColumns", label:"grid-template-columns", diff:"beg", tip:"Defines the number & size of columns, e.g. '1fr 1fr 1fr' or 'repeat(3, 1fr)'" },
  { key:"gridTemplateRows", label:"grid-template-rows", diff:"beg", tip:"Defines the number & size of rows, e.g. '1fr 1fr'" },
];
const GRID_CONTAINER_PROPS_OPT = [
  { key:"gridAutoFlow", label:"grid-auto-flow", diff:"int", type:"opt",
    options:[
      {v:"row", ic:"fa-arrow-right", tip:"Auto-placed items fill rows first"},
      {v:"column", ic:"fa-arrow-down", tip:"Auto-placed items fill columns first"},
      {v:"dense", ic:"fa-compress", tip:"Fills gaps in the grid densely"},
    ]},
  { key:"justifyItems", label:"justify-items", diff:"beg", type:"opt", cols:4,
    options:[
      {v:"stretch", ic:"fa-left-right", tip:"Stretch items to fill their cell horizontally"},
      {v:"start", ic:"fa-align-left", tip:"Align items to the start of their cell"},
      {v:"center", ic:"fa-align-center", tip:"Center items horizontally in their cell"},
      {v:"end", ic:"fa-align-right", tip:"Align items to the end of their cell"},
    ]},
  { key:"alignItems", label:"align-items", diff:"beg", type:"opt", cols:4,
    options:[
      {v:"stretch", ic:"fa-up-down", tip:"Stretch items to fill their cell vertically"},
      {v:"start", ic:"fa-align-left fa-rotate-90", tip:"Align items to the top of their cell"},
      {v:"center", ic:"fa-align-center fa-rotate-90", tip:"Center items vertically in their cell"},
      {v:"end", ic:"fa-align-right fa-rotate-90", tip:"Align items to the bottom of their cell"},
    ]},
  { key:"justifyContent", label:"justify-content", diff:"adv", type:"opt", cols:3,
    options:[
      {v:"start", ic:"fa-align-left", tip:"Pack the whole grid to the start (horizontal)"},
      {v:"center", ic:"fa-align-center", tip:"Center the grid horizontally"},
      {v:"end", ic:"fa-align-right", tip:"Pack the whole grid to the end"},
      {v:"space-between", ic:"fa-arrows-left-right-to-line", tip:"Even gaps between grid tracks"},
      {v:"space-around", ic:"fa-arrows-left-right", tip:"Even space around grid tracks"},
      {v:"space-evenly", ic:"fa-equals", tip:"Perfectly equal spacing of tracks"},
    ], note:"Visible when tracks are smaller than the container."},
  { key:"alignContent", label:"align-content", diff:"adv", type:"opt", cols:3,
    options:[
      {v:"start", ic:"fa-align-left fa-rotate-90", tip:"Pack the whole grid to the top"},
      {v:"center", ic:"fa-align-center fa-rotate-90", tip:"Center the grid vertically"},
      {v:"end", ic:"fa-align-right fa-rotate-90", tip:"Pack the whole grid to the bottom"},
      {v:"space-between", ic:"fa-arrows-left-right-to-line", tip:"Even gaps between grid rows"},
      {v:"space-around", ic:"fa-arrows-left-right", tip:"Even space around grid rows"},
      {v:"space-evenly", ic:"fa-equals", tip:"Perfectly equal vertical spacing"},
    ], note:"Visible when tracks are smaller than the container."},
];

/* ============================================================
   PRESETS
   ============================================================ */
const PRESETS = [
  { name:"Navbar", sub:"space-between row", mode:"flex", icon:"row",
    apply(){ Object.assign(state.flex, {flexDirection:"row", flexWrap:"nowrap", justifyContent:"space-between", alignItems:"center", alignContent:"stretch", gap:12}); setItemCount(4); }},
  { name:"Centered box", sub:"perfect centering", mode:"flex", icon:"center",
    apply(){ Object.assign(state.flex, {flexDirection:"row", flexWrap:"nowrap", justifyContent:"center", alignItems:"center", alignContent:"stretch", gap:12}); setItemCount(1); }},
  { name:"Card row", sub:"wrap + even gaps", mode:"flex", icon:"cards",
    apply(){ Object.assign(state.flex, {flexDirection:"row", flexWrap:"wrap", justifyContent:"flex-start", alignItems:"stretch", alignContent:"flex-start", gap:16}); setItemCount(7); }},
  { name:"Sidebar layout", sub:"fixed + fluid column", mode:"flex", icon:"sidebar",
    apply(){ Object.assign(state.flex, {flexDirection:"row", flexWrap:"nowrap", justifyContent:"flex-start", alignItems:"stretch", alignContent:"stretch", gap:12});
      setItemCount(2); state.items[0].flexGrow=0; state.items[0].flexShrink=0; state.items[0].flexBasis="200px";
      state.items[1].flexGrow=1; state.items[1].flexShrink=1; state.items[1].flexBasis="auto"; }},
  { name:"Card grid", sub:"responsive 3-col grid", mode:"grid", icon:"grid3",
    apply(){ Object.assign(state.grid, {gridTemplateColumns:"1fr 1fr 1fr", gridTemplateRows:"auto auto", gridAutoFlow:"row", justifyItems:"stretch", alignItems:"stretch", justifyContent:"start", alignContent:"start", gap:16}); setItemCount(6); }},
  { name:"Holy grail", sub:"header/side/main/footer", mode:"grid", icon:"holy",
    apply(){ Object.assign(state.grid, {gridTemplateColumns:"180px 1fr 180px", gridTemplateRows:"64px 1fr 64px", gridAutoFlow:"row", justifyItems:"stretch", alignItems:"stretch", justifyContent:"start", alignContent:"start", gap:10});
      setItemCount(5);
      const gc=["1 / 4","1 / 2","2 / 3","3 / 4","1 / 4"], gr=["1 / 2","2 / 3","2 / 3","2 / 3","3 / 4"];
      state.items.forEach((it,i)=>{ it.gridColumn=gc[i]; it.gridRow=gr[i]; }); }},
  { name:"Pricing table", sub:"3 equal centered cards", mode:"grid", icon:"pricing",
    apply(){ Object.assign(state.grid, {gridTemplateColumns:"repeat(3, minmax(140px,220px))", gridTemplateRows:"280px", gridAutoFlow:"row", justifyItems:"stretch", alignItems:"stretch", justifyContent:"center", alignContent:"center", gap:20}); setItemCount(3); }},
  { name:"Dashboard", sub:"asymmetric grid areas", mode:"grid", icon:"dash",
    apply(){ Object.assign(state.grid, {gridTemplateColumns:"1fr 1fr 1fr 1fr", gridTemplateRows:"120px 120px", gridAutoFlow:"row", justifyItems:"stretch", alignItems:"stretch", justifyContent:"start", alignContent:"start", gap:12});
      setItemCount(4);
      const gc=["1 / 3","3 / 5","1 / 2","2 / 5"], gr=["1 / 2","1 / 2","2 / 3","2 / 3"];
      state.items.forEach((it,i)=>{ it.gridColumn=gc[i]; it.gridRow=gr[i]; }); }},
];

function presetIcon(kind){
  const shapes = {
    row:`<span style="width:20%"></span><span style="width:20%"></span><span style="margin-left:auto;width:20%"></span>`,
    center:`<span style="margin:auto;width:40%"></span>`,
    cards:`<span></span><span></span><span></span>`,
    sidebar:`<span style="width:28%"></span><span style="flex:1"></span>`,
    grid3:`<span></span><span></span><span></span>`,
    holy:`<span></span><span></span><span></span>`,
    pricing:`<span></span><span></span><span></span>`,
    dash:`<span></span><span></span><span></span>`,
  };
  return shapes[kind] || `<span></span>`;
}

function renderPresets(){
  const list = $("#presetList");
  list.innerHTML = "";
  PRESETS.forEach((p, i)=>{
    const b = document.createElement("button");
    b.className = "preset-item";
    b.innerHTML = `<div class="p-ic">${presetIcon(p.icon)}</div>
      <div><div class="p-tt">${p.name}</div><div class="p-sub">${p.sub} · ${p.mode}</div></div>`;
    b.addEventListener("click", ()=>{
      state.mode = p.mode;
      p.apply();
      state.selectedId = null;
      syncModeUI();
      renderAll();
      toast(`Preset applied: ${p.name}`, "success");
    });
    list.appendChild(b);
  });
}

/* ============================================================
   CONTROL RENDERING
   ============================================================ */
function diffBadge(d){
  if(!d) return "";
  const map = {beg:["Beginner","diff-beg"], int:["Intermediate","diff-int"], adv:["Advanced","diff-adv"]};
  const [txt,cls] = map[d];
  return `<span class="diff ${cls}">${txt}</span>`;
}

function buildOptField(def, currentVal, onPick){
  const wrap = document.createElement("div");
  wrap.className = "field";
  wrap.innerHTML = `<div class="field-label">${def.label}${diffBadge(def.diff)}</div>`;
  const grid = document.createElement("div");
  grid.className = "opt-grid" + (def.cols===4?" cols-4":def.cols===2?" cols-2":"");
  def.options.forEach(opt=>{
    const b = document.createElement("button");
    b.className = "opt-btn" + (opt.v===currentVal ? " sel":"");
    b.setAttribute("data-tooltip", opt.tip);
    b.innerHTML = `<i class="fa-solid ${opt.ic}"></i><span>${opt.v}</span>`;
    b.addEventListener("click", ()=>onPick(opt.v));
    grid.appendChild(b);
  });
  wrap.appendChild(grid);
  if(def.note){
    const n = document.createElement("div");
    n.style.cssText = "font-size:10.5px;color:var(--text-lo);line-height:1.5;";
    n.textContent = def.note;
    wrap.appendChild(n);
  }
  return wrap;
}

function buildTextField(def, currentVal, onInput){
  const wrap = document.createElement("div");
  wrap.className = "field";
  wrap.innerHTML = `<div class="field-label">${def.label}${diffBadge(def.diff)}</div>`;
  const input = document.createElement("input");
  input.className = "text-input"; input.type = "text"; input.value = currentVal;
  input.setAttribute("data-tooltip", def.tip);
  input.addEventListener("input", ()=>onInput(input.value));
  wrap.appendChild(input);
  return wrap;
}

function buildSliderField(label, val, min, max, unit, onInput, diff){
  const wrap = document.createElement("div");
  wrap.className = "field";
  wrap.innerHTML = `<div class="field-label">${label}${diffBadge(diff)}</div>`;
  const row = document.createElement("div");
  row.className = "slider-row";
  const input = document.createElement("input");
  input.type = "range"; input.min = min; input.max = max; input.value = val;
  const valSpan = document.createElement("span");
  valSpan.className = "slider-val"; valSpan.textContent = val+unit;
  input.addEventListener("input", ()=>{ valSpan.textContent = input.value+unit; onInput(Number(input.value)); });
  row.appendChild(input); row.appendChild(valSpan);
  wrap.appendChild(row);
  return wrap;
}

function renderContainerControls(){
  containerControls.innerHTML = "";
  if(state.mode === "flex"){
    FLEX_CONTAINER_PROPS.forEach(def=>{
      containerControls.appendChild(buildOptField(def, state.flex[def.key], v=>{
        state.flex[def.key] = v; renderAll();
      }));
    });
    containerControls.appendChild(buildSliderField("gap", state.flex.gap, 0, 48, "px", v=>{
      state.flex.gap = v; applyContainerStyles(); regenCode(); updateStatus();
    }, "beg"));
  } else {
    GRID_CONTAINER_PROPS_TEXT.forEach(def=>{
      containerControls.appendChild(buildTextField(def, state.grid[def.key], v=>{
        state.grid[def.key] = v; applyContainerStyles(); renderGridOverlay(); regenCode(); updateStatus();
      }));
    });
    GRID_CONTAINER_PROPS_OPT.forEach(def=>{
      containerControls.appendChild(buildOptField(def, state.grid[def.key], v=>{
        state.grid[def.key] = v; renderAll();
      }));
    });
    containerControls.appendChild(buildSliderField("gap", state.grid.gap, 0, 48, "px", v=>{
      state.grid.gap = v; applyContainerStyles(); renderGridOverlay(); regenCode(); updateStatus();
    }, "beg"));
  }
}

const FLEX_ITEM_OPT = { key:"alignSelf", label:"align-self", diff:"int", type:"opt", cols:3,
  options:[
    {v:"auto", ic:"fa-circle", tip:"Inherit from container's align-items"},
    {v:"flex-start", ic:"fa-align-left fa-rotate-90", tip:"Align this item to cross-axis start"},
    {v:"flex-end", ic:"fa-align-right fa-rotate-90", tip:"Align this item to cross-axis end"},
    {v:"center", ic:"fa-align-center fa-rotate-90", tip:"Center this item on the cross axis"},
    {v:"stretch", ic:"fa-up-down", tip:"Stretch this item to fill the cross axis"},
    {v:"baseline", ic:"fa-text-height", tip:"Align to text baseline"},
  ]};
const GRID_ITEM_OPT = { key:"justifySelf", label:"justify-self", diff:"int", type:"opt", cols:4,
  options:[
    {v:"auto", ic:"fa-circle", tip:"Inherit from container's justify-items"},
    {v:"start", ic:"fa-align-left", tip:"Align to the start of the cell"},
    {v:"center", ic:"fa-align-center", tip:"Center within the cell"},
    {v:"end", ic:"fa-align-right", tip:"Align to the end of the cell"},
  ]};
const GRID_ITEM_OPT2 = { key:"alignSelf", label:"align-self", diff:"int", type:"opt", cols:4,
  options:[
    {v:"auto", ic:"fa-circle", tip:"Inherit from container's align-items"},
    {v:"start", ic:"fa-align-left fa-rotate-90", tip:"Align to top of the cell"},
    {v:"center", ic:"fa-align-center fa-rotate-90", tip:"Center vertically in the cell"},
    {v:"end", ic:"fa-align-right fa-rotate-90", tip:"Align to bottom of the cell"},
  ]};

function renderItemControls(){
  itemControls.innerHTML = "";
  const item = state.items.find(i=>i.id===state.selectedId);
  if(!item){
    itemControls.innerHTML = `<div class="item-select-empty"><i class="fa-solid fa-arrow-pointer"></i>Click an item in the canvas to edit its individual properties.</div>`;
    return;
  }
  const chip = document.createElement("div");
  chip.className = "selected-item-chip";
  chip.innerHTML = `<span class="swatch" style="background:${item.color}"></span> Item ${item.label}`;
  itemControls.appendChild(chip);

  if(state.mode === "flex"){
    itemControls.appendChild(buildSliderField("order", item.order, -5, 5, "", v=>{ item.order=v; applyItemStyles(); regenCode(); }, "adv"));
    itemControls.appendChild(buildSliderField("flex-grow", item.flexGrow, 0, 5, "", v=>{ item.flexGrow=v; applyItemStyles(); regenCode(); }, "int"));
    itemControls.appendChild(buildSliderField("flex-shrink", item.flexShrink, 0, 5, "", v=>{ item.flexShrink=v; applyItemStyles(); regenCode(); }, "int"));
    itemControls.appendChild(buildTextField({label:"flex-basis", diff:"int", tip:"Starting main-axis size before growing/shrinking, e.g. 'auto', '120px', '30%'"}, item.flexBasis, v=>{
      item.flexBasis=v; applyItemStyles(); regenCode();
    }));
    itemControls.appendChild(buildOptField(FLEX_ITEM_OPT, item.alignSelf, v=>{ item.alignSelf=v; applyItemStyles(); regenCode(); renderItemControls(); }));
  } else {
    itemControls.appendChild(buildTextField({label:"grid-column", diff:"adv", tip:"Which column line(s) this item spans, e.g. '1 / 3' or 'span 2'"}, item.gridColumn, v=>{
      item.gridColumn=v; applyItemStyles(); regenCode();
    }));
    itemControls.appendChild(buildTextField({label:"grid-row", diff:"adv", tip:"Which row line(s) this item spans, e.g. '1 / 3' or 'span 2'"}, item.gridRow, v=>{
      item.gridRow=v; applyItemStyles(); regenCode();
    }));
    itemControls.appendChild(buildOptField(GRID_ITEM_OPT, item.justifySelf, v=>{ item.justifySelf=v; applyItemStyles(); regenCode(); renderItemControls(); }));
    itemControls.appendChild(buildOptField(GRID_ITEM_OPT2, item.alignSelf, v=>{ item.alignSelf=v; applyItemStyles(); regenCode(); renderItemControls(); }));
  }
}

/* ============================================================
   CANVAS RENDERING
   ============================================================ */
function applyContainerStyles(){
  playground.style.display = state.mode;
  if(state.mode === "flex"){
    const f = state.flex;
    playground.style.flexDirection = f.flexDirection;
    playground.style.flexWrap = f.flexWrap;
    playground.style.justifyContent = f.justifyContent;
    playground.style.alignItems = f.alignItems;
    playground.style.alignContent = f.alignContent;
    playground.style.gap = f.gap+"px";
    playground.style.gridTemplateColumns = "";
    playground.style.gridTemplateRows = "";
    playground.style.gridAutoFlow = "";
    playground.style.justifyItems = "";
  } else {
    const g = state.grid;
    playground.style.gridTemplateColumns = g.gridTemplateColumns;
    playground.style.gridTemplateRows = g.gridTemplateRows;
    playground.style.gridAutoFlow = g.gridAutoFlow;
    playground.style.justifyItems = g.justifyItems;
    playground.style.alignItems = g.alignItems;
    playground.style.justifyContent = g.justifyContent;
    playground.style.alignContent = g.alignContent;
    playground.style.gap = g.gap+"px";
    playground.style.flexDirection = "";
    playground.style.flexWrap = "";
  }
}

function applyItemStyles(){
  state.items.forEach(item=>{
    const el = playground.querySelector(`[data-id="${item.id}"]`);
    if(!el) return;
    if(state.mode === "flex"){
      el.style.order = item.order;
      el.style.flexGrow = item.flexGrow;
      el.style.flexShrink = item.flexShrink;
      el.style.flexBasis = item.flexBasis;
      el.style.alignSelf = item.alignSelf;
      el.style.gridColumn = ""; el.style.gridRow = ""; el.style.justifySelf = "";
      let w = item.flexBasis === "auto" ? "" : "";
    } else {
      el.style.gridColumn = item.gridColumn;
      el.style.gridRow = item.gridRow;
      el.style.justifySelf = item.justifySelf;
      el.style.alignSelf = item.alignSelf;
      el.style.order = ""; el.style.flexGrow = ""; el.style.flexShrink = ""; el.style.flexBasis = "";
    }
    const ordTag = el.querySelector(".ord");
    if(ordTag){
      if(state.mode==="flex" && item.order!==0) ordTag.textContent = "ord:"+item.order; else ordTag.textContent = "";
    }
  });
}

let dragSrcId = null;

function renderItems(){
  // rebuild only if item count/id set changed
  const existingIds = Array.from(playground.querySelectorAll(".flex-item,.grid-item")).map(e=>e.dataset.id);
  const stateIds = state.items.map(i=>i.id);
  const needsRebuild = existingIds.length !== stateIds.length || !existingIds.every((id,i)=>id===stateIds[i]);

  if(needsRebuild){
    playground.querySelectorAll(".flex-item,.grid-item").forEach(e=>e.remove());
    state.items.forEach((item, idx)=>{
      const el = document.createElement("div");
      el.className = state.mode === "flex" ? "flex-item" : "grid-item";
      el.dataset.id = item.id;
      el.draggable = true;
      el.style.background = item.color;
      el.setAttribute("tabindex","0");
      el.setAttribute("aria-label", "Item "+item.label+", draggable, double-click to recolor");
      el.innerHTML = `<span class="idx">#${idx+1}</span><span class="ord"></span><span class="lbl">${item.label}</span>`;
      if(state.mode === "flex"){
        el.style.width = "76px"; el.style.height = "76px";
      } else {
        el.style.minHeight = "64px";
      }
      el.addEventListener("click", (e)=>{ selectItem(item.id); });
      el.addEventListener("dblclick", ()=>{ cycleColor(item); });
      el.addEventListener("dragstart", (e)=>{ dragSrcId = item.id; el.classList.add("dragging"); e.dataTransfer.effectAllowed="move"; });
      el.addEventListener("dragend", ()=>{ el.classList.remove("dragging"); playground.querySelectorAll(".drag-over").forEach(x=>x.classList.remove("drag-over")); });
      el.addEventListener("dragover", (e)=>{ e.preventDefault(); el.classList.add("drag-over"); });
      el.addEventListener("dragleave", ()=>{ el.classList.remove("drag-over"); });
      el.addEventListener("drop", (e)=>{
        e.preventDefault(); el.classList.remove("drag-over");
        if(!dragSrcId || dragSrcId===item.id) return;
        const from = state.items.findIndex(i=>i.id===dragSrcId);
        const to = state.items.findIndex(i=>i.id===item.id);
        const [moved] = state.items.splice(from,1);
        state.items.splice(to,0,moved);
        dragSrcId = null;
        renderAll();
        toast("Reordered items","info","fa-arrows-up-down-left-right");
      });
      playground.appendChild(el);
    });
  } else {
    state.items.forEach((item, idx)=>{
      const el = playground.querySelector(`[data-id="${item.id}"]`);
      if(!el) return;
      el.querySelector(".idx").textContent = "#"+(idx+1);
      el.querySelector(".lbl").textContent = item.label;
      el.style.background = item.color;
      el.className = (state.mode === "flex" ? "flex-item" : "grid-item") + (item.id===state.selectedId ? " selected":"");
      if(state.mode === "flex"){ el.style.width="76px"; el.style.height="76px"; el.style.minHeight=""; }
      else { el.style.width=""; el.style.height=""; el.style.minHeight="64px"; }
    });
  }
  applyItemStyles();
  highlightSelected();
}

function highlightSelected(){
  playground.querySelectorAll(".flex-item,.grid-item").forEach(el=>{
    el.classList.toggle("selected", el.dataset.id === state.selectedId);
  });
}

function selectItem(id){
  state.selectedId = (state.selectedId === id) ? null : id;
  highlightSelected();
  renderItemControls();
}

function cycleColor(item){
  const curIdx = PALETTE.indexOf(item.color);
  item.color = PALETTE[(curIdx+1) % PALETTE.length];
  renderItems();
  regenCode();
}

function setItemCount(n){
  n = Math.max(1, Math.min(12, n));
  if(n > state.items.length){
    const start = state.items.length;
    for(let i=start;i<n;i++){
      state.items.push({
        id:"it-"+i+"-"+Date.now()+Math.floor(Math.random()*999), label:i+1, color: PALETTE[i%PALETTE.length],
        order:0, flexGrow:0, flexShrink:1, flexBasis:"auto", alignSelf:"auto",
        gridColumn:"auto", gridRow:"auto", justifySelf:"auto"
      });
    }
  } else if(n < state.items.length){
    state.items = state.items.slice(0,n);
    if(state.selectedId && !state.items.find(i=>i.id===state.selectedId)) state.selectedId = null;
  }
  state.items.forEach((it,i)=>it.label = i+1);
}

/* ============================================================
   GRID OVERLAY + AXIS INDICATOR
   ============================================================ */
function renderGridOverlay(){
  gridOverlay.innerHTML = "";
  if(state.mode !== "grid" || !state.gridLines){ gridOverlay.style.display="none"; return; }
  gridOverlay.style.display = "block";
  requestAnimationFrame(()=>{
    const cs = getComputedStyle(playground);
    const colGap = parseFloat(cs.columnGap)||0;
    const rowGap = parseFloat(cs.rowGap)||0;
    const colTemplate = cs.gridTemplateColumns.split(" ").map(parseFloat);
    const rowTemplate = cs.gridTemplateRows.split(" ").map(parseFloat);
    let x = 0;
    colTemplate.forEach((w,i)=>{
      if(i>0){
        const line = document.createElement("div");
        line.className = "gl v"; line.style.left = (x - colGap/2)+"px";
        gridOverlay.appendChild(line);
        const lbl = document.createElement("div");
        lbl.className = "gl-label"; lbl.style.left=(x-colGap/2)+"px"; lbl.style.top="0px"; lbl.textContent=i+1;
        gridOverlay.appendChild(lbl);
      }
      x += w + colGap;
    });
    let y = 0;
    rowTemplate.forEach((h,i)=>{
      if(i>0){
        const line = document.createElement("div");
        line.className = "gl h"; line.style.top = (y - rowGap/2)+"px";
        gridOverlay.appendChild(line);
      }
      y += h + rowGap;
    });
  });
}

function renderAxisIndicator(){
  if(state.mode === "flex"){
    const dir = state.flex.flexDirection;
    const horizontal = dir==="row"||dir==="row-reverse";
    const reversed = dir.includes("reverse");
    axisIndicator.innerHTML = `
      <div class="a-row a-main"><i class="fa-solid fa-arrow-${horizontal ? (reversed?'left':'right') : (reversed?'up':'down')}"></i> main axis</div>
      <div class="a-row a-cross"><i class="fa-solid fa-arrow-${horizontal ? 'down' : 'right'}"></i> cross axis</div>`;
  } else {
    axisIndicator.innerHTML = `
      <div class="a-row" style="color:var(--grid-accent)"><i class="fa-solid fa-arrow-right"></i> columns (inline)</div>
      <div class="a-row a-cross"><i class="fa-solid fa-arrow-down"></i> rows (block)</div>`;
  }
}

/* ============================================================
   CODE GENERATION
   ============================================================ */
function escapeHtml(s){ return String(s).replace(/[&<>]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;"}[c])); }

function cssLine(prop, val){
  return `  <span class="tk-prop">${prop}</span><span class="tk-punc">:</span> <span class="tk-val">${escapeHtml(val)}</span><span class="tk-punc">;</span>`;
}

function generateCSSLines(){
  const lines = [];
  lines.push(`<span class="tk-comment">/* Container */</span>`);
  lines.push(`<span class="tk-sel">.container</span> <span class="tk-punc">{</span>`);
  if(state.mode==="flex"){
    const f = state.flex;
    lines.push(cssLine("display","flex"));
    lines.push(cssLine("flex-direction", f.flexDirection));
    lines.push(cssLine("flex-wrap", f.flexWrap));
    lines.push(cssLine("justify-content", f.justifyContent));
    lines.push(cssLine("align-items", f.alignItems));
    if(f.flexWrap!=="nowrap") lines.push(cssLine("align-content", f.alignContent));
    lines.push(cssLine("gap", f.gap+"px"));
  } else {
    const g = state.grid;
    lines.push(cssLine("display","grid"));
    lines.push(cssLine("grid-template-columns", g.gridTemplateColumns));
    lines.push(cssLine("grid-template-rows", g.gridTemplateRows));
    lines.push(cssLine("grid-auto-flow", g.gridAutoFlow));
    lines.push(cssLine("justify-items", g.justifyItems));
    lines.push(cssLine("align-items", g.alignItems));
    lines.push(cssLine("justify-content", g.justifyContent));
    lines.push(cssLine("align-content", g.alignContent));
    lines.push(cssLine("gap", g.gap+"px"));
  }
  lines.push(`<span class="tk-punc">}</span>`);

  state.items.forEach((item, idx)=>{
    const decls = [];
    if(state.mode==="flex"){
      if(item.order!==0) decls.push(["order", String(item.order)]);
      if(item.flexGrow!==0) decls.push(["flex-grow", String(item.flexGrow)]);
      if(item.flexShrink!==1) decls.push(["flex-shrink", String(item.flexShrink)]);
      if(item.flexBasis!=="auto") decls.push(["flex-basis", item.flexBasis]);
      if(item.alignSelf!=="auto") decls.push(["align-self", item.alignSelf]);
    } else {
      if(item.gridColumn!=="auto") decls.push(["grid-column", item.gridColumn]);
      if(item.gridRow!=="auto") decls.push(["grid-row", item.gridRow]);
      if(item.justifySelf!=="auto") decls.push(["justify-self", item.justifySelf]);
      if(item.alignSelf!=="auto") decls.push(["align-self", item.alignSelf]);
    }
    if(decls.length){
      lines.push("");
      lines.push(`<span class="tk-comment">/* Item ${idx+1} */</span>`);
      lines.push(`<span class="tk-sel">.item:nth-child(${idx+1})</span> <span class="tk-punc">{</span>`);
      decls.forEach(([p,v])=>lines.push(cssLine(p,v)));
      lines.push(`<span class="tk-punc">}</span>`);
    }
  });
  return lines;
}

function generateHTMLLines(){
  const lines = [];
  lines.push(`<span class="tk-punc">&lt;</span><span class="tk-sel">div</span> <span class="tk-prop">class</span><span class="tk-punc">=</span><span class="tk-val">"container"</span><span class="tk-punc">&gt;</span>`);
  state.items.forEach((item,idx)=>{
    lines.push(`  <span class="tk-punc">&lt;</span><span class="tk-sel">div</span> <span class="tk-prop">class</span><span class="tk-punc">=</span><span class="tk-val">"item"</span><span class="tk-punc">&gt;</span>${item.label}<span class="tk-punc">&lt;/</span><span class="tk-sel">div</span><span class="tk-punc">&gt;</span>`);
  });
  lines.push(`<span class="tk-punc">&lt;/</span><span class="tk-sel">div</span><span class="tk-punc">&gt;</span>`);
  return lines;
}

let activeCodeTab = "css";
let lastCSSText = "";

function regenCode(){
  const lines = activeCodeTab==="css" ? generateCSSLines() : generateHTMLLines();
  codeBody.innerHTML = lines.map((l,i)=>`<div class="code-line"><span class="ln">${i+1}</span><span class="txt">${l}</span></div>`).join("");
  $("#codeFileName").textContent = activeCodeTab==="css" ? "styles.css" : "index.html";
  lastCSSText = generateCSSLines().map(l => l.replace(/<[^>]+>/g,"")).join("\n");
}

/* ============================================================
   STATUS + AXIS TAG
   ============================================================ */
function updateStatus(){
  document.body.classList.toggle("mode-grid", state.mode==="grid");
  $("#statusMode").textContent = state.mode.toUpperCase();
  if(state.mode==="flex"){
    const f = state.flex;
    $("#statusDetail").textContent = `${f.flexDirection} · ${f.flexWrap} · justify-content: ${f.justifyContent}`;
    $("#axisTag").innerHTML = `<i class="fa-solid fa-arrows-left-right"></i> ${f.flexDirection} · main-axis ${f.flexDirection.includes('row') ? '→' : '↓'}`;
  } else {
    const g = state.grid;
    $("#statusDetail").textContent = `${g.gridTemplateColumns.split(" ").length} cols × ${g.gridTemplateRows.split(" ").length} rows · gap: ${g.gap}px`;
    $("#axisTag").innerHTML = `<i class="fa-solid fa-table-cells"></i> grid · ${g.gridTemplateColumns.split(" ").length}×${g.gridTemplateRows.split(" ").length} tracks`;
  }
  $("#statusItems").innerHTML = `<i class="fa-solid fa-cube"></i> ${state.items.length} item${state.items.length!==1?'s':''}`;
  $("#itemCountTag").textContent = `${state.items.length} items`;
}

/* ============================================================
   MODE SWITCH SYNC
   ============================================================ */
function syncModeUI(){
  $$(".mode-switch button").forEach(b=>{
    const on = b.dataset.mode === state.mode;
    b.classList.toggle("active", on);
    b.setAttribute("aria-selected", on ? "true":"false");
  });
  document.body.classList.toggle("mode-grid", state.mode==="grid");
  $("#gridLinesToggle").parentElement.style.display = state.mode==="grid" ? "flex":"none";
}

/* ============================================================
   MASTER RENDER
   ============================================================ */
function renderAll(){
  applyContainerStyles();
  renderItems();
  renderContainerControls();
  renderItemControls();
  renderGridOverlay();
  renderAxisIndicator();
  regenCode();
  updateStatus();
  syncModeUI();
}

/* ============================================================
   EVENTS — TOP BAR
   ============================================================ */
$("#modeSwitch").addEventListener("click", (e)=>{
  const btn = e.target.closest("button[data-mode]");
  if(!btn) return;
  setMode(btn.dataset.mode);
});
function setMode(m){
  if(state.mode===m) return;
  state.mode = m;
  state.selectedId = null;
  renderAll();
  toast(`Switched to ${m==="flex"?"Flexbox":"Grid"} mode`, "info", m==="flex"?"fa-arrows-left-right":"fa-table-cells");
}

$("#toggleSidebar").addEventListener("click", (e)=>{
  $("#sidebar").classList.toggle("collapsed");
  e.currentTarget.classList.toggle("active");
});
$("#toggleCode").addEventListener("click", (e)=>{
  $("#codePanel").classList.toggle("collapsed");
  e.currentTarget.classList.toggle("active");
});

$$(".viewport-group button").forEach(b=>{
  b.addEventListener("click", ()=>{
    $$(".viewport-group button").forEach(x=>x.classList.remove("active"));
    b.classList.add("active");
    state.viewport = b.dataset.vp;
    applyViewport();
  });
});
function applyViewport(){
  const map = {desktop:"100%", tablet:"768px", mobile:"390px"};
  $("#frameWrap").style.width = map[state.viewport];
  $("#frameSize").textContent = state.viewport==="desktop" ? "100% width" : map[state.viewport]+" width";
}

$("#resetBtn").addEventListener("click", doReset);
function doReset(){
  state.flex = {...DEFAULTS.flex};
  state.grid = {...DEFAULTS.grid};
  state.items = freshItems(6);
  state.selectedId = null;
  renderAll();
  toast("Reset to defaults","info","fa-rotate-left");
}

$("#randomizeBtn").addEventListener("click", doRandomize);
function pick(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function doRandomize(){
  if(state.mode==="flex"){
    const f = state.flex;
    f.flexDirection = pick(["row","row-reverse","column","column-reverse"]);
    f.flexWrap = pick(["nowrap","wrap","wrap-reverse"]);
    f.justifyContent = pick(["flex-start","flex-end","center","space-between","space-around","space-evenly"]);
    f.alignItems = pick(["stretch","flex-start","flex-end","center","baseline"]);
    f.alignContent = pick(["stretch","flex-start","flex-end","center","space-between","space-around"]);
    f.gap = Math.floor(Math.random()*32);
  } else {
    const g = state.grid;
    const cols = 2+Math.floor(Math.random()*3);
    g.gridTemplateColumns = Array(cols).fill("1fr").join(" ");
    const rows = 2+Math.floor(Math.random()*2);
    g.gridTemplateRows = Array(rows).fill("1fr").join(" ");
    g.gridAutoFlow = pick(["row","column","dense"]);
    g.justifyItems = pick(["stretch","start","center","end"]);
    g.alignItems = pick(["stretch","start","center","end"]);
    g.justifyContent = pick(["start","center","end","space-between","space-around","space-evenly"]);
    g.alignContent = pick(["start","center","end","space-between","space-around","space-evenly"]);
    g.gap = Math.floor(Math.random()*28);
  }
  renderAll();
  toast("Properties randomized","info","fa-dice");
}

$("#addItemBtn").addEventListener("click", ()=>{ setItemCount(state.items.length+1); renderAll(); });
$("#removeItemBtn").addEventListener("click", ()=>{ setItemCount(state.items.length-1); renderAll(); });

$("#gridLinesToggle").addEventListener("change", (e)=>{
  state.gridLines = e.target.checked;
  renderGridOverlay();
});

$("#saveBtn").addEventListener("click", ()=>{
  try{
    localStorage.setItem("axis-flexgrid-state", JSON.stringify({mode:state.mode, flex:state.flex, grid:state.grid, items:state.items}));
    toast("Layout saved to browser storage","success","fa-floppy-disk");
  }catch(err){ toast("Could not save (storage unavailable)","warn"); }
});

function tryRestore(){
  try{
    const raw = localStorage.getItem("axis-flexgrid-state");
    if(!raw) return;
    const saved = JSON.parse(raw);
    if(saved && saved.flex && saved.grid && Array.isArray(saved.items) && saved.items.length){
      state.mode = saved.mode || "flex";
      state.flex = {...DEFAULTS.flex, ...saved.flex};
      state.grid = {...DEFAULTS.grid, ...saved.grid};
      state.items = saved.items;
      toast("Restored your last session","info","fa-clock-rotate-left");
    }
  }catch(err){ /* ignore corrupt storage */ }
}

/* Copy / Download */
$("#copyCodeBtn").addEventListener("click", async ()=>{
  const text = activeCodeTab==="css" ? lastCSSText : generateHTMLLines().map(l=>l.replace(/<[^>]+>/g,"")).join("\n");
  try{
    await navigator.clipboard.writeText(text);
    toast("CSS copied to clipboard","success","fa-copy");
  }catch(err){
    const ta = document.createElement("textarea"); ta.value = text; document.body.appendChild(ta); ta.select();
    document.execCommand("copy"); ta.remove();
    toast("Copied to clipboard","success","fa-copy");
  }
});
$("#downloadCodeBtn").addEventListener("click", ()=>{
  const text = activeCodeTab==="css" ? lastCSSText : generateHTMLLines().map(l=>l.replace(/<[^>]+>/g,"")).join("\n");
  const fname = activeCodeTab==="css" ? "layout.css" : "layout.html";
  const blob = new Blob([text], {type:"text/plain"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = fname; a.click();
  URL.revokeObjectURL(url);
  toast(`Downloaded ${fname}`,"success","fa-download");
});
$$(".code-tab").forEach(t=>{
  t.addEventListener("click", ()=>{
    $$(".code-tab").forEach(x=>x.classList.remove("active"));
    t.classList.add("active");
    activeCodeTab = t.dataset.tab;
    regenCode();
  });
});

/* Collapsible sections */
$$(".side-section-head").forEach(h=>{
  h.addEventListener("click", ()=>{ h.parentElement.classList.toggle("closed"); });
});

/* ============================================================
   CHALLENGE MODE
   ============================================================ */
const CHALLENGE_TEMPLATES = {
  flex:[
    { target:{flexDirection:"row", justifyContent:"center", alignItems:"center"}, desc:"Center every item both horizontally <b>and</b> vertically using a row layout." },
    { target:{flexDirection:"row", justifyContent:"space-between", alignItems:"center"}, desc:"Build a navbar: items spread edge-to-edge and vertically centered." },
    { target:{flexDirection:"column", alignItems:"flex-end"}, desc:"Stack items vertically, aligned to the right edge." },
    { target:{flexDirection:"row", flexWrap:"wrap", justifyContent:"space-evenly"}, desc:"Make items wrap onto multiple lines with perfectly even spacing." },
    { target:{flexDirection:"row-reverse", justifyContent:"flex-start"}, desc:"Reverse the row direction and pack items to the (visual) start." },
  ],
  grid:[
    { target:{justifyItems:"center", alignItems:"center"}, desc:"Center every item inside its own grid cell, both axes." },
    { target:{justifyContent:"center", alignContent:"center"}, desc:"Center the entire track grid within the container." },
    { target:{gridAutoFlow:"column"}, desc:"Change the auto-placement flow so new items fill columns first." },
    { target:{justifyItems:"end", alignItems:"start"}, desc:"Push items to the right edge and top edge of their cells." },
  ]
};

$("#challengeBtn").addEventListener("click", startChallenge);
function startChallenge(){
  const tpl = pick(CHALLENGE_TEMPLATES[state.mode]);
  challenge = { mode: state.mode, target: tpl.target, desc: tpl.desc };
  $("#challengeText").innerHTML = `<b>Challenge:</b> ${tpl.desc}`;
  $("#challengeBanner").classList.add("show");
  toast("New challenge started — match the target layout!","warn","fa-flag-checkered");
}
$("#closeChallengeBtn").addEventListener("click", ()=>{ $("#challengeBanner").classList.remove("show"); challenge=null; });
$("#checkChallengeBtn").addEventListener("click", ()=>{
  if(!challenge) return;
  if(challenge.mode !== state.mode){ toast("Switch to the right mode first!","warn"); return; }
  const src = state.mode==="flex" ? state.flex : state.grid;
  const ok = Object.entries(challenge.target).every(([k,v])=> src[k]===v);
  if(ok){
    toast("Challenge solved! Great work 🎉","success","fa-trophy");
    $("#challengeBanner").classList.remove("show");
    challenge = null;
  } else {
    toast("Not quite — check the property values and try again","warn","fa-xmark");
  }
});

/* ============================================================
   KEYBOARD SHORTCUTS
   ============================================================ */
document.addEventListener("keydown", (e)=>{
  const tag = document.activeElement.tagName;
  if(tag==="INPUT" || tag==="TEXTAREA" || tag==="SELECT") return;
  if(e.key==="1"){ setMode("flex"); }
  else if(e.key==="2"){ setMode("grid"); }
  else if(e.key.toLowerCase()==="r"){ doReset(); }
  else if(e.key===" "){ e.preventDefault(); doRandomize(); }
});

/* ============================================================
   INIT
   ============================================================ */
tryRestore();
renderPresets();
syncModeUI();
applyViewport();
renderAll();
setTimeout(()=>toast("Welcome to Axis — press 1/2 to switch modes, Space to shuffle","info","fa-hand-sparkles"), 500);

window.addEventListener("resize", ()=>renderGridOverlay());

})();
