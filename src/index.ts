import * as THREE from 'three'
import audioWinRound from '../assets/winround.ogg'


const canvas = document.getElementById('canvas') as HTMLCanvasElement
const renderer = new THREE.WebGLRenderer({canvas: canvas})
renderer.setClearColor(new THREE.Color("black"))

const camera = new THREE.PerspectiveCamera(
    45, window.innerWidth/window.innerHeight, 0.1, 3000)
const resetSize = () => {
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(window.innerWidth, window.innerHeight)
    camera.aspect = window.innerWidth/window.innerHeight
    camera.updateProjectionMatrix()
}
window.addEventListener('resize', resetSize)
resetSize();

const scene = new THREE.Scene()

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
cubeMesh.position.set(0, 0, -1000)

scene.add(cubeMesh)

const render = () => {
    cubeMesh.rotation.x += 0.01
    cubeMesh.rotation.y += 0.03
    cubeMesh.rotation.z += 0.07
    renderer.render(scene, camera)
    requestAnimationFrame(render)
}
requestAnimationFrame(render);

const audioContext = new AudioContext();
const source = audioContext.createBufferSource()

fetch(audioWinRound)
.then(value => {
    if (value.status == 200)
        return value.arrayBuffer()

    return Promise.reject(
        `Request to "${value.url}" returned invalid status "${value.status}"`)
})
.then(value => audioContext.decodeAudioData(value))
.then(buffer => {
    source.buffer = buffer
    source.connect(audioContext.destination)
    source.start()
})
.catch(reason => {
    console.error(`Error occurred: ${reason}`)
})
