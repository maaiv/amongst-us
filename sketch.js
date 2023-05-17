import * as THREE from 'three';

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let vandal;

let loader = new GLTFLoader();

// loader.load( 'assets/vandal/scene.gltf', function ( gltf ) {
// 	vandal = gltf.scene;
// 	vandal.position.set(0, 0, 5)
// 	vandal.rotateY( degrees(-90) );
// 	vandal.castShadow = true;
// 	scene.add(vandal);

// 	vandal.traverse( function ( object ) {

// 		if ( object.isMesh ) object.castShadow = true;

// 	} );





	
// }, undefined, function (error) {
// 	console.error( error );
// });





let scene = new THREE.Scene();
let camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

camera.position.z = 7;

let renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.shadowMap.enabled = true;
document.body.appendChild( renderer.domElement );

// Lights

scene.add( new THREE.AmbientLight( hsl(0, 0, 30) ))

let pointLight = new THREE.PointLight( hsl(0, 0, 100) );
pointLight.position.set( 0, 4, 8 );
pointLight.castShadow = true;
pointLight.shadow.mapSize.width = 1024;
pointLight.shadow.mapSize.height = 1024;


scene.add( pointLight );

// Torus

let geometry = new THREE.TorusKnotGeometry( 1.4, 0.2, 150, 35 );
let material = new THREE.MeshPhongMaterial( { color: hsl(200,100,50), 
	shininess: 1000 } );
let knot = new THREE.Mesh( geometry, material );
knot.castShadow = true;

let boxes = [];
let camYaw = 0; //x
let camPitch = 0; //y


for (let i = 0; i < 2000; i++) {
	geometry = new THREE.BoxGeometry( 0.1,0.1,0.1 );
	let box = new THREE.Mesh(geometry, material);
	box.position.y = Math.random() * 10 - 5;
	box.position.x = Math.random() * 10 - 5;
	box.position.z = Math.random() * 10 - 5;
	box.castShadow = true;
	boxes.push(box);
	scene.add(box);
}

let ground = new THREE.Mesh( 
	new THREE.PlaneGeometry(15, 15),
	new THREE.MeshPhongMaterial( {color: hsl(0, 0, 50), shininess: 100} )
);


ground.receiveShadow = true;
ground.rotateX( degrees(-90) );
ground.translateZ(-3)

scene.add( ground );





scene.add( knot );

let mousedYaw = 0, mousedPitch = 0;

function logMovement(event) {
	camYaw += degrees(event.movementX/10);
	camPitch += degrees(event.movementY/10);
}


document.addEventListener("mousemove", logMovement);

let fun = 0;

function animate() {
	let camDistance = 1;
	requestAnimationFrame( animate );
	knot.rotation.x += 0.01;
	knot.rotation.y += 0.01;


	camera.position.x = Math.cos(camYaw) * camDistance * Math.cos(camPitch);
	camera.position.y = Math.sin(camPitch) * camDistance;
	camera.position.z = 7 + Math.sin(camYaw) * camDistance * Math.cos(camPitch);

	if (camPitch > 89) {
		camPitch = 89;
	  }
	  else if (camPitch < -89) {
		camPitch = -89;
	  }

	camera.lookAt(0, 0, 7) ;
	// camera.lookAt(0,0,7);

	for (let box of boxes) {
		box.rotation.y += 0.01;
		box.rotation.x += 0.01;
	}

	console.log(mousedYaw, mousedPitch);



	document.body.addEventListener("click", async () => {
		await document.body.requestPointerLock();
	});	


	// fun += 1;
	// material.color = hsl(fun,100,50);

	// knot.position.set (Math.random() - 0.5,Math.random() - 0.5,Math.random() - 0.5);

	// camera.rotateX(degrees(1));
	camera.rotateY(degrees(-mousedYaw));
	camera.rotateX(degrees(-mousedPitch));

	renderer.render( scene, camera );
	mousedYaw = 0;
	mousedPitch = 0;
}

animate();


function degrees(theta) {
	return Math.PI * theta / 180;
}
function hsl(h, s, l) {
  	return new THREE.Color(`hsl( ${h}, ${s}%, ${l}%)`);
}

class Agent {
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
			let n = findNormal(this.x, this.z, this.dir, terrainObject);
			while (checkCollisions(this.x, this.y, this.z,terrainObject)) {
			this.x -= sin(n);
			this.z -= cos(n);
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
  }