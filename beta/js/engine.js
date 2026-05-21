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

            this.usedQuestionIdsByPool = {};
            this.maxResolveDepth = 12;
        }

        setTheme(theme) {
            this.theme = theme;
        }

        start(numPlayers) {
            if (!this.theme) {
                throw new Error("No s'ha seleccionat cap tema.");
            }

            const minPlayers = this.theme.players?.min ?? 2;
            const maxPlayers = this.theme.players?.max ?? 4;

            if (numPlayers < minPlayers || numPlayers > maxPlayers) {
                throw new Error(`Aquest tema admet entre ${minPlayers} i ${maxPlayers} jugadors.`);
            }

            this.numPlayers = numPlayers;
            this.currentTurn = 0;
            this.gameActive = true;
            this.waitingAnswer = false;
            this.usedQuestionIdsByPool = {};

            const presets = Array.isArray(this.theme.players?.presets) ? this.theme.players.presets : [];

            this.players = Array.from({ length: numPlayers }, (_, i) => {
                const preset = presets[i] || {};
                return {
                    id: i,
                    name: preset.name || `Jugador ${i + 1}`,
                    color: preset.color || "#999999",
                    token: preset.token || "●",
                    position: 0
                };
            });

            this.renderer.showGameScreen(this.theme);
            this.renderer.buildBoard(this.theme, this.players);
            this.renderer.resetLog(this.theme.texts?.startLog || "Comença la partida!");
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

            await this.movePlayerByDelta(player, value);

            if (this.gameActive) {
                await this.resolveCell(player, 0);
            }

            if (this.gameActive && !this.waitingAnswer) {
                this.nextTurn();
            }

            this.renderer.setRollEnabled(this.gameActive && !this.waitingAnswer);
        }

        async resolveCell(player, depth = 0) {
            if (!this.gameActive) return;
            if (depth > this.maxResolveDepth) {
                this.renderer.addLog("⚠️ S'ha aturat una cadena massa llarga de moviments.");
                return;
            }

            const cell = this.theme.board.cells[player.position];
            if (!cell) return;

            const landingIndex = player.position;

            if (cell.message) {
                this.renderer.addLog(cell.message);
            }

            const questionCfg = this.resolveQuestionConfig(cell, landingIndex);
            const effectDelta = this.getEffectDelta(cell);
            const resolveOrder = this.theme.rules?.resolveOrder || "question-then-effect";

            const deltas = [];

            if (resolveOrder === "effect-then-question") {
                if (effectDelta !== 0) deltas.push({ kind: "effect", delta: effectDelta, cell });
                if (questionCfg.ask) deltas.push({ kind: "question", cfg: questionCfg, cell });
            } else {
                if (questionCfg.ask) deltas.push({ kind: "question", cfg: questionCfg, cell });
                if (effectDelta !== 0) deltas.push({ kind: "effect", delta: effectDelta, cell });
            }

            let moved = false;

            for (const action of deltas) {
                if (!this.gameActive) return;

                if (action.kind === "question") {
                    const questionDelta = await this.runQuestion(player, action.cfg, action.cell);
                    if (!this.gameActive) return;

                    if (questionDelta !== 0) {
                        moved = true;
                        await this.movePlayerByDelta(player, questionDelta);
                    }
                }

                if (action.kind === "effect") {
                    moved = true;
                    await this.applyEffect(player, action.delta, action.cell);
                }

                if (!this.gameActive) return;
            }

            if (this.gameActive && moved && player.position !== landingIndex) {
                const newCell = this.theme.board.cells[player.position];
                if (newCell && newCell.type !== "goal") {
                    await this.resolveCell(player, depth + 1);
                }
            } else if (this.gameActive && !moved) {
                if (cell.type === "start") {
                    this.renderer.addLog(`🚀 <strong>${player.name}</strong> és a la sortida.`);
                }
            }
        }

        resolveQuestionConfig(cell, index) {
            const themePolicy = this.theme.questionPolicy || {};
            const cellQuestion = cell.question || {};
            const override = themePolicy.overrides?.[String(index)] || {};

            let ask;

            if (typeof cellQuestion.ask === "boolean") {
                ask = cellQuestion.ask;
            } else if (typeof override.ask === "boolean") {
                ask = override.ask;
            } else {
                ask = this.evaluateQuestionPolicy(cell, index);
            }

            let pool =
                cellQuestion.pool ||
                override.pool ||
                themePolicy.defaultPool ||
                Object.keys(this.theme.questionPools)[0];

            if (!this.theme.questionPools[pool]) {
                pool = Object.keys(this.theme.questionPools)[0];
            }

            return {
                ask,
                pool,
                correctAdvance:
                    cellQuestion.correctAdvance ??
                    override.correctAdvance ??
                    this.theme.rules?.defaultCorrectAdvance ??
                    2,
                wrongBack:
                    cellQuestion.wrongBack ??
                    override.wrongBack ??
                    this.theme.rules?.defaultWrongBack ??
                    2
            };
        }

        evaluateQuestionPolicy(cell, index) {
            const qp = this.theme.questionPolicy || {};
            const type = cell.type;

            if (Array.isArray(qp.excludeTypes) && qp.excludeTypes.includes(type)) {
                return false;
            }

            if (Array.isArray(qp.excludeIndexes) && qp.excludeIndexes.includes(index)) {
                return false;
            }

            // Si és una casella explícitament de pregunta, per defecte pregunta
            if (type === "question") {
                return true;
            }

            const includeTypes = Array.isArray(qp.includeTypes) ? qp.includeTypes : ["normal", "effect", "question"];

            switch (qp.mode) {
                case "all":
                    return true;

                case "all-except":
                    return includeTypes.includes(type);

                case "by-type":
                    return includeTypes.includes(type);

                case "every-nth":
                    if (!includeTypes.includes(type)) return false;
                    if (!Number.isFinite(qp.everyNthCell) || qp.everyNthCell <= 0) return false;
                    return index > 0 && index % qp.everyNthCell === 0;

                case "probabilistic":
                    if (!includeTypes.includes(type)) return false;
                    return Math.random() < (qp.probability ?? 1);

                case "selected":
                default:
                    return false;
            }
        }

        getEffectDelta(cell) {
            if (!cell || cell.type !== "effect" || !cell.effect) return 0;
            if (cell.effect.kind !== "move") return 0;

            const steps = cell.effect.steps || 0;
            return cell.effect.direction === "backward" ? -steps : steps;
        }

        async runQuestion(player, questionCfg, cell) {
            this.waitingAnswer = true;
            this.renderer.setRollEnabled(false);
            this.renderer.addLog(`❓ <strong>${player.name}</strong> ha de respondre una pregunta.`);

            const question = this.getRandomQuestion(questionCfg.pool);
            const correct = await this.renderer.askQuestion(question, this.theme, questionCfg);
            this.renderer.closeModal();

            const advance = (questionCfg.correctAdvance || 0) + (question.bonusIfCorrect || 0);
            const back = (questionCfg.wrongBack || 0) + (question.penaltyIfWrong || 0);

            this.waitingAnswer = false;

            if (correct) {
                if (advance > 0) {
                    this.renderer.addLog(`✅ <strong>${player.name}</strong> encerta i avança ${advance} caselles.`);
                    return advance;
                }
                this.renderer.addLog(`✅ <strong>${player.name}</strong> encerta.`);
                return 0;
            }

            if (back > 0) {
                this.renderer.addLog(`❌ <strong>${player.name}</strong> falla i retrocedeix ${back} caselles.`);
                return -back;
            }

            this.renderer.addLog(`❌ <strong>${player.name}</strong> falla.`);
            return 0;
        }

        getRandomQuestion(poolName) {
            let realPoolName = poolName;
            if (!this.theme.questionPools[realPoolName]) {
                realPoolName = Object.keys(this.theme.questionPools)[0];
            }

            const pool = this.theme.questionPools[realPoolName];
            if (!Array.isArray(pool) || pool.length === 0) {
                throw new Error(`El questionPool "${realPoolName}" no té preguntes.`);
            }

            if (!this.usedQuestionIdsByPool[realPoolName]) {
                this.usedQuestionIdsByPool[realPoolName] = [];
            }

            let available = pool.filter(q => !this.usedQuestionIdsByPool[realPoolName].includes(q.id));

            if (!available.length) {
                this.usedQuestionIdsByPool[realPoolName] = [];
                available = [...pool];
            }

            const picked = available[Math.floor(Math.random() * available.length)];
            this.usedQuestionIdsByPool[realPoolName].push(picked.id);
            return picked;
        }

        async applyEffect(player, delta, cell) {
            if (delta === 0) return;

            const steps = Math.abs(delta);
            const direction = delta > 0 ? "avança" : "retrocedeix";

            this.renderer.addLog(
                `💫 <strong>${player.name}</strong> cau en <em>${cell.label}</em> i ${direction} ${steps} caselles.`
            );

            await this.movePlayerByDelta(player, delta);
        }

        async movePlayerByDelta(player, delta) {
            if (!this.gameActive || delta === 0) return;

            const goalIndex = this.theme.board.cells.length - 1;
            const exactGoalRequired = this.theme.rules?.exactGoalRequired ?? false;
            const bounceOnOverflow = this.theme.rules?.bounceOnOverflow ?? true;

            let current = player.position;
            const direction = Math.sign(delta);

            for (let i = 0; i < Math.abs(delta); i++) {
                let next = current + direction;

                if (direction > 0) {
                    if (next > goalIndex) {
                        if (exactGoalRequired) {
                            this.renderer.addLog(`🎯 ${player.name} necessita arribar exactament a la meta.`);
                            break;
                        }

                        if (bounceOnOverflow) {
                            const overflow = next - goalIndex;
                            next = goalIndex - overflow;
                        } else {
                            next = goalIndex;
                        }
                    }
                }

                if (direction < 0 && next < 0) {
                    next = 0;
                }

                current = next;
                player.position = current;
                this.renderer.moveToken(player.id, current);
                await this.wait(150);

                if (player.position === goalIndex) {
                    await this.win(player);
                    return;
                }
            }
        }

        async win(player) {
            this.gameActive = false;
            this.waitingAnswer = false;
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
