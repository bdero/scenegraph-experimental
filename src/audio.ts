const audioContext = new AudioContext();

enum SoundPlayState {Stopped, Playing, Paused}

class SoundClip {
    readonly buffer: AudioBuffer
    private bufferSource: AudioBufferSourceNode | null = null
    private startTime: number = 0
    private pausedTime: number = 0

    playState: SoundPlayState = SoundPlayState.Stopped

    constructor(buffer: AudioBuffer, play?: boolean) {
        this.buffer = buffer
        if (play) {
            this.play()
        }
    }

    isPlaying(): boolean {
        return this.playState === SoundPlayState.Playing
    }

    isStopped(): boolean {
        return this.playState === SoundPlayState.Stopped
    }

    isPaused(): boolean {
        return this.playState === SoundPlayState.Paused
    }

    getPlayState(): SoundPlayState {
        return this.playState
    }

    getElapsedTime(): number {
        if (this.isStopped()) return 0

        let elapsedTime = 0
        if (this.isPaused()) {
            elapsedTime = this.pausedTime - this.startTime
        } else {
            elapsedTime = audioContext.currentTime - this.startTime
        }
        return elapsedTime*(
            this.bufferSource as AudioBufferSourceNode
        ).playbackRate.value
    }

    play(startPosition?: number) {
        if (this.isPlaying()) return

        this.bufferSource = audioContext.createBufferSource()
        this.bufferSource.buffer = this.buffer
        this.bufferSource.connect(audioContext.destination)

        let startOffset = 0
        if (startPosition) {
            startOffset = startPosition
        } else if(this.isPaused()) {
            startOffset = this.pausedTime - this.startTime
        }
        startOffset *= this.bufferSource.playbackRate.value

        this.bufferSource.start(0, startOffset)

        const currentBuffer = this.bufferSource
        this.bufferSource.addEventListener('ended', (ev) => {
            // This callback executes whenever the buffer source is stopped for
            // any reason, whether manually or automatically. It's possible
            // that this AudioClip has already stopped and replaced the audio
            // source triggering this event, so checking is necessary.
            if (this.bufferSource === currentBuffer) {
                this.stop()
            }
        })

        this.startTime = audioContext.currentTime - startOffset
        this.playState = SoundPlayState.Playing
    }

    pause() {
        if (!this.isPlaying()) return

        this.pausedTime = audioContext.currentTime
        this.playState = SoundPlayState.Paused;
        (this.bufferSource as AudioBufferSourceNode).stop()
        this.bufferSource = null
    }

    stop() {
        if (this.isStopped()) return

        if (this.isPlaying()) {
            (this.bufferSource as AudioBufferSourceNode).stop()
            this.bufferSource = null
        }
        this.playState = SoundPlayState.Stopped
    }
}

export {audioContext, SoundClip}
