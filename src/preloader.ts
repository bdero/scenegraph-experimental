import {audioContext} from './audio'

interface AssetURLs {
    [assetName: string]: string
}

interface AssetLibrary {
    [assetName: string]: AudioBuffer
}

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

    addPreloadItems(items: AssetURLs) {
        this.preloadAssets = {...this.preloadAssets, ...items}
    }
    fetch(): Promise<AssetLibrary> {
        const promises: Array<Promise<AssetLibrary>> = []
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
                            `Unable to preload asset "${result.url}" with ` +
                            `no file type.`)
                    }

                    if (fileType === 'ogg') {
                        return (
                            result.arrayBuffer()
                            .then(value => audioContext.decodeAudioData(value))
                            .then(buffer => {
                                return {[assetName]: buffer} as AssetLibrary
                            })
                        )
                    }

                    return Promise.reject(
                        `Unable to preload asset "${result.url}" with ` +
                        `unknown file type "${fileType}".`)
                })
            )
        });
        return (
            Promise.all(promises)
            .then(values => {
                if (values.length === 0) return {}
                if (values.length < 2) return values[0]
                return Object.assign(values[0], ...values.slice(1))
            })
        )
    }
}

export default Preloader
