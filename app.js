// ===== BRAILLE ENCODING =====
const DOT_BITS = [
  [0x01, 0x08],
  [0x02, 0x10],
  [0x04, 0x20],
  [0x40, 0x80],
];

function createGrid(rows, cols) {
  return Array.from({ length: rows }, () => Array(cols).fill(0));
}

function cloneGrid(grid) {
  return grid.map(r => [...r]);
}

function gridToBraille(grid, cellCols, cellRows) {
  const lines = [];
  for (let cr = 0; cr < cellRows; cr++) {
    let line = '';
    for (let cc = 0; cc < cellCols; cc++) {
      let mask = 0;
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 2; c++) {
          const gr = cr * 4 + r;
          const gc = cc * 2 + c;
          if (gr < grid.length && gc < grid[0].length && grid[gr][gc]) {
            mask |= DOT_BITS[r][c];
          }
        }
      }
      line += String.fromCodePoint(0x2800 + mask);
    }
    lines.push(line);
  }
  return lines;
}

function decodeBraille(char) {
  const code = char.codePointAt(0) - 0x2800;
  const grid = Array.from({ length: 4 }, () => [0, 0]);
  DOT_BITS.forEach((row, r) => row.forEach((bit, c) => {
    grid[r][c] = (code & bit) ? 1 : 0;
  }));
  return grid;
}

function gridToUnicode(grid, cellCols, cellRows) {
  const lines = gridToBraille(grid, cellCols, cellRows);
  return lines.map(l => [...l].map(ch => 'U+' + ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')).join(' ')).join('\n');
}

function gridToAscii(grid) {
  return grid.map(row => row.map(v => v ? '##' : '..').join('')).join('\n');
}

function gridToTermdot(grid) {
  return '"' + grid.map(row => row.map(v => v ? '*' : '.').join('')).join('\\n') + '"';
}

function gridToJs(grid, cellCols, cellRows) {
  const lines = gridToBraille(grid, cellCols, cellRows);
  return lines.length === 1 ? "'" + lines[0] + "'" : "[\n" + lines.map(l => "  '" + l + "'").join(',\n') + "\n]";
}

// ===== ANIMATION EXPORT =====
function exportAnimation(frames, cellCols, cellRows, format) {
  const allBraille = frames.map(f => gridToBraille(f, cellCols, cellRows));
  switch (format) {
    case 'js-braille': {
      const items = allBraille.map(lines => lines.length === 1 ? '"' + lines[0] + '"' : '[' + lines.map(l => '"' + l + '"').join(', ') + ']');
      return 'const frames = [\n' + items.map(i => '  ' + i).join(',\n') + '\n];';
    }
    case 'js-termdot': {
      const items = frames.map(f => '"' + f.map(row => row.map(v => v ? '*' : '.').join('')).join('\\n') + '"');
      return 'const frames = [\n' + items.map(i => '  ' + i).join(',\n') + '\n];';
    }
    case 'js-grid':
      return 'const frames = ' + JSON.stringify(frames, null, 2) + ';';
    case 'json':
      return JSON.stringify({ cols: cellCols, rows: cellRows, fps: state.fps, frames: allBraille }, null, 2);
    case 'python': {
      const items = allBraille.map(lines => lines.length === 1 ? '"' + lines[0] + '"' : '[' + lines.map(l => '"' + l + '"').join(', ') + ']');
      return 'frames = [\n' + items.map(i => '    ' + i).join(',\n') + '\n]';
    }
    case 'rust': {
      const items = allBraille.map(lines => lines.length === 1 ? '"' + lines[0] + '"' : '&[' + lines.map(l => '"' + l + '"').join(', ') + ']');
      return 'let frames = vec![\n' + items.map(i => '    ' + i).join(',\n') + '\n];';
    }
    case 'c': {
      const items = allBraille.map(lines => lines.length === 1 ? '"' + lines[0] + '"' : '{' + lines.map(l => '"' + l + '"').join(', ') + '}');
      return 'const char *frames[] = {\n' + items.map(i => '    ' + i).join(',\n') + '\n};';
    }
    default:
      return '';
  }
}

// ===== DRAWING TOOLS =====
function bresenhamLine(r0, c0, r1, c1) {
  const points = [];
  let dr = Math.abs(r1 - r0), dc = Math.abs(c1 - c0);
  let sr = r0 < r1 ? 1 : -1, sc = c0 < c1 ? 1 : -1;
  let err = dc - dr;
  let r = r0, c = c0;
  while (true) {
    points.push([r, c]);
    if (r === r1 && c === c1) break;
    const e2 = 2 * err;
    if (e2 > -dr) { err -= dr; c += sc; }
    if (e2 < dc) { err += dc; r += sr; }
  }
  return points;
}

function rectOutline(r0, c0, r1, c1) {
  const points = [];
  const minR = Math.min(r0, r1), maxR = Math.max(r0, r1);
  const minC = Math.min(c0, c1), maxC = Math.max(c0, c1);
  for (let c = minC; c <= maxC; c++) { points.push([minR, c]); points.push([maxR, c]); }
  for (let r = minR + 1; r < maxR; r++) { points.push([r, minC]); points.push([r, maxC]); }
  return points;
}

function rectFilled(r0, c0, r1, c1) {
  const points = [];
  const minR = Math.min(r0, r1), maxR = Math.max(r0, r1);
  const minC = Math.min(c0, c1), maxC = Math.max(c0, c1);
  for (let r = minR; r <= maxR; r++)
    for (let c = minC; c <= maxC; c++)
      points.push([r, c]);
  return points;
}

function getMirrorPoints(r, c, rows, cols, mirrorMode) {
  const points = [[r, c]];
  if (mirrorMode === 'h' || mirrorMode === 'hv') points.push([r, cols - 1 - c]);
  if (mirrorMode === 'v' || mirrorMode === 'hv') points.push([rows - 1 - r, c]);
  if (mirrorMode === 'hv') points.push([rows - 1 - r, cols - 1 - c]);
  return points;
}

// ===== IMPORT PARSING =====
function parseImport(text) {
  text = text.trim();
  if (!text) return null;

  // JSON
  try {
    const obj = JSON.parse(text);
    if (obj.frames && Array.isArray(obj.frames)) {
      const frames = obj.frames.map(f => {
        if (typeof f === 'string' || (Array.isArray(f) && typeof f[0] === 'string')) {
          const lines = Array.isArray(f) ? f : [f];
          const cellRows = lines.length;
          const cellCols = [...lines[0]].length;
          const grid = createGrid(cellRows * 4, cellCols * 2);
          lines.forEach((line, lr) => {
            [...line].forEach((ch, lc) => {
              const decoded = decodeBraille(ch);
              for (let r = 0; r < 4; r++)
                for (let c = 0; c < 2; c++)
                  grid[lr * 4 + r][lc * 2 + c] = decoded[r][c];
            });
          });
          return grid;
        }
        return f;
      });
      return { format: 'JSON', frames, cols: obj.cols || 2, rows: obj.rows || 1 };
    }
    if (Array.isArray(obj)) {
      if (Array.isArray(obj[0]) && Array.isArray(obj[0][0])) {
        return { format: 'Grid Arrays', frames: obj, cols: Math.ceil(obj[0][0].length / 2), rows: Math.ceil(obj[0].length / 4) };
      }
    }
  } catch (e) {}

  // JS Array
  const jsMatch = text.match(/\[[\s\S]*\]/);
  if (jsMatch) {
    try {
      const arr = eval('(' + jsMatch[0] + ')');
      if (Array.isArray(arr) && arr.length > 0) {
        if (typeof arr[0] === 'string') {
          const frames = arr.map(s => {
            const lines = s.split('\n').filter(Boolean);
            const cellRows = lines.length;
            const cellCols = [...lines[0]].length;
            const grid = createGrid(cellRows * 4, cellCols * 2);
            lines.forEach((line, lr) => {
              [...line].forEach((ch, lc) => {
                const decoded = decodeBraille(ch);
                for (let r = 0; r < 4; r++)
                  for (let c = 0; c < 2; c++)
                    grid[lr * 4 + r][lc * 2 + c] = decoded[r][c];
              });
            });
            return grid;
          });
          const firstLines = arr[0].split('\n').filter(Boolean);
          return { format: 'JS Array', frames, cols: [...firstLines[0]].length, rows: firstLines.length };
        }
      }
    } catch (e) {}
  }

  // Raw braille text
  const blocks = text.split(/\n\s*\n/).filter(Boolean);
  if (blocks.length > 0 && blocks[0].match(/[\u2800-\u28FF]/)) {
    const frames = blocks.map(block => {
      const lines = block.split('\n').filter(Boolean);
      const cellRows = lines.length;
      const cellCols = [...lines[0]].length;
      const grid = createGrid(cellRows * 4, cellCols * 2);
      lines.forEach((line, lr) => {
        [...line].forEach((ch, lc) => {
          if (ch.codePointAt(0) >= 0x2800 && ch.codePointAt(0) <= 0x28FF) {
            const decoded = decodeBraille(ch);
            for (let r = 0; r < 4; r++)
              for (let c = 0; c < 2; c++)
                grid[lr * 4 + r][lc * 2 + c] = decoded[r][c];
          }
        });
      });
      return grid;
    });
    const firstLines = blocks[0].split('\n').filter(Boolean);
    return { format: 'Raw Braille', frames, cols: [...firstLines[0]].length, rows: firstLines.length };
  }

  return null;
}

// ===== STATE =====
const state = {
  cellCols: 2,
  cellRows: 1,
  frames: [createGrid(4, 4)],
  currentFrame: 0,
  mode: 'draw',
  mirrorMode: 'off',
  showGuides: true,
  isPlaying: false,
  fps: 4,
  loop: true,
  onionSkin: false,
  undoStack: [],
  redoStack: [],
  playIntervalId: null,
  isPointerDown: false,
  paintVal: 1,
  lineStart: null,
  rectStart: null,
  animFormat: 'js-braille',
};

function pixelRows() { return state.cellRows * 4; }
function pixelCols() { return state.cellCols * 2; }
function currentGrid() { return state.frames[state.currentFrame]; }

// ===== UNDO/REDO =====
function pushUndo() {
  state.undoStack.push({
    frames: state.frames.map(cloneGrid),
    currentFrame: state.currentFrame,
    cellCols: state.cellCols,
    cellRows: state.cellRows,
  });
  if (state.undoStack.length > 100) state.undoStack.shift();
  state.redoStack = [];
}

function undo() {
  if (!state.undoStack.length) return;
  state.redoStack.push({
    frames: state.frames.map(cloneGrid),
    currentFrame: state.currentFrame,
    cellCols: state.cellCols,
    cellRows: state.cellRows,
  });
  const snap = state.undoStack.pop();
  state.frames = snap.frames;
  state.currentFrame = snap.currentFrame;
  state.cellCols = snap.cellCols;
  state.cellRows = snap.cellRows;
  document.getElementById('cell-cols').value = state.cellCols;
  document.getElementById('cell-rows').value = state.cellRows;
  renderAll();
}

function redo() {
  if (!state.redoStack.length) return;
  state.undoStack.push({
    frames: state.frames.map(cloneGrid),
    currentFrame: state.currentFrame,
    cellCols: state.cellCols,
    cellRows: state.cellRows,
  });
  const snap = state.redoStack.pop();
  state.frames = snap.frames;
  state.currentFrame = snap.currentFrame;
  state.cellCols = snap.cellCols;
  state.cellRows = snap.cellRows;
  document.getElementById('cell-cols').value = state.cellCols;
  document.getElementById('cell-rows').value = state.cellRows;
  renderAll();
}

// ===== AUTO-SAVE =====
let saveTimer = null;
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem('braille-draw-pro', JSON.stringify({
        cellCols: state.cellCols,
        cellRows: state.cellRows,
        frames: state.frames,
        currentFrame: state.currentFrame,
        fps: state.fps,
        loop: state.loop,
      }));
    } catch (e) {}
  }, 500);
}

function loadSaved() {
  try {
    const raw = localStorage.getItem('braille-draw-pro');
    if (!raw) return;
    const data = JSON.parse(raw);
    if (data.frames && data.frames.length) {
      state.cellCols = data.cellCols || 2;
      state.cellRows = data.cellRows || 1;
      state.frames = data.frames;
      state.currentFrame = Math.min(data.currentFrame || 0, data.frames.length - 1);
      state.fps = data.fps || 4;
      state.loop = data.loop !== false;
      document.getElementById('cell-cols').value = state.cellCols;
      document.getElementById('cell-rows').value = state.cellRows;
      document.getElementById('fps-slider').value = state.fps;
      document.getElementById('fps-value').textContent = state.fps;
      if (state.loop) document.getElementById('btn-loop').classList.add('active');
    }
  } catch (e) {}
}

// ===== TOAST =====
function showToast(message) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  container.appendChild(toast);
  if (container.children.length > 3) container.removeChild(container.firstChild);
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 150);
  }, 2000);
}

// ===== RENDER DOT GRID =====
function renderGrid() {
  const grid = currentGrid();
  const container = document.getElementById('dot-grid');
  container.innerHTML = '';
  const rows = pixelRows();
  const cols = pixelCols();

  const prevGrid = state.onionSkin && state.currentFrame > 0 ? state.frames[state.currentFrame - 1] : null;

  for (let r = 0; r < rows; r++) {
    const rowEl = document.createElement('div');
    rowEl.className = 'grid-row';
    for (let c = 0; c < cols; c++) {
      const dot = document.createElement('div');
      dot.className = 'dot';
      if (grid[r] && grid[r][c]) dot.classList.add('on');
      else if (prevGrid && prevGrid[r] && prevGrid[r][c]) dot.classList.add('ghost');
      if (state.showGuides) {
        if (c % 2 === 1 && c < cols - 1) dot.classList.add('cell-right');
        if (r % 4 === 3 && r < rows - 1) dot.classList.add('cell-bottom');
      }
      dot.dataset.r = r;
      dot.dataset.c = c;
      rowEl.appendChild(dot);
    }
    container.appendChild(rowEl);
  }

  document.getElementById('grid-label').textContent =
    `${cols} × ${rows} pixels — ${state.cellCols * state.cellRows === 1 ? '1 char' : state.cellCols * state.cellRows + ' chars'}`;
}

// ===== RENDER OUTPUTS =====
function renderOutputs() {
  const grid = currentGrid();
  const braille = gridToBraille(grid, state.cellCols, state.cellRows);
  document.getElementById('out-braille').textContent = braille.join('\n');
  document.getElementById('out-unicode').textContent = gridToUnicode(grid, state.cellCols, state.cellRows);
  document.getElementById('out-ascii').textContent = gridToAscii(grid);
  document.getElementById('out-termdot').textContent = gridToTermdot(grid);
  document.getElementById('out-js').textContent = gridToJs(grid, state.cellCols, state.cellRows);
  document.getElementById('out-animation').textContent = exportAnimation(state.frames, state.cellCols, state.cellRows, state.animFormat);
}

// ===== RENDER FRAME STRIP =====
function renderFrameStrip() {
  const strip = document.getElementById('frame-strip');
  strip.innerHTML = '';

  state.frames.forEach((frame, i) => {
    const thumb = document.createElement('div');
    thumb.className = 'frame-thumb' + (i === state.currentFrame ? ' active' : '');
    thumb.draggable = true;
    thumb.dataset.index = i;

    const num = document.createElement('div');
    num.className = 'frame-number';
    num.textContent = i + 1;
    thumb.appendChild(num);

    const preview = document.createElement('div');
    preview.className = 'frame-preview';
    const braille = gridToBraille(frame, state.cellCols, state.cellRows);
    preview.textContent = braille[0] || '';
    thumb.appendChild(preview);

    thumb.addEventListener('click', () => {
      state.currentFrame = i;
      renderAll();
    });

    // Drag and drop
    thumb.addEventListener('dragstart', (e) => {
      e.dataTransfer.setData('text/plain', i.toString());
      thumb.classList.add('dragging');
    });
    thumb.addEventListener('dragend', () => thumb.classList.remove('dragging'));
    thumb.addEventListener('dragover', (e) => e.preventDefault());
    thumb.addEventListener('drop', (e) => {
      e.preventDefault();
      const from = parseInt(e.dataTransfer.getData('text/plain'));
      const to = i;
      if (from !== to) {
        pushUndo();
        const [moved] = state.frames.splice(from, 1);
        state.frames.splice(to, 0, moved);
        if (state.currentFrame === from) state.currentFrame = to;
        else if (from < state.currentFrame && to >= state.currentFrame) state.currentFrame--;
        else if (from > state.currentFrame && to <= state.currentFrame) state.currentFrame++;
        renderAll();
      }
    });

    strip.appendChild(thumb);
  });

  // Add button
  const addBtn = document.createElement('button');
  addBtn.className = 'frame-add-btn';
  addBtn.textContent = '+';
  addBtn.title = 'Add frame';
  addBtn.addEventListener('click', addFrame);
  strip.appendChild(addBtn);

  document.getElementById('frame-counter').textContent = `${state.currentFrame + 1} / ${state.frames.length}`;
}

// ===== RENDER ALL =====
function renderAll() {
  renderGrid();
  renderOutputs();
  renderFrameStrip();
  scheduleSave();
}

// ===== FRAME ACTIONS =====
function addFrame() {
  pushUndo();
  state.frames.splice(state.currentFrame + 1, 0, createGrid(pixelRows(), pixelCols()));
  state.currentFrame++;
  renderAll();
}

function duplicateFrame() {
  pushUndo();
  state.frames.splice(state.currentFrame + 1, 0, cloneGrid(currentGrid()));
  state.currentFrame++;
  renderAll();
}

function deleteFrame() {
  if (state.frames.length <= 1) return;
  pushUndo();
  state.frames.splice(state.currentFrame, 1);
  if (state.currentFrame >= state.frames.length) state.currentFrame = state.frames.length - 1;
  renderAll();
}

function fillAll() {
  pushUndo();
  const grid = currentGrid();
  for (let r = 0; r < grid.length; r++)
    for (let c = 0; c < grid[0].length; c++)
      grid[r][c] = 1;
  renderAll();
}

function invertAll() {
  pushUndo();
  const grid = currentGrid();
  for (let r = 0; r < grid.length; r++)
    for (let c = 0; c < grid[0].length; c++)
      grid[r][c] = grid[r][c] ? 0 : 1;
  renderAll();
}

function clearGrid() {
  pushUndo();
  const grid = currentGrid();
  for (let r = 0; r < grid.length; r++)
    for (let c = 0; c < grid[0].length; c++)
      grid[r][c] = 0;
  renderAll();
}

// ===== PLAYBACK =====
function startPlayback() {
  if (state.frames.length <= 1) return;
  state.isPlaying = true;
  document.getElementById('btn-play').textContent = '⏸ Pause';
  state.playIntervalId = setInterval(() => {
    if (state.currentFrame < state.frames.length - 1) {
      state.currentFrame++;
    } else if (state.loop) {
      state.currentFrame = 0;
    } else {
      stopPlayback();
      return;
    }
    renderAll();
  }, 1000 / state.fps);
}

function stopPlayback() {
  state.isPlaying = false;
  document.getElementById('btn-play').textContent = '▶ Play';
  if (state.playIntervalId) {
    clearInterval(state.playIntervalId);
    state.playIntervalId = null;
  }
}

function togglePlayback() {
  if (state.isPlaying) stopPlayback();
  else startPlayback();
}

// ===== GRID RESIZE =====
function resizeGrid(newCols, newRows) {
  pushUndo();
  const newPixelRows = newRows * 4;
  const newPixelCols = newCols * 2;
  state.frames = state.frames.map(oldGrid => {
    const newGrid = createGrid(newPixelRows, newPixelCols);
    for (let r = 0; r < Math.min(oldGrid.length, newPixelRows); r++)
      for (let c = 0; c < Math.min(oldGrid[0].length, newPixelCols); c++)
        newGrid[r][c] = oldGrid[r][c];
    return newGrid;
  });
  state.cellCols = newCols;
  state.cellRows = newRows;
  renderAll();
}

// ===== PROJECT SAVE/LOAD =====
function saveProject() {
  const data = JSON.stringify({
    cellCols: state.cellCols,
    cellRows: state.cellRows,
    fps: state.fps,
    loop: state.loop,
    frames: state.frames,
  }, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'dab.braille-project.json';
  a.click();
  URL.revokeObjectURL(a.href);
  showToast('Project saved');
}

function loadProject() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.frames && data.frames.length) {
          pushUndo();
          state.cellCols = data.cellCols || 2;
          state.cellRows = data.cellRows || 1;
          state.frames = data.frames;
          state.currentFrame = 0;
          state.fps = data.fps || 4;
          state.loop = data.loop !== false;
          document.getElementById('cell-cols').value = state.cellCols;
          document.getElementById('cell-rows').value = state.cellRows;
          document.getElementById('fps-slider').value = state.fps;
          document.getElementById('fps-value').textContent = state.fps;
          renderAll();
          showToast('Project loaded');
        }
      } catch (err) {
        showToast('Invalid project file');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

// ===== COMMAND PALETTE =====
const commands = [
  { label: 'Draw mode', shortcut: 'D', action: () => setMode('draw') },
  { label: 'Erase mode', shortcut: 'E', action: () => setMode('erase') },
  { label: 'Line tool', shortcut: 'L', action: () => setMode('line') },
  { label: 'Rectangle tool', shortcut: 'R', action: () => setMode('rect') },
  { label: 'Fill all', shortcut: 'F', action: fillAll },
  { label: 'Invert grid', shortcut: 'I', action: invertAll },
  { label: 'Clear grid', shortcut: 'C', action: clearGrid },
  { label: 'New frame', shortcut: 'N', action: addFrame },
  { label: 'Duplicate frame', shortcut: '', action: duplicateFrame },
  { label: 'Delete frame', shortcut: 'Del', action: deleteFrame },
  { label: 'Play / Pause', shortcut: 'Space', action: togglePlayback },
  { label: 'Previous frame', shortcut: '←', action: () => { if (state.currentFrame > 0) { state.currentFrame--; renderAll(); } } },
  { label: 'Next frame', shortcut: '→', action: () => { if (state.currentFrame < state.frames.length - 1) { state.currentFrame++; renderAll(); } } },
  { label: 'Toggle guides', shortcut: 'G', action: () => { state.showGuides = !state.showGuides; renderGrid(); } },
  { label: 'Cycle mirror', shortcut: 'M', action: cycleMirror },
  { label: 'Undo', shortcut: '⌘Z', action: undo },
  { label: 'Redo', shortcut: '⌘⇧Z', action: redo },
  { label: 'Save project', shortcut: '⌘S', action: saveProject },
  { label: 'Import animation', shortcut: '', action: () => openModal('import-modal') },
  { label: 'Load project', shortcut: '', action: loadProject },
];

let paletteIndex = 0;
let filteredCommands = [...commands];

function openPalette() {
  const modal = document.getElementById('command-palette');
  modal.classList.add('open');
  const input = document.getElementById('palette-search');
  input.value = '';
  input.focus();
  filteredCommands = [...commands];
  paletteIndex = 0;
  renderPalette();
}

function closePalette() {
  document.getElementById('command-palette').classList.remove('open');
}

function renderPalette() {
  const list = document.getElementById('palette-list');
  list.innerHTML = '';
  filteredCommands.forEach((cmd, i) => {
    const item = document.createElement('div');
    item.className = 'palette-item' + (i === paletteIndex ? ' selected' : '');
    item.innerHTML = `<span class="palette-item-label">${cmd.label}</span><span class="palette-item-shortcut">${cmd.shortcut}</span>`;
    item.addEventListener('click', () => { cmd.action(); closePalette(); });
    item.addEventListener('mouseenter', () => { paletteIndex = i; renderPalette(); });
    list.appendChild(item);
  });
}

function filterPalette(query) {
  const q = query.toLowerCase();
  filteredCommands = commands.filter(c => c.label.toLowerCase().includes(q));
  paletteIndex = 0;
  renderPalette();
}

// ===== IMPORT MODAL =====
let importData = null;

function openModal(id) {
  document.getElementById(id).classList.add('open');
  if (id === 'import-modal') {
    document.getElementById('import-textarea').value = '';
    document.getElementById('import-info').textContent = '';
    document.getElementById('import-error').textContent = '';
    document.getElementById('import-confirm').disabled = true;
    importData = null;
  }
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

let importDebounce = null;
function handleImportInput(text) {
  clearTimeout(importDebounce);
  importDebounce = setTimeout(() => {
    const result = parseImport(text);
    const info = document.getElementById('import-info');
    const error = document.getElementById('import-error');
    const btn = document.getElementById('import-confirm');

    if (!text.trim()) {
      info.textContent = '';
      error.textContent = '';
      btn.disabled = true;
      importData = null;
      return;
    }

    if (result) {
      importData = result;
      info.textContent = `Detected: ${result.format} | Frames: ${result.frames.length} | Grid: ${result.cols}×${result.rows}`;
      error.textContent = '';
      btn.disabled = false;
      btn.textContent = `Import ${result.frames.length} frame${result.frames.length > 1 ? 's' : ''}`;
    } else {
      importData = null;
      info.textContent = '';
      error.textContent = 'Could not detect format. Check your data.';
      btn.disabled = true;
      btn.textContent = 'Import';
    }
  }, 300);
}

function doImport() {
  if (!importData) return;
  pushUndo();
  const mode = document.querySelector('input[name="import-mode"]:checked').value;
  if (mode === 'replace') {
    state.frames = importData.frames;
    state.currentFrame = 0;
  } else {
    state.frames.push(...importData.frames);
  }
  state.cellCols = importData.cols;
  state.cellRows = importData.rows;
  document.getElementById('cell-cols').value = state.cellCols;
  document.getElementById('cell-rows').value = state.cellRows;
  closeModal('import-modal');
  renderAll();
  showToast(`Imported ${importData.frames.length} frame${importData.frames.length > 1 ? 's' : ''}`);
}

// ===== CONFIRM DIALOG =====
let confirmCallback = null;

function showConfirm(title, message, callback) {
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-message').textContent = message;
  confirmCallback = callback;
  openModal('confirm-dialog');
}

// ===== MODE =====
function setMode(m) {
  state.mode = m;
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === m);
  });
  state.lineStart = null;
  state.rectStart = null;
}

function cycleMirror() {
  const modes = ['off', 'h', 'v', 'hv'];
  const i = modes.indexOf(state.mirrorMode);
  state.mirrorMode = modes[(i + 1) % modes.length];
  showToast('Mirror: ' + state.mirrorMode.toUpperCase());
}

// ===== COPY =====
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).catch(() => {});
}

// ===== DOT GRID INTERACTION =====
function setupGridEvents() {
  const gridEl = document.getElementById('dot-grid');

  gridEl.addEventListener('pointerdown', (e) => {
    const dot = e.target.closest('.dot');
    if (!dot) return;
    e.preventDefault();
    const r = parseInt(dot.dataset.r);
    const c = parseInt(dot.dataset.c);
    const grid = currentGrid();

    if (state.mode === 'line') {
      if (!state.lineStart) {
        state.lineStart = [r, c];
        showToast('Line: click end point');
      } else {
        pushUndo();
        const points = bresenhamLine(state.lineStart[0], state.lineStart[1], r, c);
        points.forEach(([pr, pc]) => {
          getMirrorPoints(pr, pc, pixelRows(), pixelCols(), state.mirrorMode).forEach(([mr, mc]) => {
            if (mr >= 0 && mr < grid.length && mc >= 0 && mc < grid[0].length) grid[mr][mc] = 1;
          });
        });
        state.lineStart = null;
        renderAll();
      }
      return;
    }

    if (state.mode === 'rect') {
      if (!state.rectStart) {
        state.rectStart = [r, c];
        showToast('Rect: click opposite corner');
      } else {
        pushUndo();
        const fn = e.shiftKey ? rectFilled : rectOutline;
        const points = fn(state.rectStart[0], state.rectStart[1], r, c);
        points.forEach(([pr, pc]) => {
          getMirrorPoints(pr, pc, pixelRows(), pixelCols(), state.mirrorMode).forEach(([mr, mc]) => {
            if (mr >= 0 && mr < grid.length && mc >= 0 && mc < grid[0].length) grid[mr][mc] = 1;
          });
        });
        state.rectStart = null;
        renderAll();
      }
      return;
    }

    state.isPointerDown = true;
    pushUndo();
    // Shift always erases. Erase mode always erases.
    // Draw mode: toggle — if dot is on, turn off; if off, turn on.
    let val;
    if (e.shiftKey || state.mode === 'erase') {
      val = 0;
    } else {
      val = grid[r][c] ? 0 : 1;
    }
    state.paintVal = val;
    getMirrorPoints(r, c, pixelRows(), pixelCols(), state.mirrorMode).forEach(([mr, mc]) => {
      if (mr >= 0 && mr < grid.length && mc >= 0 && mc < grid[0].length) grid[mr][mc] = val;
    });
    renderAll();
  });

  gridEl.addEventListener('pointerover', (e) => {
    if (!state.isPointerDown) return;
    const dot = e.target.closest('.dot');
    if (!dot) return;
    const r = parseInt(dot.dataset.r);
    const c = parseInt(dot.dataset.c);
    const grid = currentGrid();
    const val = state.paintVal;
    getMirrorPoints(r, c, pixelRows(), pixelCols(), state.mirrorMode).forEach(([mr, mc]) => {
      if (mr >= 0 && mr < grid.length && mc >= 0 && mc < grid[0].length) grid[mr][mc] = val;
    });
    renderAll();
  }, true);

  document.addEventListener('pointerup', () => {
    state.isPointerDown = false;
  });
}

// ===== KEYBOARD SHORTCUTS =====
function setupShortcuts() {
  document.addEventListener('keydown', (e) => {
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
      if (e.key === 'Escape') {
        closePalette();
        closeModal('import-modal');
        closeModal('confirm-dialog');
      }
      if (e.target.id === 'palette-search') {
        if (e.key === 'ArrowDown') { e.preventDefault(); paletteIndex = Math.min(paletteIndex + 1, filteredCommands.length - 1); renderPalette(); }
        if (e.key === 'ArrowUp') { e.preventDefault(); paletteIndex = Math.max(paletteIndex - 1, 0); renderPalette(); }
        if (e.key === 'Enter' && filteredCommands[paletteIndex]) { filteredCommands[paletteIndex].action(); closePalette(); }
      }
      return;
    }

    const meta = e.metaKey || e.ctrlKey;

    if (e.key === 'Escape') {
      closePalette();
      closeModal('import-modal');
      closeModal('confirm-dialog');
      return;
    }

    if (meta && e.key === 'k') { e.preventDefault(); openPalette(); return; }
    if (meta && e.shiftKey && e.key === 'z') { e.preventDefault(); redo(); return; }
    if (meta && e.key === 'z') { e.preventDefault(); undo(); return; }
    if (meta && e.key === 's') { e.preventDefault(); saveProject(); return; }
    if (meta && e.key === 'c') {
      e.preventDefault();
      copyToClipboard(JSON.stringify(currentGrid()));
      showToast('Frame copied');
      return;
    }
    if (meta && e.key === 'x') {
      e.preventDefault();
      copyToClipboard(JSON.stringify(currentGrid()));
      deleteFrame();
      showToast('Frame cut');
      return;
    }
    if (meta && e.key === 'v') {
      e.preventDefault();
      navigator.clipboard.readText().then(text => {
        try {
          const grid = JSON.parse(text);
          if (Array.isArray(grid) && Array.isArray(grid[0])) {
            pushUndo();
            state.frames.splice(state.currentFrame + 1, 0, grid);
            state.currentFrame++;
            renderAll();
            showToast('Frame pasted');
          }
        } catch (err) {}
      });
      return;
    }

    switch (e.key.toLowerCase()) {
      case 'd': setMode('draw'); break;
      case 'e': setMode('erase'); break;
      case 'l': setMode('line'); break;
      case 'r': setMode('rect'); break;
      case 'f': fillAll(); break;
      case 'i': invertAll(); break;
      case 'c': clearGrid(); break;
      case 'n': addFrame(); break;
      case 'g': state.showGuides = !state.showGuides; renderGrid(); break;
      case 'm': cycleMirror(); break;
      case ' ': e.preventDefault(); togglePlayback(); break;
      case 'arrowleft': if (state.currentFrame > 0) { state.currentFrame--; renderAll(); } break;
      case 'arrowright': if (state.currentFrame < state.frames.length - 1) { state.currentFrame++; renderAll(); } break;
      case 'delete': case 'backspace': deleteFrame(); break;
    }
  });
}

// ===== WIRE UP UI =====
function init() {
  loadSaved();

  setupGridEvents();
  setupShortcuts();

  // Grid size selects
  document.getElementById('cell-cols').addEventListener('change', (e) => resizeGrid(parseInt(e.target.value), state.cellRows));
  document.getElementById('cell-rows').addEventListener('change', (e) => resizeGrid(state.cellCols, parseInt(e.target.value)));

  // Mode buttons
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => setMode(btn.dataset.mode));
  });

  // Tool buttons
  document.getElementById('btn-fill').addEventListener('click', fillAll);
  document.getElementById('btn-invert').addEventListener('click', invertAll);
  document.getElementById('btn-clear').addEventListener('click', clearGrid);
  document.getElementById('btn-new-frame').addEventListener('click', addFrame);
  document.getElementById('btn-dup-frame').addEventListener('click', duplicateFrame);
  document.getElementById('btn-del-frame').addEventListener('click', deleteFrame);
  document.getElementById('btn-prev-frame').addEventListener('click', () => { if (state.currentFrame > 0) { state.currentFrame--; renderAll(); } });
  document.getElementById('btn-next-frame').addEventListener('click', () => { if (state.currentFrame < state.frames.length - 1) { state.currentFrame++; renderAll(); } });

  // Transport
  document.getElementById('btn-prev').addEventListener('click', () => { if (state.currentFrame > 0) { state.currentFrame--; renderAll(); } });
  document.getElementById('btn-play').addEventListener('click', togglePlayback);
  document.getElementById('btn-next').addEventListener('click', () => { if (state.currentFrame < state.frames.length - 1) { state.currentFrame++; renderAll(); } });

  // FPS
  document.getElementById('fps-slider').addEventListener('input', (e) => {
    state.fps = parseInt(e.target.value);
    document.getElementById('fps-value').textContent = state.fps;
    if (state.isPlaying) { stopPlayback(); startPlayback(); }
  });

  // Toggles
  document.getElementById('btn-loop').addEventListener('click', () => {
    state.loop = !state.loop;
    document.getElementById('btn-loop').classList.toggle('active', state.loop);
  });
  document.getElementById('btn-onion').addEventListener('click', () => {
    state.onionSkin = !state.onionSkin;
    document.getElementById('btn-onion').classList.toggle('active', state.onionSkin);
    renderGrid();
  });

  // Import/Save/Load
  document.getElementById('btn-import').addEventListener('click', () => openModal('import-modal'));
  document.getElementById('btn-save').addEventListener('click', saveProject);
  document.getElementById('btn-load').addEventListener('click', loadProject);

  // Import modal
  document.getElementById('import-textarea').addEventListener('input', (e) => handleImportInput(e.target.value));
  document.getElementById('import-file-btn').addEventListener('click', () => document.getElementById('import-file-input').click());
  document.getElementById('import-file-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      document.getElementById('import-textarea').value = ev.target.result;
      handleImportInput(ev.target.result);
    };
    reader.readAsText(file);
  });
  document.getElementById('import-cancel').addEventListener('click', () => closeModal('import-modal'));
  document.getElementById('import-confirm').addEventListener('click', doImport);

  // Animation format
  document.getElementById('anim-format').addEventListener('change', (e) => {
    state.animFormat = e.target.value;
    renderOutputs();
  });

  // Copy buttons
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = document.getElementById(btn.dataset.target);
      if (target) {
        copyToClipboard(target.textContent);
        btn.textContent = 'Copied!';
        btn.classList.add('copied');
        setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 1200);
      }
    });
  });

  // Command palette
  document.getElementById('palette-search').addEventListener('input', (e) => filterPalette(e.target.value));

  // Confirm dialog
  document.getElementById('confirm-cancel').addEventListener('click', () => closeModal('confirm-dialog'));
  document.getElementById('confirm-ok').addEventListener('click', () => {
    closeModal('confirm-dialog');
    if (confirmCallback) { confirmCallback(); confirmCallback = null; }
  });

  // Close modals on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('open');
    });
  });

  renderAll();
}

document.addEventListener('DOMContentLoaded', init);
