# Graphify per questo progetto

Questa integrazione crea un grafo locale del codice e suggerisce agli assistenti di consultarlo per trovare i file pertinenti. Richiede Python 3.10 o successivo.

```sh
python .graphify/run.py refresh
python .graphify/run.py query "UserController" --budget 1500
python .graphify/run.py explain "UserController"
python .graphify/run.py path "UserController" "Database"
python .graphify/run.py affected "UserController"
```

Sostituisci i nomi con simboli del progetto. Al primo avvio il runner installa `graphifyy==0.9.61` e le dipendenze in `.graphify-venv/`, oppure usa la stessa versione gia presente nell'interprete corrente. Il download iniziale richiede internet; la scansione del codice e le query sono locali. Su sistemi dove il comando Python e `python3` o `py`, usa quel comando.

`refresh` esegue `extract . --code-only --no-cluster` e poi `cluster-only . --no-label`. Documenti, PDF e immagini non vengono inviati a un modello. Nessuna API a pagamento viene chiamata. Le istruzioni per gli assistenti sono in `AGENTS.md`.

Gli output sono in `graphify-out/`: `graph.json`, `GRAPH_REPORT.md` e `graph.html`. Apri l'HTML per esplorare la mappa; una connessione internet puo essere necessaria per le librerie di visualizzazione. Rigenera il grafo dopo modifiche al codice, pull o cambio di branch. Output, cache e ambiente Python sono ignorati da Git.

Il grafo aiuta a scegliere cosa leggere: verifica sempre le conclusioni nel codice sorgente, soprattutto per relazioni inferite. Se non contiene simboli utili, usa la normale ricerca nei file. Repository vuoti o con soli formati non supportati possono non produrre un grafo utile.

Il parametro `--budget` indica un obiettivo per la dimensione della risposta, non un tetto rigido: Graphify puo superarlo quando include tutte le relazioni dei nodi selezionati. Il risparmio reale di token dipende dalla domanda e dal codice da verificare; i benchmark che confrontano una query con la lettura dell'intero repository non misurano una riduzione garantita della fattura o dei limiti dell'abbonamento.

Progetto originale e licenza Apache-2.0: [Graphify](https://github.com/blockflix/Graphify). Il pacchetto Python si chiama `graphifyy`, con due y.
