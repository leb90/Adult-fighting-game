export class Sprite {
  constructor({
    position,
    imageSrc,
    scale = 1,
    framesMax = 1,
    offset = { x: 0, y: 0 },
    frameDuration = 95
  }) {
    this.position = position
    this.width = 50
    this.height = 150
    this.image = new Image()
    this.image.src = imageSrc
    this.scale = scale
    this.framesMax = framesMax
    this.framesCurrent = 0
    this.frameTime = 0
    this.frameDuration = frameDuration
    this.offset = offset
    this.visible = true
  }

  draw(c) {
    if (!this.visible) return
    const frameWidth = this.image.width / this.framesMax
    const drawX = this.position.x - this.offset.x
    const drawY = this.position.y - this.offset.y
    const drawW = frameWidth * this.scale
    const drawH = this.image.height * this.scale

    if (this.flipped) {
      c.save()
      c.scale(-1, 1)
      c.drawImage(
        this.image,
        this.framesCurrent * frameWidth, 0,
        frameWidth, this.image.height,
        -(drawX + drawW), drawY,
        drawW, drawH
      )
      c.restore()
    } else {
      c.drawImage(
        this.image,
        this.framesCurrent * frameWidth, 0,
        frameWidth, this.image.height,
        drawX, drawY,
        drawW, drawH
      )
    }
  }

  animateFrames(deltaTime) {
    this.frameTime += deltaTime

    if (this.frameTime >= this.frameDuration) {
      this.frameTime = 0
      if (this.framesCurrent < this.framesMax - 1) {
        this.framesCurrent++
      } else {
        this.framesCurrent = 0
      }
    }
  }

  update(c, deltaTime) {
    this.draw(c)
    this.animateFrames(deltaTime)
  }
}

export class Fighter extends Sprite {
  constructor({
    position,
    velocity,
    color = 'red',
    imageSrc,
    scale = 1,
    framesMax = 1,
    offset = { x: 0, y: 0 },
    frameDuration = 100,
    facingRight = false,
    sprites,
    attackBox = { offset: {}, width: undefined, height: undefined },
    canvas,
    gravity
  }) {
    super({
      position,
      imageSrc,
      scale,
      framesMax,
      offset,
      frameDuration
    })

    this.velocity = velocity
    this.width = 50
    this.height = 150
    this.lastKey
    this.attackBox = {
      position: {
        x: this.position.x,
        y: this.position.y
      },
      offset: attackBox.offset,
      width: attackBox.width,
      height: attackBox.height
    }
    this.color = color
    this.facingRight = facingRight
    this.flipped = false
    this.isAttacking = false
    this.isAttacking2 = false
    this.hitFlashTimer = 0
    this.hitFlashPhase = 0  // 0=none  1=grayscale  2=white
    this.hitstopTimer = 0
    this.defaultFrameDuration = frameDuration
    this.lastFrameHoldTimer = 0
    this.attackAnimComplete = true
    this.lastFrameHoldStarted = false
    this.health = 100
    this.framesCurrent = 0
    this.frameTime = 0
    this.sprites = sprites
    this.dead = false
    this.canvas = canvas
    this.gravity = gravity

    this.ultimateMeter = 0
    this.maxUltimate = 100
    this.isUltimating = false
    this.ultimateDamage = 40
    this.ultimateCooldown = false

    this.attack1HitFrame = sprites.attack1.hitFrame ?? 1
    this.attack2HitFrame = sprites.attack2.hitFrame ?? 1

    this.comboCount = 0
    this.comboTimer = null
    this.lastHitTime = 0

    for (const sprite in this.sprites) {
      sprites[sprite].image = new Image()
      sprites[sprite].image.src = sprites[sprite].imageSrc
    }
  }

  draw(c) {
    if (this.hitFlashPhase === 1) c.filter = 'grayscale(1) brightness(1.4)'
    else if (this.hitFlashPhase === 2) c.filter = 'brightness(100)'
    super.draw(c)
    c.filter = 'none'
  }

  update(c, deltaTime) {
    this.draw(c)

    if (this.hitFlashTimer > 0) {
      this.hitFlashTimer -= deltaTime
      if (this.hitFlashTimer <= 0) {
        this.hitFlashTimer = 0
        this.hitFlashPhase = 0
      } else if (this.hitFlashTimer <= 100) {
        this.hitFlashPhase = 2
      }
    }

    if (this.hitstopTimer > 0) {
      this.hitstopTimer = Math.max(0, this.hitstopTimer - deltaTime)
    }

    if (this.lastFrameHoldTimer > 0) {
      this.lastFrameHoldTimer = Math.max(0, this.lastFrameHoldTimer - deltaTime)
      if (this.lastFrameHoldTimer === 0) {
        this.attackAnimComplete = true
        this.isAttacking = false
        this.isAttacking2 = false
      }
    }

    if (!this.dead) {
      if (
        this.image === this.sprites.death.image &&
        this.framesCurrent === this.sprites.death.framesMax - 1
      ) {
        this.dead = true
      } else if (this.hitstopTimer <= 0) {
        const isAttackAnim = this.image === this.sprites.attack1.image ||
                             this.image === this.sprites.attack2.image
        if (this.lastFrameHoldTimer > 0 || (isAttackAnim && this.attackAnimComplete)) {
          // freeze: hold active, or hold done but idle hasn't taken over yet
        } else {
          this.animateFrames(deltaTime)
          if (!this.attackAnimComplete && !this.lastFrameHoldStarted &&
              isAttackAnim && this.framesCurrent === this.framesMax - 1) {
            this.lastFrameHoldTimer = 150
            this.lastFrameHoldStarted = true
          }
        }
      }
    }

    const isFacingLeft = this.facingRight ? this.flipped : !this.flipped
    this.attackBox.position.x = isFacingLeft
      ? this.position.x - this.attackBox.offset.x - this.attackBox.width
      : this.position.x + this.attackBox.offset.x
    this.attackBox.position.y = this.position.y + this.attackBox.offset.y

    this.position.x += this.velocity.x
    this.position.y += this.velocity.y

    const frameDrawWidth = (this.image.width / this.framesMax) * this.scale
    const minX = this.offset.x
    const maxX = this.canvas.width - frameDrawWidth + this.offset.x
    if (this.position.x < minX) this.position.x = minX
    if (this.position.x > maxX) this.position.x = maxX

    if (this.position.y + this.height + this.velocity.y >= this.canvas.height - 96) {
      this.velocity.y = 0
      this.position.y = 330
    } else {
      this.velocity.y += this.gravity
    }
  }

  attack() {
    if (this.isAttacking2) return
    this.switchSprite('attack1')
    this.isAttacking = true
    this.attackAnimComplete = false
    this.lastFrameHoldStarted = false
  }

  attack2() {
    if (this.isAttacking) return
    this.switchSprite('attack2')
    this.isAttacking2 = true
    this.attackAnimComplete = false
    this.lastFrameHoldStarted = false
  }

  useUltimate() {
    if (this.ultimateMeter >= this.maxUltimate && !this.ultimateCooldown && !this.dead) {
      this.isUltimating = true
      this.ultimateMeter = 0
      this.ultimateCooldown = true

      setTimeout(() => {
        this.ultimateCooldown = false
        this.isUltimating = false
      }, 5000)

      return true
    }
    return false
  }

  gainUltimate(amount) {
    if (this.ultimateMeter < this.maxUltimate) {
      this.ultimateMeter = Math.min(this.maxUltimate, this.ultimateMeter + amount)
    }
  }

  takeHit(damage = 10) {
    this.health -= damage
    this.hitFlashTimer = 280
    this.hitFlashPhase = 1

    if (this.health <= 0) {
      this.health = 0
      this.switchSprite('death')
    } else {
      this.switchSprite('takeHit')
    }
  }

  switchSprite(sprite) {
    if (this.image === this.sprites.death.image) {
      return
    }

    if (this.image === this.sprites.attack1.image && !this.attackAnimComplete) {
      return
    }

    if (this.image === this.sprites.attack2.image && !this.attackAnimComplete) {
      return
    }

    if (
      this.image === this.sprites.takeHit.image &&
      this.framesCurrent < this.sprites.takeHit.framesMax - 1
    ) {
      return
    }

    const spriteDef = this.sprites[sprite]
    if (spriteDef) {
      this.frameDuration = spriteDef.frameDuration ?? this.defaultFrameDuration
    }

    switch (sprite) {
      case 'idle':
        if (this.image !== this.sprites.idle.image) {
          this.image = this.sprites.idle.image
          this.framesMax = this.sprites.idle.framesMax
          this.framesCurrent = 0
        }
        break
      case 'run':
        if (this.image !== this.sprites.run.image) {
          this.image = this.sprites.run.image
          this.framesMax = this.sprites.run.framesMax
          this.framesCurrent = 0
        }
        break
      case 'jump':
        if (this.image !== this.sprites.jump.image) {
          this.image = this.sprites.jump.image
          this.framesMax = this.sprites.jump.framesMax
          this.framesCurrent = 0
        }
        break
      case 'fall':
        if (this.image !== this.sprites.fall.image) {
          this.image = this.sprites.fall.image
          this.framesMax = this.sprites.fall.framesMax
          this.framesCurrent = 0
        }
        break
      case 'attack1':
        if (this.image !== this.sprites.attack1.image) {
          this.image = this.sprites.attack1.image
          this.framesMax = this.sprites.attack1.framesMax
          this.framesCurrent = 0
        }
        break
      case 'attack2':
        if (this.image !== this.sprites.attack2.image) {
          this.image = this.sprites.attack2.image
          this.framesMax = this.sprites.attack2.framesMax
          this.framesCurrent = 0
        }
        break
      case 'takeHit':
        if (this.image !== this.sprites.takeHit.image) {
          this.image = this.sprites.takeHit.image
          this.framesMax = this.sprites.takeHit.framesMax
          this.framesCurrent = 0
        }
        break
      case 'death':
        if (this.image !== this.sprites.death.image) {
          this.image = this.sprites.death.image
          this.framesMax = this.sprites.death.framesMax
          this.framesCurrent = 0
          if (this.sprites.death.offsetY !== undefined) {
            this.offset = { x: this.offset.x, y: this.sprites.death.offsetY }
          }
        }
        break
    }
  }
}
