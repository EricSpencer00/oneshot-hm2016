/**
 * GameStateManager.js
 * Manages game state transitions and game flow
 */

const GameState = {
    LOADING: 'LOADING',
    MENU: 'MENU',
    PLAYING: 'PLAYING',
    PAUSED: 'PAUSED',
    TARGET_ELIMINATED: 'TARGET_ELIMINATED',
    ESCAPE: 'ESCAPE',
    MISSION_COMPLETE: 'MISSION_COMPLETE',
    GAME_OVER: 'GAME_OVER'
};

class GameStateManager {
    constructor() {
        this.currentState = GameState.LOADING;
        this.previousState = null;
        this.listeners = new Map();
        this.stateData = {
            missionStartTime: 0,
            missionEndTime: 0,
            targetEliminated: false,
            playerDetected: false,
            enemiesKilled: 0,
            shotsFired: 0,
            timesDetected: 0,
            silentKill: true
        };
        
        // Valid state transitions
        this.validTransitions = {
            [GameState.LOADING]: [GameState.MENU],
            [GameState.MENU]: [GameState.PLAYING],
            [GameState.PLAYING]: [GameState.TARGET_ELIMINATED, GameState.GAME_OVER, GameState.PAUSED],
            [GameState.PAUSED]: [GameState.PLAYING, GameState.MENU],
            [GameState.TARGET_ELIMINATED]: [GameState.ESCAPE, GameState.GAME_OVER],
            [GameState.ESCAPE]: [GameState.MISSION_COMPLETE, GameState.GAME_OVER],
            [GameState.MISSION_COMPLETE]: [GameState.MENU],
            [GameState.GAME_OVER]: [GameState.MENU]
        };
    }

    /**
     * Get current game state
     */
    getState() {
        return this.currentState;
    }

    /**
     * Check if current state matches
     */
    isState(state) {
        return this.currentState === state;
    }

    /**
     * Check if game is actively playing
     */
    isPlaying() {
        return this.currentState === GameState.PLAYING || 
               this.currentState === GameState.TARGET_ELIMINATED ||
               this.currentState === GameState.ESCAPE;
    }

    /**
     * Transition to a new state
     */
    setState(newState, data = {}) {
        // Validate transition
        const allowedTransitions = this.validTransitions[this.currentState];
        if (!allowedTransitions || !allowedTransitions.includes(newState)) {
            console.warn(`Invalid state transition: ${this.currentState} -> ${newState}`);
            return false;
        }

        this.previousState = this.currentState;
        this.currentState = newState;

        // Handle state-specific logic
        this.onStateEnter(newState, data);

        // Notify listeners
        this.notifyListeners(newState, this.previousState, data);

        console.log(`State transition: ${this.previousState} -> ${this.currentState}`);
        return true;
    }

    /**
     * Force state change (bypass validation)
     */
    forceState(newState, data = {}) {
        this.previousState = this.currentState;
        this.currentState = newState;
        this.onStateEnter(newState, data);
        this.notifyListeners(newState, this.previousState, data);
        return true;
    }

    /**
     * Handle state entry logic
     */
    onStateEnter(state, data) {
        switch (state) {
            case GameState.PLAYING:
                this.stateData.missionStartTime = Date.now();
                break;
                
            case GameState.TARGET_ELIMINATED:
                this.stateData.targetEliminated = true;
                if (data.silent !== undefined) {
                    this.stateData.silentKill = data.silent;
                }
                break;
                
            case GameState.MISSION_COMPLETE:
                this.stateData.missionEndTime = Date.now();
                break;
                
            case GameState.GAME_OVER:
                this.stateData.missionEndTime = Date.now();
                break;
        }
    }

    /**
     * Register a state change listener
     */
    addListener(callback, states = null) {
        const id = Symbol();
        this.listeners.set(id, { callback, states });
        return id;
    }

    /**
     * Remove a listener
     */
    removeListener(id) {
        this.listeners.delete(id);
    }

    /**
     * Notify all listeners of state change
     */
    notifyListeners(newState, oldState, data) {
        this.listeners.forEach(({ callback, states }) => {
            if (!states || states.includes(newState)) {
                callback(newState, oldState, data);
            }
        });
    }

    /**
     * Get mission statistics
     */
    getStats() {
        const elapsed = this.stateData.missionEndTime - this.stateData.missionStartTime;
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        
        return {
            time: `${minutes}:${seconds.toString().padStart(2, '0')}`,
            timeMs: elapsed,
            enemiesKilled: this.stateData.enemiesKilled,
            shotsFired: this.stateData.shotsFired,
            timesDetected: this.stateData.timesDetected,
            silentKill: this.stateData.silentKill,
            targetEliminated: this.stateData.targetEliminated
        };
    }

    /**
     * Calculate mission rating
     */
    getRating() {
        const stats = this.getStats();
        
        // Silent Assassin: No detections, silent kill, minimal kills
        if (stats.timesDetected === 0 && stats.silentKill && stats.enemiesKilled <= 1) {
            return 'Silent Assassin';
        }
        
        // Professional: Few detections, target eliminated
        if (stats.timesDetected <= 2 && stats.targetEliminated) {
            return 'Professional';
        }
        
        // Hitman: Target eliminated with some noise
        if (stats.targetEliminated) {
            return 'Hitman';
        }
        
        return 'Thug';
    }

    /**
     * Increment statistics
     */
    incrementStat(stat, amount = 1) {
        if (this.stateData[stat] !== undefined) {
            this.stateData[stat] += amount;
        }
    }

    /**
     * Reset game state for new mission
     */
    reset() {
        this.currentState = GameState.LOADING;
        this.previousState = null;
        this.stateData = {
            missionStartTime: 0,
            missionEndTime: 0,
            targetEliminated: false,
            playerDetected: false,
            enemiesKilled: 0,
            shotsFired: 0,
            timesDetected: 0,
            silentKill: true
        };
    }
}

// Export for use
window.GameState = GameState;
window.GameStateManager = GameStateManager;
