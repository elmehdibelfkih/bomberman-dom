import { BaseState } from './BaseState.js';

export class MultiplayerState extends BaseState {
    #PAUSE = false

    constructor(game) {
        super(game);
    }

    // Multiplayer has no pause in active game
    SetPause = (env) => this.#PAUSE = env
    isPaused = () => this.#PAUSE

    // No timer in multiplayer
    getTime = () => 0
    startTimer = () => {}
    stopTimer = () => {}
    resetTimer = () => {}

    // No levels in multiplayer
    nextLevel = () => {}
    getcurentlevel = () => 1
    maxlevel = () => 1
    resetLevel = () => {}
    setLevel = () => {}
    getLevel = () => 1

    // No score in multiplayer
    getScore = () => 0
    setScore = () => {}

    // No lives management (handled by server)
    setLives = () => {}
    getLives = () => 0

    // No bomb count (handled by player stats)
    getBombCount = () => 0
    setBombCount = () => {}
    getMaxAllowdBombCount = () => 0
    setMaxAllowdBombCount = () => {}

    // No player speed (handled by player stats)
    setPlayerspped = () => {}
    getPlayerSpeed = () => 3

    // No game over (handled by game engine)
    isGameOver = () => false
    GameOver = () => {}

    // No restart
    Isrestar = () => false
    Restar = () => {}

    // Sound (always on, no toggle)
    isSoundOn = () => true
    updatesound = () => {}
    updateSoundIcon = () => {}

    update = () => {}
    initState = () => {}
}
