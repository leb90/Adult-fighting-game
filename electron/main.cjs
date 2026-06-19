const { app, BrowserWindow, globalShortcut } = require('electron')
const path = require('path')

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    fullscreen: true,
    frame: false,
    backgroundColor: '#0a0a0a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    }
  })

  win.loadFile(path.join(__dirname, '../dist/index.html'))
}

app.whenReady().then(() => {
  createWindow()
  // Alt+F4 nativo de Windows ya cierra la app; esto agrega Ctrl+Q como alternativa
  globalShortcut.register('CommandOrControl+Q', () => app.quit())
})

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll()
  app.quit()
})
