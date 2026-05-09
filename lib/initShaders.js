
function initShaders(gl, vertexShaderId, fragmentShaderId)
{
    var vertElem = document.getElementById(vertexShaderId);
    var fragElem = document.getElementById(fragmentShaderId);

    var vertShdr = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertShdr, vertElem.text);
    gl.compileShader(vertShdr);

    if (!gl.getShaderParameter(vertShdr, gl.COMPILE_STATUS))
    {
        alert(gl.getShaderInfoLog(vertShdr));
        return -1;
    }

    var fragShdr = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragShdr, fragElem.text);
    gl.compileShader(fragShdr);

    if (!gl.getShaderParameter(fragShdr, gl.COMPILE_STATUS))
    {
        alert(gl.getShaderInfoLog(fragShdr));
        return -1;
    }

    var program = gl.createProgram();

    gl.attachShader(program, vertShdr);
    gl.attachShader(program, fragShdr);

    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
    {
        alert(gl.getProgramInfoLog(program));
        return -1;
    }

    return program;
}
