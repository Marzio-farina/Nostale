window.addEventListener('DOMContentLoaded', async () => {
  const ul = document.getElementById('lista-records')

  try {
    const response = await fetch('https://www.noshydra.com/translations/it')
    const dati = await response.json()
    const items = dati.itemsTranslations || dati.ItemsTranslations

    if (!items) {
      ul.innerHTML = `<li>Nessun dato "itemsTranslations" trovato.</li>`
      return
    }
    const elenco = Array.isArray(items) ? items : items.split(',')

    elenco.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
    
    elenco.forEach(item => {
      const li = document.createElement('li')
      li.textContent = item.trim()
      ul.appendChild(li)
    })

  } catch (err) {
    ul.innerHTML = `<li>Errore: ${err.message}</li>`
  }
})