export function rectangularCollision({ rectangle1, rectangle2 }) {
  return (
    rectangle1.attackBox.position.x + rectangle1.attackBox.width >= rectangle2.position.x &&
    rectangle1.attackBox.position.x <= rectangle2.position.x + rectangle2.width &&
    rectangle1.attackBox.position.y + rectangle1.attackBox.height >= rectangle2.position.y &&
    rectangle1.attackBox.position.y <= rectangle2.position.y + rectangle2.height
  )
}

export function determineWinner({ player, enemy, timerId }) {
  clearTimeout(timerId)
  
  const displayText = document.querySelector('#displayText')
  const winnerText = displayText.querySelector('.winner-text')
  
  displayText.classList.add('active')
  
  if (player.health === enemy.health) {
    winnerText.innerHTML = 'TIE GAME'
    winnerText.style.color = '#fff'
  } else if (player.health > enemy.health) {
    winnerText.innerHTML = 'PLAYER 1 WINS!'
    winnerText.style.color = '#ff0080'
  } else if (player.health < enemy.health) {
    winnerText.innerHTML = 'PLAYER 2 WINS!'
    winnerText.style.color = '#00ffff'
  }
}

// Screen shake effect
export function screenShake() {
  const gameWrapper = document.querySelector('.game-wrapper')
  gameWrapper.classList.add('shake')
  setTimeout(() => {
    gameWrapper.classList.remove('shake')
  }, 300)
}

// Show ultimate overlay
export function showUltimateOverlay() {
  const overlay = document.querySelector('#ultimateOverlay')
  overlay.classList.add('active')
  setTimeout(() => {
    overlay.classList.remove('active')
  }, 800)
}

// Update ultimate meter UI
export function updateUltimateMeter(player, enemy) {
  const playerUlt = document.querySelector('#playerUltimate')
  const enemyUlt = document.querySelector('#enemyUltimate')
  const playerReady = document.querySelector('#playerUltReady')
  const enemyReady = document.querySelector('#enemyUltReady')
  
  playerUlt.style.width = `${player.ultimateMeter}%`
  enemyUlt.style.width = `${enemy.ultimateMeter}%`
  
  if (player.ultimateMeter >= player.maxUltimate) {
    playerReady.classList.add('active')
  } else {
    playerReady.classList.remove('active')
  }
  
  if (enemy.ultimateMeter >= enemy.maxUltimate) {
    enemyReady.classList.add('active')
  } else {
    enemyReady.classList.remove('active')
  }
}

// Show combo
export function showCombo(comboCount, isPlayer1) {
  const comboEl = document.querySelector(isPlayer1 ? '#comboP1' : '#comboP2')
  comboEl.textContent = `${comboCount} HIT${comboCount > 1 ? 'S' : ''}!`
  comboEl.classList.add('active')
  
  setTimeout(() => {
    comboEl.classList.remove('active')
  }, 500)
}

// Create particle effect for ultimate
export function createUltimateParticles(c, x, y, color) {
  const particles = []
  for (let i = 0; i < 20; i++) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 20,
      vy: (Math.random() - 0.5) * 20,
      life: 30,
      color
    })
  }
  return particles
}

export function updateParticles(c, particles) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]
    p.x += p.vx
    p.y += p.vy
    p.life--
    
    const alpha = p.life / 30
    c.beginPath()
    c.arc(p.x, p.y, 5, 0, Math.PI * 2)
    c.fillStyle = `rgba(${p.color}, ${alpha})`
    c.fill()
    
    if (p.life <= 0) {
      particles.splice(i, 1)
    }
  }
}
