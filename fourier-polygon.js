'use strict'
// @ts-check

// (C) 2018 Andrew Pritchard (MIT License)

class Complex {
    constructor(re, im) {
        this.re = re;
        this.im = im;
    }

    add(other) {
        return new Complex(this.re + other.re, this.im + other.im);
    }

    downscale(divisor) {
        return new Complex(this.re / divisor, this.im / divisor);
    };

    exp() {
        return new Complex(
            Math.exp(this.re) * Math.cos(this.im),
            Math.exp(this.re) * Math.sin(this.im)
        );
    }

    mul(other) {
        return new Complex(
            this.re * other.re - this.im * other.im,
            this.re * other.im + this.im * other.re
        );
    }

    sub(other) {
        return new Complex(this.re - other.re, this.im - other.im);
    }
}

class FourierCircle {
    constructor(position, sample) {
        this.sample = sample;

        this.centre = document.createElementNS(FourierDiagram.svgNamespace, "circle");
        this.centre.setAttribute ("class", "centrePoint");
        this.centre.setAttribute ("r", "2");
        
        this.circle = document.createElementNS(FourierDiagram.svgNamespace, "circle");
        this.circle.setAttribute ("class", "bigCircle");
        this.circle.setAttribute ("r", `${Math.sqrt(this.sample.im * this.sample.im + this.sample.re * this.sample.re)}`);

        this.radius = document.createElementNS(FourierDiagram.svgNamespace, "line");
        this.radius.setAttribute ("class", "radius");

        this.update(position, this.sample);
    }

    update(position, end) {
        this.centre.setAttribute ("cx", `${position.re}`);
        this.centre.setAttribute ("cy", `${position.im}`);

        this.circle.setAttribute ("cx", `${position.re}`);
        this.circle.setAttribute ("cy", `${position.im}`);

        this.radius.setAttribute ("x1", `${position.re}`);
        this.radius.setAttribute ("y1", `${position.im}`);

        this.radius.setAttribute ("x2", `${end.re}`);
        this.radius.setAttribute ("y2", `${end.im}`);
    }
}

class FourierDiagram {
    static svgNamespace = "http://www.w3.org/2000/svg";
    static margin = 1.3;

    constructor(div, path, period) {
        this.diagram = div;
        this.period = period * path.length;
        this.polyline = path.map((point) => new Complex(point[0], point[1]));
        this.transform = FourierDiagram.getTransform(this.polyline);
    };

    static waitForFrame() {
        return new Promise((resolve) => {
            window.requestAnimationFrame((time) => resolve(time));
        });
    }

    static getTransform(polyline) {
        const N = polyline.length;
        const transform = [];
        for (var k = 0; k < N; k++) {
            var current = new Complex (0, 0);
            for (var n = 0; n < N; n++) {
                var coef = new Complex (0, 2 * Math.PI * k * n / N)
                current = current.add(coef.exp().mul(polyline[n]));
            }

            transform.push(new FourierCircle(new Complex(0, 0), current.downscale(N)));
        }
        return transform;
    }

    boundingBox() {
        let right = this.polyline[0].re;
        let left = right;
        let top = this.polyline[1].im;
        let bottom = top;
    
        this.polyline.forEach((point) => {
            left = Math.min(point.re, left);
            right = Math.max(point.re, right);
            top = Math.min(point.im, top);
            bottom = Math.max(point.im, bottom);
        })
    
        var width = (right - left) * FourierDiagram.margin;
        var height = (bottom - top) * FourierDiagram.margin;
        var length = Math.max(width, height);
        
        var x = (left + right - length) / 2;
        var y = (top + bottom - length) / 2;
        
        return `${x} ${y} ${length} ${length}`;
    };

    async draw() {
        this.diagram.innerHTML = "";

        const elemSVG = document.createElementNS(FourierDiagram.svgNamespace, "svg");
        elemSVG.setAttribute("width", "600");
        elemSVG.setAttribute("height", "600");
        elemSVG.setAttribute("viewBox", this.boundingBox());
        this.diagram.appendChild(elemSVG);

        this.transform.forEach((circle) => {
            elemSVG.appendChild(circle.centre);
            elemSVG.appendChild(circle.circle);
            elemSVG.appendChild(circle.radius);
        });

        const endCircle = document.createElementNS(FourierDiagram.svgNamespace, "circle");
        endCircle.setAttribute("class", "endCircle");
        endCircle.setAttribute("cx", "0");
        endCircle.setAttribute("cy", "0");
        endCircle.setAttribute("r", "4");
        elemSVG.appendChild(endCircle);

        const traceLine = document.createElementNS(FourierDiagram.svgNamespace, "polyline");
        traceLine.setAttribute("class", "traceLine");
        traceLine.setAttribute("points", "0,0 ");
        elemSVG.appendChild (traceLine);

        let tracedPath = "";
        let time = await FourierDiagram.waitForFrame();
        const endTime = time + this.period;

        while (time < endTime) {
            let acc = new Complex (0, 0);

            const n = time % this.period;
            const N = this.transform.length;
            const nyquist = Math.floor(this.transform.length / 2);

            this.transform.forEach((circle, k) => {
                if (k > nyquist) {
                    k -= N;
                }

                const oldAcc = acc;
                const angle = new Complex (0, 2 * Math.PI * k * n / this.period);
                acc = acc.add(angle.exp().mul(circle.sample));

                circle.update(oldAcc, acc);
            });

            endCircle.setAttribute ("cx", acc.re);
            endCircle.setAttribute ("cy", acc.im);

            tracedPath += ` ${acc.re},${acc.im}`;
            traceLine.setAttribute ("points", tracedPath);

            time = await FourierDiagram.waitForFrame();
        }
    }
}
