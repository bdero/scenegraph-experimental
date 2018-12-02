import * as THREE from 'three'
import {renderer, canvas} from './renderer'

declare type Camera = THREE.PerspectiveCamera | THREE.OrthographicCamera

interface EntityChildren {
    [name: string]: Entity
}

/**
 * Wrapper for THREE.Object3D which provides uniqueness constraints along with
 * a meta graph for efficient querying of objects within the scene.
 */
class Entity {
    public sceneObject: THREE.Object3D

    public parent: Entity | null = null
    public children: EntityChildren = {}

    constructor(sceneObject: THREE.Object3D) {
        this.sceneObject = sceneObject
        if (sceneObject.children.length > 0) {
            throw new Error(
                `Unable to create Entity from scene object because it ` +
                `already has children in the scene graph.`)
        }
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

        // Ensure that all entities be part of one scene graph
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
    }

    detach() {
        if (this.parent)
            this.parent.remove(this)
    }
}

class Scene extends Entity {
    private activeCamera: Camera | null = null

    constructor() {
        super(new THREE.Scene)
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
        if (this.activeCamera !== null) {
            this.updateCameraAspect()
            renderer.render(this.sceneObject as THREE.Scene, this.activeCamera)
        }
    }
}

export {Entity, Scene}
