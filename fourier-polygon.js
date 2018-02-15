'use strict'
var FourierDiagram = function () {
    
var Complex = function (re, im) {
    this.re = re;
    this.im = im;
};
Complex.prototype.add = function (other) {
    this.re += other.re;
    this.im += other.im;
    return this;
};
Complex.prototype.sub = function (other) {
    this.re -= other.re;
    this.im -= other.re;
    return this;
};
Complex.prototype.mul = function (other) {
    var re = (this.re * other.re) - (this.im * other.im);
    var im = (this.re * other.im) + (this.im * other.re);
    this.re = re;
    this.im = im;
    return this;
};
Complex.prototype.exp = function () {
    var re = Math.exp(this.re) * Math.cos(this.im);
    var im = Math.exp(this.re) * Math.sin(this.im);
    this.re = re;
    this.im = im;
    return this;
};

Complex.mul = function (a, b) {
    var re = (a.re * b.re) - (a.im * b.im);
    var im = (a.re * b.im) + (a.im * b.re);
    return new Complex (re, im);
};

var FourierDiagram = function (div, path, period) {
    
    this.diagram = div;
    this.period = period * path.length;
    
    this.polyline = [];
    for (var i = 0; i < path.length; i++) {
        var point = path[i];
        this.polyline.push (new Complex(point[0], point[1]));
    }
    
    this.transform = [];
    this.centres = [];
    this.circles = [];
    this.svgPolyLine = null;
    this.endCircle = null;
    this.traced = null;
    
    this.tracedPath = "";
    this.endTime = null;
    
    this.updateTransform();
};
FourierDiagram.prototype.NS = "http://www.w3.org/2000/svg"
FourierDiagram.prototype.margin = 1.3;
FourierDiagram.prototype.updateTransform = function () {
    var N = this.polyline.length;
    var transform = [];
    for (var k = 0; k < N; k++) {
        var current = new Complex (0, 0);
        for (var n = 0; n < N; n++) {
            var coef = new Complex (0, (-2) * Math.PI * k * n / N)
            current.add(coef.exp().mul(this.polyline[n]));
        }
        transform.push(current);
    }
    this.transform = transform;
};
FourierDiagram.prototype.bbox = function () {
    var right = this.polyline[0].re;
    var left = right;
    var upper = this.polyline[1].im;
    var lower = upper;
    
    for (var i = 0; i < this.polyline.length; i++) {
        left = this.polyline[i].re < left ? this.polyline[i].re : left;
        right = this.polyline[i].re > right ? this.polyline[i].re : right;
        upper = this.polyline[i].im > upper ? this.polyline[i].im : upper;
        lower = this.polyline[i].im < lower ? this.polyline[i].im : lower;
    }
    var width = Math.abs (left - right);
    var height = Math.abs (upper - lower);
    
    var x = (left + right) / 2
    var y = (upper + lower) / 2
    
    var length = width > height ? width : height;
    
    return "" + (x - (length * this.margin / 2)) + " " + 
        (y - (length * this.margin/ 2)) + " " +
        (length * this.margin) + " " +
        (length * this.margin);
};
FourierDiagram.prototype.draw = function (period) {
    this.diagram.innerHTML = "";
        
    var elemSVG = document.createElementNS(this.NS, "svg");
    elemSVG.setAttribute ("width", "600");
    elemSVG.setAttribute ("height", "600");
    elemSVG.setAttribute ("viewBox", this.bbox());
    
    this.diagram.appendChild (elemSVG);
    
    this.centres = [];
    this.circles = [];
    
    for (var i = 0; i < this.transform.length; i++) {
        var x = this.transform[i].re / this.transform.length;
        var y = this.transform[i].im / this.transform.length;
        var mag = Math.sqrt (x * x + y * y);
        
        var centre = document.createElementNS(this.NS, "circle");
        centre.setAttribute ("class", "centrePoint");
        centre.setAttribute ("cx", 0);
        centre.setAttribute ("cy", 0);
        centre.setAttribute ("r", "2");
        
        elemSVG.appendChild (centre);
        this.centres.push(centre);
        
        var circle = document.createElementNS(this.NS, "circle");
        circle.setAttribute ("class", "bigCircle");
        circle.setAttribute ("cx", 0);
        circle.setAttribute ("cy", 0);
        circle.setAttribute ("r", mag);
        
        elemSVG.appendChild (circle);
        this.circles.push(circle);
    }
    
    var endCircle = document.createElementNS(this.NS, "circle");
    endCircle.setAttribute ("class", "endCircle");
    endCircle.setAttribute ("cx", "0");
    endCircle.setAttribute ("cy", "0");
    endCircle.setAttribute ("r", "4");
    
    elemSVG.appendChild(endCircle);
    this.endCircle = endCircle;
    
    var polyline = document.createElementNS(this.NS, "polyline");
    polyline.setAttribute ("points", "0,0 ");
        
    elemSVG.appendChild (polyline);
    this.svgPolyLine = polyline;
    
    var traceline = document.createElementNS(this.NS, "polyline");
    traceline.setAttribute ("class", "traceLine");
    traceline.setAttribute ("points", "0,0 ");
        
    elemSVG.appendChild (traceline);
    this.traced = traceline;
    
    this.tracedPath = "";
    
    window.requestAnimationFrame(this.animate.bind(this));
};

FourierDiagram.prototype.animate = function (time) {
    var acc = new Complex (0, 0);
    var polyString = "0,0 ";
    
    var n = time % this.period;
    var N = this.transform.length;
    
    var nyquist = Math.floor (N / 2);
    
    var k = 0;
    
    for (var i = 0; i < N; k++, i++) {
        
        var x = acc.re / N;
        var y = acc.im / N;
        
        polyString += "" + x + "," + y + " ";
        
        this.circles[i].setAttribute ("cx", x);
        this.circles[i].setAttribute ("cy", y);
        
        this.centres[i].setAttribute ("cx", x);
        this.centres[i].setAttribute ("cy", y);
        
        if (i === nyquist) {
            k -= N;
        }
        
        var coef = new Complex (0, (-2) * Math.PI * k * n / this.period);
        acc.add(coef.exp().mul(this.transform[i]));
    }
    
    x = acc.re / N;
    y = acc.im / N;
    
    polyString += "" + x + "," + y;
    this.svgPolyLine.setAttribute ("points", polyString);
    
    this.endCircle.setAttribute ("cx", x);
    this.endCircle.setAttribute ("cy", y);
    
    this.tracedPath += " " + x + "," + y;
    this.traced.setAttribute ("points", this.tracedPath);
    
    if (this.endTime === null) {
        this.endTime = time + this.period;
    }
    
    if (time > this.endTime) {
        this.endTime = null;
        return;
    }
    
    window.requestAnimationFrame (this.animate.bind(this));
};

return FourierDiagram;
}();