require('electron-reload')(__dirname, {
  electron: require(`${__dirname}/node_modules/electron`)
})

const { app, BrowserWindow } = require('electron')
const path = require('path')

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
        preload: path.join(__dirname, 'renderer.js'),
        contextIsolation: false,
        nodeIntegration: true
    }
  })

  win.loadFile('index.html')
}

app.whenReady().then(createWindow)
