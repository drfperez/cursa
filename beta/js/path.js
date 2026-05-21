
window.GAME_PATH = [
    { row: 1, col: 1 },
    { row: 1, col: 2 },
    { row: 1, col: 3 },
    { row: 1, col: 4 },
    { row: 1, col: 5 },
    { row: 1, col: 6 },
    { row: 1, col: 7 },
    { row: 1, col: 8 },

    { row: 2, col: 8 },
    { row: 3, col: 8 },
    { row: 4, col: 8 },
    { row: 5, col: 8 },
    { row: 6, col: 8 },
    { row: 7, col: 8 },
    { row: 8, col: 8 },

    { row: 8, col: 7 },
    { row: 8, col: 6 },
    { row: 8, col: 5 },
    { row: 8, col: 4 },
    { row: 8, col: 3 },
    { row: 8, col: 2 },
    { row: 8, col: 1 },

    { row: 7, col: 1 },
    { row: 6, col: 1 },
    { row: 5, col: 1 },
    { row: 4, col: 1 },
    { row: 3, col: 1 },
    { row: 2, col: 1 }
];

window.STANDARD_CELL_TYPES = [
    "start",
    "normal",
    "normal",
    "question",
    "normal",
    "advance",
    "normal",
    "question",
    "normal",
    "back",
    "normal",
    "question",
    "normal",
    "advance",
    "normal",
    "question",
    "normal",
    "back",
    "normal",
    "question",
    "normal",
    "advance",
    "normal",
    "question",
    "normal",
    "back",
    "normal",
    "goal"
];

window.createStandardCells = function (items) {
    if (!Array.isArray(items) || items.length !== window.GAME_PATH.length) {
        throw new Error("El tema ha de tenir exactament 28 caselles a l'array 'items'.");
    }

    return window.GAME_PATH.map((pos, i) => ({
        row: pos.row,
        col: pos.col,
        type: window.STANDARD_CELL_TYPES[i],
        icon: items[i][0],
        name: items[i][1]
    }));
};








