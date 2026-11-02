'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// Minimal, explicit API surface exposed to the renderer. No direct Node access.
contextBridge.exposeInMainWorld('api', {
  providers: {
    status: () => ipcRenderer.invoke('providers:status'),
    setKey: (id, key) => ipcRenderer.invoke('providers:setKey', { id, key }),
    setBaseUrl: (id, baseUrl) => ipcRenderer.invoke('providers:setBaseUrl', { id, baseUrl }),
    setActive: (provider, model) => ipcRenderer.invoke('providers:setActive', { provider, model }),
    models: (id) => ipcRenderer.invoke('providers:models', id),
    chatgptSignIn: () => ipcRenderer.invoke('chatgpt:signIn'),
    chatgptSignOut: () => ipcRenderer.invoke('chatgpt:signOut'),
  },
  pickFiles: (kind) => ipcRenderer.invoke('files:pick', kind),
  cancelRead: (jobId) => ipcRenderer.invoke('files:cancel', jobId),
  // Background reading of PDFs / scans: progress per page, then the result.
  onReadProgress: (cb) => {
    const listener = (_e, msg) => cb(msg);
    ipcRenderer.on('files:progress', listener);
    return () => ipcRenderer.removeListener('files:progress', listener);
  },
  onReadDone: (cb) => {
    const listener = (_e, msg) => cb(msg);
    ipcRenderer.on('files:done', listener);
    return () => ipcRenderer.removeListener('files:done', listener);
  },
  semantic: {
    status: () => ipcRenderer.invoke('semantic:status'),
    enable: () => ipcRenderer.invoke('semantic:enable'),
    disable: () => ipcRenderer.invoke('semantic:disable'),
    onProgress: (cb) => {
      const listener = (_e, p) => cb(p);
      ipcRenderer.on('semantic:progress', listener);
      return () => ipcRenderer.removeListener('semantic:progress', listener);
    },
  },
  aiRead: {
    run: (payload) => ipcRenderer.invoke('aiRead:run', payload),
    cancel: () => ipcRenderer.invoke('aiRead:cancel'),
    onProgress: (cb) => {
      const listener = (_e, p) => cb(p);
      ipcRenderer.on('aiRead:progress', listener);
      return () => ipcRenderer.removeListener('aiRead:progress', listener);
    },
  },
  translate: {
    run: (payload) => ipcRenderer.invoke('translate:run', payload),
    cancel: () => ipcRenderer.invoke('translate:cancel'),
    exportDocx: (payload) => ipcRenderer.invoke('translate:export', payload),
    onDelta: (cb) => {
      const listener = (_e, t) => cb(t);
      ipcRenderer.on('translate:delta', listener);
      return () => ipcRenderer.removeListener('translate:delta', listener);
    },
    onProgress: (cb) => {
      const listener = (_e, p) => cb(p);
      ipcRenderer.on('translate:progress', listener);
      return () => ipcRenderer.removeListener('translate:progress', listener);
    },
  },
  ocr: {
    settings: () => ipcRenderer.invoke('ocr:settings'),
    setLangs: (langs) => ipcRenderer.invoke('ocr:setLangs', langs),
  },
  generate: (payload) => ipcRenderer.invoke('draft:generate', payload),
  cancel: () => ipcRenderer.invoke('draft:cancel'),
  formats: {
    list: () => ipcRenderer.invoke('formats:list'),
    get: (id) => ipcRenderer.invoke('formats:get', id),
  },
  matters: {
    list: () => ipcRenderer.invoke('matters:list'),
    save: (matter) => ipcRenderer.invoke('matters:save', matter),
    open: (id) => ipcRenderer.invoke('matters:open', id),
    remove: (id) => ipcRenderer.invoke('matters:delete', id),
    last: () => ipcRenderer.invoke('matters:last'),
    clearLast: () => ipcRenderer.invoke('matters:clearLast'),
  },
  prompts: {
    get: () => ipcRenderer.invoke('prompts:get'),
    save: (values) => ipcRenderer.invoke('prompts:save', values),
    preview: (payload) => ipcRenderer.invoke('prompts:preview', payload),
    exportFile: () => ipcRenderer.invoke('prompts:export'),
    importFile: () => ipcRenderer.invoke('prompts:import'),
  },
  // Signals that the model is reasoning before it writes.
  onThinking: (cb) => {
    const listener = () => cb();
    ipcRenderer.on('draft:thinking', listener);
    return () => ipcRenderer.removeListener('draft:thinking', listener);
  },
  // Streamed draft text; returns an unsubscribe function.
  onDelta: (cb) => {
    const listener = (_e, text) => cb(text);
    ipcRenderer.on('draft:delta', listener);
    return () => ipcRenderer.removeListener('draft:delta', listener);
  },
  exportDocx: (text, name, formatId) => ipcRenderer.invoke('draft:exportDocx', { text, name, formatId }),
});
