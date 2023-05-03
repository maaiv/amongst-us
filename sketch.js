import * as THREE from 'three';

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let loader = new GLTFLoader();



let scene = new THREE.Scene();
let camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

camera.position.z = 7;

let renderer = new THREE.WebGLRenderer();
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

// Lights

scene.add( new THREE.AmbientLight( hsl(0, 0, 30) ))

let pointLight = new THREE.PointLight( hsl(0, 0, 100) );
pointLight.position.set( 0, 5, 0 );
pointLight.castShadow = true;
scene.add( pointLight );

// Torus

let geometry = new THREE.TorusKnotGeometry( 1.4, 0.2, 150, 35 );
let material = new THREE.MeshPhongMaterial( { color: hsl(200,100,50), 
	shininess: 1000 } );
let knot = new THREE.Mesh( geometry, material );

let ground = new THREE.Mesh( 
	new THREE.PlaneGeometry(15, 15),
	new THREE.MeshPhongMaterial( {color: hsl(0, 0, 50), shininess: 100} )
);

ground.rotateX( degrees(-90) );
ground.translateZ(-3)

scene.add( ground );





scene.add( knot );





let fun = 0;

function animate() {
	requestAnimationFrame( animate );
	knot.rotation.x += 0.01;
	knot.rotation.y += 0.01;

	// pointLight.position.set( Math.random() * 10 - 5, Math.random() * 10 - 5, Math.random() * 10 - 5);

	// fun += 1;
	// knot.material.color = hsl(fun,100,50);

	// knot.position.set (Math.random() - 0.5,Math.random() - 0.5,Math.random() - 0.5);




	renderer.render( scene, camera );
}

animate();


function degrees(theta) {
	return Math.PI * theta / 180;
}

function hsl(h, s, l) {

  	return new THREE.Color(`hsl( ${h}, ${s}%, ${l}%)`);
}
