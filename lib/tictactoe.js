class TicTacToe {
    constructor(playerX, playerO) {
        this.board = [' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '];
        this.playerX = playerX;
        this.playerO = playerO;
        this.currentTurn = playerX;
        this.turns = 0;
    }

    get currentPlayer() {
        return this.currentTurn;
    }

    get symbol() {
        return this.currentTurn === this.playerX ? 'X' : 'O';
    }

    turn(player, position) {
        if (this.currentTurn !== player) return -1;
        if (position < 1 || position > 9) return -2;
        if (this.board[position - 1] !== ' ') return -3;

        this.board[position - 1] = this.symbol;
        this.turns++;
        this.currentTurn = this.currentTurn === this.playerX ? this.playerO : this.playerX;

        return this.checkWin();
    }

    checkWin() {
        const b = this.board;
        const lines = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8],
            [0, 3, 6], [1, 4, 7], [2, 5, 8],
            [0, 4, 8], [2, 4, 6]
        ];

        for (const [a, c, d] of lines) {
            if (b[a] !== ' ' && b[a] === b[c] && b[a] === b[d]) {
                return b[a] === 'X' ? this.playerX : this.playerO;
            }
        }

        if (this.turns >= 9) return 'draw';
        return false;
    }

    render() {
        const b = this.board.map((v, i) => v === ' ' ? (i + 1).toString() : v);
        return `┌───┬───┬───┐\n│ ${b[0]} │ ${b[1]} │ ${b[2]} │\n├───┼───┼───┤\n│ ${b[3]} │ ${b[4]} │ ${b[5]} │\n├───┼───┼───┤\n│ ${b[6]} │ ${b[7]} │ ${b[8]} │\n└───┴───┴───┘`;
    }
}

module.exports = TicTacToe;
