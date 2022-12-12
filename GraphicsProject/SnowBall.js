"use strict";

var canvas;
var gl;

var numVertices  = 24;
var maxNumParticles = 1000;
var initialNumParticles = 200;
var initialPointSize = 3;
var initialSpeed = 0.02;
var numColors = 8;

var program;

var time = 0;
var dt = 1;

var numParticles = initialNumParticles;
var pointSize = initialPointSize;
var speed = initialSpeed;
var gravity = true;
var elastic = false;
var repulsion = false;
var coef = 1.0;


var pointsArray = [];
var colorsArray =[];

var projectionMatrix, modelViewMatrix;
var eye;
var at;
var up;

var cBufferId, vBufferId;

var vertices = [
    vec4(-1.1, -1.1,  1.1, 1.0 ),
    vec4( -1.1,  1.1,  1.1, 1.0 ),
    vec4( 1.1,  1.1,  1.1, 1.0 ),
    vec4( 1.1, -1.1,  1.1, 1.0 ),
    vec4( -1.1, -1.1, -1.1, 1.0 ),
    vec4( -1.1,  1.1, -1.1, 1.0 ),
    vec4( 1.1,  1.1, -1.1, 1.0 ),
    vec4( 1.1, -1.1, -1.1, 1.0)
];


var outlineColor = vec4( 0.0, 0.0, 0.0, 1.0 ); // black
var snowColor = vec4( 1.0, 1.0, 1.0, 1.0 ); // white


function particle(){
    var p = {};
    p.color = vec4(0, 0, 0, 1);
    p.position = vec4(0, 0, 0, 1);
    p.velocity = vec4(0, 0, 0, 0);
    p.mass = 1;

    return p;
}

var particleSystem = [];

for(var i = 0; i< maxNumParticles; i++) particleSystem.push(particle());


var d2 = []
for(var i=0; i<maxNumParticles; i++) d2[i] =  new Float32Array(maxNumParticles);

var bufferId;

function quad(a, b, c, d) {
     pointsArray.push(vertices[a]);
     colorsArray.push(outlineColor);
     pointsArray.push(vertices[b]);
     colorsArray.push(outlineColor);
     pointsArray.push(vertices[c]);
     colorsArray.push(outlineColor);
     pointsArray.push(vertices[d]);
     colorsArray.push(outlineColor);
}


function colorCube() {
    quad( 1, 0, 3, 2 );
    quad( 2, 3, 7, 6 );
    quad( 3, 0, 4, 7 );
    quad( 6, 5, 1, 2 );
    quad( 4, 5, 6, 7 );
    quad( 5, 4, 0, 1 );
}


window.onload = function init() {
    canvas = document.getElementById( "gl-canvas" );

    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );


    program = initShaders( gl, "vertex-shader", "fragment-shader" );

    gl.useProgram( program );

    bufferId = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, bufferId );

    // document.getElementById("Button1").onclick = function(){doubleNumParticles(); update();};
    // document.getElementById("Button2").onclick = function(){numParticles /= 2; update();};
    // document.getElementById("Button3").onclick = function(){speed *=2;update();};
    // document.getElementById("Button4").onclick = function(){speed /= 2; update();};
    // document.getElementById("Button5").onclick = function(){pointSize *= 2;gl.uniform1f(gl.getUniformLocation(program, "pointSize"), pointSize); update();};
    // document.getElementById("Button6").onclick = function(){pointSize /= 2;gl.uniform1f(gl.getUniformLocation(program, "pointSize"), pointSize); update();};
    // document.getElementById("Button7").onclick = function(){gravity = !gravity; update()};
    // document.getElementById("Button8").onclick = function(){elastic = !elastic; update()};
    // document.getElementById("Button9").onclick = function(){repulsion = !repulsion; update()};

    gl.clearColor( 0.5, 0.5, 0.5, 1.0 );

    eye =  vec3(1.5, 1.0, 1.0);
    at = vec3(0.0, 0.0, 0.0);
    up = vec3(0.0, 1.0, 0.0);

    modelViewMatrix = lookAt(eye, at, up);
    projectionMatrix = ortho(-2.0,2.0,-2.0,2.0,-4.0,4.0);

    gl.uniformMatrix4fv(gl.getUniformLocation( program, "modelViewMatrix" ), false, flatten(modelViewMatrix) );
    gl.uniformMatrix4fv( gl.getUniformLocation( program, "projectionMatrix" ), false, flatten(projectionMatrix) );

    gl.uniform1f(gl.getUniformLocation(program, "pointSize"), pointSize);

    cBufferId = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, cBufferId );
    gl.bufferData( gl.ARRAY_BUFFER, 16*(maxNumParticles+numVertices), gl.STATIC_DRAW );

    var vColor = gl.getAttribLocation( program, "vColor" );
    gl.vertexAttribPointer( vColor, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vColor );

    vBufferId = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, vBufferId );
    gl.bufferData( gl.ARRAY_BUFFER, 16*(maxNumParticles+numVertices), gl.STATIC_DRAW );

    var vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );

    gl.uniform1f(gl.getUniformLocation(program, "pointSize"), pointSize);

    simulation();
}

var simulation = function() {
    colorCube();

    for ( var i = 0; i < numParticles; i++ ) {
        particleSystem[i].mass = 1.0;
        particleSystem[i].color = snowColor;
        for ( var j = 0; j < 3; j++ ) {
            particleSystem[i].position[j] = 2.0 * (Math.random() - 0.5);
            particleSystem[i].velocity[j] = speed * 2.0 * (Math.random() - 0.5);
        }
        particleSystem[i].position[3] = 1.0;
    }

    for(var i =0; i<numParticles; i++) {
       pointsArray.push(particleSystem[i].position);
       colorsArray.push(particleSystem[i].color);
       }

    gl.bindBuffer( gl.ARRAY_BUFFER, cBufferId );
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(colorsArray));

    gl.bindBuffer( gl.ARRAY_BUFFER, vBufferId );
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, flatten(pointsArray));

    render();
}

var forces = function(ParticleI) {
    var ParticleK;
    var force = vec4(0, 0, 0, 0);
    if ( gravity) force[1] = -0.5;
    if ( repulsion ) {
        for ( var ParticleK = 0; ParticleK < numParticles; ParticleK++ ) {
            if ( ParticleK != ParticleI ) {
                var t = normalize(subtract(particleSystem[ParticleI].position, particleSystem[ParticleK].position));
                var d2 = dot(t, t);
                force = add(force, scale(0.01/d2, t));
            }
        }
    }
    return ( force );
}

var collision = function(particleId) {
    if(elastic) coef = 0.9; else coef = 1.0;
    for (var i = 0; i < 3; i++ ) {
        if ( particleSystem[particleId].position[i] >= 1.0 ) {
            particleSystem[particleId].velocity[i] = -coef * particleSystem[particleId].velocity[i];

            particleSystem[particleId].position[i] =
                1.0 - coef * ( particleSystem[particleId].position[i] - 1.0 );
        }
        if ( particleSystem[particleId].position[i] <= -1.0 ) {
            particleSystem[particleId].velocity[i] = -coef * particleSystem[particleId].velocity[i];

            particleSystem[particleId].position[i] =
                -1.0 - coef * ( particleSystem[particleId].position[i] + 1.0 );
        }
    }
}


var update = function() {
    for (var i = 0; i < numParticles; i++ ) {
        particleSystem[i].position = add( particleSystem[i].position, scale(speed*dt, particleSystem[i].velocity));
        particleSystem[i].velocity = add( particleSystem[i].velocity, scale(speed*dt/ particleSystem[i].mass, forces(i)));
    }
    for (var i = 0; i < numParticles; i++ ) collision(i);
    colorsArray = [];
    pointsArray = [];
    colorCube();
    for(var i = 0; i<numParticles; i++) {
       pointsArray.push(particleSystem[i].position);
       colorsArray.push(particleSystem[i].color);
    }
    gl.bindBuffer( gl.ARRAY_BUFFER, cBufferId );
    gl.bufferSubData( gl.ARRAY_BUFFER, 0, flatten(colorsArray));
    gl.bindBuffer( gl.ARRAY_BUFFER, vBufferId );
    gl.bufferSubData( gl.ARRAY_BUFFER, 0, flatten(pointsArray));
}

var render = function() {
    gl.clear( gl.COLOR_BUFFER_BIT );
    update();
    for ( var i = 0; i < 6; i++ ) gl.drawArrays( gl.LINE_LOOP, i * 4, 4 );
        gl.drawArrays(gl.POINTS, numVertices, numParticles);
    requestAnimFrame(render);
}
