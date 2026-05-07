window.onload = function () {

    const canvas = document.getElementById("gl-canvas");

    const gl = canvas.getContext("webgl");

    if (!gl) {
        alert("WebGL not supported");
        return;
    }

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.clearColor(0.4, 0.7, 1.0, 1.0);

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);

    let terrainRows = 256;
    let terrainCols = 256;

    // terrain data arrays
    let terrainVertices = [];
    let terrainNormals = [];
    let terrainIndices = [];

    // terrain buffer instantiation
    let terrainVertexBuffer = null;
    let terrainNormalBuffer = null;
    let terrainIndexBuffer = null;

    // matrix instantiation for lighting (mat4 for alphas, mat3 for geo)
    let projectionMatrix = mat4.create();
    let viewMatrix = mat4.create();
    let modelMatrix = mat4.create();
    let modelViewMatrix = mat4.create();
    let normalMatrix = mat3.create(); // normal vectors so mat4 is not needed

    let radius = 24.0; // arbitrary number, adjust later
    let theta = Math.PI * 0.25;
    let phi = Math.PI * 0.25;

    // light source positioning
    let lightPos = [0.0, 1000.0, 0.0]; // for noon lighting

    let ambientLight = [0.2, 0.2, 0.2]; // not so bright
    let diffuseLight = [1.0, 1.0, 1.0]; // full bright
    let specularLight = [1.0, 1.0, 1.0]; // full bright
    
    // terrain lighting values for phong lighting model
    let terrainAmbient = [0.18, 0.22, 0.18]; // needs adjusted
    let terrainDiffuse = [1.0, 1.0, 1.0]; // needs adjusted
    let terrainSpecular = [1.0, 1.0, 1.0]; // needs adjusted

    let shininess = 24.0; // adjust as needed, determines how brightly light is reflected
    
    function render() {

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        requestAnimationFrame(render);
    }

    render();
};
