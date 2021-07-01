"use strict";
    
const svgns = "http://www.w3.org/2000/svg";

const cos = Math.cos;
const sin = Math.sin;
const π = Math.PI;

type SVGParameter = number | string

const f_matrix_times = (([[a, b], [c, d]]: [[number, number], [number, number]], [x, y]: [number, number]): [number, number] => [a * x + b * y, c * x + d * y]);

const f_rotate_matrix = ((x: number): [[number, number], [number, number]] => {
    const cosx = cos(x);
    const sinx = sin(x);
    return [[cosx, -sinx], [sinx, cosx]];
});

const f_vec_add = (([a1, a2]: [number, number], [b1, b2]: [number, number]) => [a1 + b1, a2 + b2]);

export function svg_create(type: string): SVGElement {
    return document.createElementNS(svgns, type);
}

export function svg_arc([cx, cy]: [number, number], [rx, ry]: [number, number], [t1, Δ]: [number, number], φ: number) {
    /* [
    returns a a array that represent a ellipse for SVG path element d attribute.
    cx,cy â†’ center of ellipse.
    rx,ry â†’ major minor radius.
    t1 â†’ start angle, in radian.
    Î” â†’ angle to sweep, in radian. positive.
    Ï† â†’ rotation on the whole, in radian.
    url: SVG Circle Arc http://xahlee.info/js/svg_circle_arc.html
    Version 2019-06-19
        ] */
        
    const path = document.createElementNS(svgns, "path");
    svg_update_arc(path, [cx, cy], [rx, ry], [t1, Δ], φ);
    return path;
};

export function svg_update_arc(arc: SVGElement, [cx, cy]: [number, number], [rx, ry]: [number, number], [t1, Δ]: [number, number], φ: number) {
    Δ = Δ / 180 * π;
    Δ = Δ % (2*π);
    t1 = t1 / 180 * π;
    
    const rotMatrix = f_rotate_matrix (φ);
    const [sX, sY] = ( f_vec_add ( f_matrix_times ( rotMatrix, [rx * cos(t1), ry * sin(t1)] ), [cx,cy] ) );
    const [eX, eY] = ( f_vec_add ( f_matrix_times ( rotMatrix, [rx * cos(t1+Δ), ry * sin(t1+Δ)] ), [cx,cy] ) );
    const fA = ( (  Δ > π ) ? 1 : 0 );
    const fS = ( (  Δ > 0 ) ? 1 : 0 );

    let cmd = [" M ", sX, " ", sY, " A ", rx, ry, φ / π * 180, fA, fS, eX, eY].join(" ");

    arc.setAttribute("d", cmd);
}

export function svg_rectangle(x: SVGParameter, y: SVGParameter, width: SVGParameter, height: SVGParameter, fill: string) {
    var rect = document.createElementNS(svgns, 'rect');
    svg_update_rectangle(rect, x, y, width, height, fill)
    return rect
}

export function svg_update_rectangle(rect: SVGElement, x: SVGParameter, y: SVGParameter, width: SVGParameter, height: SVGParameter, fill: string) {
    rect.setAttributeNS(null, 'x', x.toString());
    rect.setAttributeNS(null, 'y', y.toString());
    rect.setAttributeNS(null, 'height', height.toString());
    rect.setAttributeNS(null, 'width', width.toString());
    rect.setAttributeNS(null, 'fill', fill);
}

export function svg_text(x: SVGParameter, y: SVGParameter, size: SVGParameter, content: string, fill: string) {
    var element = document.createElementNS(svgns, 'text');
    element.setAttribute('x', x.toString());
    element.setAttribute('y', y.toString());
    element.setAttribute('fill', fill);
    element.setAttribute('font-size', size.toString());

    var txt = document.createTextNode(content);
    element.appendChild(txt);

    return element
}

export function svg_line(x1: SVGParameter, y1: SVGParameter, x2: SVGParameter, y2: SVGParameter, stroke: string) {
    var line = document.createElementNS(svgns, 'line');
    svg_update_line(line, x1, y1, x2, y2, stroke);
    return line;
}

export function svg_update_line(line: SVGElement, x1: SVGParameter, y1: SVGParameter, x2: SVGParameter, y2: SVGParameter, stroke: string) {
    line.setAttribute('x1',x1.toString());
    line.setAttribute('y1',y1.toString());
    line.setAttribute('x2',x2.toString());
    line.setAttribute('y2',y2.toString());
    line.setAttribute("stroke", stroke);
}