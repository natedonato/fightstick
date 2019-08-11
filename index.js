
window.addEventListener("gamepadconnected", function (e) {
    console.log("Gamepad connected at index %d: %s. %d buttons, %d axes.",
        e.gamepad.index, e.gamepad.id,
        e.gamepad.buttons.length, e.gamepad.axes.length);
});

window.addEventListener("gamepaddisconnected", function (e) {
    console.log("Gamepad disconnected from index %d: %s",
        e.gamepad.index, e.gamepad.id);
});

class Guy {
    constructor(canvaswidth, canvasheight, guyspeed) {

        this.pos = {
            x: canvaswidth / 2,
            y: canvasheight - 50
        };

        this.vel = {
            x: 0,
            y: 5,
        };

        this.width = 28;
        this.height = 42;
        this.maxspeed = guyspeed;
        this.jumps = 0;
        this.airborne = true;
        this.dead = false;
        this.wallcling = 0;
    }
}

class Rock {
    constructor(posx, posy, size, speed, variation) {
        this.pos = { x: posx, y: posy };
        this.width = size;
        this.height = size;
        this.falling = true;
        this.rockspeed = (speed - (variation / 2) + (Math.random() * variation));
    }

    static generate(minSize, maxSize, maxrockHeight, maxX, speed, variation) {
        let size = minSize + Math.random() * (maxSize - minSize);
        let x = (Math.random() * (maxX - size));
        let y = -220 - maxrockHeight;
        return new Rock(x, y, size, speed, variation);
    }
}

class GameView {
    constructor(game, ctx, canvasheight, canvaswidth) {
        this.game = game;
        this.paused = true;
        this.ctx = ctx;
        this.guy = game.guy;
        this.keys = {};
        this.canvasheight = canvasheight;
        this.canvaswidth = canvaswidth;
        this.lastUpdated = 0;
        this.water = game.water;
        this.jumpSound = new Audio('./soundfx/jump1.wav');
        this.jumpSound.volume = 0.2;
        this.jumpSound2 = new Audio('./soundfx/jump2.wav');
        this.jumpSound2.volume = 0.3;
        this.waterSound = new Audio('./soundfx/drowned.wav');
        this.crushSound = new Audio('./soundfx/crushed.wav');
        this.crushSound.volume = 0.3;
        this.colorSound = new Audio('./soundfx/colorshift.wav');
        this.colorSound.volume = 0.35;
        this.bgm = new Audio('./soundfx/Fantasies_of_Yonder.mp3');
        this.bgm.volume = 0.35;
        this.bgm.loop = true;
        this.gameEndHeight = 0;

        //for throttling key presses
        this.tooSoon = false;
        this.tooSoonMute = false;

        //color options
        this.bgcolor = '#FFA500';
        this.rockcolor = '#000000';
        this.playercolor = "#ff1919";
        this.watercolor = 'blue';
        this.colorChangeHeight = 500;

        //initial background fill
        this.colorChangeCurrent = this.colorChangeHeight;
        this.ctx.fillStyle = this.bgcolor;
        this.ctx.fillRect(0, 0, this.game.canvaswidth, this.game.canvasheight);
    }

    bindkeys() {

        let gameview = this;
        let canvas = document.getElementById("canvas");
        window.addEventListener("keydown", function (e) {
            if (e.keyCode === 37 || e.keyCode === 38 || e.keyCode === 39 || e.keyCode === 40 || e.keyCode === 13) {
                e.preventDefault();
            }
            gameview.keys[e.keyCode] = true;
        });

        window.addEventListener("keyup", function (e) {
            gameview.keys[e.keyCode] = false;
        });


        let jumpbutton = document.getElementById('jump-button');
        if (jumpbutton !== null) {
            jumpbutton.addEventListener("touchstart", (e) => {
                e.preventDefault();
                gameview.keys.jump = true;
            });


            // let joypad = document.getElementById('joypad');
            // let touchStartX;

            // joypad.addEventListener("touchstart", (e) => {   
            //     touchStartX = e.changedTouches[0].clientX;
            //     e.preventDefault();
            // });

            // joypad.addEventListener('touchmove', (e) => {
            //     let touchCurrentX = e.changedTouches[0].clientX;
            //     if (touchCurrentX < touchStartX - 10 ) {
            //         gameview.keys[39] = false;
            //         gameview.keys[37] = true;
            //     } else if (touchCurrentX > touchStartX + 10 ){
            //         gameview.keys[39] = true;
            //         gameview.keys[37] = false; 
            //     } else{
            //         gameview.keys[39] = false;
            //         gameview.keys[37] = false;     
            //     }
            // });

            // joypad.addEventListener('touchend', (e) => {
            //     e.preventDefault();
            //     gameview.keys[39] = false;
            //     gameview.keys[37] = false;
            // });



            let left = document.getElementById('left');
            let right = document.getElementById('right');

            left.addEventListener("touchstart", (e) => {
                e.preventDefault();
                gameview.keys[37] = true;
            });

            let leftx = left.getClientRects()[0].right;

            left.addEventListener('touchmove', (e) => {
                let touchCurrentL = Math.min(Object.values(e.changedTouches).map(e => e.clientX));
                if (touchCurrentL > leftx) {
                    gameview.keys[37] = false;
                }
            });

            left.addEventListener('touchend', (e) => {
                e.preventDefault();
                gameview.keys[39] = false;
                gameview.keys[37] = false;
            });

            let rightx = right.getClientRects()[0].left;

            right.addEventListener("touchstart", (e) => {
                e.preventDefault();
                gameview.keys[39] = true;
            });

            right.addEventListener('touchmove', (e) => {
                let touchCurrentR = e.changedTouches[0].clientX;
                if (touchCurrentR < rightx) {
                    gameview.keys[39] = false;
                }
            });

            right.addEventListener('touchend', (e) => {
                e.preventDefault();
                gameview.keys[39] = false;
                gameview.keys[37] = false;
            });

            const title = document.getElementById("splash");

            title.addEventListener("touchend", (e) => {
                this.closeMenu();
                this.bgm.play();
                gameview.keys[13] = true;
            });

            const menu = document.getElementById("menu");
            menu.addEventListener("touchend", (e) => {
                this.closeMenu();
                this.bgm.play();
                gameview.keys[13] = true;
            });
        }
    }

    openLeaderBoard() {
        this.leaderboard = true;
        fetchScores();
        const menu = document.getElementById("menu");
        const leaderboard = document.getElementById("leaderboard");
        const form = document.getElementsByClassName("post-form");

        for (let i = 0; i < form.length; i++) {
            form[i].style.display = "table-row";
        }

        menu.style.display = "none";
        leaderboard.style.display = "flex";
        let height = this.gameEndHeight;
        document.getElementById("currscore").innerHTML = height;
        const button = document.getElementById("submit");
        const closebutton = document.getElementById("close");
        button.addEventListener("click", (e) => {
            let name = document.getElementById("name").value;
            for (let i = 0; i < form.length; i++) {
                form[i].style.display = "none";
            }
            fetchPost(name, height);
        });
        closebutton.addEventListener("click", (e) => {
            menu.style.display = "flex";
            leaderboard.style.display = "none";
            this.leaderboard = false;
        });
    }

    openMenu() {
        this.paused = true;
        let canvas = document.getElementById("game");
        if (canvas) { canvas.style.display = "none"; }
        const menu = document.getElementById("menu");
        menu.style.display = "flex";
        const height = document.getElementById("height");
        const deathinfo = document.getElementById("death-info");
        height.innerHTML = String(this.gameEndHeight) + ' ft';
        if (this.guy.dead === "crushed") {
            deathinfo.innerHTML = "(then you were crushed by a falling block)";
        } else if (this.guy.dead === "drowned") {
            deathinfo.innerHTML = "(then you fell into the water and drowned)";
        }
    }

    closeMenu() {
        let canvas = document.getElementById("game");
        if (!canvas) { canvas = document.getElementById("mobilegame"); }
        const menu = document.getElementById("menu");
        const splash = document.getElementById("splash");
        menu.style.display = "none";
        splash.style.display = "none";
        canvas.style.display = "block";
        this.paused = false;
    }


    jump() {
        if (this.game.paused) { return; }
        if (this.guy.wallcling !== 0 && this.guy.airborne === true && this.tooSoon === false) {

            this.jumpSound2.play();
            this.tooSoon = true;

            this.guy.vel.y = -8;
            this.guy.vel.x = this.guy.wallcling * 6;
            setTimeout(() => this.tooSoon = false, 300);
        }
        else if (this.guy.jumps > 0 && this.tooSoon === false) {
            this.jumpSound.play();
            this.tooSoon = true;

            if (this.guy.jumps === 2) {
                this.guy.vel.y = -8;
            } else { this.guy.vel.y = -6; }
            this.guy.airborne = true;
            this.guy.jumps -= 2;
            setTimeout(() => this.tooSoon = false, 300);
        }
    }

    moveRight() {
        if (this.guy.vel.x < this.guy.maxspeed) {
            this.guy.vel.x += 1;
        }
    }

    moveLeft() {
        if (this.guy.vel.x > -this.guy.maxspeed) {
            this.guy.vel.x -= 1;
        }
    }

    handleKeys() {
        let gamepads = navigator.getGamepads();
        if (!gamepads[0]) {
            return;
        }
        let pad = gamepads[0];

        for (let i = 0; i <= 7; i++) {
            if (pad.buttons[i].pressed) {
                this.keys.jump = true;
                break;
            }
        }

        if (this.keys.jump) {
            this.jump();
            this.keys.jump = false;
        }

        if (this.keys[38] || this.keys[32] || this.keys[87]) {
            this.jump();
        }

        if (this.keys[39] || this.keys[68] || pad.axes[2] > 0.95) {
            this.moveRight();
        }

        if (this.keys[37] || this.keys[65] || pad.axes[2] < -0.95) {
            this.moveLeft();
        }

        if (this.keys[13] || pad.buttons[9].pressed) {
            this.reset();
            this.keys[13] = false;
        }
        if (this.keys[76] && this.paused) {
            this.openLeaderBoard();
        }

        if (this.keys[77]) {
            if (this.tooSoonMute === false) {

                this.tooSoonMute = true;
                if (this.bgm.volume === 0.35) {
                    this.bgm.volume = 0;
                    this.bgm.pause();
                }
                else {
                    (this.bgm.volume = 0.35);
                    this.bgm.play();
                }

                setTimeout(() => this.tooSoonMute = false, 300);
            }
        }
    }

    handleDeath() {
        this.gameEndHeight = Math.floor(this.game.maxHeight / 10);

        if (this.guy.dead === "drowned") {
            this.waterSound.play();
        } else if (this.guy.dead === "crushed") { this.crushSound.play(); }

        this.bgm.pause();
        this.openMenu();
    }

    reset() {
        this.guy = this.game.reset();
        this.colorChangeCurrent = this.colorChangeHeight;
        this.bgcolor = '#FFA500';
        this.closeMenu();
        this.bgm.currentTime = 0;
        this.bgm.play();
        this.paused = false;
    }


    drawGuy(offset) {
        if (!this.guy.dead) {
            this.ctx.fillStyle = this.playercolor;
            //leans guy to side with x - velocity


            this.ctx.save();
            this.ctx.translate(this.guy.pos.x + this.guy.width / 2 - this.guy.wallcling * 4, this.guy.pos.y + this.guy.height);


            if (this.guy.wallcling === 0) {
                this.ctx.rotate(this.guy.vel.x * 2 * Math.PI / 180);
            } else {
                this.ctx.rotate(this.guy.wallcling * 12 * Math.PI / 180);
            }





            let w = this.guy.width;
            let h = this.guy.height;
            if (this.guy.airborne) {
                let scale = this.guy.vel.y;
                if (scale > 6) { scale = 6; }
                h -= scale;

                if (scale > 2) { scale = 2; }
                w += scale;
            }

            this.ctx.fillRect(-w / 2, -h, w, h);
            this.ctx.restore();

            this.ctx.fillStyle = "#ffffff";
            this.ctx.textAlign = "end";
            this.ctx.font = "30px Arial";
            this.ctx.fillText(Math.floor(this.game.maxHeight / 10) + ' ft', this.canvaswidth - 10, 35 - offset);
            this.ctx.font = "10px Arial";
            this.ctx.fillText(Math.floor(this.game.currHeight / 10) + ' ft', this.canvaswidth - 10 - 2, 50 - offset);
        }
    }

    drawRocks() {
        this.game.rocks.forEach(rock => {
            this.ctx.fillStyle = this.rockcolor;
            this.ctx.fillRect(rock.pos.x, rock.pos.y, rock.width, rock.height + 1);
            this.ctx.fillStyle = this.bgcolor;
            this.ctx.beginPath();
            this.ctx.arc(rock.pos.x + (rock.width / 2), rock.pos.y + (rock.width / 2), rock.width / 2 * 0.7, 0, 2 * Math.PI);
            this.ctx.fill();
        }
        );
    }

    drawWater() {
        this.ctx.globalAlpha = 0.5;
        this.ctx.fillStyle = this.watercolor;
        this.ctx.fillRect(this.water.x, this.water.y, this.water.w, this.water.h);
        this.ctx.globalAlpha = 1.0;
    }

    draw() {



        if (this.game.maxHeight > this.colorChangeCurrent) {
            this.colorSound.play();
            this.colorChangeCurrent += this.colorChangeHeight;
            let hue = Math.random() * 290 + 20;
            this.bgcolor = 'hsl(' + hue + ',100%, 50%)';
            this.rockcolor === 'white' ? this.rockcolor = 'black' : this.rockcolor = 'white';
        }

        //moves "camera" with current player
        this.ctx.save();
        let offset = this.game.currHeight - 190;
        this.ctx.translate(0, offset);

        //clears and fills background
        this.ctx.clearRect(0, 0 - offset, this.canvaswidth, this.canvasheight);
        this.ctx.fillStyle = this.bgcolor;
        this.ctx.fillRect(0, 0 - offset, this.canvaswidth, this.canvasheight);


        this.drawRocks();
        this.drawWater();
        this.drawGuy(offset);


        //adds floor
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, this.canvasheight, this.canvaswidth * 2 / 3, 500);
        this.ctx.fillRect(this.canvaswidth * 2 / 3 + 5, this.canvasheight, this.canvaswidth * 1 / 3, 500);

        this.ctx.restore();
    }

    start() {
        this.bindkeys();
        this.update(0);
    }


    update(timestamp) {
        const dt = (timestamp - this.lastUpdated) / 10;
        if (this.leaderboard !== true) {
            this.handleKeys();
        }
        if (this.paused !== true) {
            this.game.step(timestamp, dt);
            if (this.guy.dead) {
                this.handleDeath();
            }
            this.draw();
        }
        this.lastUpdated = timestamp;
        requestAnimationFrame(this.update.bind(this));
    }
}

class Game {
    constructor(canvasheight, canvaswidth) {

        //player options can be set here
        this.guyspeed = 10;
        this.friction = 0.85;
        this.gravity = 0.3;
        this.guy = new Guy(canvasheight, canvaswidth, this.guyspeed);

        //rock related options can be set here
        this.minSize = 80;
        this.maxSize = 180;
        this.maxX = canvaswidth;
        this.rockInterval = 1000;
        this.lastRock = this.rockInterval * 2;
        this.rockAvgSpeed = 2;
        this.rockSpeedVariation = 0.5;

        //water related options can be set here
        this.water = {
            x: 0,
            y: canvasheight + 600,
            w: canvaswidth,
            h: canvasheight + 600,
            speed: 0.62
        };

        //canvas & height related variables
        this.canvasheight = canvasheight;
        this.canvaswidth = canvaswidth;
        this.maxrockheight = 0;
        this.currHeight = 0;
        this.maxHeight = 0;

        this.rocks = [];
    }

    reset() {
        this.rocks = [];
        this.maxrockheight = 0;
        this.currHeight = 190;
        this.maxHeight = 0;
        this.lastRock = 0;
        this.guy = new Guy(this.canvasheight, this.canvaswidth, this.guyspeed);
        this.water.y = this.canvasheight + 500;
        return this.guy;
    }


    addRock(rock) {
        this.rocks.push(rock);
    }

    rockGenerator(timestamp) {
        let rockGenerateHeight = this.maxrockheight;
        if (this.maxHeight + this.canvasheight > this.maxrockheight) {
            rockGenerateHeight = this.maxHeight + this.canvasheight;
        }

        //makes less rocks if just starting
        if (Math.floor(this.maxHeight / 10) < 100) {
            if (timestamp - this.lastRock > this.rockInterval * 2) {
                this.lastRock = timestamp - this.rockInterval / 8 + Math.random() * this.rockInterval / 4;
                this.addRock(Rock.generate(this.minSize, this.maxSize, rockGenerateHeight, this.maxX, this.rockAvgSpeed * 3 / 4, this.rockSpeedVariation));
            }

        } else if (timestamp - this.lastRock > this.rockInterval) {
            this.lastRock = timestamp - this.rockInterval / 8 + Math.random() * this.rockInterval / 4;
            this.addRock(Rock.generate(this.minSize, this.maxSize, rockGenerateHeight, this.maxX, this.rockAvgSpeed, this.rockSpeedVariation));
        }
    }

    checkRockCollision(rock1, rock2) {
        if (rock1.pos.x < rock2.pos.x + rock2.width &&
            rock2.pos.x < rock1.pos.x + rock1.width &&
            rock1.pos.y < rock2.pos.y + rock2.height &&
            rock2.pos.y < rock1.pos.y + rock1.height
        ) {
            //collision has occured if we get here
            if (!rock1.falling || !rock2.falling) {
                rock1.falling = false;
                rock2.falling = false;
                //pushes rock generator upwards with height of rock if it lands
                if (this.canvasheight - rock1.pos.y > this.maxrockheight) {
                    this.maxrockheight = this.canvasheight - rock1.pos.y;
                }
            } else {
                let lowerSpeed = Math.min(rock1.rockspeed, rock2.rockspeed);
                rock1.rockspeed = lowerSpeed;
                rock2.rockspeed = lowerSpeed;
            }
        }
    }

    checkPlayerCollision(rock) {
        let collisionSide = "none";
        let vectorx = (this.guy.pos.x + (this.guy.width / 2)) - (rock.pos.x + (rock.width / 2));
        let vectory = (this.guy.pos.y + (this.guy.height / 2)) - (rock.pos.y + (rock.height / 2));
        let avectorx = Math.abs(vectorx);
        let avectory = Math.abs(vectory);
        //can't be closer than half of each width
        let minwidth = (this.guy.width / 2) + (rock.width / 2);
        let minheight = (this.guy.height / 2) + (rock.height / 2);


        if (avectorx < minwidth && avectory < minheight) {
            let offsetx = minwidth - avectorx;
            let offsety = minheight - avectory;
            let xcollisiontime;
            let ycollisiontime;
            //calculates whether we hit the side first or the top or bottom first
            xcollisiontime = Math.abs((offsetx / this.guy.vel.x));
            ycollisiontime = Math.abs((offsety / this.guy.vel.y));
            if (ycollisiontime < xcollisiontime || (this.guy.vel.y === 0 && this.guy.airborne === false)) {
                if (vectory <= 0) {

                    //let him coast on top of falling rock and reset jumps
                    collisionSide = "top";
                    this.guy.pos.y -= offsety;
                    if (rock.falling) {
                        this.guy.vel.y = rock.rockspeed;
                    }
                    else {
                        this.guy.vel.y = 1;
                    }
                    this.guy.airborne = false;
                    this.guy.jumps = 2;
                }

                else {
                    collisionSide = "bottom";

                    if (!this.guy.airborne && rock.falling) {
                        this.guy.dead = "crushed";
                    }
                    if (this.guy.pos.y + offsety >= this.canvasheight - this.guy.height) { this.guy.pos.y = this.canvasheight - this.guy.height; }
                    else {
                        this.guy.pos.y += offsety;
                        this.guy.vel.y = rock.rockspeed;
                    }
                }
            }
            else {
                if (vectorx > 0) {
                    collisionSide = "right";
                    this.guy.pos.x += offsetx;
                    this.guy.wallcling = 1;
                }
                else {
                    collisionSide = "left";
                    this.guy.pos.x -= offsetx;
                    this.guy.wallcling = -1;
                }
            }
        }
        return collisionSide;
    }

    checkWaterCollision() {
        if (this.guy.pos.y + this.guy.height > this.water.y) {
            this.guy.dead = "drowned";
        }
    }

    updateWaterPos(dt) {
        if (Math.floor(this.maxHeight / 10) < 150) {
            this.water.y -= this.water.speed * dt / 2;
        } else {
            this.water.y -= this.water.speed * dt;
            if (this.water.y - this.guy.pos.y > 700) {
                this.water.y -= this.water.speed * dt / 2;
            }
            if (this.water.y - this.maxrockheight > 1000) { this.water.y -= this.water.speed * dt; }
        }
        this.checkWaterCollision();
    }

    updateRockPos(dt) {
        this.rocks.forEach(rock => {
            if (rock.falling) {
                rock.pos.y += rock.rockspeed * dt;
                if (rock.pos.y + rock.height >= this.canvasheight) {
                    rock.pos.y = this.canvasheight - rock.height;
                    rock.falling = false;
                }
                this.rocks.forEach(rock2 => {
                    if (rock2 !== rock)
                        this.checkRockCollision(rock, rock2);
                });
            }
            this.checkPlayerCollision(rock);
        });
    }


    updateGuyPos(dt) {
        //applies friction and gravity to guys velocities
        this.guy.vel.x *= this.friction;
        this.guy.vel.y += this.gravity;

        if (this.guy.wallcling !== 0 && this.guy.vel.y > 0) {
            this.guy.vel.y -= this.gravity * 2 / 3;
        }

        if (this.guy.vel.y > this.gravity + 1) {
            this.guy.airborne = true;
            this.guy.jumps = 0;
        }

        //screen wraparound for guy
        if (this.guy.pos.x > this.canvaswidth - this.guy.width / 2) { this.guy.pos.x = -4; }
        else if (this.guy.pos.x < -this.guy.width / 2) { this.guy.pos.x = this.canvaswidth - this.guy.width / 2 - 2; }

        //updates dudes position using velocity over time
        this.guy.pos.x += this.guy.vel.x * dt;
        this.guy.pos.y += this.guy.vel.y * dt;

        //allows guy to jump off ground, could be removed after refactor ground code
        if (this.guy.pos.y >= this.canvasheight - this.guy.height) {
            this.guy.pos.y = this.canvasheight - this.guy.height;
            this.guy.jumps = 2;
            this.guy.airborne = false;
            this.guy.vel.y = 1;
        }

        //keeps track of current height and max height
        // & pushes rock generator upwards if this.guy is hella high up
        this.currHeight = (500 - this.guy.pos.y - this.guy.height);
        if (this.currHeight > this.maxHeight) { this.maxHeight = this.currHeight; }
        this.guy.wallcling = 0;
    }


    updatePos(dt) {
        //avoids the curse of the NaN on initial render
        if (isNaN(dt)) {
            dt = 1;
        }
        this.updateGuyPos(dt);
        this.updateRockPos(dt);
        this.updateWaterPos(dt);
    }

    step(timestamp, dt) {
        this.rockGenerator(timestamp);
        this.updatePos(dt);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    
    const canvas = document.getElementById("game");
    if(canvas !== null){
        canvas.width = 640;
        canvas.height = 500;
        ctx = canvas.getContext("2d");

        const game = new Game(canvas.height, canvas.width);
        const gameView = new GameView(game, ctx, canvas.height, canvas.width).start();
    }else{
        const canvas = document.getElementById("mobilegame");
        canvas.width = 640;
        canvas.height = 700;
        ctx = canvas.getContext("2d");
        
        const game = new Game(canvas.height, canvas.width);
        const gameView = new GameView(game, ctx, canvas.height, canvas.width).start();
    }
});