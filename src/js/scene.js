import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader'
import gsap from 'gsap'

// import * as SOUNDS from './audio'
import QueryableWorker from './QueryableWorker';

const event = new Event('gameover');

/**
 * Represent a complete basic scene of Three js
 * @class
 * @constructor
 * @param {object} config - the configuration of scene
 * @param {object} config.camera
 */
export default class BasicScene {

    WORKER_URL = '/js/worker.js';
    worker

    /**
     * @property
     * 
     * @default
     */
    isStarted = false

    scene
    world

    wind = new CANNON.Vec3(0,0,-0.002)

    camera
    controls
    renderer

    ortoSize = 12

    jump = false

    lights = []
    meshes = []
    bodies = []

    clock
    then = 0
    fr = 1/60
    interval = 1000/60
    maxSubStep = 10
    sendTime

    loader =  new GLTFLoader()

    constructor({ camera = {}, enableShadow = false, world = { forces: []}}) {

        this.clock = new THREE.Clock()

        // this.maxSubStep = Math.max( Math.floor(this.fr / (1/60)),1)

        this.scene = new THREE.Scene()
        this.scene.background = new THREE.Color('#111111')
        this.scene.add(new THREE.AxesHelper(5))

        this.initRenderer(true)
        this.initDefaultLight()
        this.initCamera(camera)
        this.initWorker()
        this.initWorld(world.forces)
        this.initControls() 
        // this.animate()
        requestAnimationFrame(this.animate)

        

    }

    initWorker() {

        if (process.env.NODE_ENV === 'development') {

            this.WORKER_URL = './src/js/workers/worker.js'

        }

        this.worker = new QueryableWorker(this.WORKER_URL)

        // this.worker.addListener('render',(e) => {
        //     this.updateMeshes(e)
        // })

    }

    /**
     * @param {boolean} enableShadow 
     */
    initRenderer(enableShadow) {
        this.renderer = new THREE.WebGLRenderer()
        this.renderer.setSize(window.innerWidth, window.innerHeight)
        this.renderer.setPixelRatio(window.devicePixelRatio)
        this.renderer.shadowMap.enabled = enableShadow
        // this.renderer.shadowMap.type = THREE.PCFShadowMap
        // this.renderer.shadowMap.type = THREE.PCFShadowMap
        document.body.appendChild(this.renderer.domElement);

        this.renderer.toneMapping = THREE.ReinhardToneMapping
        this.renderer.toneMappingExposure = 1

        window.addEventListener('resize', () => {
            this.onWindowResize()
        })
    }

    /**
     * Initialize the camera controls
     */
    initControls() {

        this.controls = new OrbitControls(this.camera, this.renderer.domElement)
        this.controls.enableDamping = true
        this.controls.target = new THREE.Vector3(0,60,0)
        this.controls.update()

    } 
    /**
     * @param  {} {type='perspective'
     * @param  {} near=0
     * @param  {} far=2000
     * @param  {} fov}
     */
    initCamera({type = 'perspective', near = 0, far = 2000, fov}) {

        if(type === 'orto') {

            this.camera = new THREE.OrthographicCamera( 
                window.innerWidth / - this.ortoSize, 
                window.innerWidth / this.ortoSize,
                window.innerHeight / this.ortoSize, 
                window.innerHeight / - this.ortoSize,  
                near, 
                far );

        } else {

            this.camera = new THREE.PerspectiveCamera(
                fov,
                window.innerWidth / window.innerHeight,
                near,
                far
              )

        }

        this.scene.add(this.camera);

        this.camera.position.set(200,160,80)

    }
    /**
     * @param  {object} {mesh
     * @param  {object} body}
     */
    addObject({mesh,body}) {
        // this.addBody(body)
        this.addMesh(mesh)
    }
    /**
     * @param  {object} mesh
     */
    addMesh(mesh) {
        this.meshes.push(mesh)
        this.scene.add(mesh)
    }
    /**
     * @param  {object} body
     */
    addBody(body) {
        this.bodies.push(body)
        this.world.addBody(body)
    }

    initDefaultLight() {

        const hemi = new THREE.HemisphereLight(0xffffff,0x222222,1)
        const spot = new THREE.SpotLight(0xffc9bf,4.5)
        spot.castShadow = true

        // const ambientLight = new THREE.AmbientLight('#ffffff',0.5)
        // const dirLight = new THREE.DirectionalLight('#ffffff',0.8)
        // dirLight.position.copy(new THREE.Vector3(10,15,0))
        // dirLight.target = new THREE.Vector3(0,0,0)

        // this.lights.push(ambientLight)
        this.lights.push(hemi)
        this.lights.push(spot)

        spot.position.set(200,150,120)
        const target = new THREE.Object3D()
        target.position.set(0,60,0)
        spot.target = target

        spot.shadow.bias = -0.00001
        spot.shadow.normalBias = 0.01
        spot.shadow.mapSize.width = 1024*4
        spot.shadow.mapSize.height = 1024*4
        spot.shadow.radius = 2.7
        // spot.shadow.camera.fov = 20
        spot.decay = 2
        spot.penumbra = 0.9

        // this.lights.push(dirLight)

        // this.scene.add(ambientLight)
        this.scene.add(hemi)
        this.scene.add(spot)
        // this.scene.add(dirLight) 
    }
    /**
     * @param  {Array.<CANNON.Vec3>} forces
     */
    initWorld(forces) {
        this.worker.sendQuery('initWorld',null,forces)

        // this.worker.addListener('updateMeshes',(obj) => {
        //     // console.log('updateMeshs', this.scene);
        //     this.updateMeshes(obj)
        // })

    }

    onWindowResize() {
        // console.log('resize')
        if(this.camera instanceof THREE.PerspectiveCamera) {
            this.camera.aspect = window.innerWidth / window.innerHeight
        } else if(this.camera instanceof THREE.OrthographicCamera) {

            this.camera.left = window.innerWidth / - this.ortoSize;
            this.camera.right = window.innerWidth / this.ortoSize;
            this.camera.top = window.innerHeight / this.ortoSize;
            this.camera.bottom = window.innerHeight / - this.ortoSize;

        }
        this.camera.updateProjectionMatrix()
        this.renderer.setSize(window.innerWidth, window.innerHeight)
        this.render()
    }

    // reset() {

    //     // SOUNDS._GAME_OVER.play()

        
    //     // let player = this.bodies[0]
    //     // player.position.copy( new CANNON.Vec3(0,10,0))
    //     // player.velocity = new CANNON.Vec3(0,0,0)
        

    //     // this.world.gravity = new CANNON.Vec3(0,-100,0)
    //     // this.isStarted = false
    //     // this.jump = false

    //     window.dispatchEvent(event);
    // }

    

    animate = (now) =>  {

        requestAnimationFrame(this.animate)

        // let diff = this.sendTime ? Date.now() - this.sendTime : 0;
        
        // this.delta = now - this.then
        this.delta = this.then ? (now - this.then )/1000 : 0
        // console.log(now,this.delta,this.then)

        /*
        //on top
        const timeStep = 1 / 60
        let lastCallTime = performance.now()
         * 
         * const time = performance.now() / 1000
        const dt = time - lastCallTime
        lastCallTime = time

        if (controls.enabled) {
          world.step(timeStep, dt)

         */

        

        // if(this.delta > this.interval) {

            this.worker.sendQuery('step',null,this.fr,this.delta,this.maxSubStep)
            // this.worker.sendQuery('step',this.clock.getDelta(),this.delta,this.maxSubStep)

            // if(this.meshes.length) {
            //     this.camera.position.z = THREE.MathUtils.lerp(this.meshes[0].position.z + this.camera.position.y, this.camera.position.z, 0.9);  
            //     this.controls.target.z = this.camera.position.z - this.camera.position.y
            // }
          
            // console.log(bullets)
            
            this.render()

            // this.then = now - (this.delta % this.interval)
            this.then = now //+ this.delta
        // }
      
        
    }

    render() {
        this.renderer.render(this.scene, this.camera)
    }

    loadModel(src) {
        return new Promise((resolve,reject) => {

            try {

                this.loader.load( src, function ( gltf ) {
            
                    resolve(gltf.scene)
                    // gltf.animations; // Array<THREE.AnimationClip>
                    // gltf.scene; // THREE.Group
                    // gltf.scenes; // Array<THREE.Group>
                    // gltf.cameras; // Array<THREE.Camera>
                    // gltf.asset; // Object
            
                },
                // called while loading is progressing
                function ( xhr ) {
            
                    console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );
            
                },
                // called when loading has errors
                function ( error ) {
            
                    console.log( 'An error happened' );
            
                })

            } catch (e) {
                reject()
            }

        })
    }
}
