import * as THREE from "three";
import {Entity, PROPERTY_PATH_REGEX} from "./scene";

interface EntityProperties {
    [propertyPath: string]: EntityProperty
}

interface EntityProperty {
    enabled: boolean
    object: object | null
    property: string | null
    keyframes: Keyframes
}

/** A collection of keyframes over a single property. */
interface Keyframes {
    [time: number]: Keyframe
    sortedTimes: number[]
}

interface Keyframe {
    value: number
}

enum TimelinePlayState {Stopped, Playing, Paused}

class Timeline {
    private entity: Entity | null = null
    private entityProperties: EntityProperties = {}
    private playState: TimelinePlayState = TimelinePlayState.Stopped

    private startTime: number = 0
    private pausedTime: number = 0

    private static getTimestamp() {
        return Date.now()/1000
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


    }

    getElapsedTime(): number {
        if (this.playState === TimelinePlayState.Stopped) return 0
        if (this.playState === TimelinePlayState.Paused)
            return this.pausedTime - this.startTime

        return Timeline.getTimestamp() - this.startTime
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
            this.entityProperties[propertyPath] = {
                enabled: false,
                object: null,
                property: null,
                keyframes: {
                    sortedTimes: []
                }
            }
        }
        const property = this.entityProperties[propertyPath]
        if (property.keyframes[time]) {
            throw new Error(
                `Unable to add keyframe for property path "${propertyPath}" ` +
                `at time "${time}" because a keyframe matching that ` +
                `property and time has already been set.`)
        }
        property.keyframes[time] = {value: value}
        property.keyframes.sortedTimes.push(time)
        property.keyframes.sortedTimes.sort()
        this.resolveProperty(propertyPath)
    }
}

export default Timeline
