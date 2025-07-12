// ===== GAME CONFIGURATION =====
const GAME_CONFIG = {
    symbols: ['💎', '🔷', '🔶', '📦', '👑', 'Α'],
    symbolWeights: {
        '💎': 25,
        '🔷': 20,
        '🔶': 20,
        '📦': 15,
        '👑': 10,
        'Α': 5
    },
    payouts: {
        'ΑΑΑ': 1000,
        'ΑΑΑΑΑ': 5000,
        '👑👑👑': 500,
        '👑👑👑👑👑': 2500,
        '📦📦📦': 200,
        '📦📦📦📦📦': 1000,
        '💎💎💎': 100,
        '💎💎💎💎💎': 500,
        '🔷🔷🔷': 50,
        '🔷🔷🔷🔷🔷': 250,
        '🔶🔶🔶': 25,
        '🔶🔶🔶🔶🔶': 125
    },
    betAmounts: [1, 5, 10, 25, 50, 100],
    maxBet: 100,
    minBet: 1,
    initialBalance: 1000,
    reelCount: 5,
    symbolHeight: window.innerWidth <= 480 ? 70 : window.innerWidth <= 768 ? 80 : 120,
    spinDuration: 2000,
    reelStopDelay: 300
};

// ===== GAME STATE =====
class GameState {
    constructor() {
        this.balance = GAME_CONFIG.initialBalance;
        this.currentBet = GAME_CONFIG.betAmounts[2]; // Start with $10
        this.isSpinning = false;
        this.reels = [];
        this.lastWin = 0;
        this.totalWins = 0;
        this.spinsCount = 0;
    }

    canSpin() {
        return this.balance >= this.currentBet && !this.isSpinning;
    }

    placeBet() {
        if (this.canSpin()) {
            this.balance -= this.currentBet;
            return true;
        }
        return false;
    }

    addWinnings(amount) {
        this.balance += amount;
        this.lastWin = amount;
        this.totalWins += amount;
    }

    increaseBet() {
        const currentIndex = GAME_CONFIG.betAmounts.indexOf(this.currentBet);
        if (currentIndex < GAME_CONFIG.betAmounts.length - 1) {
            this.currentBet = GAME_CONFIG.betAmounts[currentIndex + 1];
            return true;
        }
        return false;
    }

    decreaseBet() {
        const currentIndex = GAME_CONFIG.betAmounts.indexOf(this.currentBet);
        if (currentIndex > 0) {
            this.currentBet = GAME_CONFIG.betAmounts[currentIndex - 1];
            return true;
        }
        return false;
    }

    setMaxBet() {
        this.currentBet = Math.min(GAME_CONFIG.maxBet, this.balance);
    }
}

// ===== SYMBOL GENERATOR =====
class SymbolGenerator {
    static getRandomSymbol() {
        const totalWeight = Object.values(GAME_CONFIG.symbolWeights).reduce((sum, weight) => sum + weight, 0);
        let random = Math.random() * totalWeight;
        
        for (const [symbol, weight] of Object.entries(GAME_CONFIG.symbolWeights)) {
            random -= weight;
            if (random <= 0) {
                return symbol;
            }
        }
        
        return GAME_CONFIG.symbols[0]; // Fallback
    }

    static generateReelStrip() {
        const strip = [];
        // Generate enough symbols for smooth scrolling
        for (let i = 0; i < 50; i++) {
            strip.push(this.getRandomSymbol());
        }
        return strip;
    }
}

// ===== REEL MANAGER =====
class ReelManager {
    constructor() {
        this.reels = [];
        this.initializeReels();
    }

    initializeReels() {
        for (let i = 1; i <= GAME_CONFIG.reelCount; i++) {
            const reelElement = document.querySelector(`[data-reel="${i}"]`);
            const reel = {
                element: reelElement,
                strip: SymbolGenerator.generateReelStrip(),
                currentPosition: 0,
                finalSymbol: null
            };
            
            this.populateReel(reel);
            this.reels.push(reel);
        }
    }

    populateReel(reel) {
        reel.element.innerHTML = '';
        reel.strip.forEach(symbol => {
            const symbolElement = document.createElement('div');
            symbolElement.className = 'symbol';
            symbolElement.textContent = symbol;
            reel.element.appendChild(symbolElement);
        });
    }

    spin(onComplete) {
        const results = [];
        let completedReels = 0;

        this.reels.forEach((reel, index) => {
            // Start spinning animation
            reel.element.classList.add('spinning');
            
            // Generate final symbol for this reel
            reel.finalSymbol = SymbolGenerator.getRandomSymbol();
            results.push(reel.finalSymbol);

            // Stop reel after delay
            setTimeout(() => {
                this.stopReel(reel, () => {
                    completedReels++;
                    if (completedReels === this.reels.length) {
                        setTimeout(() => onComplete(results), 300);
                    }
                });
            }, GAME_CONFIG.spinDuration + (index * GAME_CONFIG.reelStopDelay));
        });
    }

    stopReel(reel, callback) {
        reel.element.classList.remove('spinning');
        
        // Find position to show the final symbol
        const symbolIndex = reel.strip.findIndex(symbol => symbol === reel.finalSymbol);
        const position = symbolIndex * GAME_CONFIG.symbolHeight;
        
        // Ensure we land exactly on a symbol (no halfway positions)
        reel.element.style.transform = `translateY(-${position}px)`;
        reel.currentPosition = position;
        
        // Update the visible symbol
        const visibleSymbolElement = reel.element.children[symbolIndex];
        if (visibleSymbolElement) {
            visibleSymbolElement.textContent = reel.finalSymbol;
        }
        
        callback();
    }

    highlightWinningSymbols(winningPositions) {
        winningPositions.forEach(position => {
            const reel = this.reels[position];
            const visibleSymbolIndex = Math.floor(reel.currentPosition / GAME_CONFIG.symbolHeight);
            const symbolElement = reel.element.children[visibleSymbolIndex];
            if (symbolElement) {
                symbolElement.classList.add('winning');
                setTimeout(() => symbolElement.classList.remove('winning'), 2000);
            }
        });
    }

    clearHighlights() {
        this.reels.forEach(reel => {
            Array.from(reel.element.children).forEach(symbol => {
                symbol.classList.remove('winning');
            });
        });
    }
}

// ===== WIN CALCULATOR =====
class WinCalculator {
    static calculateWin(symbols, bet) {
        const symbolString = symbols.join('');
        let winAmount = 0;
        let winningPositions = [];

        // Check for exact matches first
        if (GAME_CONFIG.payouts[symbolString]) {
            winAmount = GAME_CONFIG.payouts[symbolString] * bet;
            winningPositions = [0, 1, 2, 3, 4]; // All positions
            return { winAmount, winningPositions, winType: 'JACKPOT' };
        }

        // Check for 3+ consecutive matches from left
        const counts = this.getConsecutiveMatches(symbols);
        
        for (const [symbol, { count, positions }] of Object.entries(counts)) {
            if (count >= 3) {
                const threeSymbolKey = symbol.repeat(3);
                if (GAME_CONFIG.payouts[threeSymbolKey]) {
                    const payout = GAME_CONFIG.payouts[threeSymbolKey] * bet;
                    if (payout > winAmount) {
                        winAmount = payout;
                        winningPositions = positions.slice(0, count);
                    }
                }
            }
        }

        const winType = winAmount > bet * 100 ? 'BIG_WIN' : winAmount > 0 ? 'WIN' : 'LOSE';
        return { winAmount, winningPositions, winType };
    }

    static getConsecutiveMatches(symbols) {
        const matches = {};
        
        for (let i = 0; i < symbols.length; i++) {
            const symbol = symbols[i];
            
            if (!matches[symbol]) {
                matches[symbol] = { count: 0, positions: [] };
            }
            
            // Check consecutive from current position
            let consecutiveCount = 0;
            let consecutivePositions = [];
            
            for (let j = i; j < symbols.length && symbols[j] === symbol; j++) {
                consecutiveCount++;
                consecutivePositions.push(j);
            }
            
            if (consecutiveCount > matches[symbol].count) {
                matches[symbol].count = consecutiveCount;
                matches[symbol].positions = consecutivePositions;
            }
        }
        
        return matches;
    }
}

// ===== UI MANAGER =====
class UIManager {
    constructor(gameState) {
        this.gameState = gameState;
        this.elements = {
            balance: document.getElementById('balance'),
            betAmount: document.getElementById('bet-amount'),
            spinButton: document.getElementById('spin-button'),
            betIncrease: document.getElementById('bet-increase'),
            betDecrease: document.getElementById('bet-decrease'),
            maxBet: document.getElementById('max-bet'),
            gameMessage: document.getElementById('game-message'),
            winOverlay: document.getElementById('win-overlay'),
            winTitle: document.getElementById('win-title'),
            winAmount: document.getElementById('win-amount'),
            winLine: document.getElementById('win-line'),
            paytableToggle: document.getElementById('paytable-toggle'),
            paytable: document.getElementById('paytable'),
            particleContainer: document.getElementById('particle-container')
        };
        
        this.initializeEventListeners();
        this.updateDisplay();
    }

    initializeEventListeners() {
        this.elements.spinButton.addEventListener('click', () => this.handleSpin());
        this.elements.betIncrease.addEventListener('click', () => this.handleBetIncrease());
        this.elements.betDecrease.addEventListener('click', () => this.handleBetDecrease());
        this.elements.maxBet.addEventListener('click', () => this.handleMaxBet());
        this.elements.paytableToggle.addEventListener('click', () => this.togglePaytable());
        this.elements.winOverlay.addEventListener('click', () => this.hideWinOverlay());
        
        // Keyboard support
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && !this.gameState.isSpinning) {
                e.preventDefault();
                this.handleSpin();
            }
        });
    }

    updateDisplay() {
        this.elements.balance.textContent = `${this.gameState.balance.toLocaleString()}`;
        this.elements.betAmount.textContent = `${this.gameState.currentBet}`;
        
        // Update button states
        this.elements.betDecrease.disabled = this.gameState.currentBet <= GAME_CONFIG.minBet;
        this.elements.betIncrease.disabled = this.gameState.currentBet >= GAME_CONFIG.maxBet || this.gameState.currentBet >= this.gameState.balance;
        this.elements.maxBet.disabled = this.gameState.currentBet >= this.gameState.balance;
        this.elements.spinButton.disabled = !this.gameState.canSpin();
        
        // Update message
        if (this.gameState.balance < this.gameState.currentBet) {
            this.setMessage('Insufficient funds! Lower your bet.');
        } else if (this.gameState.balance === 0) {
            this.setMessage('Game Over! Refresh to play again.');
        } else {
            this.setMessage('Good Luck!');
        }
    }

    handleSpin() {
        if (!this.gameState.canSpin()) return;
        
        if (window.slotGame) {
            window.slotGame.spin();
        }
    }

    handleBetIncrease() {
        if (this.gameState.increaseBet()) {
            this.updateDisplay();
        }
    }

    handleBetDecrease() {
        if (this.gameState.decreaseBet()) {
            this.updateDisplay();
        }
    }

    handleMaxBet() {
        this.gameState.setMaxBet();
        this.updateDisplay();
    }

    setSpinning(spinning) {
        this.gameState.isSpinning = spinning;
        this.elements.spinButton.disabled = spinning;
        
        if (spinning) {
            this.elements.spinButton.classList.add('spinning');
            this.setMessage('Spinning...');
        } else {
            this.elements.spinButton.classList.remove('spinning');
        }
        
        this.updateDisplay();
    }

    setMessage(message) {
        this.elements.gameMessage.textContent = message;
    }

    showWin(winAmount, winType) {
        // Show win line
        this.elements.winLine.classList.add('active');
        setTimeout(() => this.elements.winLine.classList.remove('active'), 3000);

        // Create particles
        this.createParticles();

        // Show win overlay for big wins
        if (winType === 'JACKPOT' || winType === 'BIG_WIN') {
            this.elements.winTitle.textContent = winType === 'JACKPOT' ? 'JACKPOT!' : 'BIG WIN!';
            this.elements.winAmount.textContent = `${winAmount.toLocaleString()}`;
            this.elements.winOverlay.classList.add('active');
            
            setTimeout(() => this.hideWinOverlay(), 3000);
        }

        // Update message
        this.setMessage(`You won ${winAmount.toLocaleString()}!`);
    }

    hideWinOverlay() {
        this.elements.winOverlay.classList.remove('active');
    }

    createParticles() {
        const colors = ['#d4af37', '#ffd700', '#ffed4e'];
        
        for (let i = 0; i < 30; i++) {
            setTimeout(() => {
                const particle = document.createElement('div');
                particle.className = 'particle';
                particle.style.left = Math.random() * 100 + '%';
                particle.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
                particle.style.animationDelay = Math.random() * 0.5 + 's';
                
                this.elements.particleContainer.appendChild(particle);
                
                setTimeout(() => particle.remove(), 3000);
            }, i * 50);
        }
    }

    togglePaytable() {
        this.elements.paytable.classList.toggle('active');
    }
}

// ===== MAIN GAME CLASS =====
class SlotMachine {
    constructor() {
        this.gameState = new GameState();
        this.reelManager = new ReelManager();
        this.uiManager = new UIManager(this.gameState);
        
        // Make game accessible globally for UI events
        window.slotGame = this;
    }

    spin() {
        if (!this.gameState.placeBet()) {
            this.uiManager.setMessage('Cannot place bet!');
            return;
        }

        this.uiManager.setSpinning(true);
        this.reelManager.clearHighlights();

        this.reelManager.spin((results) => {
            this.gameState.spinsCount++;
            const { winAmount, winningPositions, winType } = WinCalculator.calculateWin(results, this.gameState.currentBet);
            
            if (winAmount > 0) {
                this.gameState.addWinnings(winAmount);
                this.reelManager.highlightWinningSymbols(winningPositions);
                this.uiManager.showWin(winAmount, winType);
            } else {
                this.uiManager.setMessage('Try again!');
            }
            
            this.uiManager.setSpinning(false);
            this.uiManager.updateDisplay();
        });
    }
}

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    new SlotMachine();
});