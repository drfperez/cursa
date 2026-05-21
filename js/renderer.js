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
            this.diceEl.innerHTML = "";
            for (let i = 0; i < 9; i++) {
                const pip = document.createElement("span");
                pip.className = "pip";
                this.diceEl.appendChild(pip);
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
            this.gameTitleEl.textContent = theme.title;
            this.gameEmojiEl.textContent = theme.emoji;
            this.gameSubtitleEl.textContent = theme.subtitle;
        }

        buildBoard(theme, players) {
            const rows = theme.board.rows || 8;
            const cols = theme.board.cols || 8;
            const cells = theme.board.cells;
            const inner = theme.board.innerDecorations || ["✨", "🔬", "🌿"];

            this.boardEl.innerHTML = "";
            this.tokenElements.clear();

            const cellMap = new Map();
            cells.forEach((cell, index) => {
                cellMap.set(`${cell.row}-${cell.col}`, { ...cell, index });
            });

            for (let row = 1; row <= rows; row++) {
                for (let col = 1; col <= cols; col++) {
                    const key = `${row}-${col}`;
                    const info = cellMap.get(key);
                    const div = document.createElement("div");

                    if (info) {
                        div.className = `cell ${info.type}`;
                        div.style.gridRow = row;
                        div.style.gridColumn = col;
                        div.title = `${info.index + 1}: ${info.name}`;
                        div.innerHTML = `
                            <span class="cell-number">${info.index + 1}</span>
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
                this.tokenElements.set(player.id, token);

                const startContainer = document.getElementById("tokens-0");
                if (startContainer) startContainer.appendChild(token);
            });
        }

        moveToken(playerId, position) {
            const token = this.tokenElements.get(playerId);
            const target = document.getElementById(`tokens-${position}`);
            if (token && target) target.appendChild(token);
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
            this.rollBtn.disabled = !enabled;
        }

        renderDice(value) {
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

        askQuestion(questionObj, theme) {
            return new Promise(resolve => {
                this.modalEmoji.textContent = theme.emoji || "❓";
                this.modalTitle.textContent = "Pregunta";
                this.questionText.textContent = questionObj.question;
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

                        if (index === questionObj.correct) {
                            btn.classList.add("correct");
                            this.resultText.textContent = "✅ Correcte!";
                            this.resultText.style.color = "#7CFC90";
                        } else {
                            btn.classList.add("wrong");
                            allButtons[questionObj.correct].classList.add("correct");
                            this.resultText.textContent = "❌ Incorrecte!";
                            this.resultText.style.color = "#ff8a80";
                        }

                        setTimeout(() => resolve(index === questionObj.correct), 1500);
                    });

                    this.optionsContainer.appendChild(btn);
                });

                this.openModal();
            });
        }

        showVictory(player, theme, onPlayAgain) {
            this.modalEmoji.textContent = "🏆";
            this.modalTitle.textContent = "ENHORABONA!";
            this.questionText.innerHTML = `
                <strong>${player.name}</strong><br><br>
                ${theme.victoryTitle}<br><br>
                Has completat el recorregut del tema <strong>${theme.title}</strong>.
            `;

            this.optionsContainer.innerHTML = "";
            this.resultText.textContent = "";

            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "btn-modal";
            btn.textContent = "🎉 Tornar a l'inici";
            btn.addEventListener("click", onPlayAgain);

            this.optionsContainer.appendChild(btn);
            this.openModal();
        }

        openModal() {
            this.modalOverlay.classList.add("active");
        }

        closeModal() {
            this.modalOverlay.classList.remove("active");
        }
    }

    window.GameRenderer = GameRenderer;
})();










