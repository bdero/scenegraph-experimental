import * as THREE from 'three'

const canvas = document.getElementById('canvas') as HTMLCanvasElement
const renderer = new THREE.WebGLRenderer({canvas: canvas})
renderer.setClearColor(new THREE.Color("black"))

function resetSize() {
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(window.innerWidth, window.innerHeight)
}
window.addEventListener('resize', resetSize)
resetSize()

export {renderer, canvas}
