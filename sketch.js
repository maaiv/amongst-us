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
	mousedYaw = event.movementX;
	mousedPitch = event.movementY;
}

document.addEventListener("mousemove", logMovement);

let fun = 0;

function animate() {
	requestAnimationFrame( animate );
	knot.rotation.x += 0.01;
	knot.rotation.y += 0.01;

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

