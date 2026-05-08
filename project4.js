"use strict";

var canvas;
var gl;
var program;

var pointsArray = [];
var colorsArray = [];
var texCoordsArray = [];

var modelView;
var projection;

var vBuffer;
var cBuffer;
var tBuffer;

var terrainTexture;
var useTextureLoc;
var useTexture = 0;

var mvMatrix;
var pMatrix;

var eye;

const at = vec3(0.0, 0.0, 0.0);
const up = vec3(0.0, 1.0, 0.0);

var radius = 9.0;
var theta = 45.0 * Math.PI / 180.0;
var phi = 45.0 * Math.PI / 180.0;

var dr = 5.0 * Math.PI / 180.0;

var left = -15.0;
var right = 15.0;
var ytop = 15.0;
var bottom = -15.0;

var near = -50.0;
var far = 50.0;
// terrain settings
var terrainRows = 150;
var terrainCols = 150;

var terrainSize = 30.0;
var terrainData = [];

var terrainStart = 0;
var terrainCount = 0;
// water settings
var waterStart = 0;
var waterCount = 0;
//skybox settings
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
            // large hill
            y += hill(x, z, -10.0, -10.0, 4.0, 20.0);
            // two med hills
            y += hill(x, z, 2.4, -3.0, 0.55, 0.8);
            y += hill(x, z, 3.3, -2.3, 0.45, 0.7);
            // four small hills
            y += hill(x, z, -10.0, 8.0, 1.5, 7.0);
            y += hill(x, z, -7.0, 11.0, 1.3, 7.0);
            y += hill(x, z, -12.0, 11.0, 1.2, 6.0);
            y += hill(x, z, -7.5, 7.5, 1.1, 6.0);
            //rolling ground
            y += 0.18 * Math.sin(0.6 * x);
            y += 0.14 * Math.cos(0.6 * z);

            var distFromCenter = Math.sqrt(x * x + z * z);

            if (distFromCenter < 4.0)
            {
                y = -0.35;
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

            var s1 = i / terrainRows;
            var s2 = (i + 1) / terrainRows;

            var t1 = j / terrainCols;
            var t2 = (j + 1) / terrainCols;

            var green1 = vec4(0.0, 0.45, 0.0, 1.0);
            var green2 = vec4(0.0, 0.65, 0.0, 1.0);

            pointsArray.push(vec4(x1, y1, z1, 1.0));
            colorsArray.push(green1);
            texCoordsArray.push(vec2(s1, t1));

            pointsArray.push(vec4(x2, y2, z1, 1.0));
            colorsArray.push(green2);
            texCoordsArray.push(vec2(s2, t1));

            pointsArray.push(vec4(x2, y3, z2, 1.0));
            colorsArray.push(green1);
            texCoordsArray.push(vec2(s2, t2));

            pointsArray.push(vec4(x1, y1, z1, 1.0));
            colorsArray.push(green1);
            texCoordsArray.push(vec2(s1, t1));

            pointsArray.push(vec4(x2, y3, z2, 1.0));
            colorsArray.push(green2);
            texCoordsArray.push(vec2(s2, t2));

            pointsArray.push(vec4(x1, y4, z2, 1.0));
            colorsArray.push(green1);
            texCoordsArray.push(vec2(s1, t2));
        }
    }

    terrainCount = pointsArray.length - terrainStart;
}



function buildWater()
{
    waterStart = pointsArray.length;

    var waterColor = vec4(0.0, 0.3, 0.9, 1.0);

    var y = -0.30;
    var size = 4.2;

    pointsArray.push(vec4(-size, y, -size, 1.0));
    colorsArray.push(waterColor);
    texCoordsArray.push(vec2(0.0, 0.0));

    pointsArray.push(vec4(size, y, -size, 1.0));
    colorsArray.push(waterColor);
    texCoordsArray.push(vec2(0.0, 0.0));

    pointsArray.push(vec4(size, y, size, 1.0));
    colorsArray.push(waterColor);
    texCoordsArray.push(vec2(0.0, 0.0));

    pointsArray.push(vec4(-size, y, -size, 1.0));
    colorsArray.push(waterColor);
    texCoordsArray.push(vec2(0.0, 0.0));

    pointsArray.push(vec4(size, y, size, 1.0));
    colorsArray.push(waterColor);
    texCoordsArray.push(vec2(0.0, 0.0));

    pointsArray.push(vec4(-size, y, size, 1.0));
    colorsArray.push(waterColor);
    texCoordsArray.push(vec2(0.0, 0.0));

    waterCount = pointsArray.length - waterStart;
}


function buildSkybox()
{
    skyboxStart = pointsArray.length;

    var topBlue = vec4(0.0, 0.1, 0.6, 1.0);
    var bottomBlue = vec4(0.5, 0.8, 1.0, 1.0);

    var size = terrainSize * 1.5;

    pointsArray.push(vec4(-size, -size, -size, 1.0));
    colorsArray.push(bottomBlue);
    texCoordsArray.push(vec2(0.0, 0.0));

    pointsArray.push(vec4(size, -size, -size, 1.0));
    colorsArray.push(bottomBlue);
    texCoordsArray.push(vec2(0.0, 0.0));

    pointsArray.push(vec4(size, size, -size, 1.0));
    colorsArray.push(topBlue);
    texCoordsArray.push(vec2(0.0, 0.0));

    pointsArray.push(vec4(-size, -size, -size, 1.0));
    colorsArray.push(bottomBlue);
    texCoordsArray.push(vec2(0.0, 0.0));

    pointsArray.push(vec4(size, size, -size, 1.0));
    colorsArray.push(topBlue);
    texCoordsArray.push(vec2(0.0, 0.0));

    pointsArray.push(vec4(-size, size, -size, 1.0));
    colorsArray.push(topBlue);
    texCoordsArray.push(vec2(0.0, 0.0));

    skyboxCount = pointsArray.length - skyboxStart;
}


function configureTexture(image)
{
    terrainTexture = gl.createTexture();

    gl.bindTexture(gl.TEXTURE_2D, terrainTexture);

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

    gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        image
    );

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(gl.getUniformLocation(program, "terrainTexture"), 0);

    useTexture = 1;
}


window.onload = function init()
{
    canvas = document.getElementById("gl-canvas");

    gl = WebGLUtils.setupWebGL(canvas);

    if (!gl){ alert("WebGL isn't available"); }

    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.clearColor(0.7, 0.9, 1.0, 1.0);

    gl.enable(gl.DEPTH_TEST);

    program = initShaders(gl, "vertex-shader", "fragment-shader");

    gl.useProgram(program);

    generateTerrainData(terrainRows, terrainCols);

    buildTerrain();

    buildWater();

    buildSkybox();


    cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colorsArray), gl.STATIC_DRAW);

    var vColor = gl.getAttribLocation(program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);

    tBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(texCoordsArray), gl.STATIC_DRAW);

    var vTexCoord = gl.getAttribLocation(program, "vTexCoord");
    gl.vertexAttribPointer(vTexCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vTexCoord);

    vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    modelView = gl.getUniformLocation(program, "modelView");

    projection = gl.getUniformLocation(program, "projection");

    useTextureLoc = gl.getUniformLocation(program, "useTexture");

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

    document.getElementById("heightmapInput").onchange = function(event)
    {
        var file = event.target.files[0];

        if (!file)
        {
            return;
        }

        var img = new Image();

        img.onload = function()
        {
            configureTexture(img);
        };

        img.src = URL.createObjectURL(file);
    };

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

    //draw skybox
    gl.uniform1i(useTextureLoc, 0);
    gl.drawArrays(gl.TRIANGLES, skyboxStart, skyboxCount);
    //draw terrain
    gl.uniform1i(useTextureLoc, useTexture);
    gl.drawArrays(gl.TRIANGLES, terrainStart, terrainCount);

    //draw water
    gl.uniform1i(useTextureLoc, 0);
    gl.drawArrays(gl.TRIANGLES, waterStart, waterCount);

    requestAnimFrame(render);
}
