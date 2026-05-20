# Cursa de Ciències · README tècnic

Aplicació web estàtica per a jocs de preguntes de ciències basada en **HTML + CSS + JavaScript + JSON**.

Aquest repositori conté un motor de joc reutilitzable i una capa de contingut desacoblada mitjançant fitxers JSON perquè es puguin crear nous temes sense modificar la lògica principal.

---

## 1. Visió general de l'arquitectura

El projecte segueix una estructura simple de **motor + renderitzat + dades**:

- **`index.html`**
  - Punt d'entrada de l'aplicació.
  - Defineix l'estructura base de la interfície: pantalla inicial, tauler, panell lateral i modal.

- **`css/styles.css`**
  - Estils globals.
  - Layout responsive del tauler i del panell.
  - Estils del dau, fitxes, modal i caselles.

- **`js/app.js`**
  - Inicialització de l'aplicació.
  - Càrrega del manifest de temes (`data/themes.json`).
  - Càrrega del tema seleccionat.
  - Enllaç entre la interfície i el motor.

- **`js/engine.js`**
  - Motor del joc.
  - Gestiona jugadors, torns, moviment, preguntes, caselles especials i victòria.

- **`js/renderer.js`**
  - Capa de renderitzat del DOM.
  - Construeix el tauler, actualitza el panell, anima el dau, mostra el modal i mou les fitxes.

- **`js/path.js`**
  - Defineix el recorregut estàndard del tauler.
  - Genera les caselles a partir de les dades JSON del tema.

- **`data/themes.json`**
  - Manifest de temes disponibles.

- **`data/themes/*.json`**
  - Definició de cada tema.
  - Contenen metadades, decoracions, regles, caselles i preguntes.

---

## 2. Estructura del projecte

```text
.
├── index.html
├── css/
│   └── styles.css
├── js/
│   ├── app.js
│   ├── engine.js
│   ├── renderer.js
│   └── path.js
└── data/
    ├── themes.json
    └── themes/
        ├── exoplanetes.json
        ├── celules.json
        └── ecosistemes.json
```

---

## 3. Flux de dades

### 3.1 Inicialització

Quan es carrega l'aplicació:

1. `app.js` carrega `data/themes.json`.
2. El selector de tema s'omple dinàmicament.
3. En seleccionar un tema, `app.js` carrega el JSON corresponent.
4. El tema es normalitza i es transforma en una estructura interna consistent.
5. Quan l'usuari prem un botó de nombre de jugadors, el motor s'inicialitza.

### 3.2 Execució del joc

1. `engine.start(numPlayers)` crea els jugadors.
2. `renderer.buildBoard(theme, players)` pinta el tauler.
3. Cada tirada de dau passa per `engine.rollDice()`.
4. El motor calcula el moviment i la casella de destí.
5. Si la casella ho requereix, es mostra una pregunta amb `renderer.askQuestion()`.
6. El motor aplica les conseqüències de la resposta.
7. Si un jugador arriba a la meta, es mostra el modal de victòria.

---

## 4. Model de dades del tema

Cada tema es defineix amb un fitxer JSON.

### Exemple simplificat

```json
{
  "id": "exoplanetes",
  "title": "EXOCURSA",
  "subtitle": "Viatja per la galàxia descobrint exoplanetes.",
  "emoji": "🪐",
  "shortDescription": "Preguntes i recorregut sobre astronomia i exoplanetes.",
  "victoryTitle": "Has arribat a l'exoplaneta habitable!",
  "innerDecorations": ["🌟", "🌌", "🪐", "⭐"],
  "rules": {
    "correctAdvance": 2,
    "wrongBack": 2,
    "specialAdvance": 3,
    "specialBack": 3,
    "exactGoalRequired": false
  },
  "items": [
    ["🚀", "Sortida"],
    ["🌍", "Casella 2"],
    ["✨", "Casella 3"],
    ["❓", "Casella 4"]
  ],
  "questions": [
    {
      "question": "Què és un exoplaneta?",
      "options": [
        "Un planeta del sistema solar",
        "Un planeta que orbita una altra estrella",
        "Una estrella",
        "Un satèl·lit"
      ],
      "correct": 1
    }
  ]
}
```

### Camps principals

#### Metadades del tema
- `id`: identificador intern únic.
- `title`: títol gran del joc.
- `subtitle`: subtítol o descripció curta.
- `emoji`: icona principal del tema.
- `shortDescription`: text resum per al selector.
- `victoryTitle`: missatge de victòria.

#### Decoració
- `innerDecorations`: array d'emojis decoratius del centre del tauler.

#### Regles
- `correctAdvance`: caselles que s'avancen quan s'encerta una pregunta.
- `wrongBack`: caselles que es retrocedeixen quan es falla.
- `specialAdvance`: efecte d'una casella d'avançar.
- `specialBack`: efecte d'una casella de retrocedir.
- `exactGoalRequired`: reserva per a futures variants de meta exacta.

#### Caselles
- `items`: array de **28 elements**.
- Cada element és una tupla:

```json
["🌋", "Cràter"]
```

Format:
1. emoji de la casella
2. nom de la casella

#### Preguntes
- `questions`: llista de preguntes del tema.
- Cada pregunta ha de tenir:
  - `question`
  - `options` (4 opcions)
  - `correct` (valor entre 0 i 3)

---

## 5. Requisits del JSON

Perquè un tema funcioni correctament:

- `items` ha de tenir **exactament 28 caselles**.
- `questions` ha de contenir **almenys una pregunta**.
- cada pregunta ha de tenir **4 opcions**.
- `correct` ha d'estar entre `0` i `3`.
- el fitxer ha de ser un JSON vàlid (comes, claus i cometes correctes).

---

## 6. Manifest de temes

El fitxer `data/themes.json` controla quins temes apareixen al selector.

### Exemple

```json
{
  "themes": [
    {
      "id": "exoplanetes",
      "label": "🪐 Exoplanetes",
      "file": "./data/themes/exoplanetes.json"
    },
    {
      "id": "celules",
      "label": "🔬 Cèl·lules",
      "file": "./data/themes/celules.json"
    }
  ]
}
```

### Per afegir un tema nou

1. Crear un nou fitxer dins `data/themes/`.
2. Afegir una nova entrada a `data/themes.json`.
3. Recarregar l'aplicació.

---

## 7. Execució en local

### Opció recomanada: servidor local

Com que el projecte utilitza `fetch()` per carregar JSON, no és recomanable obrir `index.html` directament amb `file://`.

### Amb Python

```bash
python -m http.server 5500
```

Després:

```text
http://localhost:5500
```

### Amb VS Code + Live Server

1. Obrir la carpeta del projecte.
2. Instal·lar l'extensió **Live Server**.
3. Obrir `index.html` amb **Open with Live Server**.

---

## 8. Publicació a GitHub Pages

### Cas 1 · repositori personal

Nom del repositori:

```text
nomusuari.github.io
```

URL final:

```text
https://nomusuari.github.io/
```

### Cas 2 · repositori de projecte

Nom del repositori:

```text
cursa
```

URL final:

```text
https://nomusuari.github.io/cursa/
```

### Passos

1. Pujar tot el contingut del projecte al repositori.
2. Anar a `Settings → Pages`.
3. Triar `Deploy from a branch`.
4. Seleccionar `main`.
5. Seleccionar `/(root)`.
6. Guardar.

---

## 9. Detalls interns del motor

### Jugadors

Cada jugador es representa amb una estructura similar a aquesta:

```javascript
{
  id: 0,
  name: "Jugador 1 (Vermell)",
  color: "#e53935",
  position: 0
}
```

### Recorregut

El recorregut del tauler no es defineix dins de cada tema, sinó a `path.js`.

Això permet:
- reutilitzar el mateix motor,
- canviar només el contingut,
- garantir que tots els temes respectin la mateixa estructura.

### Tipus de casella

El motor treballa amb aquests tipus:

- `start`
- `normal`
- `question`
- `advance`
- `back`
- `goal`

Els tipus s'apliquen automàticament a partir del patró definit a `path.js`.

---

## 10. Personalització avançada

### Afegir preguntes a més caselles

Hi ha diverses maneres de fer-ho:

#### Opció senzilla
Fer que totes les caselles (excepte inici i meta) generin pregunta mitjançant una regla global.

#### Opció flexible
Ampliar `items` perquè cada casella inclogui un tercer valor booleà:

```json
["🌋", "Cràter", true]
```

Això permet indicar si una casella concreta ha de llançar una pregunta.

### Modificar regles

Es poden ajustar fàcilment des del JSON:
- quant s'avança en encertar,
- quant es retrocedeix en fallar,
- intensitat de les caselles especials.

---

## 11. Errors habituals i depuració

### El joc no carrega un tema
Revisar:
- que el fitxer existeixi,
- que `data/themes.json` apunti bé al fitxer,
- que el JSON sigui vàlid.

### El joc no arrenca en local
Possibles causes:
- s'ha obert amb `file://` en lloc d'un servidor,
- el navegador bloqueja `fetch()` a fitxers locals.

### 404 a GitHub Pages
Comprovar:
- existència de `index.html`,
- branca correcta,
- carpeta correcta,
- temps de propagació del desplegament.

### El tema no es veu bé
Comprovar:
- que hi hagi 28 caselles a `items`,
- que les preguntes tinguin 4 opcions,
- que no faltin carpetes com `css`, `js` o `data`.

---

## 12. Desenvolupament i manteniment

### Bones pràctiques recomanades

- mantenir la lògica del joc fora dels fitxers JSON,
- documentar els canvis en el README,
- validar el JSON abans de publicar,
- provar el joc després de cada canvi important,
- separar clarament contingut i comportament.

### Canvis recomanables futurs

- marcador de puntuacions,
- temporitzador per pregunta,
- suport per més tipus de caselles,
- banc de preguntes per nivell,
- editor visual de temes,
- exportació/importació de temes.

---

## 13. Ús didàctic

Aquest projecte és adequat per a:

- activitats de repàs,
- gamificació a l'aula,
- projectes de ciències + tecnologia,
- aprenentatge basat en reptes,
- creació cooperativa de continguts.

L'alumnat pot treballar en equips per crear temes diferents i després jugar als jocs creats pels altres grups.

---

## 14. Requisits tècnics

- Navegador modern
  - Chrome
  - Edge
  - Firefox
  - Safari

No cal backend ni base de dades.
Tot el projecte és estàtic.

---

## 15. Crèdits

Repositori base del projecte:

```text
https://github.com/drfperez/cursa
```

Projecte orientat a ús educatiu i adaptació a l'aula.

---

## 16. Llicència i reutilització

Aquest projecte es pot reutilitzar i adaptar en contextos educatius.

Es recomana:
- mantenir l'autoria original,
- indicar les modificacions fetes,
- compartir les versions millorades amb la comunitat educativa quan sigui possible.
