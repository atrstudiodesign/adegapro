const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('__TAURI_INTERNALS__', {
  invoke(command, args) {
    if (command !== 'open_module_window') {
      return Promise.reject(new Error('Comando desktop não autorizado.'));
    }
    return ipcRenderer.invoke(command, args || {});
  }
});

contextBridge.exposeInMainWorld('__ADEGA_LEGACY_WIN7__', Object.freeze({
  shell: 'electron-22',
  platform: 'win7-legacy'
}));
