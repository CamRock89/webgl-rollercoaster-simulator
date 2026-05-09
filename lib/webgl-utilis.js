var WebGLUtils = {

    setupWebGL: function(canvas)
    {
        return canvas.getContext("webgl") ||
               canvas.getContext("experimental-webgl");
    }
};

window.requestAnimFrame = (function()
{
    return window.requestAnimationFrame ||
           window.webkitRequestAnimationFrame ||
           window.mozRequestAnimationFrame ||
           function(callback)
           {
               window.setTimeout(callback, 1000/60);
           };
})();
