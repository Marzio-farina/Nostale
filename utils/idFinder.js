const fetch = require('node-fetch');
const { JSDOM } = require('jsdom');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const findMaxValidId = async (win, base = 275000, step = 1000, hardLimit = 350000) => {
  console.log(`🔎 Inizio ricerca ID massimo valido da base ${base} con step ${step} e limite ${hardLimit}`);
  let lower = base;
  let upper = base + step;

  while (upper <= hardLimit) {
    
    const exists = await idExists(win, upper);
    console.log(`🔁 Testando ID ${upper} (range attuale: ${lower} - ${upper})`);

    if (!exists) {
      console.log(`❌ ID ${upper} non valido, esco dal ciclo`);
      break;
    }
    
    lower = upper;
    upper += step;
    await delay(100);
  }

  // Ricerca binaria tra lower e upper-1
  let left = lower;
  let right = Math.min(upper, hardLimit);
  console.log(`🔍 Inizio ricerca binaria tra ${left} e ${right}`);

  while (left < right) {
    const mid = Math.ceil((left + right) / 2);
    console.time(`Binary search test ID ${mid}`);
    if (await idExists(win, mid)) {
      left = mid;
      console.log(`ID ${mid} valido, nuovo left = ${left}`);
    } else {
      right = mid - 1;
      console.log(`ID ${mid} non valido, nuovo right = ${right}`);
    }
    console.timeEnd(`Binary search test ID ${mid}`);
    await delay(100);
  }
  console.log(`✅ ID massimo valido rilevato: ${left}`);
  return left;
};

const idExists = async (win, id) => {
  const url = `https://www.noshydra.com/home?lang=it&server=dragonveil&search=${id}`;
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)...'
      }
    });
    const html = await response.text();
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    const item = doc.querySelector('#basar .search-results .item');
    const name = item?.querySelector('.text-div .all-searches-p')?.textContent;
    const valid = !!name && name.trim() !== 'Nessun contenuto trovato';

    console.log(`➡️ Caricamento URL per ID ${id}: ${url} ⇒ ${valid ? '✅ valido' : '❌ non valido'}`);

    return valid;
  } catch (e) {
    console.error(`Errore test ID ${id}:`, e.message);
    return false;
  }
};

module.exports = {
  findMaxValidId,
  idExists
};