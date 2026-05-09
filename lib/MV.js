
function vec2(x, y)
}

function vec3(x, y, z)
{
    return [x, y, z];
}

function vec4(x, y, z, w)
{
    return [x, y, z, w];
}

function flatten(v)
{
    return new Float32Array(v.flat(Infinity));
}

function subtract(a, b)
{
    return [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
}

function cross(a, b)
{
    return [
        a[1]*b[2] - a[2]*b[1],
        a[2]*b[0] - a[0]*b[2],
        a[0]*b[1] - a[1]*b[0]
    ];
}

function normalize(v)
{
    var len = Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);

    return [v[0]/len, v[1]/len, v[2]/len];
}

function dot(a, b)
{
    return a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
}

function lookAt(eye, at, up)
{
    var v = normalize(subtract(at, eye));
    var n = normalize(cross(v, up));
    var u = normalize(cross(n, v));

    v = [-v[0], -v[1], -v[2]];

    return [
        vec4(n[0], u[0], v[0], 0.0),
        vec4(n[1], u[1], v[1], 0.0),
        vec4(n[2], u[2], v[2], 0.0),
        vec4(-dot(n, eye), -dot(u, eye), -dot(v, eye), 1.0)
    ];
}

function ortho(left, right, bottom, top, near, far)
{
    return [
        vec4(2/(right-left), 0, 0, 0),
        vec4(0, 2/(top-bottom), 0, 0),
        vec4(0, 0, -2/(far-near), 0),
        vec4(-(right+left)/(right-left),
             -(top+bottom)/(top-bottom),
             -(far+near)/(far-near),
             1)
    ];
}
