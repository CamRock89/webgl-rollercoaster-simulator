"use strict";

var canvas;
var gl;
var program;

var pointsArray = [];
var colorsArray = [];
var texCoordsArray = [];
var normalsArray = [];

var modelView;
var projection;

var vBuffer;
var cBuffer;
var tBuffer;
var nBuffer;

var terrainTexture;
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

var radius = 15.0;
var theta = 45.0 * Math.PI / 180.0;
var phi = 45.0 * Math.PI / 180.0;
var dr = 5.0 * Math.PI / 180.0;

var left = -15.0;
var right = 15.0;
var ytop = 15.0;
var bottom = -15.0;
var near = -50.0;
var far = 50.0;

var terrainRows = 150;
var terrainCols = 150;
var terrainSize = 30.0;
var terrainData = [];

var terrainStart = 0;
var terrainCount = 0;
var waterStart = 0;
var waterCount = 0;
var skyboxStart = 0;
var skyboxCount = 0;
var trackStart = 0;
var trackCount = 0;

var cameraMode = "auto";
var cameraPos = vec3(0.0, 3.0, 12.0);
var yaw = -90.0;
var pitch = 0.0;
var cameraForward = vec3(0.0, 0.0, -1.0);
var cameraSpeed = 0.25;

var smoothAutoEye = vec3(0.0, 3.0, 12.0);
var smoothAutoAt = vec3(0.0, 3.0, 11.0);
var cameraSmoothness = 0.08;

var keys = {};

var autoT = 0.0;
var autoSpeed = 0.0025;

var TWO_PI = 2.0 * Math.PI;
var startTime = null;

var landscapeStart = 0;
var landscapeCount = 0;
var randomSeed = 7;

function addVec(a, b)
{
    return vec3(a[0] + b[0], a[1] + b[1], a[2] + b[2]);
}

function subVec(a, b)
{
    return vec3(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

function scaleVec(v, s)
{
    return vec3(v[0] * s, v[1] * s, v[2] * s);
}

function normalizeVec(v)
{
    var len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);

    if (len === 0)
    {
        return vec3(0.0, 0.0, 0.0);
    }

    return vec3(v[0] / len, v[1] / len, v[2] / len);
}

function updateCameraDirection()
{
    var yawRad = yaw * Math.PI / 180.0;
    var pitchRad = pitch * Math.PI / 180.0;

    var x = Math.cos(yawRad) * Math.cos(pitchRad);
    var y = Math.sin(pitchRad);
    var z = Math.sin(yawRad) * Math.cos(pitchRad);

    cameraForward = normalizeVec(vec3(x, y, z));
}

function smoothStep(edge0, edge1, x)
{
    var t = Math.max(0.0, Math.min(1.0, (x - edge0) / (edge1 - edge0)));
    return t * t * (3.0 - 2.0 * t);
}

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

            y += hill(x, z, -10.0, -10.0, 4.0, 20.0);
            y += hill(x, z, 2.4, -3.0, 0.55, 0.8);
            y += hill(x, z, 3.3, -2.3, 0.45, 0.7);
            y += hill(x, z, -10.0, 8.0, 1.5, 7.0);
            y += hill(x, z, -7.0, 11.0, 1.3, 7.0);
            y += hill(x, z, -12.0, 11.0, 1.2, 6.0);
            y += hill(x, z, -7.5, 7.5, 1.1, 6.0);
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

function terrainNormal(i, j)
{
    var iL = Math.max(i - 1, 0);
    var iR = Math.min(i + 1, terrainRows - 1);
    var jD = Math.max(j - 1, 0);
    var jU = Math.min(j + 1, terrainCols - 1);

    var dx = terrainSize / terrainRows * 2.0;
    var dz = terrainSize / terrainCols * 2.0;

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

            var n00 = terrainNormal(i, j);
            var n10 = terrainNormal(i + 1, j);
            var n11 = terrainNormal(i + 1, j + 1);
            var n01 = terrainNormal(i, j + 1);

            pointsArray.push(vec4(x1, y1, z1, 1.0));
            colorsArray.push(green1);
            texCoordsArray.push(vec2(s1, t1));
            normalsArray.push(n00);

            pointsArray.push(vec4(x2, y2, z1, 1.0));
            colorsArray.push(green2);
            texCoordsArray.push(vec2(s2, t1));
            normalsArray.push(n10);

            pointsArray.push(vec4(x2, y3, z2, 1.0));
            colorsArray.push(green1);
            texCoordsArray.push(vec2(s2, t2));
            normalsArray.push(n11);

            pointsArray.push(vec4(x1, y1, z1, 1.0));
            colorsArray.push(green1);
            texCoordsArray.push(vec2(s1, t1));
            normalsArray.push(n00);

            pointsArray.push(vec4(x2, y3, z2, 1.0));
            colorsArray.push(green2);
            texCoordsArray.push(vec2(s2, t2));
            normalsArray.push(n11);

            pointsArray.push(vec4(x1, y4, z2, 1.0));
            colorsArray.push(green1);
            texCoordsArray.push(vec2(s1, t2));
            normalsArray.push(n01);
        }
    }

    terrainCount = pointsArray.length - terrainStart;
}

function buildWater()
{
    waterStart = pointsArray.length;

    var waterColor = vec4(0.0, 0.3, 0.9, 1.0);
    var waterNormalVec = vec3(0.0, 1.0, 0.0);
    var y = -0.30;
    var size = 4.2;

    var verts = [
        vec4(-size, y, -size, 1.0),
        vec4(size, y, -size, 1.0),
        vec4(size, y, size, 1.0),
        vec4(-size, y, -size, 1.0),
        vec4(size, y, size, 1.0),
        vec4(-size, y, size, 1.0)
    ];

    for (var i = 0; i < verts.length; i++)
    {
        pointsArray.push(verts[i]);
        colorsArray.push(waterColor);
        texCoordsArray.push(vec2(0.0, 0.0));
        normalsArray.push(waterNormalVec);
    }

    waterCount = pointsArray.length - waterStart;
}

function buildSkybox()
{
    skyboxStart = pointsArray.length;

    var size = terrainSize * 1.5;
    var topBlue = vec4(0.10, 0.28, 0.72, 1.0);
    var bottomBlue = vec4(0.76, 0.88, 1.00, 1.0);
    var n = vec3(0.0, 1.0, 0.0);

    function skyColor(y)
    {
        if (y > 0.0)
        {
            return topBlue;
        }

        return bottomBlue;
    }

    var c = [
        vec4(-size, -size, -size, 1.0),
        vec4(size, -size, -size, 1.0),
        vec4(size, size, -size, 1.0),
        vec4(-size, size, -size, 1.0),
        vec4(-size, -size, size, 1.0),
        vec4(size, -size, size, 1.0),
        vec4(size, size, size, 1.0),
        vec4(-size, size, size, 1.0)
    ];

    var faces = [
        [0, 1, 2, 0, 2, 3],
        [5, 4, 7, 5, 7, 6],
        [4, 0, 3, 4, 3, 7],
        [1, 5, 6, 1, 6, 2],
        [3, 2, 6, 3, 6, 7],
        [4, 5, 1, 4, 1, 0]
    ];

    for (var f = 0; f < faces.length; f++)
    {
        for (var k = 0; k < 6; k++)
        {
            var v = c[faces[f][k]];
            pointsArray.push(v);
            colorsArray.push(skyColor(v[1]));
            texCoordsArray.push(vec2(0.0, 0.0));
            normalsArray.push(n);
        }
    }

    skyboxCount = pointsArray.length - skyboxStart;
}

function getTrackPoint(t)
{
    t = t % 1.0;

    if (t < 0.0)
    {
        t += 1.0;
    }

    var angle = t * 2.0 * Math.PI;

    var radiusBase =
        8.0
        + 1.1 * Math.sin(2.0 * angle)
        + 0.6 * Math.cos(3.0 * angle);

    var x = radiusBase * Math.cos(angle);
    var z = radiusBase * Math.sin(angle);

    var y =
        2.2
        + 1.4 * Math.sin(angle)
        + 0.9 * Math.sin(2.0 * angle + 0.8)
        + 0.4 * Math.cos(3.0 * angle);

    y +=
        3.0
        * smoothStep(0.08, 0.18, t)
        * (1.0 - smoothStep(0.22, 0.32, t));

    y -=
        1.8
        * smoothStep(0.38, 0.48, t)
        * (1.0 - smoothStep(0.55, 0.65, t));

    y +=
        2.3
        * smoothStep(0.66, 0.76, t)
        * (1.0 - smoothStep(0.83, 0.93, t));

    return vec3(x, y, z);
}

function pushVertex(p, color, normal)
{
    pointsArray.push(vec4(p[0], p[1], p[2], 1.0));
    colorsArray.push(color);
    texCoordsArray.push(vec2(0.0, 0.0));
    normalsArray.push(normal);
}

function pushQuad(v1, v2, v3, v4, color, normal)
{
    pushVertex(v1, color, normal);
    pushVertex(v2, color, normal);
    pushVertex(v3, color, normal);

    pushVertex(v1, color, normal);
    pushVertex(v3, color, normal);
    pushVertex(v4, color, normal);
}

function addThickLine(p1, p2, thickness, color)
{
    var dir = normalizeVec(subVec(p2, p1));
    var side = normalizeVec(cross(dir, up));

    if (side[0] === 0.0 && side[1] === 0.0 && side[2] === 0.0)
    {
        side = vec3(1.0, 0.0, 0.0);
    }

    var vertical = vec3(0.0, thickness, 0.0);
    var offset = scaleVec(side, thickness);

    var a = addVec(addVec(p1, offset), vertical);
    var b = addVec(subVec(p1, offset), vertical);
    var c = subVec(subVec(p1, offset), vertical);
    var d = subVec(addVec(p1, offset), vertical);

    var e = addVec(addVec(p2, offset), vertical);
    var f = addVec(subVec(p2, offset), vertical);
    var g = subVec(subVec(p2, offset), vertical);
    var h = subVec(addVec(p2, offset), vertical);

    var nTop = vec3(0.0, 1.0, 0.0);
    var nBottom = vec3(0.0, -1.0, 0.0);
    var nSide1 = side;
    var nSide2 = scaleVec(side, -1.0);

    pushQuad(a, e, f, b, color, nTop);
    pushQuad(d, c, g, h, color, nBottom);
    pushQuad(a, d, h, e, color, nSide1);
    pushQuad(b, f, g, c, color, nSide2);
}

function buildRollerCoasterTrack()
{
    trackStart = pointsArray.length;

    var railColor = vec4(0.08, 0.08, 0.08, 1.0);
    var tieColor = vec4(0.03, 0.03, 0.03, 1.0);

    var segments = 420;
    var railOffset = 0.45;
    var railThickness = 0.09;
    var tieThickness = 0.07;

    for (var i = 0; i < segments; i++)
    {
        var t1 = i / segments;
        var t2 = (i + 1) / segments;

        var p1 = getTrackPoint(t1);
        var p2 = getTrackPoint(t2);

        var direction = normalizeVec(subVec(p2, p1));
        var side = normalizeVec(cross(direction, up));

        var left1 = addVec(p1, scaleVec(side, railOffset));
        var left2 = addVec(p2, scaleVec(side, railOffset));
        var right1 = subVec(p1, scaleVec(side, railOffset));
        var right2 = subVec(p2, scaleVec(side, railOffset));

        addThickLine(left1, left2, railThickness, railColor);
        addThickLine(right1, right2, railThickness, railColor);

        if (i % 8 === 0)
        {
            addThickLine(left1, right1, tieThickness, tieColor);
        }
    }

    trackCount = pointsArray.length - trackStart;
}

function seededRandom()
{
    randomSeed = (randomSeed * 9301 + 49297) % 233280;
    return randomSeed / 233280;
}

function getTerrainHeight(x, z)
{
    var i = Math.floor((x + terrainSize / 2.0) / terrainSize * terrainRows);
    var j = Math.floor((z + terrainSize / 2.0) / terrainSize * terrainCols);

    if (i < 0) i = 0;
    if (j < 0) j = 0;
    if (i >= terrainRows) i = terrainRows - 1;
    if (j >= terrainCols) j = terrainCols - 1;

    return terrainData[i][j];
}

function addBox(cx, cy, cz, sx, sy, sz, color)
{
    var x1 = cx - sx / 2.0;
    var x2 = cx + sx / 2.0;
    var y1 = cy - sy / 2.0;
    var y2 = cy + sy / 2.0;
    var z1 = cz - sz / 2.0;
    var z2 = cz + sz / 2.0;

    var v = [
        vec3(x1, y1, z2), vec3(x1, y2, z2), vec3(x2, y2, z2), vec3(x2, y1, z2),
        vec3(x1, y1, z1), vec3(x1, y2, z1), vec3(x2, y2, z1), vec3(x2, y1, z1)
    ];

    pushQuad(v[1], v[0], v[3], v[2], color, vec3(0.0, 0.0, 1.0));
    pushQuad(v[2], v[3], v[7], v[6], color, vec3(1.0, 0.0, 0.0));
    pushQuad(v[3], v[0], v[4], v[7], color, vec3(0.0, -1.0, 0.0));
    pushQuad(v[6], v[5], v[1], v[2], color, vec3(0.0, 1.0, 0.0));
    pushQuad(v[4], v[5], v[6], v[7], color, vec3(0.0, 0.0, -1.0));
    pushQuad(v[5], v[4], v[0], v[1], color, vec3(-1.0, 0.0, 0.0));
}

function buildTree(x, z)
{
    var y = getTerrainHeight(x, z);

    var trunkColor = vec4(0.35, 0.18, 0.05, 1.0);
    var leafColor = vec4(0.0, 0.35, 0.08, 1.0);

    addBox(x, y + 0.45, z, 0.25, 0.9, 0.25, trunkColor);
    addBox(x, y + 1.15, z, 0.9, 0.9, 0.9, leafColor);
    addBox(x, y + 1.75, z, 0.6, 0.6, 0.6, leafColor);
}

function buildRock(x, z)
{
    var y = getTerrainHeight(x, z);
    var rockColor = vec4(0.32, 0.32, 0.32, 1.0);

    addBox(x, y + 0.15, z, 0.7, 0.3, 0.6, rockColor);
}

function buildStand(x, z)
{
    var y = getTerrainHeight(x, z);

    var wallColor = vec4(0.65, 0.20, 0.05, 1.0);
    var roofColor = vec4(0.25, 0.05, 0.05, 1.0);

    addBox(x, y + 0.45, z, 1.4, 0.9, 1.4, wallColor);
    addBox(x, y + 1.05, z, 1.8, 0.3, 1.8, roofColor);
}

function buildLandscape()
{
    landscapeStart = pointsArray.length;

    /* station and drink stands near coaster entrance */
    buildStand(-5.0, 10.5);
    buildStand(5.0, 10.5);

    var stationY = getTerrainHeight(0.0, 11.5);
    addBox(0.0, stationY + 0.45, 11.5, 4.0, 0.9, 2.0, vec4(0.55, 0.32, 0.12, 1.0));
    addBox(0.0, stationY + 1.10, 11.5, 4.5, 0.35, 2.4, vec4(0.25, 0.05, 0.05, 1.0));

    /* random trees, avoiding the lake */
    for (var i = 0; i < 45; i++)
    {
        var x = seededRandom() * terrainSize - terrainSize / 2.0;
        var z = seededRandom() * terrainSize - terrainSize / 2.0;

        var dist = Math.sqrt(x * x + z * z);

        if (dist > 5.5)
        {
            buildTree(x, z);
        }
    }

    /* random rocks near water and hills */
    for (var j = 0; j < 18; j++)
    {
        var angle = seededRandom() * TWO_PI;
        var r = 4.8 + seededRandom() * 3.0;

        var rx = Math.cos(angle) * r;
        var rz = Math.sin(angle) * r;

        buildRock(rx, rz);
    }

    landscapeCount = pointsArray.length - landscapeStart;
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

function updateManualCamera()
{
    var forward = normalizeVec(cameraForward);
    var rightVec = normalizeVec(cross(forward, up));

    if (keys["w"])
    {
        cameraPos = addVec(cameraPos, scaleVec(forward, cameraSpeed));
    }

    if (keys["s"])
    {
        cameraPos = subVec(cameraPos, scaleVec(forward, cameraSpeed));
    }

    if (keys["a"])
    {
        cameraPos = subVec(cameraPos, scaleVec(rightVec, cameraSpeed));
    }

    if (keys["d"])
    {
        cameraPos = addVec(cameraPos, scaleVec(rightVec, cameraSpeed));
    }

    if (keys["Space"])
    {
        cameraPos = addVec(cameraPos, scaleVec(up, cameraSpeed));
    }

    if (keys["ShiftLeft"] || keys["ShiftRight"])
    {
        cameraPos = subVec(cameraPos, scaleVec(up, cameraSpeed));
    }
}

function getCameraMatrix()
{
    if (cameraMode === "auto")
    {
        var current = getTrackPoint(autoT);
        var next = getTrackPoint(autoT + 0.01);
        var farNext = getTrackPoint(autoT + 0.025);

        var direction = normalizeVec(subVec(farNext, current));

        var targetEye = vec3(
            current[0],
            current[1] + 1.0,
            current[2]
        );

        var targetAt = vec3(
            next[0] + direction[0] * 2.5,
            next[1] + 1.0 + direction[1] * 2.5,
            next[2] + direction[2] * 2.5
        );

        smoothAutoEye = addVec(
            smoothAutoEye,
            scaleVec(subVec(targetEye, smoothAutoEye), cameraSmoothness)
        );

        smoothAutoAt = addVec(
            smoothAutoAt,
            scaleVec(subVec(targetAt, smoothAutoAt), cameraSmoothness)
        );

        autoT += autoSpeed;

        if (autoT > 1.0)
        {
            autoT = 0.0;
        }

        return lookAt(smoothAutoEye, smoothAutoAt, up);
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

    if (!gl)
    {
        alert("WebGL isn't available");
        return;
    }

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.7, 0.9, 1.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram(program);

    startTime = performance.now();
    updateCameraDirection();

    generateTerrainData(terrainRows, terrainCols);
    buildTerrain();
    buildWater();
    buildSkybox();
    buildRollerCoasterTrack();
    buildLandscape();

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

    nBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(normalsArray), gl.STATIC_DRAW);
    var vNormal = gl.getAttribLocation(program, "vNormal");
    gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vNormal);

    vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointsArray), gl.STATIC_DRAW);
    var vPosition = gl.getAttribLocation(program, "vPosition");
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    modelView = gl.getUniformLocation(program, "modelView");
    projection = gl.getUniformLocation(program, "projection");
    uSurfaceTypeLoc = gl.getUniformLocation(program, "uSurfaceType");
    uUseTextureLoc = gl.getUniformLocation(program, "uUseTexture");
    uIsWaterLoc = gl.getUniformLocation(program, "uIsWater");
    uTimeLoc = gl.getUniformLocation(program, "uTime");

    document.getElementById("Button1").onclick = function()
    {
        cameraMode = "orbit";
        radius *= 1.1;
    };

    document.getElementById("Button2").onclick = function()
    {
        cameraMode = "orbit";
        radius *= 0.9;
    };

    document.getElementById("Button3").onclick = function()
    {
        cameraMode = "orbit";
        theta += dr;
    };

    document.getElementById("Button4").onclick = function()
    {
        cameraMode = "orbit";
        theta -= dr;
    };

    document.getElementById("Button5").onclick = function()
    {
        cameraMode = "orbit";
        phi += dr;
    };

    document.getElementById("Button6").onclick = function()
    {
        cameraMode = "orbit";
        phi -= dr;
    };

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

    window.onkeydown = function(event)
    {
        keys[event.key.toLowerCase()] = true;
        keys[event.code] = true;

        if (
            event.code === "Space" ||
            event.code === "ShiftLeft" ||
            event.code === "ShiftRight" ||
            event.key.indexOf("Arrow") === 0
        )
        {
            event.preventDefault();
        }

        if (event.key.toLowerCase() === "r")
        {
            cameraMode = "auto";
        }

        if (event.key.toLowerCase() === "m")
        {
            cameraMode = "manual";
        }

        if (event.key.toLowerCase() === "o")
        {
            cameraMode = "orbit";
        }

        if (event.key === "ArrowLeft")
        {
            yaw -= 3.0;
        }

        if (event.key === "ArrowRight")
        {
            yaw += 3.0;
        }

        if (event.key === "ArrowUp")
        {
            pitch += 2.0;
        }

        if (event.key === "ArrowDown")
        {
            pitch -= 2.0;
        }

        if (pitch > 85.0)
        {
            pitch = 85.0;
        }

        if (pitch < -85.0)
        {
            pitch = -85.0;
        }

        updateCameraDirection();
    };

    window.onkeyup = function(event)
    {
        keys[event.key.toLowerCase()] = false;
        keys[event.code] = false;
    };

    render();
};

function render()
{
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    var elapsed = ((performance.now() - startTime) / 1000.0) % TWO_PI;
    gl.uniform1f(uTimeLoc, elapsed);

    mvMatrix = getCameraMatrix();
    pMatrix = perspective(65.0, canvas.width / canvas.height, 0.1, 100.0);

    gl.uniformMatrix4fv(modelView, false, flatten(mvMatrix));
    gl.uniformMatrix4fv(projection, false, flatten(pMatrix));

    gl.uniform1f(uSurfaceTypeLoc, 0.0);
    gl.uniform1f(uUseTextureLoc, 0.0);
    gl.uniform1f(uIsWaterLoc, 0.0);
    gl.drawArrays(gl.TRIANGLES, skyboxStart, skyboxCount);

    gl.uniform1f(uSurfaceTypeLoc, 1.0);
    gl.uniform1f(uUseTextureLoc, useTexture);
    gl.uniform1f(uIsWaterLoc, 0.0);
    gl.drawArrays(gl.TRIANGLES, terrainStart, terrainCount);

    gl.uniform1f(uSurfaceTypeLoc, 2.0);
    gl.uniform1f(uUseTextureLoc, 0.0);
    gl.uniform1f(uIsWaterLoc, 1.0);
    gl.drawArrays(gl.TRIANGLES, waterStart, waterCount);

    gl.uniform1f(uSurfaceTypeLoc, 3.0);
    gl.uniform1f(uUseTextureLoc, 0.0);
    gl.uniform1f(uIsWaterLoc, 0.0);
    gl.drawArrays(gl.TRIANGLES, trackStart, trackCount);

    gl.uniform1f(uSurfaceTypeLoc, 4.0);
    gl.uniform1f(uUseTextureLoc, 0.0);
    gl.uniform1f(uIsWaterLoc, 0.0);
    gl.drawArrays(gl.TRIANGLES, landscapeStart, landscapeCount);

    requestAnimFrame(render);
}
