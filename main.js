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

    function render() {

        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        requestAnimationFrame(render);
    }

    render();
};
