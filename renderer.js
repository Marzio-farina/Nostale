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
    const maxItems = 5; // cambia questo valore se vuoi più risultati

    for (let i = 0; i < Math.min(datiScraping.length, maxItems); i++) {
      const { id, name } = datiScraping[i];

      const postData = {
        lang: 'it',
        server: 'dragonveil',
        id: parseInt(id),
        shellFilters: []
      };

      try {
        const priceResponse = await fetch('https://www.noshydra.com/get_results_from_searches', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/119.0.0.0 Safari/537.36'
          },
          body: JSON.stringify(postData)
        });

        const priceData = await priceResponse.json();

        let priceInfo = 'Prezzo non disponibile';
        if (priceData.results && priceData.results.length > 0) {
          const firstResult = priceData.results[0];
          console.log(firstResult);
          const rawPrice = firstResult.PricePerUnit;
          priceInfo = rawPrice
            ? `${formattaPrezzoConApice(rawPrice)}`
            : 'Prezzo non disponibile';
        }

        ul.innerHTML += `<li>${name} (ID: ${id}) - Prezzo: ${priceInfo}</li>`;
      } catch (err) {
        ul.innerHTML += `<li>${name} (ID: ${id}) - Errore: ${err.message}</li>`;
      }
    }
  } catch (err) {
    ul.innerHTML = `<li>Errore: ${err.message}</li>`;
  }
});