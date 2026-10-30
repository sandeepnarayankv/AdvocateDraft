'use strict';
// Loads the real src/main.js with Electron replaced by a small stand-in, and
// returns its IPC handlers so tests can call them like the window does.
const fs = require('fs');
const os = require('os');
const path = require('path');
const Module = require('module');

// pickFiles: paths the file dialog should "choose" (array, or a function per call).
async function loadMain({ openExternal = async () => {}, safeStorage, pickFiles } = {}) {
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'advdraft-'));
  const handlers = {};
  const electronStub = {
    app: { getPath: () => userData, whenReady: () => Promise.resolve(), on: () => {} },
    BrowserWindow: class {
      constructor() {
        this.webContents = { openDevTools() {}, setWindowOpenHandler() {}, on() {} };
      }
      loadFile() {}
      static getAllWindows() { return []; }
    },
    ipcMain: { handle: (ch, fn) => (handlers[ch] = fn) },
    dialog: {
      showOpenDialog: async () => {
        const filePaths = typeof pickFiles === 'function' ? pickFiles() : pickFiles || [];
        return { canceled: !filePaths.length, filePaths };
      },
    },
    shell: { openExternal: (url) => openExternal(url) },
    safeStorage: safeStorage || { isEncryptionAvailable: () => false },
  };
  const origLoad = Module._load;
  Module._load = function (request, ...rest) {
    if (request === 'electron') return electronStub;
    return origLoad.call(this, request, ...rest);
  };
  require('../../src/main.js');
  await new Promise((r) => setImmediate(r)); // let whenReady().then run

  // Call a handler the way ipcRenderer.invoke would (event first).
  const call = (ch, arg, event = {}) => handlers[ch](event, arg);
  return { handlers, call, userData };
}

function fakeSender() {
  const deltas = [];
  const sender = {
    deltas,
    thinking: 0,
    isDestroyed: () => false,
    send: (ch, t) => {
      if (ch === 'draft:delta') deltas.push(t);
      if (ch === 'draft:thinking') sender.thinking++;
    },
  };
  return sender;
}

module.exports = { loadMain, fakeSender };
