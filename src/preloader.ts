import {audioContext} from './audio'

interface AssetURLs {
    [assetName: string]: string
}

interface AssetLibrary {
    [assetName: string]: AudioBuffer
}

interface ProgressStats {
    /** The total number of items enqueued for preloading. */
    readonly totalItems: number
    /** The total number of items. */
    readonly loadedItems: number
    /** Floating point range between 0 and 1. */
    readonly percentage: number
}

declare type ProgressCallback = (progress: ProgressStats) => void

function getFileType(url: string): string | null {
    const split = url.split('.')
    if (split.length < 2) {
        return null
    }
    return split[split.length - 1]
}

/**
 * Allows for asynchronously loading a group of assets, keeping track of
 * progress.
 */
class Preloader {
    private preloadAssets: AssetURLs = {}
    private loadedItems: AssetLibrary = {}
    private preloadPromise: Promise<Readonly<AssetLibrary>> | null = null

    private numTotalItems: number = 0
    private numLoadedItems: number = 0

    private progressCallback: ProgressCallback | null = null

    constructor(progressCallback?: ProgressCallback) {
        this.progressCallback = progressCallback || null
    }

    isPreloading() {
        return this.preloadPromise !== null
    }

    addPreloadItems(items: AssetURLs) {
        if (this.isPreloading()) {
            throw new Error(
                'Unable to enqueue items to a preloader that has already ' +
                'started fetching.')
        }
        this.numTotalItems += Object.keys(items).length
        this.preloadAssets = Object.assign(this.preloadAssets, items)
    }

    getProgress(): ProgressStats {
        return {
            totalItems: this.numTotalItems,
            loadedItems: this.numLoadedItems,
            percentage: this.numLoadedItems/this.numTotalItems
        }
    }

    fetch(): Promise<Readonly<AssetLibrary>> {
        if (this.preloadPromise !== null) return this.preloadPromise

        this.preloadPromise = new Promise((resolve, reject) => {
            const promises: Array<Promise<void>> = []
            Object.keys(this.preloadAssets).forEach(assetName => {
                const url = this.preloadAssets[assetName]
                promises.push(
                    fetch(url)
                    .then(result => {
                        if (result.status !== 200) {
                            return Promise.reject(
                                `Fetch for URL "${result.url}" returned ` +
                                `unexpected status code "${result.status}".`)
                        }
                        const fileType = getFileType(result.url)
                        if (fileType === null) {
                            return Promise.reject(
                                `Unable to preload asset "${result.url}" ` +
                                `with no file type.`)
                        }

                        if (fileType === 'ogg') {
                            return (
                                result.arrayBuffer()
                                .then(value => audioContext.decodeAudioData(
                                    value))
                                .then(buffer => {
                                    return {[assetName]: buffer}
                                })
                            )
                        }

                        return Promise.reject(
                            `Unable to preload asset "${result.url}" with ` +
                            `unknown file type "${fileType}".`)
                    })
                    .then((items: AssetLibrary) => {
                        Object.keys(items).forEach((name) => {
                            this.numLoadedItems += 1
                            this.loadedItems[name] = items[name]
                        })
                        if (this.progressCallback !== null) {
                            this.progressCallback(this.getProgress())
                        }
                    })
                )
            });

            // Resolve or reject the promise once all of the items are loaded,
            // or at least one of them fails.
            Promise.all(promises)
            .then(_ => this.loadedItems as Readonly<AssetLibrary>)
            .then(value => resolve(value))
            .catch(value => reject(value))
        })

        return this.preloadPromise
    }
}

export default Preloader
