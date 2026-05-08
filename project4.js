"use strict";

var canvas;
var gl;

var pointsArray = [];
var colorsArray = [];

var modelView;
var projection;

var mvMatrix;
var pMatrix;

var eye;

const at = vec3(0.0, 0.0, 0.0);
const up = vec3(0.0, 1.0, 0.0);

var radius = 9.0;
var theta = 45.0 * Math.PI / 180.0;
var phi = 45.0 * Math.PI / 180.0;

var dr = 5.0 * Math.PI / 180.0;

var left = -5.0;
var right = 5.0;
var ytop = 5.0;
var bottom = -5.0;

var near = -20.0;
var far = 20.0;

var terrainRows = 100;
var terrainCols = 100;

var terrainSize = 8.0;
var terrainData = [];

var terrainStart = 0;
var terrainCount = 0;

var waterStart = 0;
var waterCount = 0;

var skyboxStart = 0;
var skyboxCount = 0;


function hill(x, z, cx, cz, height, width)
{
    var dx = x - cx;
    var dz = z - cz;

    return height * Math.exp(-(dx * dx + dz * dz) / width);
}


function generateTerrainData(rows, cols)
{
    for (var i = 0; i < rows; i++)
    {
        terrainData[i] = [];

        for (var j = 0; j < cols; j++)
        {
            var x = terrainSize * i / rows - terrainSize / 2;
            var z = terrainSize * j / cols - terrainSize / 2;

            var y = 0.0;

            y += hill(x, z, -3.0, -3.0, 1.4, 1.8);

            y += hill(x, z, 2.4, -3.0, 0.55, 0.8);
            y += hill(x, z, 3.3, -2.3, 0.45, 0.7);

            y += hill(x, z, -3.0, 2.2, 0.45, 0.7);
            y += hill(x, z, -2.2, 3.0, 0.40, 0.7);
            y += hill(x, z, -3.5, 3.2, 0.35, 0.6);
            y += hill(x, z, -2.4, 2.1, 0.30, 0.6);

            y += 0.08 * Math.sin(2.0 * x);
            y += 0.06 * Math.cos(2.0 * z);

            var distFromCenter = Math.sqrt(x * x + z * z);

            if (distFromCenter < 1.5)
            {
                y = -0.25;
            }

            terrainData[i][j] = y;
        }
    }
}


function buildTerrain()
{
    terrainStart = pointsArray.length;

    for (var i = 0; i < terrainRows - 1; i++)
    {
        for (var j = 0; j < terrainCols - 1; j++)
        {
            var x1 = terrainSize * i / terrainRows - terrainSize / 2;
            var x2 = terrainSize * (i + 1) / terrainRows - terrainSize / 2;

            var z1 = terrainSize * j / terrainCols - terrainSize / 2;
            var z2 = terrainSize * (j + 1) / terrainCols - terrainSize / 2;

            var y1 = terrainData[i][j];
            var y2 = terrainData[i + 1][j];
            var y3 = terrainData[i + 1][j + 1];
            var y4 = terrainData[i][j + 1];

            var green1 = vec4(0.0, 0.45, 0.0, 1.0);
            var green2 = vec4(0.0, 0.65, 0.0, 1.0);

            pointsArray.push(vec4(x1, y1, z1, 1.0));
            colorsArray.push(green1);

            pointsArray.push(vec4(x2, y2, z1, 1.0));
            colorsArray.push(green2);

            pointsArray.push(vec4(x2, y3, z2, 1.0));
            colorsArray.push(green1);

            pointsArray.push(vec4(x1, y1, z1, 1.0));
            colorsArray.push(green1);

            pointsArray.push(vec4(x2, y3, z2, 1.0));
            colorsArray.push(green2);

            pointsArray.push(vec4(x1, y4, z2, 1.0));
            colorsArray.push(green1);
        }
    }

    terrainCount = pointsArray.length - terrainStart;
}


function buildWater()
{
    waterStart = pointsArray.length;

    var waterColor = vec4(0.0, 0.3, 0.9, 1.0);

    var y = -0.20;
    var size = 1.6;

    pointsArray.push(vec4(-size, y, -size, 1.0));
    colorsArray.push(waterColor);

    pointsArray.push(vec4(size, y, -size, 1.0));
    colorsArray.push(waterColor);

    pointsArray.push(vec4(size, y, size, 1.0));
    colorsArray.push(waterColor);

    pointsArray.push(vec4(-size, y, -size, 1.0));
    colorsArray.push(waterColor);

    pointsArray.push(vec4(size, y, size, 1.0));
    colorsArray.push(waterColor);

    pointsArray.push(vec4(-size, y, size, 1.0));
    colorsArray.push(waterColor);

    waterCount = pointsArray.length - waterStart;
}


function buildSkybox()
{
    skyboxStart = pointsArray.length;

    var topBlue = vec4(0.0, 0.1, 0.6, 1.0);
    var bottomBlue = vec4(0.5, 0.8, 1.0, 1.0);

    var size = 12.0;

    pointsArray.push(vec4(-size, -size, -size, 1.0));
    colorsArray.push(bottomBlue);

    pointsArray.push(vec4(size, -size, -size, 1.0));
    colorsArray.push(bottomBlue);

    pointsArray.push(vec4(size, size, -size, 1.0));
    colorsArray.push(topBlue);

    pointsArray.push(vec4(-size, -size, -size, 1.0));
    colorsArray.push(bottomBlue);

    pointsArray.push(vec4(size, size, -size, 1.0));
    colorsArray.push(topBlue);

    pointsArray.push(vec4(-size, size, -size, 1.0));
    colorsArray.push(topBlue);

    skyboxCount = pointsArray.length - skyboxStart;
}


window.onload = function init()
{
    canvas = document.getElementById("gl-canvas");

    gl = WebGLUtils.setupWebGL(canvas);

    if (!gl){ alert("WebGL isn't available"); }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.7, 0.9, 1.0, 1.0);
    gl.enable(gl.DEPTH_TEST);

    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    generateTerrainData(terrainRows, terrainCols);

    buildTerrain();
    buildWater();
    buildSkybox();

    var cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colorsArray), gl.STATIC_DRAW);

    var vColor = gl.getAttribLocation(program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);

    var vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);
    
    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    modelView = gl.getUniformLocation(program, "modelView");
    projection = gl.getUniformLocation(program, "projection");

    document.getElementById("Button1").onclick =
        function() { radius *= 1.1; };

    document.getElementById("Button2").onclick =
        function() { radius *= 0.9; };

    document.getElementById("Button3").onclick =
        function() { theta += dr; };

    document.getElementById("Button4").onclick =
        function() { theta -= dr; };

    document.getElementById("Button5").onclick =
        function() { phi += dr; };

    document.getElementById("Button6").onclick =
        function() { phi -= dr; };

    render();
};


function render()
{
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    eye = vec3(
        radius * Math.sin(theta) * Math.cos(phi),
        radius * Math.sin(theta) * Math.sin(phi),
        radius * Math.cos(theta)
    );

    mvMatrix = lookAt(eye, at, up);
    pMatrix = ortho(left, right, bottom, ytop, near, far);
    gl.uniformMatrix4fv(modelView, false, flatten(mvMatrix));
    gl.uniformMatrix4fv(projection, false, flatten(pMatrix));

    gl.drawArrays(gl.TRIANGLES, skyboxStart, skyboxCount);

    gl.drawArrays(gl.TRIANGLES, terrainStart, terrainCount);

    gl.drawArrays(gl.TRIANGLES, waterStart, waterCount);
    requestAnimFrame(render);
}
