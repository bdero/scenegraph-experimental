import * as THREE from 'three'
import {renderer, canvas} from './renderer'
import Timeline from './timeline'

const ENTITY_NAME_PATTERN =
    '[0-9a-zA-Z_]|([0-9a-zA-Z_]+[0-9a-zA-Z_\\s]*?[0-9a-zA-Z_])'
const VAR_PATTERN = '[a-zA-Z_$]+[0-9a-zA-Z_$]*'
/**
 * Property path strings consist of two subsections, separated by a colon (:):
 *     1) a slash (/) delimited path of entity names in the scene
 *            Example: `child/grandchild/great grandchild`
 *     2) a dot (.) delimited object property path
 *            Example: `position.z`
 *
 *     Example: `path/to my/object:rotation.x`
 */
const PROPERTY_PATH_REGEX = new RegExp(
    `^(${ENTITY_NAME_PATTERN})+(\\/(${ENTITY_NAME_PATTERN})+)*:` +
    `${VAR_PATTERN}(\\.${VAR_PATTERN})*$`)

declare type Camera = THREE.PerspectiveCamera | THREE.OrthographicCamera

interface EntityChildren {
    [name: string]: Entity
}

interface Timelines {
    [name: string]: Timeline
}

/**
 * Wrapper for THREE.Object3D which provides uniqueness constraints along with
 * a meta graph for efficient querying of objects within the scene.
 *
 * Entities can also have Timelines attached to them, which can take control of
 * any property values within the ThreeJS scene
 */
class Entity {
    public sceneObject: THREE.Object3D

    public parent: Entity | null = null
    public children: EntityChildren = {}
    public timelines: Timelines = {}

    constructor(sceneObject: THREE.Object3D) {
        this.sceneObject = sceneObject
        if (sceneObject.children.length > 0) {
            throw new Error(
                `Unable to create Entity from scene object because it ` +
                `already has children in the scene graph.`)
        }
    }

    getAllTimelines(): Timeline[] {
        const entities: Entity[] = [this]
        const timelines: Timeline[] = []
        // Do an iterative BFS and collect all of the timelines.
        while (entities.length > 0) {
            const entity = entities.shift() as Entity
            timelines.push(...Object.values(entity.timelines))
            entities.push(...Object.values(entity.children))
        }
        return timelines
    }

    /**
     * Returns the scene that this entity is currently a member of, or returns
     * null when the root node is not a scene.
     */
    getScene(): Scene | null {
        const root = this.getRoot()
        if (root instanceof Scene) return root
        return null
    }

    /**
     * Returns the top-most node of this entity's entity tree. Note that this
     * Entity may or may not be a Scene node.
     */
    getRoot(): Entity {
        let entity: Entity = this
        while (this.parent !== null) {
            entity = this.parent
        }
        return entity
    }

    add(object: Entity | THREE.Object3D): Entity {
        if (object instanceof THREE.Object3D) {
            object = new Entity(object)
        }

        // Calculate a unique name.
        let name = object.sceneObject.name
        let nameNumber = 0
        const initialName = name
        while (name in this.children) {
            nameNumber += 1
            name = `${initialName}${nameNumber}`
        }
        object.sceneObject.name = name

        // Ensure that all entities be part of one scene graph.
        if (object.sceneObject.parent !== null) {
            throw new Error(
                `Unable to add object "${name}" as a child of ` +
                `"${this.sceneObject.name}" because it's already a child of ` +
                `another object "${object.sceneObject.parent.name}".`)
        }

        // Add the object as a child in the Three.js scene.
        this.sceneObject.add(object.sceneObject)
        // Link the new child to the meta graph.
        object.parent = this
        this.children[name] = object

        // If this node is within a scene, collect all timelines within the
        // child entity and register them as part of the scene.
        const scene = this.getScene()
        if (scene !== null) {
            const timelines = object.getAllTimelines()
            scene.registerSceneTimelines(...timelines)
        }

        return object
    }

    remove(object: string | Entity) {
        if (object instanceof Entity) {
            object = object.sceneObject.name
        }
        if (!(object in this.children)) {
            throw new Error(
                `Unable to remove object "${object}" from object ` +
                `"${this.sceneObject.name}" because object "${object}" is ` +
                `not in its set of children.`)
        }

        const childObject = this.children[object]

        // Remove the child object from the Three.js scene.
        this.sceneObject.remove(childObject.sceneObject)
        // Unlink the child from the meta graph.
        childObject.parent = null
        delete this.children[object]

        // If this node is within a scene, collect all timelines within the
        // child entity and unregister them from the scene.
        const scene = this.getScene()
        if (scene !== null) {
            const timelines = childObject.getAllTimelines()
            scene.unregisterSceneTimelines(...timelines)
        }
    }

    addTimeline(timeline: Timeline, name?: string) {
        // Calculate a unique name.
        if (!name) {
            name = 'Timeline'
        }
        let nameNumber = 0
        const initialName = name
        while (name in this.timelines) {
            nameNumber += 1
            name = `${initialName}${nameNumber}`
        }

        Object.keys(this.timelines).forEach((key) => {
            if (timeline === this.timelines[key]) {
                throw new Error(
                    `Unable to add timeline "${name}" to Scene because it's ` +
                    `already attached to the Scene (with name: "${key}").`)
            }
        })
        timeline.bindToEntity(this)

        // Register the timeline to the scene cache.
        const scene = this.getScene()
        if (scene !== null) {
            scene.registerSceneTimelines(timeline)
        }
    }

    detach() {
        if (this.parent)
            this.parent.remove(this)
    }
}

class Scene extends Entity {
    private activeCamera: Camera | null = null
    // Write registered Timelines to a cached set to enforce uniqueness with
    // O(1) rather than doing O(n) checks, and further cache the resulting
    // values as an array for fast indexing during render time.
    private timelineCacheSet: Set<Timeline> = new Set()
    private timelineCache: Timeline[] = []

    constructor() {
        super(new THREE.Scene())
    }

    registerSceneTimelines(...timelines: Timeline[]) {
        timelines.forEach((timeline) => {
            this.timelineCacheSet.add(timeline)
        })
        this.timelineCache = new Array(...this.timelineCacheSet)
    }

    unregisterSceneTimelines(...timelines: Timeline[]) {
        timelines.forEach((timeline) => {
            this.timelineCacheSet.delete(timeline)
        })
        this.timelineCache = new Array(...this.timelineCacheSet)
    }

    setActiveCamera(camera: Camera) {
        this.activeCamera = camera
    }

    updateCameraAspect() {
        if (!(this.activeCamera instanceof THREE.PerspectiveCamera)) return

        const canvasAspect = canvas.width/canvas.height
        if (this.activeCamera.aspect !== canvasAspect) {
            this.activeCamera.aspect = canvasAspect
            this.activeCamera.updateProjectionMatrix()
        }
    }

    render() {
        for (let i = 0, l = this.timelineCacheSet.size; i < l; ++i) {
            this.timelineCache[i].update()
        }

        if (this.activeCamera !== null) {
            this.updateCameraAspect()
            renderer.render(this.sceneObject as THREE.Scene, this.activeCamera)
        }
    }
}

export {Entity, Scene, PROPERTY_PATH_REGEX}
