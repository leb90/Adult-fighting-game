import gsap from 'gsap'
import { Sprite, Fighter } from './classes.js'
import { 
  rectangularCollision, 
  determineWinner, 
  screenShake, 
  showUltimateOverlay,
  updateUltimateMeter,
  showCombo,
  createUltimateParticles,
  updateParticles
} from './utils.js'

// DOM Elements
const startScreen = document.querySelector('#startScreen')
const gameContainer = document.querySelector('#gameContainer')
const startBtn = document.querySelector('#startBtn')
const restartBtn = document.querySelector('#restartBtn')

// Canvas setup
const canvas = document.querySelector('#gameCanvas')
const c = canvas.getContext('2d')

canvas.width = 1024
canvas.height = 576

const gravity = 0.7

// Game state
let player, enemy, background, shop
let timer = 60
let timerId
let gameStarted = false
let particles = []

// Initialize game objects
function initGame() {
  particles = []
  timer = 60
  document.querySelector('#timer').innerHTML = timer
  document.querySelector('#displayText').classList.remove('active')
  
  background = new Sprite({
    position: { x: 0, y: 0 },
    imageSrc: '/img/background.png'
  })

  shop = new Sprite({
    position: { x: 600, y: 128 },
    imageSrc: '/img/shop.png',
    scale: 2.75,
    framesMax: 6
  })

  player = new Fighter({
    position: { x: 100, y: 0 },
    velocity: { x: 0, y: 0 },
    offset: { x: 0, y: 0 },
    imageSrc: '/img/samuraiMack/Idle.png',
    framesMax: 8,
    scale: 2.5,
    offset: { x: 215, y: 157 },
    sprites: {
      idle: { imageSrc: '/img/samuraiMack/Idle.png', framesMax: 8 },
      run: { imageSrc: '/img/samuraiMack/Run.png', framesMax: 8 },
      jump: { imageSrc: '/img/samuraiMack/Jump.png', framesMax: 2 },
      fall: { imageSrc: '/img/samuraiMack/Fall.png', framesMax: 2 },
      attack1: { imageSrc: '/img/samuraiMack/Attack1.png', framesMax: 6 },
      takeHit: { imageSrc: '/img/samuraiMack/Take Hit - white silhouette.png', framesMax: 4 },
      death: { imageSrc: '/img/samuraiMack/Death.png', framesMax: 6 }
    },
    attackBox: { offset: { x: 100, y: 50 }, width: 160, height: 50 },
    canvas,
    gravity
  })

  enemy = new Fighter({
    position: { x: 800, y: 100 },
    velocity: { x: 0, y: 0 },
    color: 'blue',
    offset: { x: -50, y: 0 },
    imageSrc: '/img/kenji/Idle.png',
    framesMax: 4,
    scale: 2.5,
    offset: { x: 215, y: 167 },
    sprites: {
      idle: { imageSrc: '/img/kenji/Idle.png', framesMax: 4 },
      run: { imageSrc: '/img/kenji/Run.png', framesMax: 8 },
      jump: { imageSrc: '/img/kenji/Jump.png', framesMax: 2 },
      fall: { imageSrc: '/img/kenji/Fall.png', framesMax: 2 },
      attack1: { imageSrc: '/img/kenji/Attack1.png', framesMax: 4 },
      takeHit: { imageSrc: '/img/kenji/Take hit.png', framesMax: 3 },
      death: { imageSrc: '/img/kenji/Death.png', framesMax: 7 }
    },
    attackBox: { offset: { x: -170, y: 50 }, width: 170, height: 50 },
    canvas,
    gravity
  })

  // Reset health bars
  gsap.to('#playerHealth', { width: '100%', duration: 0.3 })
  gsap.to('#enemyHealth', { width: '100%', duration: 0.3 })
  
  // Reset ultimate bars
  document.querySelector('#playerUltimate').style.width = '0%'
  document.querySelector('#enemyUltimate').style.width = '0%'
  document.querySelector('#playerUltReady').classList.remove('active')
  document.querySelector('#enemyUltReady').classList.remove('active')
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
    determineWinner({ player, enemy, timerId })
  }
}

// Combo tracking
let playerCombo = 0
let enemyCombo = 0
let playerComboTimer = null
let enemyComboTimer = null

function handlePlayerHit() {
  playerCombo++
  showCombo(playerCombo, true)
  
  clearTimeout(playerComboTimer)
  playerComboTimer = setTimeout(() => {
    playerCombo = 0
  }, 1000)
}

function handleEnemyHit() {
  enemyCombo++
  showCombo(enemyCombo, false)
  
  clearTimeout(enemyComboTimer)
  enemyComboTimer = setTimeout(() => {
    enemyCombo = 0
  }, 1000)
}

function animate() {
  window.requestAnimationFrame(animate)
  
  if (!gameStarted) return
  
  c.fillStyle = 'black'
  c.fillRect(0, 0, canvas.width, canvas.height)
  
  background.update(c)
  shop.update(c)
  
  c.fillStyle = 'rgba(255, 255, 255, 0.15)'
  c.fillRect(0, 0, canvas.width, canvas.height)
  
  player.update(c)
  enemy.update(c)
  
  // Update particles
  updateParticles(c, particles)

  player.velocity.x = 0
  enemy.velocity.x = 0

  // Player movement
  if (keys.a.pressed && player.lastKey === 'a') {
    player.velocity.x = -5
    player.switchSprite('run')
  } else if (keys.d.pressed && player.lastKey === 'd') {
    player.velocity.x = 5
    player.switchSprite('run')
  } else {
    player.switchSprite('idle')
  }

  // Player jumping
  if (player.velocity.y < 0) {
    player.switchSprite('jump')
  } else if (player.velocity.y > 0) {
    player.switchSprite('fall')
  }

  // Enemy movement
  if (keys.ArrowLeft.pressed && enemy.lastKey === 'ArrowLeft') {
    enemy.velocity.x = -5
    enemy.switchSprite('run')
  } else if (keys.ArrowRight.pressed && enemy.lastKey === 'ArrowRight') {
    enemy.velocity.x = 5
    enemy.switchSprite('run')
  } else {
    enemy.switchSprite('idle')
  }

  // Enemy jumping
  if (enemy.velocity.y < 0) {
    enemy.switchSprite('jump')
  } else if (enemy.velocity.y > 0) {
    enemy.switchSprite('fall')
  }

  // Player hits enemy
  if (
    rectangularCollision({ rectangle1: player, rectangle2: enemy }) &&
    player.isAttacking &&
    player.framesCurrent === 4
  ) {
    enemy.takeHit()
    player.isAttacking = false
    player.gainUltimate(15)
    handlePlayerHit()
    screenShake()

    gsap.to('#enemyHealth', { width: enemy.health + '%' })
  }

  // Player misses
  if (player.isAttacking && player.framesCurrent === 4) {
    player.isAttacking = false
  }

  // Enemy hits player
  if (
    rectangularCollision({ rectangle1: enemy, rectangle2: player }) &&
    enemy.isAttacking &&
    enemy.framesCurrent === 2
  ) {
    player.takeHit()
    enemy.isAttacking = false
    enemy.gainUltimate(15)
    handleEnemyHit()
    screenShake()

    gsap.to('#playerHealth', { width: player.health + '%' })
  }

  // Enemy misses
  if (enemy.isAttacking && enemy.framesCurrent === 2) {
    enemy.isAttacking = false
  }

  // Ultimate collision detection
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
      
      // Add particles
      const newParticles = createUltimateParticles(c, enemy.position.x, enemy.position.y, '255, 0, 128')
      particles.push(...newParticles)
      
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
      
      // Add particles
      const newParticles = createUltimateParticles(c, player.position.x, player.position.y, '0, 255, 255')
      particles.push(...newParticles)
      
      gsap.to('#playerHealth', { width: player.health + '%' })
    }
  }

  // Update ultimate meters
  updateUltimateMeter(player, enemy)

  // End game based on health
  if (enemy.health <= 0 || player.health <= 0) {
    determineWinner({ player, enemy, timerId })
  }
}

// Start game
function startGame() {
  startScreen.style.display = 'none'
  gameContainer.style.display = 'block'
  gameStarted = true
  initGame()
  decreaseTimer()
}

// Restart game
function restartGame() {
  clearTimeout(timerId)
  initGame()
  gameStarted = true
  decreaseTimer()
}

// Event listeners
startBtn.addEventListener('click', startGame)
restartBtn.addEventListener('click', restartGame)

window.addEventListener('keydown', (event) => {
  if (!gameStarted) return
  
  if (!player.dead) {
    switch (event.key) {
      case 'd':
        keys.d.pressed = true
        player.lastKey = 'd'
        break
      case 'a':
        keys.a.pressed = true
        player.lastKey = 'a'
        break
      case 'w':
        if (player.velocity.y === 0) {
          player.velocity.y = -20
        }
        break
      case ' ':
        player.attack()
        break
      case 'q':
      case 'Q':
        if (player.useUltimate()) {
          showUltimateOverlay()
          screenShake()
        }
        break
    }
  }

  if (!enemy.dead) {
    switch (event.key) {
      case 'ArrowRight':
        keys.ArrowRight.pressed = true
        enemy.lastKey = 'ArrowRight'
        break
      case 'ArrowLeft':
        keys.ArrowLeft.pressed = true
        enemy.lastKey = 'ArrowLeft'
        break
      case 'ArrowUp':
        if (enemy.velocity.y === 0) {
          enemy.velocity.y = -20
        }
        break
      case 'ArrowDown':
        enemy.attack()
        break
      case '/':
        if (enemy.useUltimate()) {
          showUltimateOverlay()
          screenShake()
        }
        break
    }
  }
})

window.addEventListener('keyup', (event) => {
  switch (event.key) {
    case 'd':
      keys.d.pressed = false
      break
    case 'a':
      keys.a.pressed = false
      break
    case 'ArrowRight':
      keys.ArrowRight.pressed = false
      break
    case 'ArrowLeft':
      keys.ArrowLeft.pressed = false
      break
  }
})

// Initialize animation loop
animate()
