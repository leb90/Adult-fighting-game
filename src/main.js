import gsap from 'gsap'
import { Sprite, Fighter } from './classes.js'
import { 
  rectangularCollision, 
  screenShake, 
  updateUltimateMeter,
  showCombo,
  createUltimateParticles,
  updateParticles
} from './utils.js'

const startScreen    = document.querySelector('#startScreen')
const gameContainer  = document.querySelector('#gameContainer')
const titlePane      = document.querySelector('#titlePane')
const modePane       = document.querySelector('#modePane')
const charPane       = document.querySelector('#charPane')
const configPane     = document.querySelector('#configPane')
const startBtn       = document.querySelector('#startBtn')
const mode1v1Btn     = document.querySelector('#mode1v1Btn')
const mode1vpcBtn    = document.querySelector('#mode1vpcBtn')
const charRukiBtn    = document.querySelector('#charRukiBtn')
const charChunBtn    = document.querySelector('#charChunBtn')
const restartBtn     = document.querySelector('#restartBtn')
const p1Label        = document.querySelector('#p1Label')
const p2Label        = document.querySelector('#p2Label')

const canvas = document.querySelector('#gameCanvas')
const c = canvas.getContext('2d')

canvas.width  = 1024
canvas.height = 576
c.imageSmoothingEnabled = false

const gravity = 0.7
const BASE    = import.meta.env.BASE_URL

// ── Audio ─────────────────────────────────────────────────────────────────────
const fightMusic = new Audio(`${BASE}sound/FightSong.mp3`)
fightMusic.loop   = true
fightMusic.volume = 0.5

const punchSfx = new Audio(`${BASE}sound/punch.mp3`)
punchSfx.volume = 0.7

function playPunch() {
  punchSfx.currentTime = 0
  punchSfx.play().catch(() => {})
}

let player, enemy
let timer = 90
let timerId
let gameStarted = false
let particles   = []
let lastTimestamp = 0

let playerWins  = 0
let enemyWins   = 0
let roundNumber = 1
let roundEnded  = false

let gameMode        = '1v1'
let playerCharacter = 'ruki'

// ── Sprite configs ────────────────────────────────────────────────────────────
const RUKI_CFG = {
  imageSrc:     `${BASE}img/Ruki/Idle.png`,
  framesMax:    4,
  scale:        2.0,
  offset:       { x: 160, y: 145 },
  frameDuration: 83,
  facingRight:  false,
  sprites: {
    idle:    { imageSrc: `${BASE}img/Ruki/Idle.png`,      framesMax: 4 },
    run:     { imageSrc: `${BASE}img/Ruki/Run.png`,       framesMax: 8 },
    jump:    { imageSrc: `${BASE}img/Ruki/Jump.png`,      framesMax: 2 },
    fall:    { imageSrc: `${BASE}img/Ruki/Fall.png`,      framesMax: 2 },
    attack1: { imageSrc: `${BASE}img/Ruki/Attack1.png`,   framesMax: 4, hitFrame: 1 },
    attack2: { imageSrc: `${BASE}img/Ruki/Attack2.png`,   framesMax: 4, hitFrame: 2 },
    takeHit: { imageSrc: `${BASE}img/Ruki/Take hit.png`,  framesMax: 3 },
    death:   { imageSrc: `${BASE}img/Ruki/Death.png`,     framesMax: 7, offsetY: 90 }
  },
  attackBox: { offset: { x: 60, y: 50 }, width: 140, height: 60 }
}

const CHUN_CFG = {
  imageSrc:     `${BASE}img/Chun/Idle.png`,
  framesMax:    4,
  scale:        2.0,
  offset:       { x: 160, y: 145 },
  frameDuration: 83,
  facingRight:  true,
  sprites: {
    idle:    { imageSrc: `${BASE}img/Chun/Idle.png`,      framesMax: 4 },
    run:     { imageSrc: `${BASE}img/Chun/Run.png`,       framesMax: 8 },
    jump:    { imageSrc: `${BASE}img/Chun/Jump.png`,      framesMax: 2 },
    fall:    { imageSrc: `${BASE}img/Chun/Fall.png`,      framesMax: 2 },
    attack1: { imageSrc: `${BASE}img/Chun/Attack1.png`,   framesMax: 4, hitFrame: 0 },
    attack2: { imageSrc: `${BASE}img/Chun/Attack2.png`,   framesMax: 4, hitFrame: 2 },
    takeHit: { imageSrc: `${BASE}img/Chun/Take hit.png`,  framesMax: 3 },
    death:   { imageSrc: `${BASE}img/Chun/Death.png`,     framesMax: 7, offsetY: 90 }
  },
  attackBox: { offset: { x: 60, y: 50 }, width: 140, height: 60 }
}

// ── AI ────────────────────────────────────────────────────────────────────────
let aiTimer    = 0
let aiDelay    = 400
let aiMoveDir  = 0

function updateAI(deltaTime) {
  if (!gameStarted || roundEnded || ultPlaying || enemy.dead || player.dead) return

  aiTimer += deltaTime
  if (aiTimer < aiDelay) return
  aiTimer  = 0
  aiDelay  = 280 + Math.random() * 380

  const dist        = Math.abs(enemy.position.x - player.position.x)
  const enemyIsRight = enemy.position.x > player.position.x
  const towardPlayer = enemyIsRight ? -1 : 1

  if (dist > 320) {
    aiMoveDir = towardPlayer
  } else if (dist < 90) {
    aiMoveDir = Math.random() < 0.35 ? -towardPlayer : towardPlayer
  } else {
    aiMoveDir = Math.random() < 0.65 ? towardPlayer : 0
  }

  if (dist < 210 && !enemy.isAttacking && !enemy.isAttacking2 && Math.random() < 0.70) {
    if (Math.random() < 0.35) enemy.attack2()
    else enemy.attack()
  }

  if (enemy.velocity.y === 0 && Math.random() < 0.14) {
    enemy.velocity.y = -20
  }

  if (dist < 260 && Math.random() < 0.35) {
    if (enemy.useUltimate()) triggerUltimate('enemy')
  }
}

// ── Game init ─────────────────────────────────────────────────────────────────
function initGame(preserveUltimate = false) {
  const savedPlayerUlt = preserveUltimate && player ? player.ultimateMeter : 0
  const savedEnemyUlt  = preserveUltimate && enemy  ? enemy.ultimateMeter  : 0

  particles  = []
  timer      = 90
  roundEnded = false
  aiTimer    = 0
  aiMoveDir  = 0
  document.querySelector('#timer').innerHTML = timer
  document.querySelector('#displayText').classList.remove('active', 'match-over')
  hideWinGifs()

  const p1Cfg = playerCharacter === 'ruki' ? RUKI_CFG : CHUN_CFG
  const p2Cfg = playerCharacter === 'ruki' ? CHUN_CFG : RUKI_CFG

  player = new Fighter({ position: { x: 100, y: 0 },  velocity: { x: 0, y: 0 }, ...p1Cfg, canvas, gravity })
  enemy  = new Fighter({ position: { x: 800, y: 100 }, velocity: { x: 0, y: 0 }, color: 'blue', ...p2Cfg, canvas, gravity })

  player.ultimateMeter = savedPlayerUlt
  enemy.ultimateMeter  = savedEnemyUlt

  gsap.to('#playerHealth', { width: '100%', duration: 0.3 })
  gsap.to('#enemyHealth',  { width: '100%', duration: 0.3 })

  if (!preserveUltimate) {
    document.querySelector('#playerUltimate').style.width = '0%'
    document.querySelector('#enemyUltimate').style.width  = '0%'
    document.querySelector('#playerUltReady').classList.remove('active')
    document.querySelector('#enemyUltReady').classList.remove('active')
  }

  if (gameMode === '1vpc') {
    p1Label.textContent = playerCharacter === 'ruki' ? 'RUKI' : 'CHUN'
    p2Label.textContent = 'CPU'
  } else {
    p1Label.textContent = 'PLAYER 1'
    p2Label.textContent = 'PLAYER 2'
  }

  updateRoundLabel()
}

// ── Round / match helpers ─────────────────────────────────────────────────────
function updateRoundLabel() {
  const label = document.querySelector('#roundLabel')
  if (label) label.textContent = `ROUND ${roundNumber}`
}

function updateWinDots() {
  document.querySelectorAll('#playerWinDots .win-dot').forEach((dot, i) => {
    dot.classList.toggle('filled', i < playerWins)
  })
  document.querySelectorAll('#enemyWinDots .win-dot').forEach((dot, i) => {
    dot.classList.toggle('filled', i < enemyWins)
  })
}

function showWinGif(winnerId) {
  const winner = winnerId === 'player' ? player : enemy
  const gifEl  = document.querySelector(winnerId === 'player' ? '#winGifPlayer' : '#winGifEnemy')
  const isRuki = (winnerId === 'player' && playerCharacter === 'ruki') ||
                 (winnerId === 'enemy'  && playerCharacter !== 'ruki')
  const src = isRuki ? `${BASE}img/Ruki/Win.gif` : `${BASE}img/Chun/win.gif`

  gifEl.src = ''
  gifEl.src = src

  const isFacingLeft = winner.facingRight ? winner.flipped : !winner.flipped
  gifEl.style.transform = isFacingLeft ? 'translateX(-50%) scaleX(-1)' : 'translateX(-50%)'
  gifEl.style.display   = 'block'
}

function hideWinGifs() {
  const p = document.querySelector('#winGifPlayer')
  const e = document.querySelector('#winGifEnemy')
  if (p) { p.style.display = 'none'; p.src = '' }
  if (e) { e.style.display = 'none'; e.src = '' }
}

let matchOverKeyHandler = null

function endRound(winnerId) {
  if (roundEnded) return
  roundEnded = true
  clearTimeout(timerId)

  const displayText = document.querySelector('#displayText')
  const winnerText  = displayText.querySelector('.winner-text')

  const p1Name = gameMode === '1vpc' ? (playerCharacter === 'ruki' ? 'RUKI' : 'CHUN') : 'PLAYER 1'
  const p2Name = gameMode === '1vpc' ? 'CPU' : 'PLAYER 2'

  if (winnerId === 'player') {
    playerWins++
    winnerText.textContent = `${p1Name} WINS!`
    winnerText.style.color = '#ff0080'
    player.visible = false
    showWinGif('player')
  } else if (winnerId === 'enemy') {
    enemyWins++
    winnerText.textContent = `${p2Name} WINS!`
    winnerText.style.color = '#00ffff'
    enemy.visible = false
    showWinGif('enemy')
  } else {
    winnerText.textContent = 'DRAW!'
    winnerText.style.color = '#fff'
  }

  updateWinDots()
  displayText.classList.add('active')

  setTimeout(() => {
    if (playerWins >= 2 || enemyWins >= 2) {
      const matchWinner = playerWins >= 2 ? p1Name : p2Name
      winnerText.textContent = `${matchWinner} WINS THE MATCH!`
      displayText.classList.add('match-over')

      matchOverKeyHandler = () => returnToMenu()
      window.addEventListener('keydown', matchOverKeyHandler, { once: true })
    } else {
      roundNumber++
      displayText.classList.remove('active')
      showRoundBanner(() => {
        initGame(true)
        decreaseTimer()
      })
    }
  }, 3000)
}

function showRoundBanner(callback) {
  const banner = document.querySelector('#roundBanner')
  banner.textContent = `ROUND ${roundNumber}`
  banner.classList.add('active')
  setTimeout(() => {
    banner.classList.remove('active')
    callback()
  }, 1500)
}

// ── Navigation ────────────────────────────────────────────────────────────────
function showPane(pane) {
  titlePane.style.display  = 'none'
  modePane.style.display   = 'none'
  charPane.style.display   = 'none'
  configPane.style.display = 'none'
  pane.style.display       = 'flex'
  const gearBtn = document.querySelector('#configBtn')
  if (gearBtn) gearBtn.style.display = pane === configPane ? 'none' : 'block'
  if (pane !== configPane) requestAnimationFrame(() => setMenuFocus(0))
}

function getMenuButtons() {
  if (modePane.style.display !== 'none') return [mode1v1Btn, mode1vpcBtn]
  if (charPane.style.display !== 'none') return [charRukiBtn, charChunBtn]
  return [startBtn]
}

let menuFocusIdx = 0
function setMenuFocus(idx) {
  const btns = getMenuButtons()
  if (!btns.length) return
  menuFocusIdx = ((idx % btns.length) + btns.length) % btns.length
  btns.forEach((b, i) => b.classList.toggle('gp-focus', i === menuFocusIdx))
}

function returnToMenu() {
  if (matchOverKeyHandler) {
    window.removeEventListener('keydown', matchOverKeyHandler)
    matchOverKeyHandler = null
  }
  clearTimeout(timerId)
  fightMusic.pause()
  fightMusic.currentTime = 0
  gameStarted = false
  gameContainer.style.display = 'none'
  startScreen.style.display   = 'flex'
  showPane(titlePane)
}

function launchGame() {
  startScreen.style.display   = 'none'
  gameContainer.style.display = 'flex'
  gameStarted  = true
  playerWins   = 0
  enemyWins    = 0
  roundNumber  = 1
  updateWinDots()
  initGame()
  fightMusic.currentTime = 0
  fightMusic.play().catch(() => {})
  showRoundBanner(() => decreaseTimer())
}

// ── Buttons ───────────────────────────────────────────────────────────────────
startBtn.addEventListener('click', () => showPane(modePane))

mode1v1Btn.addEventListener('click', () => {
  gameMode        = '1v1'
  playerCharacter = 'ruki'
  launchGame()
})

mode1vpcBtn.addEventListener('click', () => {
  gameMode = '1vpc'
  showPane(charPane)
})

charRukiBtn.addEventListener('click', () => { playerCharacter = 'ruki'; launchGame() })
charChunBtn.addEventListener('click', () => { playerCharacter = 'chun'; launchGame() })

restartBtn.addEventListener('click', () => returnToMenu())

// ── Gamepad config (persistente) ─────────────────────────────────────────────
const defaultPlayerCfg = {
  neutral: 3.29,
  left:    { axisIdx: 9, val: -0.8  },
  right:   { axisIdx: 9, val:  0.14 },
  jump:    { axisIdx: 9, val: -1.0  },
  btn:     { attack1: 0, attack2: 5, ultimate: 8 }
}
const defaultGpConfig = {
  p1: JSON.parse(JSON.stringify(defaultPlayerCfg)),
  p2: JSON.parse(JSON.stringify(defaultPlayerCfg))
}

function loadPlayerCfg(s, d) {
  if (!s) return JSON.parse(JSON.stringify(d))
  return {
    neutral: s.neutral ?? d.neutral,
    left:  { axisIdx: s.left?.axisIdx  ?? d.left.axisIdx,  val: s.left?.val  ?? d.left.val  },
    right: { axisIdx: s.right?.axisIdx ?? d.right.axisIdx, val: s.right?.val ?? d.right.val },
    jump:  { axisIdx: s.jump?.axisIdx  ?? d.jump.axisIdx,  val: s.jump?.val  ?? d.jump.val  },
    btn:   { attack1: s.btn?.attack1 ?? d.btn.attack1, attack2: s.btn?.attack2 ?? d.btn.attack2, ultimate: s.btn?.ultimate ?? d.btn.ultimate }
  }
}

function loadGpConfig() {
  try {
    const raw = localStorage.getItem('fytefans_gpConfig')
    if (!raw) return JSON.parse(JSON.stringify(defaultGpConfig))
    const s = JSON.parse(raw)
    return { p1: loadPlayerCfg(s.p1, defaultPlayerCfg), p2: loadPlayerCfg(s.p2, defaultPlayerCfg) }
  } catch { return JSON.parse(JSON.stringify(defaultGpConfig)) }
}

let gpConfig = loadGpConfig()

// ── Gamepad runtime ───────────────────────────────────────────────────────────
const gpPrev = {
  p1: new Array(20).fill(false), p1Ax: [],
  p2: new Array(20).fill(false), p2Ax: []
}
const gpMove = { p1Left: false, p1Right: false, p2Left: false, p2Right: false }

let p1PadIndex   = -1
let p2PadIndex   = -1
let inConfigMode = false

const MATCH = 0.35

function readStick(gp, prevAx, move, fighter, cfg) {
  if (!gp || fighter.dead) return
  const axL = gp.axes[cfg.left.axisIdx]  ?? cfg.neutral
  const axR = gp.axes[cfg.right.axisIdx] ?? cfg.neutral
  const axJ = gp.axes[cfg.jump.axisIdx]  ?? cfg.neutral
  const pJ  = prevAx[cfg.jump.axisIdx]   ?? cfg.neutral

  move.left  = Math.abs(axL - cfg.left.val)  < MATCH
  move.right = Math.abs(axR - cfg.right.val) < MATCH

  const wasJump = Math.abs(pJ  - cfg.jump.val) < MATCH
  const isJump  = Math.abs(axJ - cfg.jump.val) < MATCH
  if (!wasJump && isJump && fighter.velocity.y === 0)
    fighter.velocity.y = -20
}

function pollGamepads() {
  const padList = navigator.getGamepads ? navigator.getGamepads() : []
  const allPads = Array.from(padList).filter(Boolean)

  // Auto-heal stale indices (handles brief reconnects with new index)
  let gp1 = p1PadIndex >= 0 ? padList[p1PadIndex] : null
  let gp2 = p2PadIndex >= 0 ? padList[p2PadIndex] : null
  if (!gp1 && allPads.length > 0) {
    gp1 = allPads.find(p => p.index !== p2PadIndex) ?? null
    if (gp1) p1PadIndex = gp1.index
  }
  if (!gp2 && allPads.length > 1) {
    gp2 = allPads.find(p => p.index !== p1PadIndex) ?? null
    if (gp2) p2PadIndex = gp2.index
  }

  // ── P1 ───────────────────────────────────────────────────────────────────
  gpMove.p1Left = gpMove.p1Right = false
  if (gp1) {
    const jp1 = i => (gp1.buttons[i]?.pressed ?? false) && !gpPrev.p1[i]

    // DEBUG botones P1
    for (let i = 0; i < 10; i++) { if (jp1(i)) console.log(`[P1 BTN] ${i}`) }

    // Botón 9: swap P1 ↔ P2
    if (jp1(9) && p2PadIndex >= 0) {
      ;[p1PadIndex, p2PadIndex] = [p2PadIndex, p1PadIndex]
      console.log(`Swap: P1=index${p1PadIndex} P2=index${p2PadIndex}`)
    }

    // Botón 2: reinicio global
    if (jp1(2)) { gameStarted ? returnToMenu() : showPane(titlePane) }

    if (!gameStarted && !inConfigMode) {
      const c1    = gpConfig.p1
      const ax    = gp1.axes[c1.left.axisIdx] ?? c1.neutral
      const pax   = gpPrev.p1Ax[c1.left.axisIdx] ?? c1.neutral
      const wasAct = Math.abs(pax - c1.left.val)  < MATCH ||
                     Math.abs(pax - c1.right.val) < MATCH ||
                     Math.abs(pax - c1.jump.val)  < MATCH
      const isLeft  = Math.abs(ax - c1.left.val)  < MATCH
      const isRight = Math.abs(ax - c1.right.val) < MATCH
      const isJump  = Math.abs(ax - c1.jump.val)  < MATCH
      if (!wasAct && (isLeft || isRight || isJump)) {
        if (isLeft || isJump) setMenuFocus(menuFocusIdx - 1)
        else                  setMenuFocus(menuFocusIdx + 1)
      }
      for (let i = 0; i < 20; i++) {
        if (i !== 2 && jp1(i)) { getMenuButtons()[menuFocusIdx]?.click(); break }
      }
    } else if (gameStarted && !roundEnded && !ultPlaying) {
      const m = {}
      readStick(gp1, gpPrev.p1Ax, m, player, gpConfig.p1)
      gpMove.p1Left  = m.left  ?? false
      gpMove.p1Right = m.right ?? false
      if (jp1(gpConfig.p1.btn.attack1))  player.attack()
      if (jp1(gpConfig.p1.btn.attack2))  player.attack2()
      if (jp1(gpConfig.p1.btn.ultimate)) { if (player.useUltimate()) triggerUltimate('player') }
    }

    gpPrev.p1Ax = Array.from(gp1.axes)
    for (let i = 0; i < 20; i++) gpPrev.p1[i] = gp1.buttons[i]?.pressed ?? false
  }

  // ── P2 (solo 1v1) ────────────────────────────────────────────────────────
  gpMove.p2Left = gpMove.p2Right = false
  if (gp2 && gameStarted && !roundEnded && !ultPlaying && gameMode === '1v1') {
    const jp2 = i => (gp2.buttons[i]?.pressed ?? false) && !gpPrev.p2[i]
    const m = {}
    readStick(gp2, gpPrev.p2Ax, m, enemy, gpConfig.p2)
    gpMove.p2Left  = m.left  ?? false
    gpMove.p2Right = m.right ?? false
    if (jp2(gpConfig.p2.btn.attack1))  enemy.attack()
    if (jp2(gpConfig.p2.btn.attack2))  enemy.attack2()
    if (jp2(gpConfig.p2.btn.ultimate)) { if (enemy.useUltimate()) triggerUltimate('enemy') }
    gpPrev.p2Ax = Array.from(gp2.axes)
    for (let i = 0; i < 20; i++) gpPrev.p2[i] = gp2.buttons[i]?.pressed ?? false
  }
}

window.addEventListener('gamepadconnected', e => {
  console.log(`Gamepad [${e.gamepad.index}] conectado: ${e.gamepad.id}`)
  if (p1PadIndex < 0)      { p1PadIndex = e.gamepad.index; console.log(`→ P1 (index ${p1PadIndex})`); setMenuFocus(0) }
  else if (p2PadIndex < 0) { p2PadIndex = e.gamepad.index; console.log(`→ P2 (index ${p2PadIndex})`) }
})
window.addEventListener('gamepaddisconnected', e => {
  console.log(`Gamepad [${e.gamepad.index}] desconectado`)
  if (e.gamepad.index === p1PadIndex) { p1PadIndex = -1; console.log('→ P1 desconectado') }
  if (e.gamepad.index === p2PadIndex) { p2PadIndex = -1; console.log('→ P2 desconectado') }
})

// ── Config Wizard ─────────────────────────────────────────────────────────────
const configInstrEl    = document.querySelector('#configInstruction')
const configDetectEl   = document.querySelector('#configDetected')
const configStepNumEl  = document.querySelector('#configStepNum')
const configBadgeEl    = document.querySelector('#configPlayerBadge')
const configProgressEl = document.querySelector('#configProgressFill')
const configBackBtn    = document.querySelector('#configBackBtn')
const configBtn        = document.querySelector('#configBtn')

// 7 steps × 2 players = 14 steps total
const CONFIG_STEPS = [
  { player: 1, id: 'neutral', label: 'CENTER JOYSTICK, PRESS ANY BUTTON', type: 'neutral' },
  { player: 1, id: 'left',    label: 'MOVE STICK LEFT',                   type: 'axis'    },
  { player: 1, id: 'right',   label: 'MOVE STICK RIGHT',                  type: 'axis'    },
  { player: 1, id: 'jump',    label: 'PUSH STICK UP (JUMP)',               type: 'axis'    },
  { player: 1, id: 'attack1', label: 'PRESS ATTACK 1',                    type: 'button'  },
  { player: 1, id: 'attack2', label: 'PRESS ATTACK 2',                    type: 'button'  },
  { player: 1, id: 'ultimate',label: 'PRESS ULTIMATE',                    type: 'button'  },
  { player: 2, id: 'neutral', label: 'CENTER JOYSTICK, PRESS ANY BUTTON', type: 'neutral' },
  { player: 2, id: 'left',    label: 'MOVE STICK LEFT',                   type: 'axis'    },
  { player: 2, id: 'right',   label: 'MOVE STICK RIGHT',                  type: 'axis'    },
  { player: 2, id: 'jump',    label: 'PUSH STICK UP (JUMP)',               type: 'axis'    },
  { player: 2, id: 'attack1', label: 'PRESS ATTACK 1',                    type: 'button'  },
  { player: 2, id: 'attack2', label: 'PRESS ATTACK 2',                    type: 'button'  },
  { player: 2, id: 'ultimate',label: 'PRESS ULTIMATE',                    type: 'button'  },
]

let configStep     = 0
let configBaseline = { p1: [], p2: [] }
let configRaf      = null
let pendingConfig  = null

function startConfigWizard() {
  pendingConfig  = JSON.parse(JSON.stringify(gpConfig))
  configStep     = 0
  configBaseline = { p1: [], p2: [] }
  inConfigMode   = true
  showPane(configPane)
  runConfigStep()
}

function runConfigStep() {
  const step = CONFIG_STEPS[configStep]
  if (!step) {
    localStorage.setItem('fytefans_gpConfig', JSON.stringify(pendingConfig))
    gpConfig     = pendingConfig
    inConfigMode = false
    showPane(titlePane)
    return
  }
  const pKey = `p${step.player}`
  configBadgeEl.textContent = `PLAYER ${step.player}`
  configBadgeEl.className   = `config-player-badge p${step.player}`
  configInstrEl.textContent   = step.label
  configStepNumEl.textContent = `${configStep + 1} / ${CONFIG_STEPS.length}`
  configProgressEl.style.width = `${(configStep / CONFIG_STEPS.length) * 100}%`
  configDetectEl.textContent  = 'Detecting...'
  configDetectEl.className    = 'config-detected detecting'
  if (configRaf) cancelAnimationFrame(configRaf)
  configRaf = requestAnimationFrame(() => pollConfigStep(pKey))
}

function pollConfigStep(pKey) {
  const step    = CONFIG_STEPS[configStep]
  const padList = navigator.getGamepads ? navigator.getGamepads() : []
  const allPads = Array.from(padList).filter(Boolean)
  const prevArr = pKey === 'p1' ? gpPrev.p1 : gpPrev.p2
  const baseline = configBaseline[pKey]

  // Resolve which pad to use for this player
  let gp
  if (pKey === 'p1') {
    gp = (p1PadIndex >= 0 ? padList[p1PadIndex] : null) || allPads[0] || null
  } else {
    gp = (p2PadIndex >= 0 ? padList[p2PadIndex] : null) ||
         (allPads.length > 1 ? allPads[1] : null) || null
  }

  if (!gp) {
    configDetectEl.textContent = `Connect Player ${step.player} gamepad...`
    configDetectEl.className   = 'config-detected'
    configRaf = requestAnimationFrame(() => pollConfigStep(pKey))
    return
  }

  const SKIP        = [2, 9]
  const btn2Pressed = (gp.buttons[2]?.pressed ?? false) && !prevArr[2]
  const btn9Pressed = (gp.buttons[9]?.pressed ?? false) && !prevArr[9]

  for (let i = 0; i < 20; i++) prevArr[i] = gp.buttons[i]?.pressed ?? false

  if (btn2Pressed) { advanceConfigStep(); return }
  if (btn9Pressed && configStep > 0) { configStep--; runConfigStep(); return }

  if (step.type === 'neutral') {
    for (let i = 0; i < gp.buttons.length; i++) {
      if (!SKIP.includes(i) && (gp.buttons[i]?.pressed ?? false)) {
        configBaseline[pKey]         = Array.from(gp.axes)
        const ax9base                = configBaseline[pKey][9] ?? 3.29
        pendingConfig[pKey].neutral  = ax9base
        configDetectEl.textContent   = `Neutral: ${ax9base.toFixed(2)}`
        configDetectEl.className     = 'config-detected found'
        setTimeout(advanceConfigStep, 600)
        return
      }
    }
  } else if (step.type === 'axis') {
    let maxDev = 0, bestIdx = -1, bestVal = 0
    Array.from(gp.axes).forEach((val, i) => {
      const base = baseline[i] ?? pendingConfig[pKey].neutral
      const dev  = Math.abs(val - base)
      if (dev > maxDev) { maxDev = dev; bestIdx = i; bestVal = val }
    })
    if (maxDev > 0.3 && bestIdx >= 0) {
      pendingConfig[pKey][step.id]   = { axisIdx: bestIdx, val: bestVal }
      configDetectEl.textContent     = `Axis ${bestIdx} = ${bestVal.toFixed(2)}`
      configDetectEl.className       = 'config-detected found'
      setTimeout(advanceConfigStep, 800)
      return
    }
  } else {
    for (let i = 0; i < gp.buttons.length; i++) {
      if (!SKIP.includes(i) && (gp.buttons[i]?.pressed ?? false)) {
        pendingConfig[pKey].btn[step.id] = i
        configDetectEl.textContent       = `Button ${i}`
        configDetectEl.className         = 'config-detected found'
        setTimeout(advanceConfigStep, 800)
        return
      }
    }
  }

  configRaf = requestAnimationFrame(() => pollConfigStep(pKey))
}

function advanceConfigStep() { configStep++; runConfigStep() }

configBtn?.addEventListener('click', startConfigWizard)
configBackBtn?.addEventListener('click', () => {
  if (configRaf) { cancelAnimationFrame(configRaf); configRaf = null }
  inConfigMode = false
  showPane(titlePane)
})

// Always-running loop (menu + game)
;(function gpLoop() {
  try { pollGamepads() } catch (e) { console.error('[gpLoop]', e) }
  requestAnimationFrame(gpLoop)
}())

// ── Timer ─────────────────────────────────────────────────────────────────────
const keys = {
  a: { pressed: false },
  d: { pressed: false },
  ArrowRight: { pressed: false },
  ArrowLeft:  { pressed: false }
}

function decreaseTimer() {
  if (timer > 0) {
    timerId = setTimeout(decreaseTimer, 1000)
    timer--
    document.querySelector('#timer').innerHTML = timer
  }

  if (timer === 0) {
    const winnerId = player.health > enemy.health ? 'player'
      : enemy.health > player.health ? 'enemy'
      : 'tie'
    endRound(winnerId)
  }
}

// ── Ultimate animation ────────────────────────────────────────────────────────
let ultPlaying = false

const ultFlash = document.querySelector('#ultFlash')
const cumGif   = document.querySelector('#cumGif')

function triggerUltimate(attackerId) {
  if (ultPlaying || roundEnded) return
  ultPlaying = true

  const defender = attackerId === 'player' ? enemy : player
  const isRukiAttacker = (attackerId === 'player' && playerCharacter === 'ruki') ||
                         (attackerId === 'enemy'  && playerCharacter !== 'ruki')
  const gifSrc = isRukiAttacker ? `${BASE}img/Ruki/cum.gif` : `${BASE}img/Chun/cum.gif`

  const savedPlayerPos = { x: player.position.x, y: player.position.y }
  const savedEnemyPos  = { x: enemy.position.x,  y: enemy.position.y  }

  player.visible = false
  enemy.visible  = false

  cumGif.src = ''
  cumGif.src = gifSrc
  cumGif.style.display = 'block'
  ultFlash.classList.add('active')

  setTimeout(() => {
    ultFlash.classList.remove('active')
    cumGif.style.display = 'none'
    cumGif.src = ''

    player.position.x = savedPlayerPos.x
    player.position.y = savedPlayerPos.y
    player.velocity.x = 0
    player.velocity.y = 0

    enemy.position.x = savedEnemyPos.x
    enemy.position.y = savedEnemyPos.y
    enemy.velocity.x = 0
    enemy.velocity.y = 0

    player.visible = true
    enemy.visible  = true

    const damage = Math.ceil(100 / 3)
    defender.takeHit(damage)

    const healthBar = attackerId === 'player' ? '#enemyHealth' : '#playerHealth'
    gsap.to(healthBar, { width: defender.health + '%' })
    screenShake()
    particles.push(...createUltimateParticles(c, defender.position.x, defender.position.y,
      attackerId === 'player' ? '255, 0, 128' : '0, 255, 255'))

    ultPlaying = false

    if (defender.health <= 0) endRound(attackerId)
  }, 4000)
}

// ── Combo helpers ─────────────────────────────────────────────────────────────
let playerCombo = 0
let enemyCombo  = 0
let playerComboTimer = null
let enemyComboTimer  = null

function handlePlayerHit() {
  playerCombo++
  showCombo(playerCombo, true)
  clearTimeout(playerComboTimer)
  playerComboTimer = setTimeout(() => { playerCombo = 0 }, 1000)
}

function handleEnemyHit() {
  enemyCombo++
  showCombo(enemyCombo, false)
  clearTimeout(enemyComboTimer)
  enemyComboTimer = setTimeout(() => { enemyCombo = 0 }, 1000)
}

// ── Game loop ─────────────────────────────────────────────────────────────────
function animate(timestamp) {
  window.requestAnimationFrame(animate)

  const deltaTime = lastTimestamp ? Math.min(timestamp - lastTimestamp, 50) : 16
  lastTimestamp = timestamp

  if (!gameStarted) return

  c.clearRect(0, 0, canvas.width, canvas.height)
  c.imageSmoothingEnabled = false

  player.flipped = player.facingRight
    ? player.position.x > enemy.position.x
    : player.position.x < enemy.position.x
  enemy.flipped = enemy.facingRight
    ? enemy.position.x > player.position.x
    : enemy.position.x < player.position.x

  player.update(c, deltaTime)
  enemy.update(c, deltaTime)

  updateParticles(c, particles)

  if (roundEnded || ultPlaying) return

  player.velocity.x = 0
  enemy.velocity.x  = 0

  // P1 input
  if ((keys.a.pressed && player.lastKey === 'a') || gpMove.p1Left) {
    player.velocity.x = -5
    player.switchSprite('run')
  } else if ((keys.d.pressed && player.lastKey === 'd') || gpMove.p1Right) {
    player.velocity.x = 5
    player.switchSprite('run')
  } else {
    player.switchSprite('idle')
  }

  if (player.velocity.y < 0) player.switchSprite('jump')
  else if (player.velocity.y > 0) player.switchSprite('fall')

  // P2 input — keys, gamepad, or AI
  if (gameMode === '1vpc') {
    updateAI(deltaTime)
    enemy.velocity.x = aiMoveDir * 5
    if (aiMoveDir !== 0) enemy.switchSprite('run')
    else enemy.switchSprite('idle')
  } else {
    if ((keys.ArrowLeft.pressed && enemy.lastKey === 'ArrowLeft') || gpMove.p2Left) {
      enemy.velocity.x = -5
      enemy.switchSprite('run')
    } else if ((keys.ArrowRight.pressed && enemy.lastKey === 'ArrowRight') || gpMove.p2Right) {
      enemy.velocity.x = 5
      enemy.switchSprite('run')
    } else {
      enemy.switchSprite('idle')
    }
  }

  if (enemy.velocity.y < 0) enemy.switchSprite('jump')
  else if (enemy.velocity.y > 0) enemy.switchSprite('fall')

  // Body collision — only when both characters are on the ground
  const playerAirborne = player.position.y < 315
  const enemyAirborne  = enemy.position.y  < 315
  if (!playerAirborne && !enemyAirborne) {
    const bodyGap = 80
    const pX      = player.position.x
    const eX      = enemy.position.x
    const overlap = bodyGap - Math.abs(pX - eX)
    if (overlap > 0) {
      const push = overlap / 2
      if (pX < eX) {
        player.position.x -= push
        enemy.position.x  += push
      } else {
        player.position.x += push
        enemy.position.x  -= push
      }
    }
  }

  // Hit detection
  if (
    rectangularCollision({ rectangle1: player, rectangle2: enemy }) &&
    player.isAttacking && player.framesCurrent === player.attack1HitFrame
  ) {
    enemy.takeHit()
    player.isAttacking = false
    player.gainUltimate(15)
    player.hitstopTimer = 80
    enemy.hitstopTimer = 80
    handlePlayerHit()
    screenShake()
    playPunch()
    gsap.to('#enemyHealth', { width: enemy.health + '%' })
  }

  if (player.isAttacking && player.framesCurrent === player.sprites.attack1.framesMax - 1) {
    player.isAttacking = false
  }

  if (
    rectangularCollision({ rectangle1: player, rectangle2: enemy }) &&
    player.isAttacking2 && player.framesCurrent === player.attack2HitFrame
  ) {
    enemy.takeHit(15)
    player.isAttacking2 = false
    player.gainUltimate(20)
    player.hitstopTimer = 90
    enemy.hitstopTimer = 90
    handlePlayerHit()
    screenShake()
    playPunch()
    gsap.to('#enemyHealth', { width: enemy.health + '%' })
  }

  if (player.isAttacking2 && player.framesCurrent === player.sprites.attack2.framesMax - 1) {
    player.isAttacking2 = false
  }

  if (
    rectangularCollision({ rectangle1: enemy, rectangle2: player }) &&
    enemy.isAttacking && enemy.framesCurrent === enemy.attack1HitFrame
  ) {
    player.takeHit()
    enemy.isAttacking = false
    enemy.gainUltimate(15)
    player.hitstopTimer = 80
    enemy.hitstopTimer = 80
    handleEnemyHit()
    screenShake()
    playPunch()
    gsap.to('#playerHealth', { width: player.health + '%' })
  }

  if (enemy.isAttacking && enemy.framesCurrent === enemy.sprites.attack1.framesMax - 1) {
    enemy.isAttacking = false
  }

  if (
    rectangularCollision({ rectangle1: enemy, rectangle2: player }) &&
    enemy.isAttacking2 && enemy.framesCurrent === enemy.attack2HitFrame
  ) {
    player.takeHit(15)
    enemy.isAttacking2 = false
    enemy.gainUltimate(20)
    player.hitstopTimer = 90
    enemy.hitstopTimer = 90
    handleEnemyHit()
    screenShake()
    playPunch()
    gsap.to('#playerHealth', { width: player.health + '%' })
  }

  if (enemy.isAttacking2 && enemy.framesCurrent === enemy.sprites.attack2.framesMax - 1) {
    enemy.isAttacking2 = false
  }

  updateUltimateMeter(player, enemy)

  if (enemy.health <= 0 || player.health <= 0) {
    endRound(player.health <= 0 ? 'enemy' : 'player')
  }
}

// ── Input ─────────────────────────────────────────────────────────────────────
window.addEventListener('keydown', (event) => {
  if (!gameStarted || roundEnded) return

  if (!player.dead) {
    switch (event.key) {
      case 'd': keys.d.pressed = true; player.lastKey = 'd'; break
      case 'a': keys.a.pressed = true; player.lastKey = 'a'; break
      case 'w':
        if (player.velocity.y === 0) player.velocity.y = -20
        break
      case ' ': player.attack(); break
      case 'e':
      case 'E': player.attack2(); break
      case 'q':
      case 'Q':
        if (player.useUltimate()) triggerUltimate('player')
        break
    }
  }

  if (gameMode === '1v1' && !enemy.dead) {
    switch (event.key) {
      case 'ArrowRight': keys.ArrowRight.pressed = true; enemy.lastKey = 'ArrowRight'; break
      case 'ArrowLeft':  keys.ArrowLeft.pressed  = true; enemy.lastKey = 'ArrowLeft';  break
      case 'ArrowUp':
        if (enemy.velocity.y === 0) enemy.velocity.y = -20
        break
      case 'ArrowDown': enemy.attack(); break
      case 'Enter': enemy.attack2(); break
      case '/':
        if (enemy.useUltimate()) triggerUltimate('enemy')
        break
    }
  }
})

window.addEventListener('keyup', (event) => {
  switch (event.key) {
    case 'd':          keys.d.pressed          = false; break
    case 'a':          keys.a.pressed          = false; break
    case 'ArrowRight': keys.ArrowRight.pressed = false; break
    case 'ArrowLeft':  keys.ArrowLeft.pressed  = false; break
  }
})

// ── Resize ────────────────────────────────────────────────────────────────────
function resizeGame() {
  const wrapper = document.querySelector('.game-wrapper')
  const scaleX  = window.innerWidth  / 1024
  const scaleY  = window.innerHeight / 576
  wrapper.style.transform = `scale(${Math.min(scaleX, scaleY)})`
}

window.addEventListener('resize', resizeGame)
resizeGame()

document.querySelector('.game-wrapper').style.backgroundImage = `url(${BASE}img/background2.png)`
document.querySelector('#shopGif').src = `${BASE}img/shop2.gif`

animate()
