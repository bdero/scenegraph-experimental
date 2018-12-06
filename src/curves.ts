// Essentially, these are rederived/simplified versions of Penner's easing
// functions.

type CurveFunction = (t: number) => number
type CurveFunctionCollection = {[name: string]: CurveFunction}

function assignCollection<T extends CurveFunctionCollection>(arg: T): T {
    return arg
}

const Curves = assignCollection({
    linear(t: number): number {
        return t
    },
    easeInQuad(t: number): number {
        return t*t
    },
    outQuad(t: number): number {
        return -t*(t - 2)
    },
    easeInOutQuad(t: number): number {
        if (t < 0.5)
            return 2*t*t
        return -2*t*(t - 2) - 1
    },
    easeInCubic(t: number): number {
        return t*t*t
    },
    outCubic(t: number): number {
        const tx = t - 1
        return tx*tx*tx + 1
    },
    easeInOutCubic(t: number): number {
        if (t < 0.5)
            return 4*t*t*t
        const tx = t - 1
        return 4*tx*tx*tx + 1
    },
    easeInQuart(t: number): number {
        return t*t*t*t
    },
    outQuart(t: number): number {
        const tx = t - 1
        return -tx*tx*tx*tx + 1
    },
    easeInOutQuart(t: number): number {
        if (t < 0.5)
            return 8*t*t*t*t
        const tx = t - 1
        return -8*tx*tx*tx*tx + 1
    },
    easeInQuint(t: number): number {
        return t*t*t*t*t
    },
    outQuint(t: number): number {
        const tx = t - 1
        return 16*tx*tx*tx*tx*tx + 1
    },
    easeInOutQuint(t: number): number {
        if (t < 0.5)
            return 16*t*t*t*t*t
        const tx = t - 1
        return 16*tx*tx*tx*tx*tx + 1
    },
    easeInSine(t: number): number {
        return -Math.cos(t*Math.PI/2) + 1
    },
    outSine(t: number): number {
        return Math.sin(t*Math.PI/2)
    },
    easeInOutSine(t: number): number {
        return -(Math.cos(t*Math.PI) - 1)/2
    },
    easeInExpo(t: number): number {
        return t == 0 ? 0 : Math.pow(2, 10*(t - 1))
    },
    outExpo(t: number): number {
        return t == 1 ? 1 : -Math.pow(2, -10*t) + 1
    },
    easeInOutExpo(t: number): number {
        if (t == 0) return 0
        if (t == 1) return 1
        if (t < 0.5)
            return Math.pow(2, 10*(2*t - 1))/2
        return -Math.pow(2, -10*(2*t - 1))/2 + 1
    },
    easeInCirc(t: number): number {
        return -Math.sqrt(1 - t*t) + 1
    },
    outCirc(t: number): number {
        const tx = t - 1
        return Math.sqrt(1 - tx*tx)
    },
    easeInOutCirc(t: number): number {
        if (t < 0.5)
            return -(Math.sqrt(1 - 4*t*t) + 1)/2
        const tx = t - 1
        return (Math.sqrt(1 - 4*tx*tx) + 1)/2
    },
    /**
     * @param overshoot The "overshoot" parameter defaults to a constant that
     *     results in the local minimum of the function being -0.1 (in other
     *     words, a 10% overshoot, just like other implementations that can be
     *     found around the web). A value of 0 will yield the same result as
     *     "inCubic".
     */
    easeInBack(t: number, overshoot: number = 1.7015401988668): number {
        return t*t*(t*(overshoot + 1) - overshoot)
    },
    /**
     * @param overshoot The "overshoot" parameter defaults to a constant that
     *     results in the local maximum of the function being 1.1 (in other
     *     words, a 10% overshoot, just like other implementations that can be
     *     found around the web). A value of 0 will yield the same result as
     *     "inCubic".
     */
    outBack(t: number, overshoot: number = 1.7015401988668): number {
        const tx = t - 1
        return tx*tx*(tx*(overshoot + 1) + overshoot) + 1;
    },
    /**
     * @param overshoot The "overshoot" parameter defaults to a constant that
     *     results in the local minimum and maximum of the function being -0.1
     *     and 1.1 respectively (in other words, a 10% overshoot, just like
     *     other implementations that can be found around the web). A value of
     *     0 will yield the same result as "inCubic".
     */
    easeInOutBack(t: number, overshoot: number = 1.7015401988668): number {
        if (t < 0.5) {
            const tx = t*2
            return (t*t*(t*(overshoot + 1) - overshoot))/2
        }
        const tx = t*2 - 2
        return (tx*tx*(tx*(overshoot + 1) + overshoot) + 2)/2
    },

})

type CurveKey = keyof typeof Curves

export {CurveFunction, Curves, CurveKey}
