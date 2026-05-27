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
  frameDuration: 115,
  facingRight:  false,
  sprites: {
    idle:    { imageSrc: `${BASE}img/Ruki/Idle.png`,      framesMax: 4 },
    run:     { imageSrc: `${BASE}img/Ruki/Run.png`,       framesMax: 8 },
    jump:    { imageSrc: `${BASE}img/Ruki/Jump.png`,      framesMax: 2 },
    fall:    { imageSrc: `${BASE}img/Ruki/Fall.png`,      framesMax: 2 },
    attack1: { imageSrc: `${BASE}img/Ruki/Attack1.png`,   framesMax: 4 },
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
  frameDuration: 115,
  facingRight:  true,
  sprites: {
    idle:    { imageSrc: `${BASE}img/Chun/Idle.png`,      framesMax: 4 },
    run:     { imageSrc: `${BASE}img/Chun/Run.png`,       framesMax: 8 },
    jump:    { imageSrc: `${BASE}img/Chun/Jump.png`,      framesMax: 2 },
    fall:    { imageSrc: `${BASE}img/Chun/Fall.png`,      framesMax: 2 },
    attack1: { imageSrc: `${BASE}img/Chun/Attack1.png`,   framesMax: 4 },
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

  if (dist < 210 && !enemy.isAttacking && Math.random() < 0.70) {
    enemy.attack()
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
  titlePane.style.display = 'none'
  modePane.style.display  = 'none'
  charPane.style.display  = 'none'
  pane.style.display      = 'flex'
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
  if (keys.a.pressed && player.lastKey === 'a') {
    player.velocity.x = -5
    player.switchSprite('run')
  } else if (keys.d.pressed && player.lastKey === 'd') {
    player.velocity.x = 5
    player.switchSprite('run')
  } else {
    player.switchSprite('idle')
  }

  if (player.velocity.y < 0) player.switchSprite('jump')
  else if (player.velocity.y > 0) player.switchSprite('fall')

  // P2 input — keys or AI
  if (gameMode === '1vpc') {
    updateAI(deltaTime)
    enemy.velocity.x = aiMoveDir * 5
    if (aiMoveDir !== 0) enemy.switchSprite('run')
    else enemy.switchSprite('idle')
  } else {
    if (keys.ArrowLeft.pressed && enemy.lastKey === 'ArrowLeft') {
      enemy.velocity.x = -5
      enemy.switchSprite('run')
    } else if (keys.ArrowRight.pressed && enemy.lastKey === 'ArrowRight') {
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
    player.isAttacking && player.framesCurrent === 1
  ) {
    enemy.takeHit()
    player.isAttacking = false
    player.gainUltimate(15)
    handlePlayerHit()
    screenShake()
    playPunch()
    gsap.to('#enemyHealth', { width: enemy.health + '%' })
  }

  if (player.isAttacking && player.framesCurrent === player.sprites.attack1.framesMax - 1) {
    player.isAttacking = false
  }

  if (
    rectangularCollision({ rectangle1: enemy, rectangle2: player }) &&
    enemy.isAttacking && enemy.framesCurrent === 1
  ) {
    player.takeHit()
    enemy.isAttacking = false
    enemy.gainUltimate(15)
    handleEnemyHit()
    screenShake()
    playPunch()
    gsap.to('#playerHealth', { width: player.health + '%' })
  }

  if (enemy.isAttacking && enemy.framesCurrent === enemy.sprites.attack1.framesMax - 1) {
    enemy.isAttacking = false
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

animate()
