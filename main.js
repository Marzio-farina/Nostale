const { findMaxValidId, idExists } = require('./utils/idFinder');
const { loadAllResults, saveResultsToFile, splitExistingJsonFile } = require('./utils/fileManager');

require('electron-reload')(__dirname, {
  electron: require(`${__dirname}/node_modules/electron`)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('❗ Promise non gestita:', reason);
});

const { app, BrowserWindow, ipcMain} = require('electron')
const path = require('path')
const fs = require('fs');
const fsPromises = fs.promises;
const pathToJson = path.join(__dirname, 'dati_scraping.json');

app.commandLine.appendSwitch('js-flags', '--max-old-space-size=4096');

let mainWindow;
let scraperWindow;
let isProcessing = false;
let scrapedCount = 0;

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
  const win = new BrowserWindow({
    show: true,
    webPreferences: {
      partition: 'persist:scraper', // sessione isolata
      // ATTENZIONE: disattiviamo l'offscreen per test
      offscreen: false,
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const ses = win.webContents.session;

  ses.webRequest.onBeforeRequest((details, callback) => {
    // Blocca immagini, video, font, CSS, etc
    const blockedTypes = ['image', 'media', 'font', 'stylesheet'];
    if (blockedTypes.includes(details.resourceType)) {
      callback({ cancel: true });
    } else {
      callback({});
    }
  });

  return win;
}

async function startScraping(win, initialMaxId = null) {
  console.log('🚀 startScraping chiamata');
  const maxId = initialMaxId || await findMaxValidId(win, 275000, 1000, 350000);
  console.log(`🔍 ID massimo trovato dinamicamente: ${maxId}`);

  const minId = 241000;
  let nuoviAggiunti = 0;

  // Carica tutti i risultati da tutti i file
  let existingResults = await loadAllResults();
  console.log(`📂 Caricati ${existingResults.length} risultati esistenti`);
  const existingIds = new Set(existingResults.map(item => item.id));
  let idsToScrape = generateIdsToScrape(maxId, minId, existingIds);
  console.log(`🗂️ Totale ID da processare: ${idsToScrape.length}`);
  let stopRequested = false;

  // ⏱ Timer per ricalcolo ogni 3 minuti
  const interval = setInterval(async () => {
    console.log(`⏰ Timer 3 minuti scattato! Ricalcolo nuovo max ID...`);
    stopRequested = true;
  }, 3 * 60 * 1000); // 3 minuti

  async function processNext() {
    if (isProcessing) return;
    isProcessing = true;

    if (stopRequested) {
      console.log(`🔁 Riavvio scraping da nuovo ID massimo...`);
      await saveResultsToFile(existingResults);
      clearInterval(interval);
      if (win && !win.isDestroyed()) {
        win.destroy();
      }

      scraperWindow = createScraperWindow();

      const newWin = scraperWindow;
      const newMaxId = await findMaxValidId(newWin, maxId - 1, 1000, 350000);
      console.log(`🔍 Nuovo max ID dopo ricalcolo: ${newMaxId}`);

      // 🔁 Ricarica risultati esistenti ed elimina duplicati
      const updatedResults = await loadAllResults();
      console.log(`📂 Caricati ${updatedResults.length} risultati aggiornati`);
      const updatedIds = new Set(updatedResults.map(item => item.id));
      const newIdsToScrape = generateIdsToScrape(newMaxId, minId, updatedIds);
      console.log(`🗂️ Nuovi ID da processare: ${newIdsToScrape.length}`);

      startScraping(newWin, newMaxId);
      return;
    }

    if (idsToScrape.length === 0) {
      console.log('✅ Scraping completato.');
      clearInterval(interval);
      await saveResultsToFile(existingResults);
      if (win && !win.isDestroyed()) {
        win.destroy();
      }
      return;
    }

    const id = idsToScrape.shift().toString();
    const url = `https://www.noshydra.com/home?lang=it&server=dragonveil&search=${id}`;

    console.log(`🌐 Scraping ID: ${id} → ${url}`);
    const startLoad = Date.now();

    try {
      if (win.webContents.isDestroyed()) {
        console.warn(`⚠️ webContents distrutto: salto ID ${id}`);
        return;
      }
      await win.webContents.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'
      );
      await win.loadURL(url);
      console.log(`⏳ Pagina caricata per ID ${id} in ${Date.now() - startLoad} ms`);

      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 500));
      const startExecJs = Date.now();

      const resultData = await win.webContents.executeJavaScript(`(() => {
        const firstItem = document.querySelector('#basar .search-results .item');
        const nameSpan = firstItem?.querySelector('.text-div .all-searches-p');
        const timestampSpan = document.querySelector('#search-timestamp');
        return {
          name: nameSpan ? nameSpan.innerText.trim() : null,
          timestamp: timestampSpan ? timestampSpan.innerText.trim() : null
        };
      })()`);
      console.log(`⏳ executeJavaScript per ID ${id} in ${Date.now() - startExecJs} ms`);

      if (resultData.name && resultData.name !== 'Nessun contenuto trovato') {
        const result = {
          id,
          name: resultData.name?.replace(/[\t\n\r]+/g, ' '),
          timestamp: resultData.timestamp?.replace(/[\t\n\r]+/g, ' ')
        };
        existingResults.push(result);
        existingIds.add(id);
        nuoviAggiunti++;
        scrapedCount++;
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('scrape-result', result);
        }

        if (nuoviAggiunti % 50 === 0) {
          console.log(`Scritti ${nuoviAggiunti} nuovi record finora...`);
          await saveResultsToFile(existingResults);
          await new Promise(resolve => setTimeout(resolve, 400)); // Pausa per evitare errore -3
        }
      }
      if (scrapedCount >= 200) {
        console.log(`♻️ Raggiunti ${scrapedCount} ID → ricreo finestra per pulizia memoria`);
        if (win && !win.isDestroyed()) {
          win.destroy();
        }
        scraperWindow = createScraperWindow();
        win = scraperWindow;
        scrapedCount = 0;
      }
    } catch (e) {
      console.error(`Errore ID ${id}:`, e.message);
    } finally {
      isProcessing = false;

      setTimeout(() => {
        if (!win.webContents.isDestroyed()) {
          setTimeout(() => processNext(), 500);
        } else {
          console.warn('❌ Tentato accesso a finestra chiusa, processo interrotto.');
        }
      }, 1000); // aumentato a 1000 ms
    }
  }
  setTimeout(() => processNext(), 500);
}

function generateIdsToScrape(maxId, minId, existingIdsSet) {
  const ids = [];
  for (let id = maxId; id >= minId; id--) {
    if (!existingIdsSet.has(id.toString())) {
      ids.push(id);
    }
  }
  return ids;
}

app.whenReady().then(() => {
  console.log('🔄 Inizio con splitExistingJsonFile...');
  splitExistingJsonFile(); // prima taglia i file...
  console.log('🖥️ Creo finestra principale e avvio scraping...');
  createWindow();          // poi crea finestre e inizia scraping
});

ipcMain.handle('leggi-json-scraping', async () => {
  try {
    const json = fs.readFileSync(pathToJson, 'utf8');
    return JSON.parse(json);
  } catch (e) {
    console.error('Errore lettura JSON:', e.message);
    return [];
  }
});