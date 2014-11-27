var Game = new function() {
	this.initialize = function(canvasElementId, spriteData, callback)	 {
		this.canvas = document.getElementById(canvasElementId)
		this.canvasMultiplier = 1
		this.playerOffset = 10
		this.setupMobile()

		this.width = this.canvas.width
		this.height = this.canvas.height

		this.ctx = this.canvas.getContext && this.canvas.getContext('2d')
		if(!this.ctx) {
			return alert('Please upgrade your browser')
		} else {
			if(this.mobile) {
				this.setBoard(4, new TouchControls())
			}
			this.setupInput()
			this.loop()
			SpriteSheet.load(spriteData, callback)
		}
	}

	var KEY_CODES = {65: 'left', 68: 'right', 87: 'up', 83: 'down', 32: 'fire'}
	this.keys = {}
	this.setupInput = function() {
		window.addEventListener('keydown', function(e) {
			if(KEY_CODES[e.keyCode]) {
				Game.keys[KEY_CODES[e.keyCode]] = true
				e.preventDefault()
			}
		}, false)

		window.addEventListener('keyup', function(e) {
			if(KEY_CODES[e.keyCode]) {
				Game.keys[KEY_CODES[e.keyCode]] = false
				e.preventDefault()
			}
		}, false)
	}

	var boards = []
	this.loop = function() {
		var dt = 30 / 1000
		for(var i = 0, len = boards.length; i < len; i++) {
			if(boards[i]) {
				boards[i].step(dt)
				boards[i] && boards[i].draw(Game.ctx)
			}
		}
		setTimeout(Game.loop, 30)
	}

	this.setBoard = function(num, board) {
		boards[num] = board
	}

	this.setupMobile = function() {
		var container = document.getElementById('container'),
				hasTouch = !!('ontouchstart' in window),
				w = window.innerWidth, h = window.innerHeight;

		this.mobile = hasTouch	

		if(screen.width >= 1280 || !hasTouch) {
			return false
		}

		if(w > h) {
			alert("Please rotate the device and click ok")
			w = window.innerWidth
			h = window.innerHeight
		}

		container.style.height = h * 2 + "px"
		window.scrollTo(0, 1)
		h = window.innerHeight + 2

		container.style.height = h + 'px'
		container.style.width = w + 'px'
		container.style.padding = 0

		if(h >= this.canvas.height * 1.75 || w >= this.canvas.height * 1.75) {
			this.canvasMultiplier = 2
			this.canvas.width = w / 2
			this.canvas.height = h / 2
			this.canvas.style.width = w + "px"
			this.canvas.style.height = h + "px"
		} else {
			this.canvas.width = w
			this.canvas.height = h
		}

		this.canvas.style.position = 'absolute'
		this.canvas.style.left = '0px'
		this.canvas.style.top = '0px'
	}
}


var SpriteSheet = new function() {
	this.map = {}
	this.load = function(spriteData, callback) {
		this.map = spriteData
		this.image = new Image()
		this.image.onload = callback
		this.image.src = 'images/sprites.png'
	}
	this.draw = function(ctx, sprite, x, y, frame) {
		var s = this.map[sprite]
		if(!frame) {
			frame = 0;
		}
		ctx.drawImage(this.image,
										s.sx + frame * s.w,
										s.sy,
										s.w,
										s.h,
                    Math.floor(x), Math.floor(y),
										s.w, s.h)
	}
}

var Starfield = function(speed, opacity, numStars, clear) {
	var stars = document.createElement("canvas")
	stars.width = Game.width
	stars.height = Game.height

	var starCtx = stars.getContext("2d")
	var offset = 0

	if(clear) {
		starCtx.fillStyle = "#000"
		starCtx.fillRect(0, 0, stars.width, stars.height)
	}

	starCtx.fillStyle = "#fff"
	starCtx.globalAlpha = opacity

	for(var i=0; i<numStars; i++) {
		starCtx.fillRect(Math.floor(Math.random() * stars.width),
										 Math.floor(Math.random() * stars.height),
										 2, 2)
	}
	this.draw = function(ctx) {
		var initOffset = Math.floor(offset)
		var remaining = stars.height - initOffset

		if(initOffset > 0) {
			ctx.drawImage(stars,
										0, remaining,
										stars.width, initOffset,
										0, 0,
										stars.width, initOffset)
		}

		if(remaining > 0) {
			ctx.drawImage(stars,
										0, 0,
										stars.width, remaining,
										0, initOffset,
										stars.width, remaining)
		}
	}

	this.step = function(dt) {
		offset += dt * speed
		offset = offset % stars.height
	}
}

var TitleScreen = function(title, subtitle, callback) {
	this.step = function(dt) {
		if(Game.keys['fire'] && callback) {
			callback()
		}
	}

	this.draw = function(ctx) {
		ctx.fillStyle = "#fff"
		ctx.textAlign = "center"

		ctx.font = "bold 40 Arial"
		ctx.fillText(title, Game.width/2, Game.height / 2)

		ctx.font = "bold 20px Arial"
		ctx.fillText(subtitle, Game.width / 2, Game.height / 2 + 40)
	}
}

var GameBoard = function() {
	var board = this
	this.objects = []
	this.cnt = []

	this.add = function(obj) {
		obj.board = this
		this.objects.push(obj)
		this.cnt[obj.type] = (this.cnt[obj.type] || 0) + 1
		return obj
	}

	this.remove = function(obj) {
		var wasStillAlive = this.objects.indexOf(obj) != -1
		if(wasStillAlive) {
			this.removed.push(obj)
		}
		return wasStillAlive
	}

	this.resetRemoved = function() {
		this.removed = []
	}

	this.finalizeRemoved = function() {
		for(var i=0, len=this.removed.length; i<len; i++) {
			var idx = this.objects.indexOf(this.removed[i])
			if(idx != -1) {
				this.cnt[this.removed[i].type]--
				this.objects.splice(idx, 1)
			}
		}
	}

	this.iterate = function(funcName) {
		var args = Array.prototype.slice.call(arguments, 1)
		for(var i=0, len=this.objects.length; i<len; i++) {
			var obj = this.objects[i]
			obj[funcName].apply(obj, args)
		}
	}

	this.detect = function(func) {
		for(var i=0, len=this.objects.length; i<len; i++) {
			if(func.call(this.objects[i])) {
				return this.objects[i]
			}
		}

		return false
	}

	this.step = function(dt) {
		this.resetRemoved()
		this.iterate('step', dt)
		this.finalizeRemoved()
	}

	this.draw = function(ctx) {
		this.iterate('draw', ctx)
	}

	this.overlap = function(o1, o2) {
		return !((o1.y + o1.h - 1 < o2.y) || (o1.y > o2.y + o2.h -1)
						|| (o1.x + o1.w - 1 < o2.x) || (o1.x > o2.x + o2.w -1))
	}

	this.collide = function(obj, type) {
		return this.detect(function() {
			if(obj != this) {
				var col = (!type || this.type & type) && board.overlap(obj, this)
				return col ? this : false
			}
		})
	}
}



var Sprite = function() {}

Sprite.prototype.setup = function(sprite, props) {
	this.sprite = sprite
	this.merge(props)
	this.frame = this.frame || 0
	this.w = SpriteSheet.map[sprite].w
	this.h = SpriteSheet.map[sprite].h
}

Sprite.prototype.merge = function(props) {
	if(props) {
		for(var prop in props) {
			this[prop] = props[prop]
		}
	}
}

Sprite.prototype.draw = function(ctx) {
	SpriteSheet.draw(ctx, this.sprite, this.x, this.y, this.frame)
}

Sprite.prototype.hit = function(damage) {
	this.board.remove(this)
}

var Level = function(levelData, callback) {
	this.levelData = []
	for(var i=0; i<levelData.length; i++) {
		this.levelData.push(Object.create(levelData[i]))
	}
	this.t = 0
	this.callback = callback
}

Level.prototype.step = function(dt) {
	var idx = 0, remove = [], curShip = null;

	this.t += dt * 1000

	while((curShip = this.levelData[idx]) && (curShip[0] < this.t + 2000)) {
		if(this.t > curShip[1]) {
			remove.push(curShip)
		} else if(curShip[0] < this.t) {
			var enemy = enemies[curShip[3]], override = curShip[4]
			this.board.add(new Enemy(enemy, override))
			curShip[0] += curShip[2]
		}

		idx++
	}

	for(var i=0, len=remove.length; i<len; i++) {
		var idx = this.levelData.indexOf(remove[i])
		if(idx != -1) {
			this.levelData.splice(idx, 1)
		}
	}

	if(this.levelData.length == 0 && this.board.cnt[OBJECT_ENEMY] == 0) {
		if(this.callback) {
			this.callback()
		}
	}
}

Level.prototype.draw = function(ctx) {}

var TouchControls = function() {
	var gutterWidth = 10
	var unitWidth = Game.width / 5
	var blockWidth = unitWidth - gutterWidth

	this.drawSquare = function(ctx, x, y, txt, on) {
		ctx.globalAlpha = on ? 0.9 : 0.6
		ctx.fillStyle = "#ccc"
		ctx.fillRect(x, y, blockWidth, blockWidth)

		ctx.fillStyle = "#fff"
		ctx.textAlign = "center"
		ctx.globalAlpha = 1.0
		ctx.font = "bold " + (3 * unitWidth / 4) + "px arial"

		ctx.fillText(txt, x + blockWidth / 2, y + 3 * blockWidth / 4 + 5)
	}

	this.draw = function(ctx) {
		ctx.save()
		var yLoc = Game.height - unitWidth
		this.drawSquare(ctx, gutterWidth, yLoc, "\u25C0", Game.keys['left'])
		this.drawSquare(ctx, unitWidth + gutterWidth, yLoc, "\u25B6", Game.keys['right'])
		// this.drawSquare(ctx, unitWidth / 2 + gutterWidth, yLoc - unitWidth, "\u25B3", Game.keys['top'])
		this.drawSquare(ctx, 4*unitWidth, yLoc, "A", Game.keys['fire'])
		ctx.restore()
	}

	this.step = function(dt) {}

	this.trackTouch = function(e) {
		var touch, x;
		e.preventDefault()
		Game.keys['left'] = false
		Game.keys['right'] = false
		for(var i=0; i<e.targetTouches.length; i++) {
			touch = e.targetTouches[i]
			x = touch.pageX / Game.canvasMultiplier - Game.canvas.offsetLeft
			if(x < unitWidth) {
				Game.keys['left'] = true
			}
			if(x > unitWidth && x < 2 * unitWidth) {
				Game.keys['right'] = true
			}
		}

		if(e.type == 'touchstart' || e.type == 'touchend') {
			for(var i=0; i<e.changedTouches.length; i++) {
				touch = e.changedTouches[i]
				x = touch.pageX / Game.canvasMultiplier - Game.canvas.offsetLeft
				if(x > 4 * unitWidth) {
					Game.keys['fire'] = (e.type == 'touchstart')
				}
			}
		}
	}

	Game.canvas.addEventListener('touchstart', this.trackTouch, true)
	Game.canvas.addEventListener('touchmove', this.trackTouch, true)
	Game.canvas.addEventListener('touchend', this.trackTouch, true)
	Game.playerOffset = unitWidth + 20
}

var GamePoints = function(points) {
	Game.points = points
	var pointsLength = 8
	this.draw = function(ctx) {
		ctx.save()

		ctx.font = "bold 18px arial"
		ctx.fillStyle = "#fff"

		var txt = "" + Game.points

		var i = pointsLength - txt.length, zeros="";
		while(i-- > 0) {
			zeros += '0'
		}

		ctx.fillText(zeros + txt, 50, 20)

		ctx.restore()
	}

	this.step = function(dt) {}
}