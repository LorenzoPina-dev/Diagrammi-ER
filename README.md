# Diagrammi ER

**Editor visuale interattivo per la progettazione rapida di diagrammi Entità-Relazione**, secondo la notazione accademica italiana (Chen estesa con attributi UML).

L'obiettivo del progetto è ridurre al minimo il tempo che intercorre tra un'idea di schema e un diagramma leggibile e condivisibile — senza richiedere strumenti pesanti, account cloud o connessione internet.

---

## Motivazione

La creazione di un diagramma ER è spesso il primo passo nella progettazione di una base dati, eppure la maggior parte degli strumenti disponibili pone attriti inutili: interfacce sovraccariche, formati proprietari, curve di apprendimento ripide. Chi insegna o studia basi di dati ha bisogno di qualcosa di diverso — uno strumento che sparisca dietro il proprio lavoro, che si avvii in un secondo, che non richieda di creare un account.

**Diagrammi ER** nasce da questa esigenza: un'applicazione web completamente locale, zero dipendenze esterne a runtime, che implementa fedelmente la notazione ER insegnata nei corsi universitari italiani (entità, relazioni, attributi semplici/chiave/composti/derivati/multivalore, generalizzazioni).

---

## Funzionalità principali

### Elementi del diagramma

| Elemento | Rappresentazione visiva | Come si crea |
|---|---|---|
| **Entità** | Rettangolo blu | Tasto destro sul canvas → *Aggiungi Entità*, oppure drag dalla toolbar |
| **Relazione** | Rombo viola | Tasto destro sul canvas → *Aggiungi Relazione*, oppure drag dalla toolbar |
| **Associazione** | Linea con cardinalità draggabile | Trascinare da un'entità a una relazione |
| **Attributo semplice** | Cerchio vuoto verde | Pannello laterale → sezione Attributi |
| **Chiave primaria** | Cerchio pieno verde (•) | Tipo `Chiave (PK)` nel pannello |
| **Attributo opzionale** | Cerchio vuoto + `(0,1)` sul link | Tipo `(0,1)` nel pannello |
| **Attributo multivalore** | Cerchio vuoto + `(1,N)` sul link | Tipo `(1,N)` nel pannello |
| **Attributo derivato** | Cerchio tratteggiato | Tipo `Derivato` nel pannello |
| **Attributo composto** | Ellisse viola con sotto-attributi | Tipo `Composto` nel pannello, poi `+` per aggiungere i figli |
| **Chiave composta** | Pallino pieno con sotto-attributi | Tipo `Chiave comp.` nel pannello, poi `+` per aggiungere i figli |
| **Generalizzazione** | Struttura a T con freccia triangolare | Pannello entità → sezione *Generalizzazione (Padre)* |

### Interazione con il canvas

- **Tasto destro** sul canvas apre un menu contestuale per aggiungere entità e relazioni nella posizione esatta del cursore.
- **Drag-to-connect**: trascinare direttamente da un nodo verso un altro per creare un'associazione — nessun punto di connessione esplicito da cercare.
- **Waypoints**: fare clic su qualsiasi arco per aggiungere un punto di controllo e ridisegnare il percorso. I waypoints sono draggabili e rimuovibili (doppio clic).
- **Label draggabili**: le cardinalità sulle associazioni si spostano trascinandole lungo l'arco.
- **Selezione e cancellazione**: clic per selezionare, `Canc` / `Backspace` per eliminare il nodo (e i suoi archi).

### Pannello laterale contestuale

Il pannello laterale si adatta al nodo selezionato:

- **Entità** — modifica il nome, gestisce attributi di tutti i tipi (inclusi composti con sotto-attributi), configura la generalizzazione (copertura totale/parziale, esclusiva/sovrapposta).
- **Relazione** — modifica il nome, collega entità scegliendo la cardinalità da preset o digitandola liberamente, supporta self-relation, gestisce attributi di relazione (tipici delle associazioni N:N).

### Persistenza e portabilità

- **Auto-save su `localStorage`**: ogni modifica viene salvata automaticamente nel browser; il diagramma sopravvive alla chiusura della scheda.
- **Export JSON** (`.er.json`): formato aperto, versionato (`"version": "1.0"`), ricaricabile in qualsiasi momento tramite *Importa*.
- **Export PNG** ad alta risoluzione (2×), sfondo scuro.
- **Export SVG** vettoriale, ideale per inserimento in documenti e presentazioni.
- **Import JSON**: carica un progetto precedentemente esportato, ripristinando nodi, archi e viewport.

### Keyboard shortcuts

| Scorciatoia | Azione |
|---|---|
| `Canc` / `Backspace` | Elimina il nodo selezionato |
| `Ctrl+Z` / `⌘Z` | Annulla l'ultima operazione |

---

## Stack tecnologico

| Libreria | Versione | Ruolo |
|---|---|---|
| [React](https://react.dev) | 18 | UI component model |
| [ReactFlow](https://reactflow.dev) | 11 | Engine canvas drag-and-drop |
| [Zustand](https://zustand-demo.pmnd.rs) + Immer | 4 + 10 | State management immutabile con history/undo |
| [Vite](https://vitejs.dev) | 5 | Build e dev server |
| [TypeScript](https://www.typescriptlang.org) | 5 | Type safety completa |
| [Tailwind CSS](https://tailwindcss.com) | 3 | Stili utility-first |
| [html-to-image](https://github.com/bubkoo/html-to-image) | 1 | Export PNG/SVG |
| [Lucide React](https://lucide.dev) | — | Icone |

---

## Architettura del codice

```
src/
├── nodes/
│   ├── AttributeNode.tsx     # Cerchi, ellissi, pallini per tutti i tipi di attributo
│   ├── EntityNode.tsx        # Rettangolo entità con handle invisibili
│   └── RelationNode.tsx      # Rombo relazione con handle ai quattro vertici
│
├── edges/
│   ├── AssociationEdge.tsx   # Linea con cardinalità draggabile
│   ├── AttributeLinkEdge.tsx # Linea sottile nodo→attributo con cardinalità auto
│   ├── FloatingEdge.tsx      # Engine comune: anchor floating + waypoints + label
│   └── GeneralizationEdge.tsx# Contenitore dati (rendering delegato al layer SVG)
│
├── lib/path/
│   ├── geometry.ts           # Primitive pure: intersezione linea/rettangolo/cerchio/rombo/ellisse
│   ├── nodeAnchor.ts         # Calcolo del punto di ancoraggio sul bordo di ciascun tipo di nodo
│   ├── polyline.ts           # Operazioni su polilinee: midpoint, inserimento/spostamento waypoints
│   ├── EdgePath.tsx          # Componente SVG che renderizza il path con waypoints cliccabili
│   └── drag.ts               # Hook useDragDelta / useDragPoint per il drag in coordinate flow
│
├── store/
│   └── diagramStore.ts       # Zustand + Immer + Persist: tutto lo stato e le azioni del diagramma
│
├── components/
│   ├── canvas/
│   │   ├── ERCanvas.tsx           # ReactFlow con nodi/archi custom, drag-to-drop, context menu
│   │   ├── CanvasContextMenu.tsx  # Menu tasto destro per aggiungere nodi
│   │   └── GeneralizationLayer.tsx# Layer SVG assoluto per il disegno delle generalizzazioni
│   ├── sidebar/
│   │   ├── Sidebar.tsx       # Routing al pannello corretto in base al nodo selezionato
│   │   ├── EntityPanel.tsx   # Form entità: nome, attributi, generalizzazione
│   │   ├── RelationPanel.tsx # Form relazione: nome, connessioni, cardinalità, attributi
│   │   └── EmptyPanel.tsx    # Placeholder quando nessun nodo è selezionato
│   └── toolbar/
│       └── Toolbar.tsx       # Nome progetto, undo, import/export, nuovo diagramma
│
├── hooks/
│   └── useKeyboardShortcuts.ts  # Canc/Backspace + Ctrl+Z
│
└── types/
    └── er.types.ts           # Tutti i tipi TypeScript del dominio ER
```

### Principio di separazione geometria / rendering

La logica geometrica (dove si trova il bordo di un nodo, come si calcola il punto medio di una polilinea, come si inserisce un waypoint nel segmento più vicino) è isolata in `lib/path` come funzioni pure senza dipendenze da React o ReactFlow. Questo la rende testabile in isolamento e riutilizzabile.

Il `FloatingEdge` è l'unico componente che unisce geometria e rendering: calcola gli anchor point, costruisce il path SVG, gestisce i drag dei waypoints e della label. Tutti gli archi del diagramma (`AssociationEdge`, `AttributeLinkEdge`) sono wrapper di `FloatingEdge` che personalizzano colore, spessore e contenuto della label.

---

## Avvio in locale

```bash
# Clona il repository
git clone https://github.com/<tuo-utente>/Diagrammi-ER.git
cd Diagrammi-ER

# Installa le dipendenze
npm install

# Avvia il dev server
npm run dev
# → http://localhost:5173
```

### Build di produzione

```bash
npm run build    # compila TypeScript + bundle Vite in /dist
npm run preview  # serve la build locale per verifica
```

---

## Utilizzo rapido

1. **Tasto destro** sul canvas → *Aggiungi Entità* — posiziona l'entità dove vuoi.
2. **Tasto destro** sul canvas → *Aggiungi Relazione* — posiziona il rombo tra le entità.
3. **Trascina** da un'entità al rombo per creare un'associazione; seleziona il rombo e nel pannello imposta le cardinalità.
4. **Seleziona un'entità** → pannello laterale → aggiungi attributi scegliendo il tipo.
5. Per attributi **composti o chiave composta**: espandi il pannello con il pulsante `⊞` e aggiungi i sotto-attributi.
6. Per le **generalizzazioni**: seleziona l'entità padre → sezione *Generalizzazione* → spunta le entità figlie, scegli copertura e disgiunzione.
7. **Esporta** con i pulsanti nella toolbar: PNG per le presentazioni, SVG per i documenti, JSON per salvare e riprendere il lavoro.

---

## Roadmap

- [ ] Layout automatico (Dagre / ELK) con un click
- [ ] Modalità presentazione (zoom animato sui singoli elementi)
- [ ] Esportazione DDL SQL a partire dallo schema ER
- [ ] Tema chiaro
- [ ] Supporto multi-diagramma (tab)
- [ ] Collaborazione in tempo reale (WebSocket / CRDT)

---

## Licenza

MIT — libero di usare, modificare e distribuire.
