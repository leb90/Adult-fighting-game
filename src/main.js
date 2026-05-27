import gsap from 'gsap'
import { Sprite, Fighter } from './classes.js'
import { 
  rectangularCollision, 
  screenShake, 
  showUltimateOverlay,
  updateUltimateMeter,
  showCombo,
  createUltimateParticles,
  updateParticles
} from './utils.js'

const startScreen = document.querySelector('#startScreen')
const gameContainer = document.querySelector('#gameContainer')
const startBtn = document.querySelector('#startBtn')
const restartBtn = document.querySelector('#restartBtn')

const canvas = document.querySelector('#gameCanvas')
const c = canvas.getContext('2d')

canvas.width = 1024
canvas.height = 576

const gravity = 0.7

let player, enemy
let timer = 60
let timerId
let gameStarted = false
let particles = []
let lastTimestamp = 0

let playerWins = 0
let enemyWins = 0
let roundNumber = 1
let roundEnded = false

function initGame(preserveUltimate = false) {
  const savedPlayerUlt = preserveUltimate && player ? player.ultimateMeter : 0
  const savedEnemyUlt = preserveUltimate && enemy ? enemy.ultimateMeter : 0

  particles = []
  timer = 60
  roundEnded = false
  document.querySelector('#timer').innerHTML = timer
  document.querySelector('#displayText').classList.remove('active', 'match-over')
  hideWinGifs()

  player = new Fighter({
    position: { x: 100, y: 0 },
    velocity: { x: 0, y: 0 },
    imageSrc: '/img/Ruki/Idle.png',
    framesMax: 4,
    scale: 2.0,
    offset: { x: 160, y: 145 },
    frameDuration: 115,
    sprites: {
      idle: { imageSrc: '/img/Ruki/Idle.png', framesMax: 4 },
      run: { imageSrc: '/img/Ruki/Run.png', framesMax: 8 },
      jump: { imageSrc: '/img/Ruki/Jump.png', framesMax: 2 },
      fall: { imageSrc: '/img/Ruki/Fall.png', framesMax: 2 },
      attack1: { imageSrc: '/img/Ruki/Attack1.png', framesMax: 4 },
      takeHit: { imageSrc: '/img/Ruki/Take hit.png', framesMax: 3 },
      death: { imageSrc: '/img/Ruki/Death.png', framesMax: 7, offsetY: 90 }
    },
    attackBox: { offset: { x: 60, y: 50 }, width: 140, height: 60 },
    canvas,
    gravity
  })

  enemy = new Fighter({
    position: { x: 800, y: 100 },
    velocity: { x: 0, y: 0 },
    color: 'blue',
    imageSrc: '/img/Chun/Idle.png',
    framesMax: 4,
    scale: 2.0,
    offset: { x: 160, y: 145 },
    frameDuration: 115,
    facingRight: true,
    sprites: {
      idle: { imageSrc: '/img/Chun/Idle.png', framesMax: 4 },
      run: { imageSrc: '/img/Chun/Run.png', framesMax: 8 },
      jump: { imageSrc: '/img/Chun/Jump.png', framesMax: 2 },
      fall: { imageSrc: '/img/Chun/Fall.png', framesMax: 2 },
      attack1: { imageSrc: '/img/Chun/Attack1.png', framesMax: 4 },
      takeHit: { imageSrc: '/img/Chun/Take hit.png', framesMax: 3 },
      death: { imageSrc: '/img/Chun/Death.png', framesMax: 7, offsetY: 90 }
    },
    attackBox: { offset: { x: 60, y: 50 }, width: 140, height: 60 },
    canvas,
    gravity
  })

  player.ultimateMeter = savedPlayerUlt
  enemy.ultimateMeter = savedEnemyUlt

  gsap.to('#playerHealth', { width: '100%', duration: 0.3 })
  gsap.to('#enemyHealth', { width: '100%', duration: 0.3 })

  if (!preserveUltimate) {
    document.querySelector('#playerUltimate').style.width = '0%'
    document.querySelector('#enemyUltimate').style.width = '0%'
    document.querySelector('#playerUltReady').classList.remove('active')
    document.querySelector('#enemyUltReady').classList.remove('active')
  }

  updateRoundLabel()
}

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
  const gifEl = document.querySelector(winnerId === 'player' ? '#winGifPlayer' : '#winGifEnemy')
  const src = winnerId === 'player' ? '/img/Ruki/Win.gif' : '/img/Chun/win.gif'

  gifEl.src = ''
  gifEl.src = src

  const isFacingLeft = winner.facingRight ? winner.flipped : !winner.flipped
  gifEl.style.transform = isFacingLeft
    ? 'translateX(-50%) scaleX(-1)'
    : 'translateX(-50%)'
  gifEl.style.display = 'block'
}

function hideWinGifs() {
  const p = document.querySelector('#winGifPlayer')
  const e = document.querySelector('#winGifEnemy')
  if (p) { p.style.display = 'none'; p.src = '' }
  if (e) { e.style.display = 'none'; e.src = '' }
}

function endRound(winnerId) {
  if (roundEnded) return
  roundEnded = true
  clearTimeout(timerId)

  const displayText = document.querySelector('#displayText')
  const winnerText = displayText.querySelector('.winner-text')

  if (winnerId === 'player') {
    playerWins++
    winnerText.textContent = 'PLAYER 1 WINS!'
    winnerText.style.color = '#ff0080'
    player.visible = false
    showWinGif('player')
  } else if (winnerId === 'enemy') {
    enemyWins++
    winnerText.textContent = 'PLAYER 2 WINS!'
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
      const matchWinner = playerWins >= 2 ? 'PLAYER 1' : 'PLAYER 2'
      winnerText.textContent = `${matchWinner} WINS THE MATCH!`
      displayText.classList.add('match-over')
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

const keys = {
  a: { pressed: false },
  d: { pressed: false },
  ArrowRight: { pressed: false },
  ArrowLeft: { pressed: false }
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

let playerCombo = 0
let enemyCombo = 0
let playerComboTimer = null
let enemyComboTimer = null

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

function animate(timestamp) {
  window.requestAnimationFrame(animate)

  const deltaTime = lastTimestamp ? Math.min(timestamp - lastTimestamp, 50) : 16
  lastTimestamp = timestamp

  if (!gameStarted) return

  c.clearRect(0, 0, canvas.width, canvas.height)

  player.flipped = player.facingRight
    ? player.position.x > enemy.position.x
    : player.position.x < enemy.position.x
  enemy.flipped = enemy.facingRight
    ? enemy.position.x > player.position.x
    : enemy.position.x < player.position.x

  player.update(c, deltaTime)
  enemy.update(c, deltaTime)

  updateParticles(c, particles)

  if (roundEnded) return

  player.velocity.x = 0
  enemy.velocity.x = 0

  if (keys.a.pressed && player.lastKey === 'a') {
    player.velocity.x = -5
    player.switchSprite('run')
  } else if (keys.d.pressed && player.lastKey === 'd') {
    player.velocity.x = 5
    player.switchSprite('run')
  } else {
    player.switchSprite('idle')
  }

  if (player.velocity.y < 0) {
    player.switchSprite('jump')
  } else if (player.velocity.y > 0) {
    player.switchSprite('fall')
  }

  if (keys.ArrowLeft.pressed && enemy.lastKey === 'ArrowLeft') {
    enemy.velocity.x = -5
    enemy.switchSprite('run')
  } else if (keys.ArrowRight.pressed && enemy.lastKey === 'ArrowRight') {
    enemy.velocity.x = 5
    enemy.switchSprite('run')
  } else {
    enemy.switchSprite('idle')
  }

  if (enemy.velocity.y < 0) {
    enemy.switchSprite('jump')
  } else if (enemy.velocity.y > 0) {
    enemy.switchSprite('fall')
  }

  if (
    rectangularCollision({ rectangle1: player, rectangle2: enemy }) &&
    player.isAttacking &&
    player.framesCurrent === 1
  ) {
    enemy.takeHit()
    player.isAttacking = false
    player.gainUltimate(15)
    handlePlayerHit()
    screenShake()
    gsap.to('#enemyHealth', { width: enemy.health + '%' })
  }

  if (player.isAttacking && player.framesCurrent === player.sprites.attack1.framesMax - 1) {
    player.isAttacking = false
  }

  if (
    rectangularCollision({ rectangle1: enemy, rectangle2: player }) &&
    enemy.isAttacking &&
    enemy.framesCurrent === 1
  ) {
    player.takeHit()
    enemy.isAttacking = false
    enemy.gainUltimate(15)
    handleEnemyHit()
    screenShake()
    gsap.to('#playerHealth', { width: player.health + '%' })
  }

  if (enemy.isAttacking && enemy.framesCurrent === enemy.sprites.attack1.framesMax - 1) {
    enemy.isAttacking = false
  }

  if (player.isUltimating) {
    const ultHitbox = {
      attackBox: {
        position: { x: player.position.x - 50, y: player.position.y },
        width: 300,
        height: 150
      }
    }
    if (
      ultHitbox.attackBox.position.x + ultHitbox.attackBox.width >= enemy.position.x &&
      ultHitbox.attackBox.position.x <= enemy.position.x + enemy.width &&
      !enemy.dead
    ) {
      enemy.takeHit(player.ultimateDamage)
      player.isUltimating = false
      screenShake()
      particles.push(...createUltimateParticles(c, enemy.position.x, enemy.position.y, '255, 0, 128'))
      gsap.to('#enemyHealth', { width: enemy.health + '%' })
    }
  }

  if (enemy.isUltimating) {
    const ultHitbox = {
      attackBox: {
        position: { x: enemy.position.x - 200, y: enemy.position.y },
        width: 300,
        height: 150
      }
    }
    if (
      ultHitbox.attackBox.position.x + ultHitbox.attackBox.width >= player.position.x &&
      ultHitbox.attackBox.position.x <= player.position.x + player.width &&
      !player.dead
    ) {
      player.takeHit(enemy.ultimateDamage)
      enemy.isUltimating = false
      screenShake()
      particles.push(...createUltimateParticles(c, player.position.x, player.position.y, '0, 255, 255'))
      gsap.to('#playerHealth', { width: player.health + '%' })
    }
  }

  updateUltimateMeter(player, enemy)

  if (enemy.health <= 0 || player.health <= 0) {
    const winnerId = player.health <= 0 ? 'enemy' : 'player'
    endRound(winnerId)
  }
}

function startGame() {
  startScreen.style.display = 'none'
  gameContainer.style.display = 'flex'
  gameStarted = true
  playerWins = 0
  enemyWins = 0
  roundNumber = 1
  updateWinDots()
  initGame()
  showRoundBanner(() => decreaseTimer())
}

function restartGame() {
  clearTimeout(timerId)
  playerWins = 0
  enemyWins = 0
  roundNumber = 1
  updateWinDots()
  initGame()
  showRoundBanner(() => decreaseTimer())
}

startBtn.addEventListener('click', startGame)
restartBtn.addEventListener('click', restartGame)

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
        if (player.useUltimate()) { showUltimateOverlay(); screenShake() }
        break
    }
  }

  if (!enemy.dead) {
    switch (event.key) {
      case 'ArrowRight': keys.ArrowRight.pressed = true; enemy.lastKey = 'ArrowRight'; break
      case 'ArrowLeft': keys.ArrowLeft.pressed = true; enemy.lastKey = 'ArrowLeft'; break
      case 'ArrowUp':
        if (enemy.velocity.y === 0) enemy.velocity.y = -20
        break
      case 'ArrowDown': enemy.attack(); break
      case '/':
        if (enemy.useUltimate()) { showUltimateOverlay(); screenShake() }
        break
    }
  }
})

window.addEventListener('keyup', (event) => {
  switch (event.key) {
    case 'd': keys.d.pressed = false; break
    case 'a': keys.a.pressed = false; break
    case 'ArrowRight': keys.ArrowRight.pressed = false; break
    case 'ArrowLeft': keys.ArrowLeft.pressed = false; break
  }
})

function resizeGame() {
  const wrapper = document.querySelector('.game-wrapper')
  const scaleX = window.innerWidth / 1024
  const scaleY = window.innerHeight / 576
  wrapper.style.transform = `scale(${Math.min(scaleX, scaleY)})`
}

window.addEventListener('resize', resizeGame)
resizeGame()

animate()
