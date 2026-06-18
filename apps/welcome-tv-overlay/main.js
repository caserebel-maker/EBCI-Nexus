const { app, BrowserWindow, globalShortcut, screen } = require('electron')
const path = require('node:path')

app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')

let mainWindow

function createWindow() {
  const display = screen.getPrimaryDisplay()
  const { width, height } = display.workAreaSize

  mainWindow = new BrowserWindow({
    width,
    height,
    x: display.workArea.x,
    y: display.workArea.y,
    frame: false,
    fullscreen: true,
    transparent: true,
    backgroundColor: '#00000000',
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    focusable: false,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.setAlwaysOnTop(true, 'screen-saver')
  mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
  mainWindow.setIgnoreMouseEvents(true, { forward: true })
  mainWindow.loadFile(path.join(__dirname, 'renderer.html'))
}

app.whenReady().then(() => {
  createWindow()

  globalShortcut.register('CommandOrControl+Alt+Q', () => app.quit())
  globalShortcut.register('CommandOrControl+Alt+R', () => mainWindow?.reload())
  globalShortcut.register('CommandOrControl+Alt+T', () => {
    mainWindow?.webContents.send('demo-popup')
  })
  globalShortcut.register('CommandOrControl+Alt+D', () => {
    if (mainWindow?.webContents.isDevToolsOpened()) {
      mainWindow.webContents.closeDevTools()
    } else {
      mainWindow?.webContents.openDevTools({ mode: 'detach' })
    }
  })
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

app.on('window-all-closed', () => {
  app.quit()
})
