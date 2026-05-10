"use strict";

var canvas;
var gl;
var program;

var pointsArray    = [];
var colorsArray    = [];
var texCoordsArray = [];
var normalsArray   = [];

var modelView;
var projection;

var vBuffer;
var cBuffer;
var tBuffer;
var nBuffer;

var terrainTexture;
var useTextureLoc; 
var useTexture = 0;

var uSurfaceTypeLoc;
var uUseTextureLoc;
var uIsWaterLoc;
var uTimeLoc;

var mvMatrix;
var pMatrix;

var eye;

const at = vec3(0.0, 0.0, 0.0);
const up = vec3(0.0, 1.0, 0.0);

var radius = 9.0;
var theta  = 45.0 * Math.PI / 180.0;
var phi    = 45.0 * Math.PI / 180.0;
var dr     = 5.0  * Math.PI / 180.0;

var left   = -15.0;
var right  =  15.0;
var ytop   =  15.0;
var bottom = -15.0;
var near   = -50.0;
var far    =  50.0;

var terrainRows = 150;
var terrainCols = 150;
var terrainSize = 30.0;
var terrainData = [];

var terrainStart = 0,  terrainCount = 0;
var waterStart   = 0,  waterCount   = 0;
var skyboxStart  = 0,  skyboxCount  = 0;
var trackStart   = 0,  trackCount   = 0;

var cameraMode    = "orbit";
var cameraPos     = vec3(0.0, 3.0, 12.0);
var cameraForward = vec3(0.0, 0.0, -1.0);
var cameraSpeed   = 0.25;

var keys = {};

var autoT     = 0.0;
var autoSpeed = 0.003;

var TWO_PI    = 2.0 * Math.PI;
var startTime = null;


// vec helpers

function addVec(a, b)  { return vec3(a[0]+b[0], a[1]+b[1], a[2]+b[2]); }
function subVec(a, b)  { return vec3(a[0]-b[0], a[1]-b[1], a[2]-b[2]); }
function scaleVec(v,s) { return vec3(v[0]*s,    v[1]*s,    v[2]*s);    }

function normalizeVec(v)
{
    var len = Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);
    if (len === 0) return vec3(0, 0, 0);
    return vec3(v[0]/len, v[1]/len, v[2]/len);
}

function crossVec(a, b)
{
    return vec3(
        a[1]*b[2] - a[2]*b[1],
        a[2]*b[0] - a[0]*b[2],
        a[0]*b[1] - a[1]*b[0]
    );
}


// terrain integration

function hill(x, z, cx, cz, height, width)
{
    var dx = x - cx, dz = z - cz;
    return height * Math.exp(-(dx*dx + dz*dz) / width);
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

            y += hill(x, z, -10.0, -10.0, 4.0, 20.0);
            y += hill(x, z,   2.4,  -3.0, 0.55, 0.8);
            y += hill(x, z,   3.3,  -2.3, 0.45, 0.7);
            y += hill(x, z, -10.0,   8.0, 1.5,  7.0);
            y += hill(x, z,  -7.0,  11.0, 1.3,  7.0);
            y += hill(x, z, -12.0,  11.0, 1.2,  6.0);
            y += hill(x, z,  -7.5,   7.5, 1.1,  6.0);
            y += 0.18 * Math.sin(0.6 * x);
            y += 0.14 * Math.cos(0.6 * z);

            if (Math.sqrt(x*x + z*z) < 4.0) y = -0.35;

            terrainData[i][j] = y;
        }
    }
}

// vertex normals
function terrainNormal(i, j)
{
    var iL = Math.max(i - 1, 0),             iR = Math.min(i + 1, terrainRows - 1);
    var jD = Math.max(j - 1, 0),             jU = Math.min(j + 1, terrainCols - 1);
    var dx = terrainSize / terrainRows * 2.0, dz = terrainSize / terrainCols * 2.0;
    var dydx = (terrainData[iR][j] - terrainData[iL][j]) / dx;
    var dydz = (terrainData[i][jU] - terrainData[i][jD]) / dz;
    return normalizeVec(vec3(-dydx, 1.0, -dydz));
}

function buildTerrain()
{
    terrainStart = pointsArray.length;

    for (var i = 0; i < terrainRows - 1; i++)
    {
        for (var j = 0; j < terrainCols - 1; j++)
        {
            var x1 = terrainSize *  i      / terrainRows - terrainSize / 2;
            var x2 = terrainSize * (i + 1) / terrainRows - terrainSize / 2;
            var z1 = terrainSize *  j      / terrainCols - terrainSize / 2;
            var z2 = terrainSize * (j + 1) / terrainCols - terrainSize / 2;

            var y1 = terrainData[i    ][j    ];
            var y2 = terrainData[i + 1][j    ];
            var y3 = terrainData[i + 1][j + 1];
            var y4 = terrainData[i    ][j + 1];

            var s1 = i       / terrainRows,  s2 = (i + 1) / terrainRows;
            var t1 = j       / terrainCols,  t2 = (j + 1) / terrainCols;

            var green1 = vec4(0.0, 0.45, 0.0, 1.0);
            var green2 = vec4(0.0, 0.65, 0.0, 1.0);

            var n00 = terrainNormal(i,     j    );
            var n10 = terrainNormal(i + 1, j    );
            var n11 = terrainNormal(i + 1, j + 1);
            var n01 = terrainNormal(i,     j + 1);

            
            pointsArray.push(vec4(x1,y1,z1,1)); colorsArray.push(green1); texCoordsArray.push(vec2(s1,t1)); normalsArray.push(n00);
            pointsArray.push(vec4(x2,y2,z1,1)); colorsArray.push(green2); texCoordsArray.push(vec2(s2,t1)); normalsArray.push(n10);
            pointsArray.push(vec4(x2,y3,z2,1)); colorsArray.push(green1); texCoordsArray.push(vec2(s2,t2)); normalsArray.push(n11);
            
            pointsArray.push(vec4(x1,y1,z1,1)); colorsArray.push(green1); texCoordsArray.push(vec2(s1,t1)); normalsArray.push(n00);
            pointsArray.push(vec4(x2,y3,z2,1)); colorsArray.push(green2); texCoordsArray.push(vec2(s2,t2)); normalsArray.push(n11);
            pointsArray.push(vec4(x1,y4,z2,1)); colorsArray.push(green1); texCoordsArray.push(vec2(s1,t2)); normalsArray.push(n01);
        }
    }

    terrainCount = pointsArray.length - terrainStart;
}


// function to make water 

function buildWater()
{
    waterStart = pointsArray.length;

    var wc   = vec4(0.0, 0.3, 0.9, 1.0);
    var wn   = vec3(0.0, 1.0, 0.0);
    var y    = -0.30;
    var size = 4.2;

    var verts = [
        vec4(-size, y, -size, 1), vec4( size, y, -size, 1), vec4( size, y,  size, 1),
        vec4(-size, y, -size, 1), vec4( size, y,  size, 1), vec4(-size, y,  size, 1)
    ];
    for (var k = 0; k < verts.length; k++)
    {
        pointsArray.push(verts[k]);
        colorsArray.push(wc);
        texCoordsArray.push(vec2(0.0, 0.0));
        normalsArray.push(wn);
    }

    waterCount = pointsArray.length - waterStart;
}


// skybox

function buildSkybox()
{
    skyboxStart = pointsArray.length;

    var s   = terrainSize * 1.5;   // 45.0 — matches shader const skySize
    var top = vec4(0.10, 0.28, 0.72, 1.0);   // zenith
    var bot = vec4(0.76, 0.88, 1.00, 1.0);   // horizon
    var n   = vec3(0.0, 1.0, 0.0);           // normals unused for skybox

    function sc(y) { return (y > 0) ? top : bot; }

    var C = [
        vec4(-s,-s,-s,1), vec4( s,-s,-s,1), vec4( s, s,-s,1), vec4(-s, s,-s,1),
        vec4(-s,-s, s,1), vec4( s,-s, s,1), vec4( s, s, s,1), vec4(-s, s, s,1)
    ];

    // 6 faces × 6 verts (2 triangles), wound CCW from inside
    var faces = [
        [0,1,2, 0,2,3],   // front  z=-s
        [5,4,7, 5,7,6],   // back   z=+s
        [4,0,3, 4,3,7],   // left   x=-s
        [1,5,6, 1,6,2],   // right  x=+s
        [3,2,6, 3,6,7],   // top    y=+s
        [4,5,1, 4,1,0]    // bottom y=-s
    ];

    for (var f = 0; f < faces.length; f++)
    {
        for (var k = 0; k < 6; k++)
        {
            var v = C[faces[f][k]];
            pointsArray.push(v);
            colorsArray.push(sc(v[1]));
            texCoordsArray.push(vec2(0.0, 0.0));
            normalsArray.push(n);
        }
    }

    skyboxCount = pointsArray.length - skyboxStart;
}


// roller coaster track  (Cameron)

function getTrackPoint(t)
{
    var angle = t * 2.0 * Math.PI;
    return vec3(9.0 * Math.cos(angle), 2.2 + 1.2 * Math.sin(2.0 * angle), 9.0 * Math.sin(angle));
}

function buildRollerCoasterTrack()
{
    trackStart = pointsArray.length;

    var tc  = vec4(0.55, 0.25, 0.05, 1.0);
    var seg = 180;

    for (var i = 0; i < seg; i++)
    {
        var p1 = getTrackPoint(i       / seg);
        var p2 = getTrackPoint((i + 1) / seg);
        var tn = normalizeVec(crossVec(normalizeVec(subVec(p2, p1)), up));

        pointsArray.push(vec4(p1[0],p1[1],p1[2],1)); colorsArray.push(tc); texCoordsArray.push(vec2(0.0,0.0)); normalsArray.push(tn);
        pointsArray.push(vec4(p2[0],p2[1],p2[2],1)); colorsArray.push(tc); texCoordsArray.push(vec2(0.0,0.0)); normalsArray.push(tn);
    }

    trackCount = pointsArray.length - trackStart;
}


// texture upload

function configureTexture(image)
{
    terrainTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, terrainTexture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(gl.getUniformLocation(program, "terrainTexture"), 0);
    useTexture = 1;
}


// camera

function updateManualCamera()
{
    var fwd   = normalizeVec(cameraForward);
    var right = normalizeVec(cross(fwd, up));
    if (keys["w"]) cameraPos = addVec(cameraPos, scaleVec(fwd,   cameraSpeed));
    if (keys["s"]) cameraPos = subVec(cameraPos, scaleVec(fwd,   cameraSpeed));
    if (keys["a"]) cameraPos = subVec(cameraPos, scaleVec(right, cameraSpeed));
    if (keys["d"]) cameraPos = addVec(cameraPos, scaleVec(right, cameraSpeed));
    if (keys["q"]) cameraPos = addVec(cameraPos, scaleVec(up,    cameraSpeed));
    if (keys["e"]) cameraPos = subVec(cameraPos, scaleVec(up,    cameraSpeed));
}

function getCameraMatrix()
{
    if (cameraMode === "auto")
    {
        var cur  = getTrackPoint(autoT);
        var next = getTrackPoint(autoT + 0.01);
        autoT = (autoT + autoSpeed > 1.0) ? 0.0 : autoT + autoSpeed;
        return lookAt(vec3(cur[0],cur[1]+0.7,cur[2]), vec3(next[0],next[1]+0.7,next[2]), up);
    }
    if (cameraMode === "manual")
    {
        updateManualCamera();
        return lookAt(cameraPos, addVec(cameraPos, cameraForward), up);
    }
    eye = vec3(
        radius * Math.sin(theta) * Math.cos(phi),
        radius * Math.sin(theta) * Math.sin(phi),
        radius * Math.cos(theta)
    );
    return lookAt(eye, at, up);
}




window.onload = function init()
{
    canvas = document.getElementById("gl-canvas");
    gl = WebGLUtils.setupWebGL(canvas);
    if (!gl) { alert("WebGL isn't available"); }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.7, 0.9, 1.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    // geometry
    generateTerrainData(terrainRows, terrainCols);
    buildTerrain();
    buildWater();
    buildSkybox();
    buildRollerCoasterTrack();

    // color buffer
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

    // normals
    nBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW);
    var vNormal = gl.getAttribLocation(program, "vNormal");
    gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);

    // position
    vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);
    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    // uniforms
    modelView        = gl.getUniformLocation(program, "modelView");
    projection       = gl.getUniformLocation(program, "projection");
    uSurfaceTypeLoc  = gl.getUniformLocation(program, "uSurfaceType");
    uUseTextureLoc   = gl.getUniformLocation(program, "uUseTexture");
    uIsWaterLoc      = gl.getUniformLocation(program, "uIsWater");
    uTimeLoc         = gl.getUniformLocation(program, "uTime");

    document.getElementById("Button1").onclick = function(){ cameraMode="orbit"; radius*=1.1; };
    document.getElementById("Button2").onclick = function(){ cameraMode="orbit"; radius*=0.9; };
    document.getElementById("Button3").onclick = function(){ cameraMode="orbit"; theta+=dr;   };
    document.getElementById("Button4").onclick = function(){ cameraMode="orbit"; theta-=dr;   };
    document.getElementById("Button5").onclick = function(){ cameraMode="orbit"; phi+=dr;     };
    document.getElementById("Button6").onclick = function(){ cameraMode="orbit"; phi-=dr;     };

    document.getElementById("heightmapInput").onchange = function(event)
    {
        var file = event.target.files[0];
        if (!file) return;
        var img = new Image();
        img.onload = function(){ configureTexture(img); };
        img.src = URL.createObjectURL(file);
    };

    window.onkeydown = function(e)
    {
        keys[e.key.toLowerCase()] = true;
        if (e.key.toLowerCase() === "r") cameraMode = "auto";
        if (e.key.toLowerCase() === "m") cameraMode = "manual";
        if (e.key.toLowerCase() === "o") cameraMode = "orbit";
    };
    window.onkeyup = function(e){ keys[e.key.toLowerCase()] = false; };

    startTime = performance.now();
    render();
};


function render()
{
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    var elapsed = ((performance.now() - startTime) / 1000.0) % TWO_PI;
    gl.uniform1f(uTimeLoc, elapsed);

    mvMatrix = getCameraMatrix();
    pMatrix  = ortho(left, right, bottom, ytop, near, far);
    gl.uniformMatrix4fv(modelView,  false, flatten(mvMatrix));
    gl.uniformMatrix4fv(projection, false, flatten(pMatrix));

    gl.uniform1f(uSurfaceTypeLoc, 0.0);
    gl.uniform1f(uUseTextureLoc,  0.0);
    gl.uniform1f(uIsWaterLoc,     0.0);
    gl.drawArrays(gl.TRIANGLES, skyboxStart, skyboxCount);

    gl.uniform1f(uSurfaceTypeLoc, 1.0);
    gl.uniform1f(uUseTextureLoc,  useTexture ? 1.0 : 0.0);
    gl.uniform1f(uIsWaterLoc,     0.0);
    gl.drawArrays(gl.TRIANGLES, terrainStart, terrainCount);

    gl.uniform1f(uSurfaceTypeLoc, 2.0);
    gl.uniform1f(uUseTextureLoc,  0.0);
    gl.uniform1f(uIsWaterLoc,     1.0);
    gl.drawArrays(gl.TRIANGLES, waterStart, waterCount);

    gl.uniform1f(uSurfaceTypeLoc, 3.0);
    gl.uniform1f(uUseTextureLoc,  0.0);
    gl.uniform1f(uIsWaterLoc,     0.0);
    gl.drawArrays(gl.LINES, trackStart, trackCount);

    requestAnimFrame(render);
}
