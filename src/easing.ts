// Essentially, these are rederived/simplified versions of Penner's easing
// functions.

type EasingFunction = (t: number) => number
type EasingFunctionCollection = {[name: string]: EasingFunction}

function createEasingCollection<T extends EasingFunctionCollection>(arg: T): T {
    return arg
}

const EasingFunctions = createEasingCollection({

    linear(t: number): number {
        return t
    },
    inQuad(t: number): number {
        return t*t
    },
    outQuad(t: number): number {
        return -t*(t - 2)
    },
    inOutQuad(t: number): number {
        if (t < 0.5)
            return 2*t*t
        return -2*t*(t - 2) - 1
    },
    inCubic(t: number): number {
        return t*t*t
    },
    outCubic(t: number): number {
        const tx = t - 1
        return tx*tx*tx + 1
    },
    inOutCubic(t: number): number {
        if (t < 0.5)
            return 4*t*t*t
        const tx = t - 1
        return 4*tx*tx*tx + 1
    },
    inQuart(t: number): number {
        return t*t*t*t
    },
    outQuart(t: number): number {
        const tx = t - 1
        return -tx*tx*tx*tx + 1
    },
    inOutQuart(t: number): number {
        if (t < 0.5)
            return 8*t*t*t*t
        const tx = t - 1
        return -8*tx*tx*tx*tx + 1
    },
    inQuint(t: number): number {
        return t*t*t*t*t
    },
    outQuint(t: number): number {
        const tx = t - 1
        return 16*tx*tx*tx*tx*tx + 1
    },
    inOutQuint(t: number): number {
        if (t < 0.5)
            return 16*t*t*t*t*t
        const tx = t - 1
        return 16*tx*tx*tx*tx*tx + 1
    },
    inSine(t: number): number {
        return -Math.cos(t*Math.PI/2) + 1
    },
    outSine(t: number): number {
        return Math.sin(t*Math.PI/2)
    },
    inOutSine(t: number): number {
        return -(Math.cos(t*Math.PI) - 1)/2
    }
})

type EasingFunctionKey = keyof typeof EasingFunctions

export {EasingFunction, EasingFunctions, EasingFunctionKey}
