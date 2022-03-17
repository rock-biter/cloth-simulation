import * as THREE from 'three'
import * as CANNON from 'cannon-es'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader'
import gsap from 'gsap'

// import * as SOUNDS from './audio'
import QueryableWorker from './QueryableWorker';
import { Vec3 } from 'cannon-es'

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

    clothMass = 0.1 // 1 kg in total
    clothSize = 150 // 1 meter
    Nx = 40 // number of horizontal particles in the cloth
    Nz = this.Nx // number of vertical particles in the cloth
    mass = (this.clothMass / this.Nx) * this.Nz
    restDistance = this.clothSize / this.Nx
    particles = []
    constraintCouple = [];
    sphereMaterial

    angle = Math.PI

    ready = false

    clock
    then = 0
    fr = 1/60
    interval = 1000/60
    maxSubStep = 10
    sendTime

    loader =  new GLTFLoader()

    constructor({ camera = {}, enableShadow = false, world = { forces: [], clothData: {}}}) {

        this.clock = new THREE.Clock()

        this.Nx = world.clothData.Nx // number of horizontal particles in the cloth
        this.Nz = this.Nx // number of vertical particles in the cloth
        this.mass = (this.clothMass / this.Nx) * this.Nz
        this.restDistance = this.clothSize / this.Nx

        // this.maxSubStep = Math.max( Math.floor(this.fr / (1/60)),1)

        this.scene = new THREE.Scene()
        this.scene.background = new THREE.Color('#111111')
        // this.scene.add(new THREE.AxesHelper(5))

        this.initRenderer(true)
        this.initDefaultLight()
        this.initCamera(camera)
        // this.initWorker()
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

        // this.renderer.toneMapping = THREE.ReinhardToneMapping
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping
        this.renderer.toneMappingExposure = 1
        this.renderer.physicallyCorrectLights = true
        this.renderer.outputEncoding = THREE.sRGBEncoding

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

        this.camera.position.set(120,140,80)
        this.camera.zoom = 2
        this.camera.updateProjectionMatrix()

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

        const hemi = new THREE.HemisphereLight(0xffffff,0x222222,0.7)
        const spot = new THREE.SpotLight(0xffc9bf,4.5)
        spot.castShadow = true
        spot.intensity = 250

        // const ambientLight = new THREE.AmbientLight('#ffffff',0.5)
        // const dirLight = new THREE.DirectionalLight('#ffffff',0.8)
        // dirLight.position.copy(new THREE.Vector3(10,15,0))
        // dirLight.target = new THREE.Vector3(0,0,0)

        // this.lights.push(ambientLight)
        this.lights.push(hemi)
        this.lights.push(spot)

        spot.position.set(100,120,100)
        const target = new THREE.Object3D()
        target.position.set(0,60,0)
        spot.target = target

        spot.shadow.bias = -0.000001
        spot.shadow.normalBias = 0.8
        spot.shadow.mapSize.width = 1024*4
        spot.shadow.mapSize.height = 1024*4
        spot.shadow.radius = 2.7
        // spot.shadow.camera.fov = 20
        spot.shadow.camera.fov = 30
        spot.shadow.camera.near = 110
        spot.shadow.camera.far = 200
        spot.decay = 1
        spot.penumbra = 0.8

        // this.lights.push(dirLight)

        this.spotLightCameraHelper = new THREE.CameraHelper( spot.shadow.camera )
        // this.scene.add( this.spotLightCameraHelper )

        // this.scene.add(ambientLight)
        this.scene.add(hemi)
        this.scene.add(spot)
        this.scene.add(spot.target)
        // this.scene.add(dirLight) 
    }
    /**
     * @param  {Array.<CANNON.Vec3>} forces
     */
    initWorld(forces) {
        // this.worker.sendQuery('initWorld',null,forces)

        let force = new CANNON.Vec3();
        for(let f of forces) {
            force = force.vadd(f);
        }

        this.world = new CANNON.World({
            gravity: force,
            allowSleep: true
        })

        this.world.solver.iterations = 8

        this.world.broadphase = new CANNON.SAPBroadphase(this.world)

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

    step = function(fr,dt,sub) {

        if( !this.world ) {
            return
        }

        // if( start ) {
        //     player.applyImpulse(wind)
        //     // player.velocity = player.velocity.vadd(wind)
        //     // world.gravity = world.gravity.vadd(wind)

        //     player.position.y < -20 ? queryableFunction['resetGame'].apply(self) : null
            
        // }

        this.world.step(fr,dt,sub)

        if(this.sphere) {
            this.angle += 0.05
            let vel = new CANNON.Vec3(0,0.6*Math.sin(this.angle / 2),0)
            this.sphere.angularVelocity = vel

            // console.log(sphere.angularVelocity)
        }
        // console.log(bufferPosition,ready)

        if(this.ready && this.bufferPosition.length) {

            // console.log(this.bufferPosition[0])
            
            for(let i = 0; i < this.particles.length; i++) {
                // let i = 210;
                // this.bufferPosition[i*3] = this.particles[i].position.x
                // this.bufferPosition[i*3+1] = this.particles[i].position.y
                // this.bufferPosition[i*3+2] = this.particles[i].position.z

                // console.log(  vertexMap[i].body.position.z )

                // let internalIndex = vertexMap[i].indices.indexOf(i)
                
                
                // bufferPosition[i*3] = vertexMap[i].vertices[internalIndex*3]
                // bufferPosition[i*3+1] = vertexMap[i].vertices[internalIndex*3+1]
                // if(vertexMap[i]) {
                //     console.log(vertexMap[i].body.position.z)
                // } else {
                //     console.log('tremesh not found')
                // }
                
                // bufferPosition[i*3+2] = vertexMap[i].body.position.z

                // console.log( internalIndex, [
                //     vertexMap[i].vertices[internalIndex*3],
                //     vertexMap[i].vertices[internalIndex*3+1],
                //     vertexMap[i].vertices[internalIndex*3+2]
                // ] , [
                //     bufferPosition[i*3],
                //     bufferPosition[i*3+1],
                //     bufferPosition[i*3+2]
                // ] )

                // reply('updateParticle',i,{ 
                //     x: particles[i].position.x,
                //     y: particles[i].position.y,
                //     z: particles[i].position.z
                // })
                this.cloth.geometry.attributes.position.array[i*3] = this.particles[i].position.x
                this.cloth.geometry.attributes.position.array[i*3+1] = this.particles[i].position.y
                this.cloth.geometry.attributes.position.array[i*3+2] = this.particles[i].position.z
            }

            this.cloth.geometry.computeVertexNormals()
            this.cloth.geometry.attributes.position.needsUpdate = true;
            this.cloth.geometry.attributes.normal.needsUpdate = true;

        }
        

        
    }
    

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

        this.step(1/60,this.delta,this.maxSubStep)

        // if(this.delta > this.interval) {

            // this.worker.sendQuery('step',null,this.fr,this.delta,this.maxSubStep)
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

    createBox = function({mass, conf, meshId}) {

        // console.log('worker create platform');

        let shape = new CANNON.Box(new CANNON.Vec3(conf.l/2,conf.h/2,conf.d/2));
        let box = new CANNON.Body({mass: mass, shape: shape});
        // box.material = new CANNON.Material({friction: 0})
        box.position.copy(new CANNON.Vec3(conf.x,conf.y,conf.z))

        // console.log(box.position)

        this.world.addBody(box)

        // box.addEventListener('collide', () => {
        //     reply('onCollide',box.id,player.velocity)
        // })

        // reply('registerPlatformBody',box.id, meshId)

    }

    createSphere = function({mass, conf, meshId}) {

        this.sphereMaterial = new CANNON.Material('sphere')

        let shape = new CANNON.Sphere(conf.r);
        this.sphere = new CANNON.Body({mass: mass, shape: shape, material: this.sphereMaterial});
        this.sphere.position.copy( new CANNON.Vec3(conf.x,conf.y,conf.z) )

        this.sphere.angularVelocity = new CANNON.Vec3(0,0.3,0)

        this.world.addBody(this.sphere)

        // reply('registerPlatformBody',sphere.id, meshId)

    }

    createClothSphere = function({index,position,clothData}) {

        this.bufferPosition = new Float32Array(position)

        this.clothMass = clothData.clothMass // 1 kg in total
        this.clothSize = clothData.clothSize // 1 meter
        this.Nx = clothData.Nx // number of horizontal particles in the cloth
        this.Nz = clothData.Nz // number of vertical particles in the cloth
        this.mass = clothData.mass
        this.restDistance = clothData.restDistance

        const clothMaterial = new CANNON.Material('cloth')
        
        const cloth_sphere = new CANNON.ContactMaterial(clothMaterial, this.sphereMaterial, {
          friction: 10.0,
          restitution: 0.0,
        })

        const cloth_cloth = new CANNON.ContactMaterial(clothMaterial,clothMaterial, {
            friction: 0.1,
            restitution: 0
        })

        // sphere.material = sphereMaterial

         // Contact stiffness - use to make softer/harder contacts
        cloth_sphere.contactEquationStiffness = 1e9
        // Stabilization time in number of timesteps
        cloth_sphere.contactEquationRelaxation = 3

        this.world.addContactMaterial(cloth_sphere)
        this.world.addContactMaterial(cloth_cloth)

        for( let i = 0; i < position.length; i+=3) {

            const particle = new CANNON.Body({
              // Fix in place the first row
              mass: this.mass,
              material: clothMaterial,
              linearDamping: 0.8, 
              fixedRotation: true
            })
            particle.addShape(new CANNON.Sphere(this.restDistance*0.252*Math.sqrt(2)))
            // particle.linearDamping = 0.7
            particle.position.set(position[i], position[i+1], position[i+2] )
            // particle.velocity.set(0, -0.10, 0)
        
            this.particles.push(particle)
            this.world.addBody(particle)
        }
        

        for( let i = 0; i < index.length; i+=3) { 

            this.connect(index[i], index[i+1], this.restDistance)
            this.connect(index[i+1], index[i+2], this.restDistance)
            this.connect(index[i], index[i+2], this.restDistance)
            
        }
        
        this.ready = true

    }

    connect = function (i1,i2,distance) {

        // console.log('connect')
    
        let couple = [i1,i2];
        
        for(let c of this.constraintCouple) {
          if(c.includes(i1) && c.includes(i2)) {
            // console.log('punti gia collegati')
            return
          }
        }
    
        // console.log('punti da collegare')
        this.constraintCouple.push(couple)
    
        if(Math.abs(i1-i2) == this.Nx) {
            // return
          distance *= Math.sqrt(2)
        
        }
    
        this.world.addConstraint(new CANNON.DistanceConstraint(this.particles[i1], this.particles[i2]));
        // world.addConstraint(new CANNON.DistanceConstraint(particles[i1], particles[i2], distance));
    
        // let spring = new CANNON.Spring(particles[i1], particles[i2], {
        //   restLength: distance,
        //   stiffness: 300,
        //   damping: 1,
        // })
    
        // springs.push(spring)
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
