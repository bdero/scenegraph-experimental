import * as THREE from 'three'
import audioWinRound from '../assets/winround.ogg'
import Preloader from './preloader'
import {SoundClip} from './audio'
import {Scene} from './scene'
import Timeline from './timeline'

const camera = new THREE.PerspectiveCamera(
    45, window.innerWidth/window.innerHeight, 0.1, 3000)

const scene = new Scene()
scene.setActiveCamera(camera)

const light = new THREE.AmbientLight(0xffffff, 0.5)
scene.add(light)
const light2 = new THREE.PointLight(0xffffff, 0.5)
scene.add(light2)

const cubeMesh = new THREE.Mesh(
    new THREE.CubeGeometry(100, 100, 100),
    new THREE.MeshPhysicalMaterial({
        color: "orange",
        metalness: 0.2,
        roughness: 0.2,
        emissive: "green",
        emissiveIntensity: 0.3
    })
);
cubeMesh.name = 'nicecube'
cubeMesh.position.set(0, 0, -1000)

scene.add(cubeMesh)

const render = () => {
    cubeMesh.rotation.x += 0.01
    cubeMesh.rotation.y += 0.03
    cubeMesh.rotation.z += 0.07
    scene.render()
    requestAnimationFrame(render)

    //console.log(clip!.getPlayState())
}
let clip: SoundClip | null = null
const preloader = new Preloader()
preloader.addPreloadItems({audioWinRound: audioWinRound})
preloader.fetch()
.then(value => {
    clip = new SoundClip(value['audioWinRound'], false, 1.2)
    //clip.play()

    const timeline = new Timeline(true)
    scene.addTimeline(timeline, 'my timeline')
    timeline.addKeyframe(0, 'nicecube:position.x', -100)
    timeline.addKeyframe(1, 'nicecube:position.x', 100, 'easeInOutSine')

    timeline.addKeyframe(1, 'nicecube:position.y', 0)
    timeline.addKeyframe(1.2, 'nicecube:position.y', 100, 'outSine')
    timeline.addKeyframe(1.4, 'nicecube:position.y', 0, 'easeInSine')
    //timeline.removeKeyframe(1.4, 'nicecube:position.y')
    console.log(timeline.getLength())
    //timeline.addEvent(0.5, () => {clip!.stop(); clip!.play()})
    timeline.play()

    requestAnimationFrame(render);
})
.catch(reason => {
    console.error(`Error occurred: ${reason}`)
})
