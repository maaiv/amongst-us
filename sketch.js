// 3D Amongst Us
// Johnson Ji
// March 19th, 2023
//
// Controls: 
// [WASD] to move
// [SPACE] to jump
// [1] to equip nothing
// [2] to equip lamp
// [3] to equip knife
// [MOUSE] to look around (click the screen to lock the pointer) 
// [CLICK] to kill other players when holding knife
// [P] to enter debug mode
// [UP and DOWN ARROWS] to change the world lighting
//
// Notes:
// - Multiplayer only supports up to 5 players due to WEBGL limitations in rendering spotlights
//
// Extra for Experts:
// - 3D rendering with specular lighting and adaptive ambient colouring
// - Custom 3D player models drawn in WEBGL
// - Normal angle calculator for flexible 2D collisions with (almost) any shape
// - Incorporated height and y position elements with p5.collide2D to create pseudo 3D collisions
// - Multiplayer interactivity through p5.party


// Instantiating variables
let camYaw = 0; //x
let camPitch = 0; //y
let camDistance = 300;
let lightpos = [];

let my, guests, shared, killSFX, cam, collideVisualCanvas, mrGuest, canvas3D;


// Create environment objects
let hostTerrain = [
  {type: "box", x: 0, y: 50, z: 0, width: 100*100, height: 100, length: 100*100, rotation: 0},
  {type: "box", x: 200, y: 0, z: 0, width: 100, height: 100, length: 100, rotation: 0},
  {type: "box", x: 200, y: -150, z: 200, width: 100, height: 100, length: 100, rotation: 0},
  // {type: "polygon", x: -200, y: 20, z: 300, relativeVertices: [[0,0],[0,200],[100,200],[100,-100], [-200,-100], [-200,200],[-100,200], [-100,0]], height: 100, rotation: 0},
  // {type: "polygon", x: -400, y: 20, z: 0, relativeVertices: [[0,0],[0,200],[100,100],[100,0],[-300,-100]], height: 100, rotation: -10}
];


// Connect to the server and shared data, and load sounds
function preload() {
  partyConnect("wss://demoserver.p5party.org", "among");
  mrGuest = loadImage("photo.jpg");
  my = partyLoadMyShared();
  guests = partyLoadGuestShareds();
  shared = partyLoadShared("shared", {
    ambientLevel: 100, 
    debugState: false, 
    terrain: hostTerrain, 
    lightSize: 10,
    playerAcceleration: 1,
    playerDeceleration: 0.9,
    playerMaxVelocity: 6,
    playerJumpPower: 5,
    worldGravity: 0.15,
    playerPerspective: 3,
    chat: [
      {content: "Frosty the snowman was a fairy tale they say he was made of snow but the children know how he came to life one day", life: 10},
      {content: "Frosty the snowman was a jolly happy soul", life: 10}, 
      {content: "with a corn cob pipe and a button nose", life: 10},
      {content: "and two eyes made out of coal", life: 10},
      {content: "Frosty the snowman was a fairy tale they say he was made of snow but the children know how he came to life one day", life: 10},
      
    ]
  });

  killSFX = loadSound("assets/killSFX.mp3");
  partySubscribe("die", die);
}

// Set sketch modes, canvas, and subscribe to die message
function setup() {
  // noLoop();
  createCanvas(windowWidth, windowHeight);
  canvas3D = createGraphics(windowWidth,windowHeight, WEBGL);
  angleMode(DEGREES);

  canvas3D.colorMode(HSB, 255);
  
  cam = canvas3D.createCamera();

  // instantiate player object and hitbox visual
  my.player = new Crewmate(0,0,0,0,0);
  
  collideVisualCanvas = createGraphics(180,180);
  collideVisualCanvas.angleMode(DEGREES);

  canvas3D.angleMode(DEGREES);


  // log shared data
  console.log("me", JSON.stringify(my));
  console.log("guests", JSON.stringify(guests));
  console.log("am i host?", partyIsHost());
  // noLoop();

} 

// Game update loop
function draw() {

  drawInit();

  collideVisual();
  
  updateMyPlayer();

  updateCam();

  createLights();

  drawPlayers();

  updateEnvironment();
  
  drawEnvironment();
  // background(255);
  image(canvas3D,0,0,width,height);

  updateUI();

}

// Set background and lock pointer light
function drawInit() {
  canvas3D.reset();
  canvas3D.background(0);
  
  // create a global light so WEBGL doesn't just break when there are no lights
  canvas3D.pointLight(
    0,0,shared.ambientLevel,
    0,-1900,0
  );
  canvas3D.ambientLight(shared.ambientLevel/2);

  if (mouseIsPressed) {
    requestPointerLock();
  }
}



// Creates a visualizer for the different hitboxes and colliders above the player if in debug mode
function collideVisual() {
  if (shared.debugState) {
    
    collideVisualCanvas.background(255);
    // draw environment hitboxes
    for (let terrainObject of shared.terrain) {
      collideVisualCanvas.push();
      if (terrainObject.type === "box") {
        let boxMiniX = (terrainObject.x - terrainObject.width/2)/10 + 90;
        let boxMiniZ = (terrainObject.z - terrainObject.length/2)/10 + 90;
        collideVisualCanvas.translate(boxMiniX, boxMiniZ);
        collideVisualCanvas.rotate(terrainObject.rotation);
        collideVisualCanvas.rect(0, 0, terrainObject.width/10, terrainObject.length/10);
      }
      else if (terrainObject.type === "cylinder") {
        let cylinderMiniX = terrainObject.x/10 + 90;
        let cylinderMiniZ = terrainObject.z/10 + 90;
        collideVisualCanvas.circle(cylinderMiniX,cylinderMiniZ,terrainObject.radius/5);
      }
      else if (terrainObject.type === "polygon") {
        collideVisualCanvas.fill("red");
        let polyMiniX = terrainObject.x/10 + 90;
        let polyMiniZ = terrainObject.z/10 + 90;
        collideVisualCanvas.translate(polyMiniX, polyMiniZ);
        collideVisualCanvas.rotate(terrainObject.rotation);
        collideVisualCanvas.beginShape();
        
        for (let vert of terrainObject.relativeVertices) {
          collideVisualCanvas.vertex(vert[0]/10, vert[1]/10);
        }
        collideVisualCanvas.endShape(CLOSE);

      }
      collideVisualCanvas.pop();
    }

    // draw character hitboxes
    for (let guest of guests) {
      collideVisualCanvas.circle(guest.player.x/10 + 90,guest.player.z/10 + 90, 6);
      collideVisualCanvas.circle(guest.player.x/10 + 90 + sin(guest.player.dir) * 3, guest.player.z/10 + 90 + cos(guest.player.dir) * 3, 2);
    }

    //draw visualizer above the player model
    canvas3D.push();
    canvas3D.translate(my.player.x - 50,my.player.y-65 - 100,my.player.z);
    canvas3D.image(collideVisualCanvas,0,0,100,100);
    canvas3D.pop();
  }
}

// Update local player
function updateMyPlayer() {
  my.player.update();
}

// Move camera
function updateCam() {
  if (shared.playerPerspective === 3) {
    cam.setPosition(
      my.player.x + cos(camYaw) * camDistance * cos(camPitch),
      my.player.y - 60 + sin(camPitch) * camDistance,
      my.player.z + sin(camYaw) * camDistance * cos(camPitch),
    );
    camYaw += movedX/10;
    camPitch -= movedY/10;

    // prevent camera inversion
    if (camPitch > 89) {
      camPitch = 89;
    }
    else if (camPitch < -89) {
      camPitch = -89;
    }
  
    cam.lookAt(my.player.x,my.player.y - 60,my.player.z);
  }
  else if (shared.playerPerspective === 1) {
    cam.setPosition(
      my.player.x + cos(camYaw) * cos(camPitch),
      my.player.y - 60 + sin(camPitch),
      my.player.z + sin(camYaw) * cos(camPitch),
    );
    camYaw += movedX/10;
    camPitch -= movedY/10;

    cam.lookAt(my.player.x,my.player.y - 60,my.player.z);
  }
}




// Create and store xy coordinate of each player light
function createLights() {
  lightpos = [];

  for (let guest of guests) {
    if (guest.player.hold === 1) {
      canvas3D.spotLight(
        0,0,255,
        guest.player.x,guest.player.y - 400,guest.player.z,
        0,1,0,
        85,40/shared.lightSize
      );
      lightpos.push([guest.player.x,guest.player.z]);
    }
  }
}

// Calculate ambient lighting and draw player models
function drawPlayers() {
  for (let guest of guests) {
    if (guest.player !== my.player || shared.playerPerspective === 3) {
      canvas3D.push();
      // calculate ambient lighting depending on the closest distance to another light before rendering
      let minimumDistance = min(lightpos.map(v => dist(guest.player.x,guest.player.z,v[0], v[1])));
      canvas3D.ambientLight(map(minimumDistance,0,125 + 50*shared.lightSize,105,5,true));
      drawCrewMateModel(guest.player.x,guest.player.y,guest.player.z,guest.player.dir,guest.player.h,guest.player.hold,guest.player.alive);
      canvas3D.pop();
    }
  }

  // draw demo player model if in debug mode
  if (shared.debugState) {
    canvas3D.push();
    let minimumDistance = min(lightpos.map(v => dist(0, 0, v[0], v[1])));
    canvas3D.ambientLight(map(minimumDistance, 0, 125 + 50 * shared.lightSize, 105, 5, true));
    drawCrewMateModel(0,0,0,0,180,2,false);
    canvas3D.pop();
  }
}

// Draw player model
function drawCrewMateModel(x,y,z,dir,h,hold,alive) {
  
  canvas3D.push();
  
  
  // inititalize materials and position
  canvas3D.noStroke();
  canvas3D.specularMaterial(25);
  canvas3D.shininess(10000);
  canvas3D.ambientMaterial(h, 255, 255);
  canvas3D.translate(x,y-36,z);
  canvas3D.rotateY(dir);

  if (alive) {
    // draw main body

    canvas3D.ellipsoid(25,30,20);
    
    // draw helmet
    canvas3D.push();
    canvas3D.specularMaterial(300);
    canvas3D.shininess(20);
    canvas3D.ambientMaterial(0,0,0);

    canvas3D.translate(0,-10,14);
    canvas3D.ellipsoid(15,10,13);
    canvas3D.pop();

    // draw legs
    canvas3D.push();
    canvas3D.translate(12,18,0);
    canvas3D.ellipsoid(8,18,8);
    canvas3D.translate(-24,0,0);
    canvas3D.ellipsoid(8,18,8);
    canvas3D.pop();
    // draw oxygen tank
    canvas3D.push();
    canvas3D.translate(0,0,-18);
    canvas3D.box(24,35,8);
    canvas3D.pop();

    if (hold === 2) {
      // draw knife
      canvas3D.push();
      canvas3D.ambientMaterial(0,120,255);
      canvas3D.translate(16,8,15);
      canvas3D.rotateY(-90);

      canvas3D.box(20,6,2);
      canvas3D.translate(22,0,0);
      canvas3D.rotateZ(-90);

      canvas3D.ambientMaterial(0,120,60);
      canvas3D.scale(1,1,0.3);
      canvas3D.cone(8,30,5,0);
      canvas3D.pop();
    }
  
  }
  else {
    // draw main body
    canvas3D.push();
    canvas3D.translate(0,15,0);
    canvas3D.ellipsoid(20,15,15);
    canvas3D.scale(1, 1, 0.75);
    canvas3D.translate(0,-9,0);
    canvas3D.cylinder(20,16);
    canvas3D.pop();

    canvas3D.push();
    canvas3D.translate(12,18,0);
    canvas3D.ellipsoid(8,18,8);
    canvas3D.translate(-24,0,0);
    canvas3D.ellipsoid(8,18,8);
    canvas3D.pop();

    // draw bone sticking out
    canvas3D.push();
    canvas3D.specularMaterial(30000);
    canvas3D.shininess(100);
    canvas3D.ambientMaterial(0,0,255);
    canvas3D.translate(0,-5,0);
    canvas3D.cylinder(4,20);

    canvas3D.translate(3,-9,0);
    canvas3D.sphere(5);
    canvas3D.translate(-6,0,0);
    canvas3D.sphere(5);
    canvas3D.pop();

    // draw oxygen tank
    canvas3D.push();
    canvas3D.translate(0,8,-14);
    canvas3D.box(24,20,10);
    canvas3D.pop();
  }
  canvas3D.pop();
  
}

function updateEnvironment() {
  for (let terrainObject of shared.terrain) {
    if (terrainObject.type === "polygon") {
      // terrainObject.x += 0.5;
    }
    
  }
}

// Draw terrain
function drawEnvironment() {

  for (let terrainObject of shared.terrain) {
    canvas3D.push();

    if (!shared.debugState) {
      canvas3D.noStroke();
    }

    canvas3D.translate(terrainObject.x,terrainObject.y,terrainObject.z);
    if (terrainObject.type === "box") {
      canvas3D.rotateY(terrainObject.rotation);
      canvas3D.box(terrainObject.width,terrainObject.height,terrainObject.length);
    }
    else if (terrainObject.type === "cylinder") {
      canvas3D.cylinder(terrainObject.radius,terrainObject.height);
    }
    else if (terrainObject.type === "polygon") {

      let verts = terrainObject.relativeVertices;

      canvas3D.sphere(15);
      canvas3D.rotateY(-terrainObject.rotation);

      canvas3D.beginShape();
      
      canvas3D.normal(0,1,0);
      for (let vert of verts) {
        canvas3D.vertex(vert[0], 0, vert[1]);
      }
      canvas3D.endShape(CLOSE);


      canvas3D.beginShape();
      canvas3D.normal(0,-1,0);
      for (let vert of verts) {
        canvas3D.vertex(vert[0], -terrainObject.height, vert[1]);
      }
      canvas3D.endShape(CLOSE);


      

      for (let i = 0; i < verts.length; i++) {
        let j = (i + 1) % verts.length;

        canvas3D.beginShape();

        let planeNormal = new p5.Vector(
          verts[j][0] - verts[i][0],
          verts[j][1] - verts[i][1]
        ).rotate(90);

        canvas3D.normal(planeNormal.x, 0, planeNormal.y);
        
        // normal(-(verts[j][0] - verts[i][0]) / (verts[j][1] - verts[i][1]), 0, 1);
        canvas3D.vertex(verts[i][0], 0, verts[i][1]);
        canvas3D.vertex(verts[j][0], 0, verts[j][1]);
        canvas3D.vertex(verts[j][0], -terrainObject.height, verts[j][1]);
        canvas3D.vertex(verts[i][0], -terrainObject.height, verts[i][1]);
        canvas3D.endShape(FILL);
      } 

    }
    canvas3D.pop();
  }

  // create axes if in debug mode
  if (shared.debugState) {
    canvas3D.push();
    canvas3D.stroke("red"); // x
    canvas3D.line(-900,0,0,900,0,0);
    canvas3D.stroke("blue"); // y
    canvas3D.line(0,-900,0,0,900,0);
    canvas3D.stroke("yellow"); // z
    canvas3D.line(0,0,-900,0,0,900);
    canvas3D.pop();
  }
}

function updateUI() {
  push();
  strokeWeight(4);
  textSize(14);
  fill("white");
  stroke("black");
  translate(width - 350, height - 20);

  for (let i = shared.chat.length - 1; i >= 0; i--) {
    let messages = shared.chat;

    let lines = round(textWidth(messages[i].content) / 250);
    console.log(lines);
    translate(0,-lines * 18 - 6);
    text(messages[i].content,0, 0, 300);
    
  }
  pop(); 
}

function drawUI() {

}

// Check if a player is intersecting with the terrain
function checkCollisions(playerX,playerY,playerZ,terrainObject) {
  if (terrainObject.type === "box") {
    if (collideRectCircle(
      terrainObject.x - terrainObject.width/2, 
      terrainObject.z - terrainObject.length/2,
      terrainObject.width,
      terrainObject.length,
      playerX,
      playerZ,
      60
    )) {
      return playerY > terrainObject.y - terrainObject.height/2 && playerY - 65 < terrainObject.y + terrainObject.height/2;
    }
  }

  else if (terrainObject.type === "polygon") {
    if (collideCirclePoly(
      playerX - terrainObject.x,
      playerZ - terrainObject.z,
      60,
      terrainObject.relativeVertices.map( verts => createVector( angleShift( verts[0], verts[1], terrainObject.rotation).x,  angleShift( verts[0], verts[1], terrainObject.rotation).y)),
      true
    )) {
      return playerY > terrainObject.y - terrainObject.height && playerY - 65 < terrainObject.y;
    }
  }

  else if (terrainObject.type === "cylinder") {
    if (collideCircleCircle(
      terrainObject.x,
      terrainObject.z,
      terrainObject.radius * 2,
      playerX,
      playerZ,
      60
    )) {
      return playerY > terrainObject.y - terrainObject.height/2 && playerY - 65 < terrainObject.y + terrainObject.height/2;
    }
  }
  return false;
}

function normalCollide(x, z, dir, terrainObject) {
  // set collide type
  if (terrainObject.type === "box") {
    return collideRectCircle(
      terrainObject.x - terrainObject.width/2,
      terrainObject.z - terrainObject.length/2,
      terrainObject.width,  
      terrainObject.length,
      x + sin(dir) * 30,
      z + cos(dir) * 30,
      60
    );
  }
  else if (terrainObject.type === "polygon") {
    // let polyVectors = terrainObject.relativeVertices.forEach( verts => createVector(verts[0], verts[1]) );
    return collideCirclePoly(
      x - terrainObject.x + sin(dir) * 30,
      z - terrainObject.z + cos(dir) * 30,
      60,
      terrainObject.relativeVertices.map( verts => createVector( angleShift( verts[0], verts[1], terrainObject.rotation).x,  angleShift( verts[0], verts[1], terrainObject.rotation).y)),
      true
    );
  }
  else if (terrainObject.type === "cylinder") {
    return collideCircleCircle(
      x + sin(dir) * 30,
      z + cos(dir) * 30,
      60,
      terrainObject.x, 
      terrainObject.z,
      terrainObject.radius * 2
    );
  }
}

// Calculate the normal angle between the player and the collided object
function findNormal(playerX,playerY,playerZ,playerDir,terrainObject) {

  let tempDir = playerDir;
  let dir1;
  let dir2;
  if (normalCollide(playerX,playerZ,tempDir,terrainObject)) {
    // find right-most point
    Loop:
    for (let i = 0; i <= 360; i++) {
      tempDir += 1;
      let notCollided = true;
      for (let thisObject of shared.terrain) {
        if (playerY > thisObject.y - thisObject.height/2 && playerY - 65 < thisObject.y + thisObject.height/2) {
          notCollided = notCollided * !normalCollide(playerX,playerZ,tempDir,thisObject);
        }
      }
      if (notCollided) {
        break Loop;
      }
    }

    dir1 = tempDir;
    // find left-most point
    tempDir = playerDir;
    Loop:
    for (let i = 0; i <= 360; i++) {
      tempDir -= 1; 
      let notCollided = true;
      for (let thisObject of shared.terrain) {
        if (playerY > thisObject.y - thisObject.height/2 && playerY - 65 < thisObject.y + thisObject.height/2) {
          notCollided = notCollided * !normalCollide(playerX,playerZ,tempDir,thisObject);
        }
      }
      if (notCollided) {
        break Loop;
      }
    }
    dir2 = tempDir;
  }

  else {
    // find right-most point
    Loop:
    for (let i = 0; i <= 360; i++) {
      tempDir += 1;
      let notCollided = true;
      for (let thisObject of shared.terrain) {
        if (playerY > thisObject.y - thisObject.height/2 && playerY - 65 < thisObject.y + thisObject.height/2) {
          notCollided = notCollided * !normalCollide(playerX,playerZ,tempDir,thisObject);
        }
      }
      if (! notCollided) {
        break Loop;
      }
    }

    dir1 = tempDir;
    // find left-most point
    tempDir = playerDir;
    Loop:
    for (let i = 0; i <= 360; i++) {
      tempDir -= 1;
      let notCollided = true;
      for (let thisObject of shared.terrain) {
        if (playerY > thisObject.y - thisObject.height/2 && playerY - 65 < thisObject.y + thisObject.height/2) {
          notCollided = notCollided * !normalCollide(playerX,playerZ,tempDir,thisObject);
        }
      }
      if (! notCollided) {
        break Loop;
      }
    }

    dir2 = tempDir + 360;
  }

  return round((dir1 + dir2)/2,2);  
}



// Update player if killed
function die(data) {
  if (data.id === my.player.id) {
    killSFX.play();
    my.player.alive = false;
    my.player.dx = data.dx;
    my.player.dy = data.dy;
    my.player.dz = data.dz;
    my.player.hold = 0;
  }
}

// Toggle debug mode
function keyPressed() {
  if (keyCode === 80) {
    shared.debugState = !shared.debugState;
  } 
}

function angleShift(x, y, dt) {
  let theta = atan2(y,x) + dt;
  let localMag = Math.sqrt(x * x + y * y);
  return {x:cos(theta) * localMag, y:sin(theta) * localMag};

}

// Crewmate class for holding data and taking user input
class Crewmate {
  constructor(x, y, z, dir, h) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.dir = dir;
    this.dx = 0;
    this.dy = 0;
    this.dz = 0;
    this.h = random(255);
    this.hold = 1;
    this.alive = true;
    this.id = noise(random(1,10));

  }

  update() {
    // player state if alive
    if (this.alive) {

      // select item
      if (keyIsDown(49)) {
        this.hold = 0;
      }
      else if (keyIsDown(50)) {
        this.hold = 1;
      }
      else if (keyIsDown(51)) {
        this.hold = 2;
      }

      // use knife
      if (this.hold === 2) {
        for (let guest of guests) {
          if (guest.player !== my.player && mouseIsPressed && !killSFX.isPlaying()) {
            if (dist(guest.player.x,guest.player.y,guest.player.z,my.player.x,my.player.y,my.player.z) < 300) {
              killSFX.play();
              let tempDir = atan2(my.player.x - guest.player.x, my.player.z - guest.player.z);
              partyEmit("die", {
                id: guest.player.id,
                dx: sin(tempDir) * -5,
                dy: -4,
                dz: cos(tempDir) * -5
              });
            }
          }
        }
      }

      // apply x velocity and check collisions
      this.x += this.dx;
      this.z += this.dz;
      
      for (let terrainObject of shared.terrain) {
        if (checkCollisions(this.x, this.y, this.z, terrainObject)) {
          let n = findNormal(this.x, this.y, this.z, this.dir, terrainObject);
          while (checkCollisions(this.x, this.y, this.z,terrainObject)) {
            this.x -= sin(n)/10;
            this.z -= cos(n)/10;
          }
          
        }
      }


      // point in direction of motion
      if (shared.playerPerspective === 3) {
        this.dir = atan2(this.dx,this.dz);
      }
      else if (shared.playerPerspective === 1) {
        this.dir = -camYaw - 90;
      }

      // apply y velocity and check collisions
      this.y += this.dy;

      let touchingGround = false;

      for (let terrainObject of shared.terrain) {
        if (checkCollisions(this.x, this.y, this.z, terrainObject)) {
          if (this.dy >= 0) {
            while (checkCollisions(this.x, this.y, this.z, terrainObject)) {
              this.y -= 0.1;
            }
            this.dy = 0;
            if (keyIsDown(32)) {
              this.dy = -shared.playerJumpPower;
            }
            
          }
          else if (this.dy < 0) {
            while (checkCollisions(this.x, this.y, this.z, terrainObject)) {
              this.y += 0.1;
            }
            this.dy = 0;
          }
          touchingGround = true;
        } 
      }

      // apply gravity
      if (!touchingGround) {
        this.dy += shared.worldGravity;
      }

      // detect keyboard input
      if (keyIsDown(83) + keyIsDown(87) === 1 || keyIsDown(65) + keyIsDown(68) === 1) {

        // perform math stuff to condense movement controls into a "single line" (this was a terrible idea)
        let magnitude = !keyIsDown(83) * 2 - 1;
        let dir = 
        (keyIsDown(68) * 0 + 
        keyIsDown(87) * 90 +
        keyIsDown(65) * 180 + 
        keyIsDown(83) * 90) / 
        (keyIsDown(68) + 
        keyIsDown(87) + 
        keyIsDown(65) + 
        keyIsDown(83)) * magnitude;

        // accelerate player
        this.dx -= shared.playerAcceleration * sin(dir - camYaw);
        this.dz -= shared.playerAcceleration * cos(dir - camYaw);

        // cap player velocity
        if (Math.sqrt(this.dx**2 + this.dz**2) > shared.playerMaxVelocity) {
          let ratio = shared.playerMaxVelocity/Math.sqrt(this.dx**2 + this.dz**2);
          this.dx = lerp(0,this.dx,ratio);
          this.dz = lerp(0,this.dz,ratio);
        }
      }
      else {
        // decelerate player
        this.dx = this.dx * shared.playerDeceleration;
        this.dz = this.dz * shared.playerDeceleration;
      }
      
      // change world ambient level
      shared.ambientLevel += keyIsDown(UP_ARROW) - keyIsDown(DOWN_ARROW);
    }

    // player state if not alive
    else {

      // apply x velocity and check collisions
      this.x += this.dx;
      this.z += this.dz;

      for (let terrainObject of shared.terrain) {
        if (checkCollisions(this.x, this.y, this.z, terrainObject)) {
          let n = findNormal(this.x, this.y, this.z, this.dir, terrainObject);
          while (checkCollisions(this.x, this.y, this.z,terrainObject)) {
            this.x -= sin(n);
            this.z -= cos(n);
          }
          let mag = sqrt(this.dx * this.dx + this.dz * this.dz);
          this.dx = mag * -sin(n);
          this.dz = mag * -cos(n);
        }
      }


      // apply y velocity and check collisions
      this.y += this.dy;
      let touchingGround = false;
      
      for (let terrainObject of shared.terrain) {
        if (checkCollisions(this.x, this.y, this.z, terrainObject)) {
          if (this.dy >= 0) {
            while (checkCollisions(this.x, this.y, this.z, terrainObject)) {
              this.y -= 0.1;
            }
          }
          else if (this.dy < 0) {
            while (checkCollisions(this.x, this.y, this.z, terrainObject)) {
              this.y += 0.1;
            }
          }

          this.dy = -this.dy;
          touchingGround = true;
        }
      }

      // apply gravity
      if (!touchingGround) {
        this.dy += shared.worldGravity;
      }
    }
  }
}