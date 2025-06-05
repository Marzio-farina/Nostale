const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');

async function loadAllResults() {
  const results = [];
  let index = 1;
  while (true) {
    const filePath = index === 1
      ? path.join(__dirname, '../dati_scraping.json')
      : path.join(__dirname, `../dati_scraping_${index}.json`);
    if (!fs.existsSync(filePath)) break;

    try {
      const jsonData = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(jsonData);
      results.push(...parsed);
    } catch (err) {
      console.error(`Errore lettura file ${filePath}:`, err.message);
    }

    index++;
  }

  return results;
}

async function saveResultsToFile(results) {
  const sorted = results.sort((a, b) => Number(a.id) - Number(b.id));
  const chunkSize = 20000;
  let index = 1;

  for (let i = 0; i < sorted.length; i += chunkSize) {
    const chunk = sorted.slice(i, i + chunkSize);
    const filePath = index === 1
      ? path.join(__dirname, '../dati_scraping.json')
      : path.join(__dirname, `../dati_scraping_${index}.json`);

    try {
      await fsPromises.writeFile(filePath, JSON.stringify(chunk, null, 2), 'utf8');
    } catch (err) {
      console.error(`Errore scrittura file ${filePath}:`, err.message);
    }
    index++;
  }

  // Rimuove eventuali file vecchi non più necessari
  let extraIndex = index;
  while (true) {
    const extraFile = path.join(__dirname, `../dati_scraping_${extraIndex}.json`);
    if (!fs.existsSync(extraFile)) break;
    try {
      fs.unlinkSync(extraFile);
    } catch (err) {
      console.error(`Errore eliminazione file ${extraFile}:`, err.message);
    }
    extraIndex++;
  }
}

function splitExistingJsonFile() {
  const filePath = path.join(__dirname, '../dati_scraping.json');
  const chunkSize = 20000;

  if (!fs.existsSync(filePath)) {
    console.error('Il file dati_scraping.json non esiste.');
    return;
  }

  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const sorted = data.sort((a, b) => Number(a.id) - Number(b.id));

    let index = 1;
    for (let i = 0; i < sorted.length; i += chunkSize) {
      const chunk = sorted.slice(i, i + chunkSize);
      const outputPath = index === 1
        ? path.join(__dirname, '../dati_scraping.json')
        : path.join(__dirname, `../dati_scraping_${index}.json`);

      fs.writeFileSync(outputPath, JSON.stringify(chunk, null, 2), 'utf8');
      console.log(`✅ Creato ${outputPath} con ${chunk.length} righe`);
      index++;
    }

    // Pulisce file extra
    let extraIndex = index;
    while (true) {
      const extraPath = path.join(__dirname, `../dati_scraping_${extraIndex}.json`);
      if (!fs.existsSync(extraPath)) break;
      fs.unlinkSync(extraPath);
      console.log(`🗑️ Rimosso vecchio file extra: dati_scraping_${extraIndex}.json`);
      extraIndex++;
    }

  } catch (err) {
    console.error('Errore durante la suddivisione:', err.message);
  }
}

module.exports = {
  loadAllResults,
  saveResultsToFile,
  splitExistingJsonFile
};