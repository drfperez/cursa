(function () {
    class GameRenderer {
        constructor() {
            this.screenHome = document.getElementById("pantalla-inicial");
            this.screenGame = document.getElementById("pantalla-joc");

            this.boardEl = document.getElementById("taulell");
            this.logEl = document.getElementById("registre");
            this.turnNameEl = document.getElementById("torn-nom");
            this.turnColorEl = document.getElementById("torn-color-ind");

            this.gameTitleEl = document.getElementById("game-title");
            this.gameEmojiEl = document.getElementById("game-emoji");
            this.gameSubtitleEl = document.getElementById("game-subtitle");

            this.diceEl = document.getElementById("dau");
            this.rollBtn = document.getElementById("btn-tirar");

            this.modalOverlay = document.getElementById("modal-overlay");
            this.modalEmoji = document.getElementById("modal-emoji");
            this.modalTitle = document.getElementById("modal-title");
            this.questionText = document.getElementById("pregunta-text");
            this.optionsContainer = document.getElementById("opcions-container");
            this.resultText = document.getElementById("resultat-text");

            this.tokenElements = new Map();

            this.initDice();
            this.renderDice(1);
        }

        initDice() {
            if (!this.diceEl) return;

            this.diceEl.innerHTML = "";
            for (let i = 0; i < 9; i++) {
                const pip = document.createElement("span");
                pip.className = "pip";
                this.diceEl.appendChild(pip);
            }
        }

        applyThemeStyles(theme) {
            const palette = theme.ui?.palette || {};
            const fontFamily = theme.ui?.fontFamily || "Segoe UI, Arial, sans-serif";

            document.body.style.fontFamily = fontFamily;
            document.body.style.background = `radial-gradient(circle at top, ${palette.panel || "#151545"} 0%, ${palette.background || "#0a0a1a"} 60%)`;

            document.documentElement.style.setProperty("--accent", palette.primary || "#7c4dff");
            document.documentElement.style.setProperty("--gold", palette.secondary || "#ffd54f");
            document.documentElement.style.setProperty("--bg", palette.background || "#0a0a1a");
            document.documentElement.style.setProperty("--panel", palette.panel || "#101033ee");
            document.documentElement.style.setProperty("--theme-accent-2", palette.accent || "#4caf50");

            if (this.rollBtn) {
                this.rollBtn.textContent = theme.texts?.rollButton || "Tira el dau";
                this.rollBtn.style.background = palette.primary || "";
                this.rollBtn.style.boxShadow = `0 4px 20px ${(palette.primary || "#7c4dff")}55`;
            }

            if (this.turnColorEl) {
                this.turnColorEl.style.borderColor = palette.secondary || "#ffffff";
            }
        }

        showHomeScreen() {
            this.closeModal();
            this.screenGame.style.display = "none";
            this.screenHome.style.display = "flex";
        }

        showGameScreen(theme) {
            this.screenHome.style.display = "none";
            this.screenGame.style.display = "flex";

            this.applyThemeStyles(theme);

            this.gameTitleEl.textContent = theme.meta.title;
            this.gameEmojiEl.textContent = theme.meta.emoji;
            this.gameSubtitleEl.textContent = theme.meta.subtitle;
        }

        buildBoard(theme, players) {
            const rows = theme.board.rows || 8;
            const cols = theme.board.cols || 8;
            const cells = theme.board.cells || [];
            const inner = theme.ui?.innerDecorations || ["✨", "🔬", "🌿"];
            const showCellNumbers = theme.ui?.showCellNumbers !== false;

            this.boardEl.innerHTML = "";
            this.tokenElements.clear();

            const cellMap = new Map();
            cells.forEach(cell => {
                cellMap.set(`${cell.row}-${cell.col}`, cell);
            });

            for (let row = 1; row <= rows; row++) {
                for (let col = 1; col <= cols; col++) {
                    const key = `${row}-${col}`;
                    const info = cellMap.get(key);
                    const div = document.createElement("div");

                    if (info) {
                        div.className = `cell ${this.getCellCssType(info)}`;
                        div.style.gridRow = row;
                        div.style.gridColumn = col;
                        div.title = `${info.index + 1}: ${info.label}`;

                        div.innerHTML = `
                            ${showCellNumbers ? `<span class="cell-number">${info.index + 1}</span>` : ""}
                            <span class="cell-icon">${info.icon}</span>
                            <div class="tokens" id="tokens-${info.index}"></div>
                        `;
                    } else {
                        div.className = "cell-inner";
                        div.style.gridRow = row;
                        div.style.gridColumn = col;
                        div.textContent = inner[(row * col + row + col) % inner.length];
                    }

                    this.boardEl.appendChild(div);
                }
            }

            players.forEach(player => {
                const token = document.createElement("span");
                token.className = `token j${player.id}`;
                token.id = `token-${player.id}`;
                token.title = player.name;
                token.textContent = player.token || "●";

                token.style.backgroundColor = player.color;
                token.style.color = "#ffffff";
                token.style.width = "22px";
                token.style.height = "22px";
                token.style.fontSize = "0.8rem";
                token.style.display = "inline-flex";
                token.style.alignItems = "center";
                token.style.justifyContent = "center";
                token.style.borderRadius = "999px";
                token.style.border = "2px solid white";

                this.tokenElements.set(player.id, token);

                const startContainer = document.getElementById("tokens-0");
                if (startContainer) {
                    startContainer.appendChild(token);
                }
            });
        }

        getCellCssType(cell) {
            if (cell.type === "effect" && cell.effect?.direction === "backward") return "back";
            if (cell.type === "effect" && cell.effect?.direction === "forward") return "advance";
            return cell.type;
        }

        moveToken(playerId, position) {
            const token = this.tokenElements.get(playerId);
            const target = document.getElementById(`tokens-${position}`);
            if (token && target) {
                target.appendChild(token);
            }
        }

        updateTurn(player, gameActive) {
            if (!player) return;
            this.turnNameEl.textContent = gameActive ? player.name : "🏆 Partida acabada!";
            this.turnColorEl.style.backgroundColor = player.color;
        }

        resetLog(startMessage) {
            this.logEl.innerHTML = `<div class="entry entry-muted">${startMessage}</div>`;
        }

        addLog(text) {
            const entry = document.createElement("div");
            entry.className = "entry";
            entry.innerHTML = text;
            this.logEl.prepend(entry);

            while (this.logEl.children.length > 24) {
                this.logEl.removeChild(this.logEl.lastChild);
            }
        }

        setRollEnabled(enabled) {
            if (this.rollBtn) {
                this.rollBtn.disabled = !enabled;
            }
        }

        renderDice(value) {
            if (!this.diceEl) return;

            const pips = this.diceEl.querySelectorAll(".pip");
            const patterns = {
                1: [4],
                2: [0, 8],
                3: [0, 4, 8],
                4: [0, 2, 6, 8],
                5: [0, 2, 4, 6, 8],
                6: [0, 2, 3, 5, 6, 8]
            };

            const pattern = patterns[value] || [4];

            pips.forEach((pip, i) => {
                pip.style.opacity = pattern.includes(i) ? "1" : "0";
            });
        }

        animateDice(finalValue) {
            return new Promise(resolve => {
                if (!this.diceEl) {
                    resolve();
                    return;
                }

                this.diceEl.classList.add("rolling");

                let count = 0;
                const interval = setInterval(() => {
                    const value = Math.floor(Math.random() * 6) + 1;
                    this.renderDice(value);
                    count++;

                    if (count >= 8) {
                        clearInterval(interval);
                        this.renderDice(finalValue);

                        setTimeout(() => {
                            this.diceEl.classList.remove("rolling");
                            resolve();
                        }, 220);
                    }
                }, 60);
            });
        }

        askQuestion(questionObj, theme, questionCfg = {}) {
            return new Promise(resolve => {
                this.modalEmoji.textContent = theme.meta.emoji || "❓";
                this.modalTitle.textContent = questionObj.category || theme.texts?.questionTitle || "Pregunta";

                let extraHtml = "";

                if (questionObj.difficulty) {
                    extraHtml += `<div style="margin-top:6px; font-size:0.92rem; opacity:0.9;">Nivell: <strong>${questionObj.difficulty}</strong></div>`;
                }

                if (questionObj.hint) {
                    extraHtml += `<div style="margin-top:10px; font-size:0.92rem; opacity:0.92;">💡 Pista: ${questionObj.hint}</div>`;
                }

                if (questionObj.image) {
                    extraHtml += `
                        <div style="margin-top:12px;">
                            ${questionObj.image} />
                        </div>
                    `;
                }

                this.questionText.innerHTML = `
                    <div>${questionObj.question}</div>
                    ${extraHtml}
                `;

                this.optionsContainer.innerHTML = "";
                this.resultText.textContent = "";
                this.resultText.style.color = "white";

                questionObj.options.forEach((option, index) => {
                    const btn = document.createElement("button");
                    btn.type = "button";
                    btn.className = "btn-opcio";
                    btn.textContent = `${String.fromCharCode(97 + index)}) ${option}`;

                    btn.addEventListener("click", () => {
                        const allButtons = this.optionsContainer.querySelectorAll(".btn-opcio");
                        allButtons.forEach(b => (b.disabled = true));

                        const isCorrect = index === questionObj.correct;

                        if (isCorrect) {
                            btn.classList.add("correct");
                            this.resultText.innerHTML = theme.texts?.correct || "✅ Correcte!";
                            this.resultText.style.color = "#7CFC90";
                        } else {
                            btn.classList.add("wrong");
                            if (allButtons[questionObj.correct]) {
                                allButtons[questionObj.correct].classList.add("correct");
                            }
                            this.resultText.innerHTML = theme.texts?.wrong || "❌ Incorrecte!";
                            this.resultText.style.color = "#ff8a80";
                        }

                        if (questionObj.explanation) {
                            this.resultText.innerHTML += `<br><br><small>${questionObj.explanation}</small>`;
                        }

                        setTimeout(() => resolve(isCorrect), 1800);
                    });

                    this.optionsContainer.appendChild(btn);
                });

                this.openModal();
            });
        }

        showVictory(player, theme, onPlayAgain) {
            this.modalEmoji.textContent = "🏆";
            this.modalTitle.textContent = theme.texts?.victoryTitle || "ENHORABONA!";
            this.questionText.innerHTML = `
                <strong>${player.name}</strong><br><br>
                ${theme.meta?.victoryTitle || theme.texts?.victoryText || "Has completat el recorregut."}<br><br>
                Has completat el recorregut del tema <strong>${theme.meta.title}</strong>.
            `;

            this.optionsContainer.innerHTML = "";
            this.resultText.textContent = "";

            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "btn-modal";
            btn.textContent = theme.texts?.playAgain || "🎉 Tornar a l'inici";
            btn.addEventListener("click", onPlayAgain);

            this.optionsContainer.appendChild(btn);
            this.openModal();
        }

        openModal() {
            this.modalOverlay.classList.add("active");
        }

        closeModal()
            
