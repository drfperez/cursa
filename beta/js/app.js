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
    const diceEl = document.getElementById("dau");
    const rollBtn = document.getElementById("btn-tirar");

    let themeManifest = [];
    const themeCache = new Map();

    const DEFAULT_THEME = {
        version: 2,
        meta: {
            id: "default",
            title: "Cursa de Ciències",
            subtitle: "",
            emoji: "🎲",
            description: "",
            victoryTitle: "Has arribat a la meta!"
        },
        ui: {
            palette: {
                primary: "#7c4dff",
                secondary: "#ffd54f",
                accent: "#4caf50",
                background: "#0a0a1a",
                panel: "#101033ee"
            },
            innerDecorations: ["✨", "🔬", "🌿", "🧪"],
            showCellNumbers: true,
            fontFamily: "Segoe UI, Arial, sans-serif"
        },
        players: {
            min: 2,
            max: 4,
            presets: [
                { name: "Equip 1", color: "#e53935", token: "🔴" },
                { name: "Equip 2", color: "#1e88e5", token: "🔵" },
                { name: "Equip 3", color: "#43a047", token: "🟢" },
                { name: "Equip 4", color: "#fb8c00", token: "🟠" }
            ]
        },
        rules: {
            exactGoalRequired: false,
            bounceOnOverflow: true,
            defaultCorrectAdvance: 2,
            defaultWrongBack: 2,
            resolveOrder: "question-then-effect"
        },
        texts: {
            startLog: "Comença la partida!",
            questionTitle: "Pregunta",
            correct: "✅ Correcte!",
            wrong: "❌ Incorrecte!",
            victoryTitle: "🏆 ENHORABONA!",
            victoryText: "Has completat el recorregut.",
            rollButton: "Tira el dau",
            playAgain: "🎉 Tornar a l'inici"
        },
        questionPolicy: {
            mode: "all-except",
            defaultPool: "general",
            includeTypes: ["normal", "effect", "question"],
            excludeTypes: ["start", "goal"],
            excludeIndexes: [],
            everyNthCell: null,
            probability: 1,
            overrides: {}
        },
        board: {
            rows: 8,
            cols: 8,
            path: "standard-8x8-ring",
            cells: []
        },
        questionPools: {
            general: []
        }
    };

    async function fetchJSON(path) {
        const response = await fetch(path);
        if (!response.ok) {
            throw new Error(`No s'ha pogut carregar ${path}`);
        }
        return response.json();
    }

    function isPlainObject(value) {
        return value && typeof value === "object" && !Array.isArray(value);
    }

    function deepMerge(base, extra) {
        const out = Array.isArray(base) ? [...base] : { ...base };

        Object.keys(extra || {}).forEach(key => {
            const baseVal = base ? base[key] : undefined;
            const extraVal = extra[key];

            if (Array.isArray(extraVal)) {
                out[key] = [...extraVal];
            } else if (isPlainObject(baseVal) && isPlainObject(extraVal)) {
                out[key] = deepMerge(baseVal, extraVal);
            } else {
                out[key] = extraVal;
            }
        });

        return out;
    }

    function validateQuestion(question, poolName, index) {
        if (!question.question || !Array.isArray(question.options) || question.options.length !== 4) {
            throw new Error(`La pregunta ${index + 1} del pool "${poolName}" ha de tenir "question" i 4 opcions.`);
        }

        if (typeof question.correct !== "number" || question.correct < 0 || question.correct > 3) {
            throw new Error(`La pregunta ${index + 1} del pool "${poolName}" ha de tenir "correct" entre 0 i 3.`);
        }

        return {
            id: question.id || `${poolName}-${index + 1}`,
            question: question.question,
            options: [...question.options],
            correct: question.correct,
            hint: question.hint || "",
            explanation: question.explanation || "",
            image: question.image || "",
            bonusIfCorrect: Number.isFinite(question.bonusIfCorrect) ? question.bonusIfCorrect : 0,
            penaltyIfWrong: Number.isFinite(question.penaltyIfWrong) ? question.penaltyIfWrong : 0,
            difficulty: question.difficulty || "",
            category: question.category || poolName
        };
    }

    function validateCell(cell, index) {
        if (!cell || typeof cell !== "object") {
            throw new Error(`La casella ${index + 1} no és vàlida.`);
        }

        if (!cell.icon || !cell.label || !cell.type) {
            throw new Error(`La casella ${index + 1} ha de tenir "icon", "label" i "type".`);
        }

        const allowedTypes = ["start", "normal", "effect", "question", "goal"];
        if (!allowedTypes.includes(cell.type)) {
            throw new Error(`La casella ${index + 1} té un type no vàlid: "${cell.type}".`);
        }

        const normalized = {
            icon: cell.icon,
            label: cell.label,
            type: cell.type,
            message: cell.message || "",
            effect: null,
            question: null
        };

        if (cell.effect) {
            const effect = cell.effect;
            if (effect.kind !== "move") {
                throw new Error(`La casella ${index + 1} només admet effect.kind = "move".`);
            }

            if (!Number.isFinite(effect.steps) || effect.steps < 0) {
                throw new Error(`La casella ${index + 1} té effect.steps no vàlid.`);
            }

            if (!["forward", "backward"].includes(effect.direction)) {
                throw new Error(`La casella ${index + 1} té effect.direction no vàlid.`);
            }

            normalized.effect = {
                kind: "move",
                steps: effect.steps,
                direction: effect.direction
            };
        }

        if (cell.question) {
            normalized.question = {
                ask: typeof cell.question.ask === "boolean" ? cell.question.ask : undefined,
                pool: cell.question.pool || null,
                correctAdvance: Number.isFinite(cell.question.correctAdvance) ? cell.question.correctAdvance : null,
                wrongBack: Number.isFinite(cell.question.wrongBack) ? cell.question.wrongBack : null
            };
        }

        return normalized;
    }

    function normalizeTheme(raw) {
        const theme = deepMerge(DEFAULT_THEME, raw);

        if (!window.GAME_PATH || !Array.isArray(window.GAME_PATH) || window.GAME_PATH.length !== 28) {
            throw new Error("No s'ha trobat un GAME_PATH vàlid a path.js.");
        }

        if (!theme.board || !Array.isArray(theme.board.cells) || theme.board.cells.length !== window.GAME_PATH.length) {
            throw new Error(`El tema "${theme.meta?.title || "(sense títol)"}" ha de tenir exactament 28 caselles a board.cells.`);
        }

        const questionPools = {};
        const poolEntries = Object.entries(theme.questionPools || {});
        if (!poolEntries.length) {
            throw new Error(`El tema "${theme.meta.title}" ha de tenir almenys un questionPool.`);
        }

        for (const [poolName, questions] of poolEntries) {
            if (!Array.isArray(questions) || !questions.length) {
                throw new Error(`El questionPool "${poolName}" ha de contenir almenys una pregunta.`);
            }
            questionPools[poolName] = questions.map((q, i) => validateQuestion(q, poolName, i));
        }

        const defaultPoolName = theme.questionPolicy?.defaultPool || Object.keys(questionPools)[0];
        if (!questionPools[defaultPoolName]) {
            throw new Error(`El defaultPool "${defaultPoolName}" no existeix dins questionPools.`);
        }

        const cells = theme.board.cells.map((rawCell, index) => {
            const cell = validateCell(rawCell, index);
            const pos = window.GAME_PATH[index];

            return {
                index,
                row: pos.row,
                col: pos.col,
                ...cell
            };
        });

        return {
            version: theme.version,
            meta: theme.meta,
            ui: theme.ui,
            players: theme.players,
            rules: theme.rules,
            texts: theme.texts,
            questionPolicy: {
                mode: theme.questionPolicy.mode || "all-except",
                defaultPool: defaultPoolName,
                includeTypes: Array.isArray(theme.questionPolicy.includeTypes) ? theme.questionPolicy.includeTypes : ["normal", "effect", "question"],
                excludeTypes: Array.isArray(theme.questionPolicy.excludeTypes) ? theme.questionPolicy.excludeTypes : ["start", "goal"],
                excludeIndexes: Array.isArray(theme.questionPolicy.excludeIndexes) ? theme.questionPolicy.excludeIndexes : [],
                everyNthCell: Number.isFinite(theme.questionPolicy.everyNthCell) ? theme.questionPolicy.everyNthCell : null,
                probability: Number.isFinite(theme.questionPolicy.probability) ? theme.questionPolicy.probability : 1,
                overrides: theme.questionPolicy.overrides || {}
            },
            board: {
                rows: theme.board.rows || 8,
                cols: theme.board.cols || 8,
                path: theme.board.path || "standard-8x8-ring",
                cells
            },
            questionPools
        };
    }

    async function loadManifest() {
        const data = await fetchJSON("./data/themes.json");
        themeManifest = Array.isArray(data.themes) ? data.themes : [];
    }

    async function getThemeById(id) {
        if (themeCache.has(id)) {
            return themeCache.get(id);
        }

        const entry = themeManifest.find(t => t.id === id);
        if (!entry) {
            throw new Error(`No existeix el tema amb id "${id}".`);
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
            option.textContent = theme.label || theme.id;
            selectorTema.appendChild(option);
        });
    }

    async function updatePreview(themeId) {
        const theme = await getThemeById(themeId);

        previewEmoji.textContent = theme.meta.emoji;
        previewTitle.textContent = theme.meta.title;
        previewSubtitle.textContent = theme.meta.subtitle;

        previewMiniEmoji.textContent = theme.meta.emoji;
        previewMiniTitle.textContent = theme.meta.title;
        previewMiniText.textContent = theme.meta.description;
    }

    selectorTema.addEventListener("change", async () => {
        try {
            await updatePreview(selectorTema.value);
        } catch (error) {
            console.error(error);
            alert(error.message);
        }
    });

    if (diceEl) {
        diceEl.addEventListener("click", () => {
            window.tirarDau();
        });
    }

    if (rollBtn) {
        rollBtn.addEventListener("click", () => {
            window.tirarDau();
        });
    }

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
            alert(`Error carregant l'aplicació: ${error.message}`);
        }
    }

    init();
})();
        







