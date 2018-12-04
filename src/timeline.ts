import * as THREE from "three";
import {Entity, PROPERTY_PATH_REGEX} from "./scene";

interface EntityProperties {
    [propertyPath: string]: EntityProperty
}

interface EntityProperty {
    enabled: boolean
    object: EntityPropertyObject | null
    property: string | null
    timeline: PropertyTimeline
}

interface EntityPropertyObject {
    [property: string]: any
}

interface Keyframes {
    [time: number]: Keyframe
}

interface Keyframe {
    value: number
}

interface Event {
    callback: EventCallback
}

type EventCallback = () => void

enum TimelinePlayState {Stopped, Playing, Paused}

class PropertyTimeline {
    public sortedTimes: number[] = []
    public keyframes: Keyframes = {}
    public length: number = 0

    private cursor: number = 0

    addKeyframe(time: number, value: number) {
        this.keyframes[time] = {value: value}
        this.sortedTimes.push(time)
        this.sortedTimes.sort()
        this.updateLength()
    }

    removeKeyframe(time: number) {
        delete this.keyframes[time]
        this.sortedTimes.splice(
            this.sortedTimes.indexOf(time), 1)
        const lastKeyframe = this.sortedTimes.length - 1

        if (this.cursor != 0 && this.cursor > lastKeyframe) {
            this.cursor = lastKeyframe
        }

        this.updateLength()
    }

    private updateLength() {
        this.length = this.sortedTimes[this.sortedTimes.length - 1]
    }

    getValue(time: number): number | null {
        // If there are no keyframes at all, don't control the value.
        if (this.sortedTimes.length === 0) return null

        // Seek the cursor to to closest keyframe <= to the current time. This
        // linear searches from the current cursor location to the correct
        // keyframe. The intention here is to optimize to O(1) for the use case
        // of querying times rapidly over small increments (which is what the
        // Timeline does).
        if (this.sortedTimes[this.cursor] > time) {
            // Cursor needs to be pushed to the past.
            do {
                if (this.cursor === 0) {
                    // If the time being queried is before the first keyframe,
                    // return the value of the first keyframe.
                    return this.keyframes[this.sortedTimes[this.cursor]].value
                }
                --this.cursor
            } while (this.sortedTimes[this.cursor] > time)
        } else {
            // Cursor might need to be pushed to the future.
            while (
                // Cursor is not on the last keyframe
                this.sortedTimes.length - 1 > this.cursor
                // and the time of the next keyframe is <= the queried time
                && this.sortedTimes[this.cursor + 1] <= time
            ) {
                ++this.cursor
            }
            if (this.cursor === this.sortedTimes.length - 1) {
                // If the time being queried is greater than or equal to the
                // time of the last keyframe, return the value of the last
                // keyframe.
                return this.keyframes[this.sortedTimes[this.cursor]].value
            }
        }
        if (time === this.sortedTimes[this.cursor]) {
            return this.keyframes[this.sortedTimes[this.cursor]].value
        }
        // At this point, we can be sure that the time being queried sits
        // between two keyframes, and that the cursor is placed on the first of
        // them (in ascending time order).
        const k0 = this.sortedTimes[this.cursor]
        const k1 = this.sortedTimes[this.cursor + 1]
        const linearTime = (time - k0)/(k1 - k0)

        // TODO: Pass lineartime through a chosen curve function.

        return this.keyframes[k0].value + linearTime*(
            this.keyframes[k1].value - this.keyframes[k0].value)
    }
}

class Timeline {
    public loop: boolean

    private entity: Entity | null = null
    private entityProperties: EntityProperties = {}
    private entityPropertiesList: EntityProperty[] = []

    private sortedEventTimes: number[] = []
    // The first index is the time lookup, each of which has an array of events
    // registered for that time.
    private events: Array<Array<Event>> = []
    private eventCursor: number | null = null

    private playState: TimelinePlayState = TimelinePlayState.Stopped

    private startTime: number = 0
    private pausedTime: number = 0

    // The time of the latest scheduled keyframe or event. This value is
    // computed directly from getLength() whenever timeline elements are
    // updated for caching purposes.
    private length: number = 0

    private static getTimestamp() {
        return Date.now()/1000
    }

    constructor(loop: boolean = false) {
        this.loop = loop
    }

    play(startPosition?: number) {
        if (this.playState === TimelinePlayState.Playing) return

        let startOffset = 0
        if (startPosition) {
            startOffset = startPosition
        } else if(this.playState === TimelinePlayState.Paused) {
            startOffset = this.pausedTime - this.startTime
        }

        this.startTime = Timeline.getTimestamp() - startOffset
        this.playState = TimelinePlayState.Playing
    }

    pause() {
        if (this.playState !== TimelinePlayState.Playing) return

        this.pausedTime = Timeline.getTimestamp()
        this.playState = TimelinePlayState.Paused
    }

    stop() {
        this.playState = TimelinePlayState.Stopped
    }

    update() {
        if (this.playState === TimelinePlayState.Stopped) return

        const timeElapsed = this.getTimeElapsed()
        for (let i = 0, l = this.entityPropertiesList.length; i < l; ++i) {
            const property = this.entityPropertiesList[i]
            if (property.enabled) {
                (property.object as EntityPropertyObject)[
                    property.property as string
                ] = property.timeline.getValue(timeElapsed);
            }
        }
        if (this.sortedEventTimes.length > 0) {
            while (
                // Cursor is null and there's one that exists
                (this.eventCursor == null && this.sortedEventTimes.length)
                // Or the cursor is assigned but it's not to the last event's
                // time.
                || (this.eventCursor != null
                    && this.sortedEventTimes.length - 1 < this.eventCursor)
            ) {
                let nextCursor =
                    this.eventCursor === null ? 0 : this.eventCursor + 1
                if (timeElapsed < this.sortedEventTimes[nextCursor]) {
                    break
                }
                this.eventCursor = nextCursor
                this.events[this.sortedEventTimes[nextCursor]].forEach(
                    (event) => {
                        event.callback()
                    }
                )
            }
        }
        if (timeElapsed >= this.length) {
            if (this.loop) {
                this.startTime = Timeline.getTimestamp() - (
                    timeElapsed - this.length)
                this.eventCursor = null
                this.update()
            } else {
                this.stop()
            }
        }
    }

    getTimeElapsed(): number {
        if (this.playState === TimelinePlayState.Stopped) return 0
        if (this.playState === TimelinePlayState.Paused)
            return this.pausedTime - this.startTime

        return Timeline.getTimestamp() - this.startTime
    }

    /** Get the total length of this timeline in seconds. */
    getLength(): number {
        return Math.max(
            this.sortedEventTimes.length === 0 ?
                0 : this.sortedEventTimes[this.sortedEventTimes.length - 1],
            ...this.entityPropertiesList.map((value) => {
                return value.timeline.length
            })
        )
    }

    private updateLengthCache() {
        this.length = this.getLength()
    }

    bindToEntity(entity: Entity) {
        if (this.entity !== null) {
            throw new Error(
                `Unable to bind timeline to entity ` +
                `"${entity.sceneObject.name}" because it's already bound to ` +
                `an entity (with name: ${this.entity.sceneObject.name}).`)
        }
        this.entity = entity
        this.resolveAllProperties()
    }

    private resolveProperty(path: string) {
        if (this.entity === null) return
        const property = this.entityProperties[path]
        if (property.enabled) return

        if (!(path.match(PROPERTY_PATH_REGEX))) {
            throw new Error(
                `Unable to resolve property path "${path}"; it doesn't ` +
                `validate against the property path format.`)
        }

        const [scenePathString, propertyPathString] = path.split(':')
        const scenePath = scenePathString.split('/')
        const propertyPath = propertyPathString.split('.')

        let currentEntity = this.entity
        let focusObject: any = currentEntity.sceneObject
        let currentName = focusObject.name
        while (scenePath.length > 0) {
                const next: string = scenePath.shift() as string
                if (!(next in currentEntity.children)) {
                    throw new Error(
                        `Unable to resolve property path "${path}"; entity ` +
                        `"${currentName}" has no child entity named ` +
                        `"${next}".`)
                }
                currentEntity = currentEntity.children[next]
                focusObject = currentEntity.sceneObject
                currentName = focusObject.name
        }
        let propertyName: string = ''
        while (propertyPath.length > 0) {
            propertyName = propertyPath.shift() as string
            if (!focusObject.hasOwnProperty(propertyName)) {
                throw new Error(
                    `Unable to resolve property path "${path}"; object ` +
                    `"${currentName}" has no property named ` +
                    `"${propertyName}".`)
            }
            if (propertyPath.length === 0) continue

            focusObject = focusObject[propertyName]
            currentName = propertyName
        }

        property.object = focusObject
        property.property = propertyName
        property.enabled = true
    }

    private resolveAllProperties() {
        Object.keys(this.entityProperties).forEach(name => {
            this.resolveProperty(name)
        });
    }

    addKeyframe(time: number, propertyPath: string, value: number) {
        if (!(propertyPath.match(PROPERTY_PATH_REGEX))) {
            throw new Error(
                `Unable to add keyframe for property path "${propertyPath}" ` +
                `because it's not a valid property path.`)
        }
        if (!(propertyPath in this.entityProperties)) {
            const newProperty = {
                enabled: false,
                object: null,
                property: null,
                timeline: new PropertyTimeline()
            }
            this.entityProperties[propertyPath] = newProperty
            this.entityPropertiesList.push(newProperty)
        }
        const property = this.entityProperties[propertyPath]
        if (property.timeline.keyframes[time]) {
            throw new Error(
                `Unable to add keyframe for property path "${propertyPath}" ` +
                `at time "${time}" because a keyframe matching that ` +
                `property and time has already been set.`)
        }
        property.timeline.addKeyframe(time, value)
        this.resolveProperty(propertyPath)

        this.updateLengthCache()
    }

    removeKeyframe(time: number, propertyPath: string) {
        const property = this.entityProperties[propertyPath]
        if (!property) {
            throw new Error(
                `Unable to remove keyframe for property path ` +
                `"${propertyPath}" at time "${time}" because there are no ` +
                `keyframes registed for property "${propertyPath}".`)
        }
        if (!property.timeline.keyframes[time]) {
            throw new Error(
                `Unable to remove keyframe for property path ` +
                `"${propertyPath}" at time "${time}" because is no keyframe ` +
                `registered at time "${time}" for property "${propertyPath}".`)
        }
        property.timeline.removeKeyframe(time)

        this.updateLengthCache()
    }

    addEvent(time: number, callback: EventCallback) {
        if (!this.events[time]) {
            this.events[time] = []
        }
        if (!this.sortedEventTimes.includes(time)) {
            this.sortedEventTimes.push(time)
            this.sortedEventTimes.sort()
        }
        this.events[time].push({callback: callback})

        this.updateLengthCache()
    }
}

export default Timeline
