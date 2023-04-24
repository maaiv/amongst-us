// Project Title
// Your Name
// Date
//
// Extra for Experts:
// - describe what you did to take this project "above and beyond"

let bullets = [];

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);

}

function draw() {

  pointLight(100,100,100);
  shininess(100);
  specularMaterial(100);

  background(220);
  bullets.push(random(-1500,1500));

  for (let huh of bullets) {
    push();
    translate(mouseX - width/2 + huh, mouseY - height/2 + huh/15, huh - 2000);
    box(100, 100);
    pop();
  }
  
}