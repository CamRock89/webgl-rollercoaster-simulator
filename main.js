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

    const vertexShaderSource = `
        attribute vec3 aPosition;
        attribute vec3 aNormal;

        uniform mat4 uProjection;
        uniform mat4 uModelView;
        uniform mat3 uNormalMatrix;

        uniform vec3 uLightPosition;

        varying vec3 vNormal;
        varying vec3 vLightDir;
        varying vec3 vEyeDir;

        void main() {

            vec4 mvPosition = uModelView * vec4(aPosition, 1.0);

            vec3 normal = normalize(uNormalMatrix * aNormal);

            vec3 lightDir = normalize(uLightPosition - mvPosition.xyz);

            vec3 eyeDir = normalize(-mvPosition.xyz);

            vNormal = normal;
            vLightDir = lightDir;
            vEyeDir = eyeDir;

            gl_Position = uProjection * mvPosition;
        }
    `;

    const fragmentShaderSource = `
        precision mediump float;

        varying vec3 vNormal;
        varying vec3 vLightDir;
        varying vec3 vEyeDir;

        uniform vec3 uAmbientLight;
        uniform vec3 uDiffuseLight;
        uniform vec3 uSpecularLight;

        uniform vec3 uTerrainAmbient;
        uniform vec3 uTerrainDiffuse;
        uniform vec3 uTerrainSpecular;

        uniform float uShininess;

        void main() {

            vec3 N = normalize(vNormal);

            vec3 L = normalize(vLightDir);

            vec3 E = normalize(vEyeDir);

            vec3 H = normalize(L + E);

            vec3 ambient = uAmbientLight * uTerrainAmbient;

            float diffuseFactor = max(dot(N, L), 0.0);

            vec3 diffuse = diffuseFactor * uDiffuseLight * uTerrainDiffuse;

            float specularFactor = pow(max(dot(N, H), 0.0), uShininess);

            vec3 specular = specularFactor * uSpecularLight * uTerrainSpecular;

            if (diffuseFactor <= 0.0) {
                specular = vec3(0.0);
            }

            vec3 color = ambient + diffuse + specular;

            gl_FragColor = vec4(color, 1.0);
        }
    `;

    function createShader(type, source) {

        const shader = gl.createShader(type);

        gl.shaderSource(shader, source);

        gl.compileShader(shader);

        return shader;
    }

    function createProgram(vertexSource, fragmentSource) {

        const vertexShader = createShader(gl.VERTEX_SHADER, vertexSource);

        const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentSource);

        const program = gl.createProgram();

        gl.attachShader(program, vertexShader);

        gl.attachShader(program, fragmentShader);

        gl.linkProgram(program);

        return program;
    }

    const program = createProgram(vertexShaderSource, fragmentShaderSource);

    gl.useProgram(program);

    const attribs = {

        position: gl.getAttribLocation(program, "aPosition"),

        normal: gl.getAttribLocation(program, "aNormal")
    };

    const uniforms = {

        projection: gl.getUniformLocation(program, "uProjection"),

        modelView: gl.getUniformLocation(program, "uModelView"),

        normalMatrix: gl.getUniformLocation(program, "uNormalMatrix"),

        lightPosition: gl.getUniformLocation(program, "uLightPosition"),

        ambientLight: gl.getUniformLocation(program, "uAmbientLight"),

        diffuseLight: gl.getUniformLocation(program, "uDiffuseLight"),

        specularLight: gl.getUniformLocation(program, "uSpecularLight"),

        terrainAmbient: gl.getUniformLocation(program, "uTerrainAmbient"),

        terrainDiffuse: gl.getUniformLocation(program, "uTerrainDiffuse"),

        terrainSpecular: gl.getUniformLocation(program, "uTerrainSpecular"),

        shininess: gl.getUniformLocation(program, "uShininess")
    };

    // will need to be adjusted for merge
    function generateTerrain() {

        terrainVertices.length = 0;
        terrainNormals.length = 0;
        terrainIndices.length = 0;

        for (let z = 0; z <= terrainRows; z++) {

            for (let x = 0; x <= terrainCols; x++) {

                const px = x - terrainCols * 0.5;

                const py = 0.0;

                const pz = z - terrainRows * 0.5;

                terrainVertices.push(px);
                terrainVertices.push(py);
                terrainVertices.push(pz);

                terrainNormals.push(0.0);
                terrainNormals.push(1.0);
                terrainNormals.push(0.0);
            }
        }

        for (let z = 0; z < terrainRows; z++) {

            for (let x = 0; x < terrainCols; x++) {

                const i0 = z * (terrainCols + 1) + x;

                const i1 = i0 + 1;

                const i2 = i0 + terrainCols + 1;

                const i3 = i2 + 1;

                terrainIndices.push(i0);
                terrainIndices.push(i2);
                terrainIndices.push(i1);

                terrainIndices.push(i1);
                terrainIndices.push(i2);
                terrainIndices.push(i3);
            }
        }
    }

    function uploadTerrainBuffers() {

        terrainVertexBuffer = gl.createBuffer();

        gl.bindBuffer(gl.ARRAY_BUFFER, terrainVertexBuffer);

        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array(terrainVertices),
            gl.STATIC_DRAW
        );

        terrainNormalBuffer = gl.createBuffer();

        gl.bindBuffer(gl.ARRAY_BUFFER, terrainNormalBuffer);

        gl.bufferData(
            gl.ARRAY_BUFFER,
            new Float32Array(terrainNormals),
            gl.STATIC_DRAW
        );

        terrainIndexBuffer = gl.createBuffer();

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, terrainIndexBuffer);

        gl.bufferData(
            gl.ELEMENT_ARRAY_BUFFER,
            new Uint32Array(terrainIndices),
            gl.STATIC_DRAW
        );
    }

    // will need to be adjusted for final merge
    function updateCamera() {

        const eyeX = radius * Math.sin(theta) * Math.cos(phi);

        const eyeY = radius * Math.sin(phi);

        const eyeZ = radius * Math.cos(theta) * Math.cos(phi);

        mat4.perspective(
            projectionMatrix,
            Math.PI / 3,
            canvas.width / canvas.height,
            0.1,
            1000.0
        );

        mat4.lookAt(
            viewMatrix,
            [eyeX, eyeY, eyeZ],
            [0.0, 0.0, 0.0],
            [0.0, 1.0, 0.0]
        );

        mat4.identity(modelMatrix);

        mat4.multiply(modelViewMatrix, viewMatrix, modelMatrix);

        mat3.normalFromMat4(normalMatrix, modelViewMatrix);

        gl.uniformMatrix4fv(
            uniforms.projection,
            false,
            projectionMatrix
        );

        gl.uniformMatrix4fv(
            uniforms.modelView,
            false,
            modelViewMatrix
        );

        gl.uniformMatrix3fv(
            uniforms.normalMatrix,
            false,
            normalMatrix
        );
    }

    // push lighting
    function uploadLighting() {

        gl.uniform3fv(uniforms.lightPosition, lightPosition);

        gl.uniform3fv(uniforms.ambientLight, ambientLight);

        gl.uniform3fv(uniforms.diffuseLight, diffuseLight);

        gl.uniform3fv(uniforms.specularLight, specularLight);

        gl.uniform3fv(uniforms.terrainAmbient, terrainAmbient);

        gl.uniform3fv(uniforms.terrainDiffuse, terrainDiffuse);

        gl.uniform3fv(uniforms.terrainSpecular, terrainSpecular);

        gl.uniform1f(uniforms.shininess, shininess);
    }

    function renderTerrain() {

        gl.bindBuffer(gl.ARRAY_BUFFER, terrainVertexBuffer);

        gl.vertexAttribPointer(
            attribs.position,
            3,
            gl.FLOAT,
            false,
            0,
            0
        );

        gl.enableVertexAttribArray(attribs.position);

        gl.bindBuffer(gl.ARRAY_BUFFER, terrainNormalBuffer);

        gl.vertexAttribPointer(
            attribs.normal,
            3,
            gl.FLOAT,
            false,
            0,
            0
        );

        gl.enableVertexAttribArray(attribs.normal);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, terrainIndexBuffer);

        gl.drawElements(
            gl.TRIANGLES,
            terrainIndices.length,
            gl.UNSIGNED_INT,
            0
        );
    }

    generateTerrain();

    uploadTerrainBuffers();

    uploadLighting();

    function render() {

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        updateCamera();

        renderTerrain();

        requestAnimationFrame(render);
    }

    render();
};
