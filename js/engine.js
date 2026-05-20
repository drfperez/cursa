(function () {
    class GameEngine {
        constructor(renderer) {
            this.renderer = renderer;
            this.theme = null;

            this.numPlayers = 2;
            this.players = [];
            this.currentTurn = 0;
            this.gameActive = false;
            this.waitingAnswer = false;
            this.usedQuestionIndexes = [];

            this.playerColors = ["#e53935", "#1e88e5", "#43a047", "#fb8c00"];
            this.playerNames = ["Vermell", "Blau", "Verd", "Taronja"];
        }

        setTheme(theme) {
            this.theme = theme;
        }

        start(numPlayers) {
            if (!this.theme) {
                throw new Error("No s'ha seleccionat cap tema.");
            }

            this.numPlayers = numPlayers;
            this.currentTurn = 0;
            this.gameActive = true;
            this.waitingAnswer = false;
            this.usedQuestionIndexes = [];

            this.players = Array.from({ length: numPlayers }, (_, i) => ({
                id: i,
                name: `Jugador ${i + 1} (${this.playerNames[i]})`,
                color: this.playerColors[i],
                position: 0
            }));

            this.renderer.showGameScreen(this.theme);
            this.renderer.buildBoard(this.theme, this.players);
            this.renderer.resetLog(`🏁 Comença l'aventura de ${this.theme.title.toLowerCase()}!`);
            this.renderer.updateTurn(this.players[this.currentTurn], true);
            this.renderer.renderDice(1);
            this.renderer.setRollEnabled(true);
        }

        goHome() {
            this.gameActive = false;
            this.waitingAnswer = false;
            this.renderer.showHomeScreen();
        }

        async rollDice() {
            if (!this.gameActive || this.waitingAnswer) return;

            this.renderer.setRollEnabled(false);

            const value = Math.floor(Math.random() * 6) + 1;
            await this.renderer.animateDice(value);

            const player = this.players[this.currentTurn];
            this.renderer.addLog(`${player.name} ha tret un <strong>${value}</strong> 🎲`);

            await this.movePlayerStepByStep(player, value);

            if (this.gameActive) {
                await this.resolveCell(player);
            }

            if (!this.waitingAnswer && this.gameActive) {
                this.nextTurn();
            }

            this.renderer.setRollEnabled(this.gameActive && !this.waitingAnswer);
        }

        async movePlayerStepByStep(player, steps) {
            const goalIndex = this.theme.board.cells.length - 1;
            let current = player.position;

            for (let i = 0; i < steps; i++) {
                let next = current + 1;

                if (next > goalIndex) {
                    const overflow = next - goalIndex;
                    next = goalIndex - overflow;
                    if (next < 0) next = 0;
                }

                current = next;
                player.position = current;
                this.renderer.moveToken(player.id, current);
                await this.wait(150);
            }

            if (player.position === goalIndex) {
                await this.win(player);
            }
        }

        async resolveCell(player) {
            const cell = this.theme.board.cells[player.position];
            if (!cell || !this.gameActive) return;

            const rules = this.theme.rules || {};
            const advanceSteps = rules.specialAdvance ?? 3;
            const backSteps = rules.specialBack ?? 3;

            switch (cell.type) {
                case "question":
                    await this.handleQuestion(player);
                    break;

                case "advance":
                    this.renderer.addLog(
                        `💫 <strong>${player.name}</strong> cau en <em>${cell.name}</em> i avança ${advanceSteps} caselles.`
                    );
                    await this.movePlayerStepByStep(player, advanceSteps);

                    if (this.gameActive && player.position < this.theme.board.cells.length - 1) {
                        const newCell = this.theme.board.cells[player.position];
                        if (newCell.type !== "goal") {
                            await this.resolveCell(player);
                        }
                    }
                    break;

                case "back": {
                    this.renderer.addLog(
                        `🕳️ <strong>${player.name}</strong> cau en <em>${cell.name}</em> i retrocedeix ${backSteps} caselles.`
                    );
                    const newPosition = Math.max(0, player.position - backSteps);
                    player.position = newPosition;
                    this.renderer.moveToken(player.id, newPosition);
                    await this.wait(180);

                    if (player.position > 0) {
                        const newCell = this.theme.board.cells[player.position];
                        if (newCell.type !== "start") {
                            await this.resolveCell(player);
                        }
                    }
                    break;
                }

                case "start":
                    this.renderer.addLog(`🚀 <strong>${player.name}</strong> és a la sortida.`);
                    break;

                case "goal":
                case "normal":
                default:
                    break;
            }
        }

        async handleQuestion(player) {
            this.waitingAnswer = true;
            this.renderer.addLog(`❓ <strong>${player.name}</strong> ha de respondre una pregunta.`);

            const question = this.getRandomQuestion();
            const correct = await this.renderer.askQuestion(question, this.theme);
            this.renderer.closeModal();

            const rules = this.theme.rules || {};
            const correctAdvance = rules.correctAdvance ?? 2;
            const wrongBack = rules.wrongBack ?? 2;

            if (correct) {
                this.renderer.addLog(
                    `✅ <strong>${player.name}</strong> encerta i avança ${correctAdvance} caselles.`
                );
                await this.movePlayerStepByStep(player, correctAdvance);

                if (this.gameActive && player.position < this.theme.board.cells.length - 1) {
                    const newCell = this.theme.board.cells[player.position];
                    if (newCell.type !== "goal") {
                        await this.resolveCell(player);
                    }
                }
            } else {
                this.renderer.addLog(
                    `❌ <strong>${player.name}</strong> falla i retrocedeix ${wrongBack} caselles.`
                );
                player.position = Math.max(0, player.position - wrongBack);
                this.renderer.moveToken(player.id, player.position);
                await this.wait(180);

                if (player.position > 0) {
                    const newCell = this.theme.board.cells[player.position];
                    if (newCell.type !== "start") {
                        await this.resolveCell(player);
                    }
                }
            }

            this.waitingAnswer = false;
        }

        getRandomQuestion() {
            if (this.usedQuestionIndexes.length >= this.theme.questions.length) {
                this.usedQuestionIndexes = [];
            }

            let availableIndexes = this.theme.questions
                .map((_, i) => i)
                .filter(i => !this.usedQuestionIndexes.includes(i));

            if (!availableIndexes.length) {
                this.usedQuestionIndexes = [];
                availableIndexes = this.theme.questions.map((_, i) => i);
            }

            const randomIndex = availableIndexes[Math.floor(Math.random() * availableIndexes.length)];
            this.usedQuestionIndexes.push(randomIndex);

            return this.theme.questions[randomIndex];
        }

        async win(player) {
            this.gameActive = false;
            this.renderer.setRollEnabled(false);
            this.renderer.addLog(`🏆 <strong>${player.name}</strong> ha guanyat la partida!`);
            this.renderer.updateTurn(player, false);

            this.renderer.showVictory(player, this.theme, () => {
                this.goHome();
            });
        }

        nextTurn() {
            if (!this.gameActive) return;
            this.currentTurn = (this.currentTurn + 1) % this.numPlayers;
            this.renderer.updateTurn(this.players[this.currentTurn], true);
        }

        wait(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }
    }

    window.GameEngine = GameEngine;
})();










                    
