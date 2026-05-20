(function () {
    const renderer = new window.GameRenderer();
    const engine = new window.GameEngine(renderer);

    const selectorTema = document.getElementById("selector-tema");
    const previewEmoji = document.getElementById("preview-emoji");
    const previewTitle = document.getElementById("preview-title");
    const previewSubtitle = document.getElementById("preview-subtitle");
    const previewMiniEmoji = document.getElementById("preview-mini-emoji");
    const previewMiniTitle = document.getElementById("preview-mini-title");
    const previewMiniText = document.getElementById("preview-mini-text");

    let themeManifest = [];
    const themeCache = new Map();

    async function fetchJSON(path) {
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`No s'ha pogut carregar ${path}`);
        }
        return await response.json();
    }

    function normalizeTheme(raw) {
        if (!raw.items || raw.items.length !== 28) {
            throw new Error(`El tema "${raw.title}" ha de tenir exactament 28 items.`);
        }

        if (!raw.questions || !Array.isArray(raw.questions) || raw.questions.length === 0) {
            throw new Error(`El tema "${raw.title}" ha de tenir almenys una pregunta.`);
        }

        return {
            id: raw.id,
            title: raw.title,
            subtitle: raw.subtitle,
            emoji: raw.emoji,
            shortDescription: raw.shortDescription,
            victoryTitle: raw.victoryTitle,
            board: {
                rows: 8,
                cols: 8,
                innerDecorations: raw.innerDecorations || ["âœ¨", "ðŸ”¬", "ðŸŒ¿", "ðŸ§ª"],
                cells: window.createStandardCells(raw.items)
            },
            rules: {
                correctAdvance: raw.rules?.correctAdvance ?? 2,
                wrongBack: raw.rules?.wrongBack ?? 2,
                specialAdvance: raw.rules?.specialAdvance ?? 3,
                specialBack: raw.rules?.specialBack ?? 3,
                exactGoalRequired: raw.rules?.exactGoalRequired ?? false
            },
            questions: raw.questions
        };
    }

    async function loadManifest() {
        const data = await fetchJSON("./data/themes.json");
        themeManifest = data.themes || [];
    }

    async function getThemeById(id) {
        if (themeCache.has(id)) {
            return themeCache.get(id);
        }

        const entry = themeManifest.find(t => t.id === id);
        if (!entry) {
            throw new Error(`No existeix el tema amb id "${id}"`);
        }

        const rawTheme = await fetchJSON(entry.file);
        const theme = normalizeTheme(rawTheme);
        themeCache.set(id, theme);
        return theme;
    }

    function fillThemeSelector() {
        selectorTema.innerHTML = "";

        themeManifest.forEach(theme => {
            const option = document.createElement("option");
            option.value = theme.id;
            option.textContent = theme.label;
            selectorTema.appendChild(option);
        });
    }

    async function updatePreview(themeId) {
        const theme = await getThemeById(themeId);

        previewEmoji.textContent = theme.emoji;
        previewTitle.textContent = theme.title;
        previewSubtitle.textContent = theme.subtitle;

        previewMiniEmoji.textContent = theme.emoji;
        previewMiniTitle.textContent = theme.title;
        previewMiniText.textContent = theme.shortDescription;
    }

    selectorTema.addEventListener("change", async () => {
        try {
            await updatePreview(selectorTema.value);
        } catch (error) {
            console.error(error);
            alert(error.message);
        }
    });

    document.getElementById("dau").addEventListener("click", () => {
        window.tirarDau();
    });

    window.iniciarJoc = async function (numPlayers) {
        try {
            const theme = await getThemeById(selectorTema.value);
            engine.setTheme(theme);
            engine.start(numPlayers);
        } catch (error) {
            console.error(error);
            alert(`Error en iniciar el joc: ${error.message}`);
        }
    };

    window.tirarDau = function () {
        engine.rollDice();
    };

    window.reiniciarJoc = function () {
        engine.goHome();
    };

    async function init() {
        try {
            await loadManifest();
            fillThemeSelector();

            if (themeManifest.length > 0) {
                selectorTema.value = themeManifest[0].id;
                await updatePreview(selectorTema.value);
            }

            renderer.showHomeScreen();
        } catch (error) {
            console.error(error);
            alert(`Error carregant l'aplicaciÃ³: ${error.message}`);
        }
    }

    init();
})();








