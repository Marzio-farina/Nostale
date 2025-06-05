const { ipcRenderer } = require('electron');

ipcRenderer.on('scrape-result', (event, result) => {
  console.log(`ID ${result.id}: ${result.name}`);
  
  const container = document.getElementById('current-result');
  if (container) {
    container.textContent = `ID ${result.id}: ${result.name}`;
  }
});

function formattaPrezzoConApice(numero) {
  const parti = numero.toString().split('.');
  parti[0] = parti[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return parti.join('.');
}

window.addEventListener('DOMContentLoaded', async () => {
  const ul = document.getElementById('lista-records');

  try {
    const datiScraping = await ipcRenderer.invoke('leggi-json-scraping');

    // Rimuove duplicati per ID
    const visti = new Set();
    const elementiUnici = datiScraping.filter(el => {
      if (visti.has(el.name)) return false;
      visti.add(el.name);
      return true;
    });

    for (const { id, name, timestamp } of elementiUnici) {
      ul.innerHTML += `<li>${name} (ID: ${id}) - Timestamp: ${timestamp}</li>`;
    }

  } catch (err) {
    ul.innerHTML = `<li>Errore: ${err.message}</li>`;
  }
});