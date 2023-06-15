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
let typingMode = false;
let typingBar = "";
let localGameState = "menu";
let voted = false;
let votingTime = 30;
let votedPlayer = false;

let backgroundStars = [];

let animationTimeline = 0;

let my, guests, shared, killSFX, cam, collideVisualCanvas, canvas3D, menuButtons, startSec, guestPlayerIDs;


let lobbyTerrain = [
  {type: "box", x: 0, y: 50, z: 0, width: 1500, height: 50, length: 1500, rotation: 0},
  {type: "box", x: 750, y: -300, z: 0, width: 50, height: 750, length: 1500, rotation: 0},
  {type: "box", x: -750, y: -300, z: 0, width: 50, height: 750, length: 1500, rotation: 0},
  {type: "box", x: 0, y: -300, z: 750, width: 1550, height: 750, length: 50, rotation: 0},
  {type: "box", x: 0, y: -300, z: -750, width: 1550, height: 750, length: 50, rotation: 0},
];

// Create environment objects
let hostTerrain = [
  {type: "box", x: 0, y: 50, z: 0, width: 100*100, height: 100, length: 100*100, rotation: 0},
  {type: "box", x: 200, y: 0, z: 0, width: 100, height: 100, length: 100, rotation: 0},
  {type: "box", x: 200, y: -150, z: 200, width: 100, height: 100, length: 100, rotation: 0},
  // {type: "polygon", x: -200, y: 20, z: 300, relativeVertices: [[0,0],[0,200],[100,200],[100,-100], [-200,-100], [-200,200],[-100,200], [-100,0]], height: 100, rotation: 0},
  // {type: "polygon", x: -400, y: 20, z: 0, relativeVertices: [[0,0],[0,200],[100,100],[100,0],[-300,-100]], height: 100, rotation: -10}
];

let chat = [
  {content: "Frosty the snowman was a jolly happy soul", life: 10}, 
  {content: "with a corn cob pipe and a button nose", life: 10},
  {content: "and two eyes made out of coal", life: 10},
  {content: "Frosty the snowman was a fairy tale they say he was made of snow but the children know how he came to life one day", life: 10},
];

// Connect to the server and shared data, and load sounds
function preload() {
  killSFX = loadSound("assets/killSFX.mp3");
}

function connectToParty(roomID) {
  partyConnect("wss://demoserver.p5party.org", "amogus", roomID);

  let voteMap = new Map([
    ["apples", 500],
    ["bananas", 300],
    ["oranges", 200]
  ]);

  guests = partyLoadGuestShareds();

  partySubscribe("die", die);
  partySubscribe("newChatMessage", newChatMessage);
  partySubscribe("gameStateChange", gameStateChange);
  shared = partyLoadShared("shared", {  
    ambientLevel: 0, 
    debugState: false, 
    terrain: [...lobbyTerrain], 
    lightSize: 20,
    playerAcceleration: 1,
    playerDeceleration: 0.1,
    playerMaxVelocity: 6,
    playerJumpPower: 5,
    worldGravity: 0.15,
    playerPerspective: 3,
    serverGameState: "lobby",
    votes: {IDs: [], total: []},
    lobbyTimer: false
  }, () => {
    my = partyLoadMyShared({}, () => {
      my.player = new Crewmate(0,0,0,0,0);
      
      if (typingBar.length === 0) {
        my.player.id = random(["Jelly", "LeL", "Walex", "Mamun", "Mr Guest", "Gamba", "KayaanT"]);
      }
      else {
        my.player.id = typingBar;
      }

      
      LoopID:
      for (let i = 0; i < 9; i++) {
        console.log(guests.map((guest) => guest.player.id));
        if ( guests.map((guest) => guest.player.id).filter( (guestID) => (guestID === my.player.id)).length <= 1 ) {
          break LoopID;
        }
        if (i > 0) {
          my.player.id = my.player.id.slice(0,my.player.id.length - 1).concat(i);
        }
        else {
          my.player.id = my.player.id.concat(i);
        }        
      }

      typingBar = "";
      rectMode(CORNER);
      textAlign(LEFT);
      
      // log shared data
      console.log("me", JSON.stringify(my));
      console.log("guests", JSON.stringify(guests));
      console.log("am i host?", partyIsHost());
      shared.votes.IDs.push(my.player.id);
      shared.votes.total.push(my.player.id);
      localGameState = "play";
    });

  });
  
}

// Set sketch modes, canvas, and subscribe to die message
function setup() {
  createCanvas(windowWidth, windowHeight);
  angleMode(DEGREES);
  rectMode(CENTER);
  textAlign(CENTER);
  colorMode(HSB, 255);
  
  // instantiate player object, hitbox visual, and 3d canvas
  

  collideVisualCanvas = createGraphics(180,180);
  collideVisualCanvas.angleMode(DEGREES);
  
  canvas3D = createGraphics(windowWidth/1,windowHeight/1, WEBGL);
  canvas3D.colorMode(HSB, 255);
  canvas3D.angleMode(DEGREES);
  
  cam = canvas3D.createCamera();


  menuButtons = {"menu": [new Button(width/2, height/2, 200, 50, "bello", 50, "play")]};

  for (let i = 0; i < 500; i++) {
    backgroundStars.push({x:random(-6500,6500), y:random(-4000, -2000), z:random(-6500,6500), size: random(100)/100});
  }

} 

// Game update loop
function draw() {
  if (localGameState === "menu") {
    menuLoop();
  }
  
  else if (localGameState === "play") {
    gameLoop();

    if (shared.serverGameState === "lobby") {
      lobbyLoop();
    }
    else if (shared.serverGameState === "vote") {
      voteLoop();
    }
  }
  else {
    animateLoop();
  }
}

function menuLoop() {
  background(255);
  for (let button of menuButtons[localGameState]) {
    button.update();
    button.draw();
  }

  
  // display text
  push();
  strokeWeight(2.5);
  textSize(14);
  stroke(0, 0, 0);
  translate(width/2, height/3);


  push();
  strokeWeight(2);
  fill(0, 55);
  stroke(0,155);
  rect(0,5,310,32);

  strokeWeight(3);

  if (typingBar.length > 0) {
    fill(255, 205);
    stroke(0, 205);
    text(typingBar, 0, 0, 300);
  }
  else {
    fill(255, 135);
    stroke(0, 135);
    text("Enter Nickname", 0, 0, 300);
  }

  

  fill(255);
  stroke(0);
  pop();

  pop();


}

function animateLoop() {
  if (localGameState === "eject") {
    drawInit(100);
    drawSky();

    cam.setPosition(0, -3000, 0);
    cam.lookAt(10, -3000, 0);
    push();
    canvas3D.ambientLight(150);
    canvas3D.pointLight(0, 0, 150, 500, -3000, -width);
    canvas3D.translate(500, -3000, -width/2.5 + animationTimeline);
    canvas3D.rotateX(animationTimeline/1.5);
    canvas3D.rotateY(-animationTimeline/3);

    if (votedPlayer.type === "impostor") {
      drawCrewMateModel(0, 30, 0, 0, votedPlayer.h, 1, true);

    }
    else if (votedPlayer.type === "crewmate") {
      drawCrewMateModel(0, 30, 0, 0, votedPlayer.h, 3, true);

    }

    pop();
    animationTimeline += 1;
    if (animationTimeline >= 540) {
      localGameState = "play";
      animationTimeline = 0;
      votedPlayer = false;
    }
  }
  background(255);
  image(canvas3D,0,0,width,height);
}

function gameLoop() {
  drawInit();
  collideVisual();
  updateMyPlayer();
  updateCam();
  createLights();
  drawPlayers();
  updateEnvironment();
  drawEnvironment();
  drawSky();

  background(255);
  image(canvas3D,0,0,width,height);
  updateUI();
}

function lobbyLoop() {
  if (partyIsHost()) {
    if (guests.length >= 1) {
      if (shared.lobbyTimer === false) {
        shared.lobbyTimer = 1;
        startSec = millis()/1000;
      }
      else if (shared.lobbyTimer <= 0) {
        partyEmit("gameStateChange", "play");
        partyEmit("newChatMessage", {content: "Starting game!", life: 10, colour:[60, 205]});
        shared.serverGameState = "play";
        shared.terrain = [...hostTerrain];
        shared.lobbyTimer = false;
        
      }
      else if (millis()/1000 >= startSec + 1) {
        shared.lobbyTimer -= round(millis()/1000 - startSec);
        startSec = millis()/1000;
        partyEmit("newChatMessage", {content: shared.lobbyTimer, life: 10, colour:[40, 205]});
      }
    }
    else if (shared.lobbyTimer !== false) {
      shared.lobbyTimer = false;
      partyEmit("newChatMessage", {content: "Start game failed! Not enough players.", life: 10, colour:[5, 205]});
    }
  }
}

function voteLoop() {
  if (partyIsHost()) {
    if (shared.lobbyTimer === false) {
      shared.lobbyTimer = votingTime + 1;
      startSec = millis()/1000;
    }
    else if (shared.lobbyTimer <= 0) {

      partyEmit("gameStateChange", "localEject");
      partyEmit("gameStateChange", "play");
      shared.serverGameState = "play";
      shared.terrain = [...hostTerrain];
      console.log("terrain shifted");
      shared.lobbyTimer = false;
    }
    else if (millis()/1000 >= startSec + 1) {
      shared.lobbyTimer -= round(millis()/1000 - startSec);
      startSec = millis()/1000;
      if (Number.isInteger(votingTime / shared.lobbyTimer) || shared.lobbyTimer <= 5) {
        partyEmit("newChatMessage", {content: shared.lobbyTimer, life: 10, colour:[40, 205]});
      }
      
    }


  }
}

function gameStateChange(data) {
  if (data === "play") {
    my.player.reset();
  }
  else if (data === "vote") {

    voted = false;
    my.player.reset();

  }
  else if (data === "localEject") {
    localGameState = "eject";
    let highestVotes = 0;
    
    for (let ID of shared.votes.IDs) {
      
      if (shared.votes.total[shared.votes.IDs.indexOf(ID)] > highestVotes) {
        for (let guest of guests) {
          if (guest.player.id === ID) {
            votedPlayer = guest.player;
          }
        }
        
        highestVotes = shared.votes.total[shared.votes.IDs.indexOf(ID)];
      }
      else if (shared.votes.total[shared.votes.IDs.indexOf(ID)] === highestVotes) {
        votedPlayer = false;
      }
    }

  }
}



// Set background and lock pointer light
function drawInit() {
  canvas3D.reset();
  canvas3D.background(0);
  
  // create a global light so WEBGL doesn't just break when there are no lights
  canvas3D.pointLight(
    0,0,shared.ambientLevel,
    my.player.x,my.player.y - 800,my.player.z
  );

  canvas3D.ambientLight(0, 0, shared.ambientLevel);

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
      canvas3D.ambientLight(map(minimumDistance,0,125 + 50 * shared.lightSize,105,0,true));
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

    canvas3D.ambientMaterial(0,0,shared.ambientLevel);

    if (!shared.debugState) {
      canvas3D.noStroke();
    }
    else {
      canvas3D.normalMaterial();
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

function drawSky() {
  canvas3D.push();
  canvas3D.translate(my.player.x, 0, my.player.z);
  canvas3D.noStroke();
  canvas3D.emissiveMaterial(60, 30, 255);
  for (let star of backgroundStars) {
    canvas3D.translate(star.x, star.y, star.z);
    canvas3D.box(star.size, star.size, star.size);
    canvas3D.sphere(star.size * 15, 5, 5);
    canvas3D.translate(-star.x, -star.y, -star.z);

    star.x += star.size * 5;
    if (star.x > my.player.x + 6000) {
      star.x = my.player.x - 6000;
    }
  }
  canvas3D.pop();
}

function keyTyped() {

  if (localGameState === "menu") {
    if (key === "Delete") {
      if (typingBar.charAt(typingBar.length - 1) === " ") {
        typingBar = typingBar.slice(0,typingBar.length - 1);
      }
      while (typingBar.charAt(typingBar.length - 1) !== " " && typingBar.length > 0){
        typingBar = typingBar.slice(0,typingBar.length - 1);
      }
    }
    else if (key !== "Enter" && typingBar.length < 30) {
      typingBar = typingBar.concat(key);
    }
  }
  else {
    if (key === "Enter") {
      if (typingMode && typingBar.length > 0) {
        if (typingBar[0] === "/") {
          runCommand(typingBar);
        }
        else {
          partyEmit("newChatMessage", {content: `[${my.player.id}] ${typingBar}`, life: 10, colour: [my.player.h, 155]});
        }
        
      }
      typingBar = "";
      typingMode = !typingMode;
    }
    else if (key === "Delete") {
      if (typingBar.charAt(typingBar.length - 1) === " ") {
        typingBar = typingBar.slice(0,typingBar.length - 1);
      }

      while (typingBar.charAt(typingBar.length - 1) !== " " && typingBar.length > 0){
        typingBar = typingBar.slice(0,typingBar.length - 1);
      }

    }
    else if (typingMode) {
      typingBar = typingBar.concat(key);
    }
  }
    

}

// Toggle debug mode
function keyPressed() {

  if (localGameState === "menu") {
    if (keyCode === BACKSPACE && typingBar.length > 0 && !keyIsDown(17)) {
      typingBar = typingBar.slice(0,typingBar.length - 1);
    }
  }

  else {

    
    if (typingMode) {
      if (keyCode === BACKSPACE && typingBar.length > 0 && !keyIsDown(17)) {
        typingBar = typingBar.slice(0,typingBar.length - 1);
      }
    }
    else if (keyCode === 80) {
      shared.debugState = !shared.debugState;
    }
  }
}

function newChatMessage(data) {
  chat.push(data);
}

function runCommand(command) {
  if (shared.serverGameState === "vote" && (command.slice(0,6) === "/vote" ||  command.slice(0,6) === "/vote ")) {
    if (voted) {
      chat.push({content: "You have already voted!", life: 10, colour: [0,255]});
    }
    else {
      if (command.slice(6,7) === "") {
        chat.push({content: "Please specify a player name", life: 10, colour: [0,255]});
      }
      else {
        idCheckLoop:
        for (let ID of shared.votes.IDs) {
          if (command.slice(6, command.length) === ID) {
            voted = true; 
            partyEmit("newChatMessage", {content: `voted for ${command.slice(6, command.length)}`, life: 10, colour: [my.player.h, 155]});
            // partyEmit("newChatMessage", {content: `[${my.player.id}] ${typingBar}`, life: 10, colour: [my.player.h, 155]});
            shared.votes.total[shared.votes.IDs.indexOf(ID)] += 1;
            break idCheckLoop;
          }
        }
        if (!voted) {
          chat.push({content: "Invalid player name", life: 10, colour: [0,255]});
        }   
        
      }
    }
  }
  else if (command.slice(0,6) === "/eject") {
    localGameState = "eject";
  }
  else if (command.slice(0,7) === "/voting") {
    shared.serverGameState = "vote";

  }
  else if (command.slice(0,6) === "/skip") {
    shared.lobbyTimer = 3;
  }
  else {
    chat.push({content: "Invalid Command!", life: 10, colour: [0,255]});
  }



}

function updateUI() {

  // display text
  push();
  strokeWeight(2.5);
  textSize(14);
  stroke(0, 0, 0);
  translate(width - 350, height - 50);

  if (typingMode) {
    push();
    strokeWeight(2);
    fill(0, 55);
    stroke(0,155);
    rect(-10,-9,310,32);

    strokeWeight(3);


    if (typingBar.length > 0) {
      fill(255, 205);
      stroke(0, 205);
      text(typingBar,0, 0, 300);
    }
    else {
      fill(255, 135);
      stroke(0, 135);
      text("type here", 0, 0, 300);
    }

    

    fill(255);
    stroke(0);
    pop();
  }

  for (let i = chat.length - 1; i >= 0; i--) {
    let lines = ceil(textWidth(chat[i].content) / 270);
    let chatHue, chatSaturation;
    if (chat[i].colour === undefined) {
      chatHue = 0;
      chatSaturation = 0;
    }
    else {
      chatHue = chat[i].colour[0];
      chatSaturation = chat[i].colour[1];
    }


    translate(0,-lines * 18 - 6);

    if (chat[i].life >= 2 || typingMode) {
      
      fill(chatHue, chatSaturation, 255);
      stroke(0);
    } 
    else {
      fill(chatHue, chatSaturation, 255, chat[i].life * 255/2);
      stroke(0, chat[i].life * 255/2);
    }

    if (chat[i].life >= 0) {
      chat[i].life -= 0.03;
    }
    

    text(chat[i].content,0, 0, 300);
    
  }
  pop(); 
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
      for (let thisObject of shared.terrain) {r
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

function angleShift(x, y, dt) {
  let theta = atan2(y,x) + dt;
  let localMag = Math.sqrt(x * x + y * y);
  return {x:cos(theta) * localMag, y:sin(theta) * localMag};
}


// Buttonclass for the menu
class Button {
  constructor(x, y, width, height, content, colour, destination) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.content = content;
    this.colour = colour;
    this.destination = destination;
  }
  update() {
    let mouseOver = mouseX >= this.x - this.width/2 && mouseX <= this.x + this.width/2 && mouseY >= this.y - this.height/2 && mouseY <= this.y + this.height/2;
    if (mouseOver) {
      if (mouseButton === LEFT && mouseIsPressed) {
        
        if (this.destination === "play") {
          connectToParty("room1");
          localGameState = "";

        }
        else {
          localGameState = this.destination;
        }
        
      }

    }
  }
  draw() {
    push();
    fill(150);
    rect(this.x, this.y, this.width, this.height);
    
    fill(0);
    textSize(34);
    text("Frosty", this.x, this.y + this.height/5);
    pop();
  }
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
    this.type = "impostor";
    this.votes = 0;
  }

  update() {
    // player state if alive
    if (this.alive) {
      // select item
      if (!typingMode) {
        if (keyIsDown(49)) {
          this.hold = 0;
        }
        else if (keyIsDown(50)) {
          this.hold = 1;
        }
        else if (keyIsDown(51) && this.type === "impostor") {
          this.hold = 2;
        } 

        // check for other players
        if (shared.serverGameState !== "vote") {
          for (let guest of guests) {
            // use knife
            if (this.hold === 2) {
              if (guest.player !== my.player && mouseIsPressed && mouseButton === LEFT && !killSFX.isPlaying()) {
                if (dist(guest.player.x,guest.player.y,guest.player.z,my.player.x,my.player.y,my.player.z) < 300) {
                  killSFX.play();
                  let tempDir = atan2(my.player.x - guest.player.x, my.player.z - guest.player.z);
                  partyEmit("die", {
                    id: guest.player.id,
                    dx: sin(tempDir) * -7,
                    dy: -5,
                    dz: cos(tempDir) * -7
                  });
                }
              }
            }

            // report body
            else if (guest.player !== my.player && mouseIsPressed && mouseButton === LEFT && !guest.player.alive) {
              if (dist(guest.player.x,guest.player.y,guest.player.z,my.player.x,my.player.y,my.player.z) < 300) {
                partyEmit("gameStateChange", "vote");
                shared.serverGameState = "vote";
                shared.terrain = [...lobbyTerrain];

                for (let i = 0; i < shared.votes.total.length; i ++) {
                  shared.votes.total[i] = 0;
                }

                
                partyEmit("newChatMessage", {content: "Voting has begun. Use /vote [player_name] to vote for them to be ejected!", life: 10, colour:[40, 205]});
          
              }
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
            if (keyIsDown(32) && !typingMode) {
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
      if ((keyIsDown(83) + keyIsDown(87) === 1 || keyIsDown(65) + keyIsDown(68) === 1) && !typingMode) {

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
        this.dx = this.dx * (1 - shared.playerDeceleration);
        this.dz = this.dz * (1 - shared.playerDeceleration);
      }
      

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
          if (Math.abs(this.dy) > 0.01) {
            this.dy = -this.dy/2;
          }
          else {
            this.dy = 0;
          }
          touchingGround = true;
        }
      }

      // apply gravity
      if (!touchingGround) {
        this.dy += shared.worldGravity;
      }

      if (Math.abs(this.dx) + Math.abs(this.dy) > 0.01) {
        this.dx = this.dx * (1 - shared.playerDeceleration/5);
        this.dz = this.dz * (1 - shared.playerDeceleration/5);
      }
      else {
        this.dx = 0;
        this.dz = 0;
      }
    }
    // change world ambient level
    shared.ambientLevel += (keyIsDown(UP_ARROW) - keyIsDown(DOWN_ARROW))/1.5;
  }

  reset() {
    this.x = random(-300, 300);
    this.y = -50;
    this.z = random(-300, 300);
    this.dx = 0;
    this.dy = 0;
    this.dz = 0;
    this.alive = true;
  }
  
}

