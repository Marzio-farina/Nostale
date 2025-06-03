require('electron-reload')(__dirname, {
  electron: require(`${__dirname}/node_modules/electron`)
})

const { app, BrowserWindow, ipcMain} = require('electron')
const path = require('path')
const fs = require('fs');
const pathToJson = path.join(__dirname, 'dati_scraping.json');
const pathToLog = path.join(__dirname, 'scraping_log.txt');

app.commandLine.appendSwitch('js-flags', '--max-old-space-size=4096');

let mainWindow;
let scraperWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
        preload: path.join(__dirname, 'renderer.js'),
        contextIsolation: false,
        nodeIntegration: true
    }
  })
  
  mainWindow.loadFile('index.html')

  scraperWindow = createScraperWindow();
  startScraping(scraperWindow);
}

function createScraperWindow() {
  return new BrowserWindow({
    show: false,
    webPreferences: {
      // ATTENZIONE: disattiviamo l'offscreen per test
      offscreen: false,
      nodeIntegration: false,
      contextIsolation: true
    }
  });
}

async function startScraping(win) {
  const maxId = 269000;
  const minId = 241000;
  let currentId = maxId;
  let nuoviAggiunti = 0;
  let existingResults = [];

  try {
    if (fs.existsSync(pathToJson)) {
      const jsonData = fs.readFileSync(pathToJson, 'utf8');
      existingResults = JSON.parse(jsonData);
    }
  } catch (err) {
    console.error('Errore lettura file JSON:', err.message);
  }

  const existingIds = new Set(existingResults.map(item => item.id));

  async function processNext() {
    if (currentId < minId) {
      console.log('Scraping completato.');
      fs.writeFileSync(pathToJson, JSON.stringify(existingResults, null, 2), 'utf8');
      win.destroy();
      return;
    }

    const id = currentId;
    currentId--;

    if (existingIds.has(id.toString())) {
      console.log(`ID ${id} già presente. Skippato.`);
      return setTimeout(processNext, 100); // passo successivo
    }

    const url = `https://www.noshydra.com/home?lang=it&server=dragonveil&search=${id}`;

    try {
      await win.webContents.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'
      );
      await win.loadURL(url);

      await new Promise(resolve => setTimeout(resolve, 600 + Math.random() * 400));

      const name = await win.webContents.executeJavaScript(`(() => {
        const firstItem = document.querySelector('#basar .search-results .item');
        if (!firstItem) return null;
        const button = firstItem.querySelector('.text-div .all-searches-p');
        return button ? button.innerText.trim() : null;
      })()`);

      if (name && name !== 'Nessun contenuto trovato') {
        const result = {
          id: id.toString(),
          name: name
        };

        existingResults.push(result);
        nuoviAggiunti++;
        mainWindow.webContents.send('scrape-result', result);

        if (nuoviAggiunti % 50 === 0) {
          fs.writeFileSync(pathToJson, JSON.stringify(existingResults, null, 2), 'utf8');
          console.log(`Scritti ${nuoviAggiunti} nuovi record finora...`);

          // RICREA la finestra
          win.destroy();
          scraperWindow = createScraperWindow();
          win = scraperWindow;
        }
      } else {
        console.log(`ID ${id}: nessun contenuto valido trovato.`);
      }

    } catch (e) {
      console.error(`Errore ID ${id}:`, e.message);
    }

    setTimeout(() => processNext(), 150); // invoca la prossima iterazione
  }

  processNext();
}

app.whenReady().then(createWindow)

ipcMain.handle('leggi-json-scraping', async () => {
  try {
    const json = fs.readFileSync(pathToJson, 'utf8');
    return JSON.parse(json);
  } catch (e) {
    console.error('Errore lettura JSON:', e.message);
    return [];
  }
});