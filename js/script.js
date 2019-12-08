(function() {

	var ParticleNetworkAnimation, PNA;
	ParticleNetworkAnimation = PNA = function() {};

	PNA.prototype.init = function(element) {
		this.$el = $(element);

		this.container = element;
		this.canvas = document.createElement('canvas');
		this.sizeCanvas();
		this.container.appendChild(this.canvas);
		this.ctx = this.canvas.getContext('2d');
		this.particleNetwork = new ParticleNetwork(this);

		this.bindUiActions();

		return this;
	};

	PNA.prototype.bindUiActions = function() {
		$(window).on('resize', function() {
			// this.sizeContainer();
			this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
			this.sizeCanvas();
			this.particleNetwork.createParticles();
		}.bind(this));
	};

	PNA.prototype.sizeCanvas = function() {
		this.canvas.width = this.container.offsetWidth;
		this.canvas.height = this.container.offsetHeight;
	};

	var Particle = function(parent, x, y) {
		this.network = parent;
		this.canvas = parent.canvas;
		this.ctx = parent.ctx;
		this.particleColor = returnRandomArrayitem(this.network.options.particleColors);
		this.radius = getLimitedRandom(1.5, 2.5);
		this.opacity = 0;
		this.x = x || Math.random() * this.canvas.width;
		this.y = y || Math.random() * this.canvas.height;
		this.velocity = {
			x: (Math.random() - 0.5) * parent.options.velocity,
			y: (Math.random() - 0.5) * parent.options.velocity
		};
	};

	Particle.prototype.update = function() {
		if (this.opacity < 1) {
			this.opacity += 0.01;
		} else {
			this.opacity = 1;
		}
		// Change dir if outside map
		if (this.x > this.canvas.width + 100 || this.x < -100) {
			this.velocity.x = -this.velocity.x;
		}
		if (this.y > this.canvas.height + 100 || this.y < -100) {
			this.velocity.y = -this.velocity.y;
		}

		// Update position
		this.x += this.velocity.x;
		this.y += this.velocity.y;
	};

	Particle.prototype.draw = function() {
		// Draw particle
		this.ctx.beginPath();
		this.ctx.fillStyle = this.particleColor;
		this.ctx.globalAlpha = this.opacity;
		this.ctx.arc(this.x, this.y, this.radius, 0, 2 * Math.PI);
		this.ctx.fill();
	};

	var ParticleNetwork = function(parent) {
		this.options = {
			velocity: 1, // the higher the faster
			density: 15000, // the lower the denser
			netLineDistance: 200,
			netLineColor: '#929292',
			particleColors: ['#aaa'] // ['#6D4E5C', '#aaa', '#FFC458' ]
		};
		this.canvas = parent.canvas;
		this.ctx = parent.ctx;

		this.init();
	};

	ParticleNetwork.prototype.init = function() {
		// Create particle objects
		this.createParticles(true);

		// Update canvas
		this.animationFrame = requestAnimationFrame(this.update.bind(this));

		this.bindUiActions();
	};

	ParticleNetwork.prototype.createParticles = function(isInitial) {
		// Initialise / reset particles
		var me = this;
		this.particles = [];
		var quantity = this.canvas.width * this.canvas.height / this.options.density;

		if (isInitial) {
			var counter = 0;
			clearInterval(this.createIntervalId);
			this.createIntervalId = setInterval(function() {
				if (counter < quantity - 1) {
					// Create particle object
					this.particles.push(new Particle(this));
				}
				else {
					clearInterval(me.createIntervalId);
				}
				counter++;
			}.bind(this), 250);
		}
		else {
			// Create particle objects
			for (var i = 0; i < quantity; i++) {
				this.particles.push(new Particle(this));
			}
		}
	};

	ParticleNetwork.prototype.createInteractionParticle = function() {
		// Add interaction particle
		this.interactionParticle = new Particle(this);
		this.interactionParticle.velocity = {
			x: 0,
			y: 0
		};
		this.particles.push(this.interactionParticle);
		return this.interactionParticle;
	};

	ParticleNetwork.prototype.removeInteractionParticle = function() {
		// Find it
		var index = this.particles.indexOf(this.interactionParticle);
		if (index > -1) {
			// Remove it
			this.interactionParticle = undefined;
			this.particles.splice(index, 1);
		}
	};

	ParticleNetwork.prototype.update = function() {
		if (this.canvas) {

			this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
			this.ctx.globalAlpha = 1;

			// Draw connections
			for (var i = 0; i < this.particles.length; i++) {
				for (var j = this.particles.length - 1; j > i; j--) {
					var distance, p1 = this.particles[i], p2 = this.particles[j];

					// check very simply if the two points are even a candidate for further measurements
					distance = Math.min(Math.abs(p1.x - p2.x), Math.abs(p1.y - p2.y));
					if (distance > this.options.netLineDistance) {
						continue;
					}

					// the two points seem close enough, now let's measure precisely
					distance = Math.sqrt(
						Math.pow(p1.x - p2.x, 2) +
						Math.pow(p1.y - p2.y, 2)
					);
					if (distance > this.options.netLineDistance) {
						continue;
					}

					this.ctx.beginPath();
					this.ctx.strokeStyle = this.options.netLineColor;
					this.ctx.globalAlpha = (this.options.netLineDistance - distance) / this.options.netLineDistance * p1.opacity * p2.opacity;
					this.ctx.lineWidth = 0.7;
					this.ctx.moveTo(p1.x, p1.y);
					this.ctx.lineTo(p2.x, p2.y);
					this.ctx.stroke();
				}
			}

			// Draw particles
			for (var i = 0; i < this.particles.length; i++) {
				this.particles[i].update();
				this.particles[i].draw();
			}

			if (this.options.velocity !== 0) {
				this.animationFrame = requestAnimationFrame(this.update.bind(this));
			}

		}
		else {
			cancelAnimationFrame(this.animationFrame);
		}
	};

	ParticleNetwork.prototype.bindUiActions = function() {
		// Mouse / touch event handling
		this.spawnQuantity = 3;
		this.mouseIsDown = false;
		this.touchIsMoving = false;

		this.onMouseMove = function(e) {
			if (!this.interactionParticle) {
				this.createInteractionParticle();
			}
			this.interactionParticle.x = e.offsetX;
			this.interactionParticle.y = e.offsetY;
		}.bind(this);

		this.onTouchMove = function(e) {
			e.preventDefault();
			this.touchIsMoving = true;
			if (!this.interactionParticle) {
				this.createInteractionParticle();
			}
			this.interactionParticle.x = e.changedTouches[0].clientX;
			this.interactionParticle.y = e.changedTouches[0].clientY;
		}.bind(this);

		this.onMouseDown = function(e) {
			this.mouseIsDown = true;
			var counter = 0;
			var quantity = this.spawnQuantity;
			var intervalId = setInterval(function() {
				if (this.mouseIsDown) {
					if (counter === 1) {
						quantity = 1;
					}
					for (var i = 0; i < quantity; i++) {
						if (this.interactionParticle) {
							this.particles.push(new Particle(this, this.interactionParticle.x, this.interactionParticle.y));
						}
					}
				}
				else {
					clearInterval(intervalId);
				}
				counter++;
			}.bind(this), 50);
		}.bind(this);

		this.onTouchStart = function(e) {
			e.preventDefault();
			setTimeout(function() {
				if (!this.touchIsMoving) {
					for (var i = 0; i < this.spawnQuantity; i++) {
						this.particles.push(new Particle(this, e.changedTouches[0].clientX, e.changedTouches[0].clientY));
					}
				}
			}.bind(this), 200);
		}.bind(this);

		this.onMouseUp = function(e) {
			this.mouseIsDown = false;
		}.bind(this);

		this.onMouseOut = function(e) {
			this.removeInteractionParticle();
		}.bind(this);

		this.onTouchEnd = function(e) {
			e.preventDefault();
			this.touchIsMoving = false;
			this.removeInteractionParticle();
		}.bind(this);

		this.canvas.addEventListener('mousemove', this.onMouseMove);
		this.canvas.addEventListener('touchmove', this.onTouchMove);
		this.canvas.addEventListener('mousedown', this.onMouseDown);
		this.canvas.addEventListener('touchstart', this.onTouchStart);
		this.canvas.addEventListener('mouseup', this.onMouseUp);
		this.canvas.addEventListener('mouseout', this.onMouseOut);
		this.canvas.addEventListener('touchend', this.onTouchEnd);
	};

	ParticleNetwork.prototype.unbindUiActions = function() {
		if (this.canvas) {
			this.canvas.removeEventListener('mousemove', this.onMouseMove);
			this.canvas.removeEventListener('touchmove', this.onTouchMove);
			this.canvas.removeEventListener('mousedown', this.onMouseDown);
			this.canvas.removeEventListener('touchstart', this.onTouchStart);
			this.canvas.removeEventListener('mouseup', this.onMouseUp);
			this.canvas.removeEventListener('mouseout', this.onMouseOut);
			this.canvas.removeEventListener('touchend', this.onTouchEnd);
		}
	};

	var getLimitedRandom = function(min, max, roundToInteger) {
		var number = Math.random() * (max - min) + min;
		if (roundToInteger) {
			number = Math.round(number);
		}
		return number;
	};

	var returnRandomArrayitem = function(array) {
		return array[Math.floor(Math.random()*array.length)];
	};

pna = new ParticleNetworkAnimation();	pna.init($('.particle-network-animation')[0]);

}());