import * as CANNON from 'cannon-es'
import { Clock } from 'three/src/core/Clock'


// const body = new CANNON.Body({mass: 1});
let world
// let wind = new CANNON.Vec3(0,0,-0.002)
// let player
// let start = false
const CLOCK = new Clock() 


let clothMass = 0.1 // 1 kg in total
let clothSize = 150 // 1 meter
let Nx = 20 // number of horizontal particles in the cloth
let Nz = Nx // number of vertical particles in the cloth
let mass = (clothMass / Nx) * Nz
let restDistance = clothSize / Nx
const particles = []
const constraintCouple = [];
let bufferPosition

let ready = false

let sphere
let sphereMaterial
let clothMaterial
let cloth_sphere

let trimeshes = []
let hingeConstr = {
    counter: 0
}
const vertexMap = []
let angle = Math.PI

const queryableFunction = {
    // example #1: get the difference between two numbers:
    // getDifference: function(nMinuend, nSubtrahend) {
    //     let res = nMinuend - nSubtrahend;
    //     reply('printStuff', res);
    // },
    // // example #2: wait three seconds
    // waitSomeTime: function() {
    //     setTimeout(function() { reply('doAlert', 3, 'seconds'); }, 3000);
    // },
    initWorld: function(forces = []) {

        let force = new CANNON.Vec3();
        for(let f of forces) {
            force = force.vadd(f);
        }

        // console.log(force);
        // todo: sum all the forces and apply to world
        world = new CANNON.World({
            gravity: force,
            allowSleep: true
        })

        world.solver.iterations = 10
        // defaultReply(world)

        // create player body

        
        
    },
    // createPlayer: function({mass, conf}) {

    //     // console.log('worker create player');

    //     let shape = new CANNON.Box(new CANNON.Vec3(conf.l/2,conf.h/2,conf.d/1));
    //     player = new CANNON.Body({mass: mass, shape: shape, fixedRotation: true, linearFactor: new CANNON.Vec3(0,1,1), linearDamping: 0.005});
    //     player.material = new CANNON.Material({friction: 0})
    //     player.position.set(conf.x,conf.y,conf.z)

    //     world.addBody(player)

    //     reply('registerPlayerBody',player.id)

    // },
    createBox: function({mass, conf, meshId}) {

        // console.log('worker create platform');

        let shape = new CANNON.Box(new CANNON.Vec3(conf.l/2,conf.h/2,conf.d/2));
        let box = new CANNON.Body({mass: mass, shape: shape});
        // box.material = new CANNON.Material({friction: 0})
        box.position.copy(new CANNON.Vec3(conf.x,conf.y,conf.z))

        // console.log(box.position)

        world.addBody(box)

        // box.addEventListener('collide', () => {
        //     reply('onCollide',box.id,player.velocity)
        // })

        // reply('registerPlatformBody',box.id, meshId)

    },
    createSphere: function({mass, conf, meshId}) {

        sphereMaterial = new CANNON.Material('sphere')

        let shape = new CANNON.Sphere(conf.r);
        sphere = new CANNON.Body({mass: mass, shape: shape, material: sphereMaterial});
        sphere.position.copy( new CANNON.Vec3(conf.x,conf.y,conf.z) )

        sphere.angularVelocity = new CANNON.Vec3(0,0.3,0)

        world.addBody(sphere)

        // reply('registerPlatformBody',sphere.id, meshId)

    },
    createClothConvex: function({index,position,clothData}) {
        //TODO implement
    },
    createClothMesh: function({index,position,clothData}) {
        //TODO implement

        bufferPosition = new Float32Array(position)

        for(let i = 0; i < index.length /3; i++) {

            
            let posIndices = [ index[i*3], index[i*3+1],index[i*3+2] ]
            let indices = [0,1,2]

            let vertices = [
                position[ index[i*3] ],position[ index[i*3] + 1 ],position[ index[i*3] + 2 ],
                position[ index[i*3+1] ],position[ index[i*3+1] + 1 ],position[ index[i*3+1] + 2 ],
                position[ index[i*3+2] ],position[ index[i*3+2] + 1 ],position[ index[i*3+2] + 2 ]
            ]

            let trimesh = new CANNON.Trimesh(vertices,indices);
            let body = new CANNON.Body({mass: clothData.mass, shape: trimesh, linearDamping: 0.1})

            console.log(`position: ${body.position.x},${body.position.y},${body.position.z}`)

            // console.log(trimesh)

            world.addBody(body)

            trimeshes.push({
                body,
                posIndices
            })
        }

        hingeConstraint()

         
        ready = true
        console.log(trimeshes.length + '=' + index.length/3,vertexMap.length + '=' + bufferPosition.length/3)
    },


    createClothSphere: function({index,position,clothData}) {

        bufferPosition = new Float32Array(position)

        clothMass = clothData.clothMass // 1 kg in total
        clothSize = clothData.clothSize // 1 meter
        Nx = clothData.Nx // number of horizontal particles in the cloth
        Nz = clothData.Nz // number of vertical particles in the cloth
        mass = clothData.mass
        restDistance = clothData.restDistance

        clothMaterial = new CANNON.Material('cloth')
        
        cloth_sphere = new CANNON.ContactMaterial(clothMaterial, sphereMaterial, {
          friction: 10.0,
          restitution: 0.0,
        })

        // sphere.material = sphereMaterial

         // Contact stiffness - use to make softer/harder contacts
        cloth_sphere.contactEquationStiffness = 1e9
        // Stabilization time in number of timesteps
        cloth_sphere.contactEquationRelaxation = 3

        world.addContactMaterial(cloth_sphere)

        for( let i = 0; i < position.length; i+=3) {

            const particle = new CANNON.Body({
              // Fix in place the first row
              mass: mass,
              material: clothMaterial,
              linearDamping: 0.8, 
              fixedRotation: true
            })
            particle.addShape(new CANNON.Sphere(restDistance*0.252*Math.sqrt(2)))
            // particle.linearDamping = 0.7
            particle.position.set(position[i], position[i+1], position[i+2] )
            // particle.velocity.set(0, -0.10, 0)
        
            particles.push(particle)
            world.addBody(particle)
        }
        

        for( let i = 0; i < index.length; i+=3) { 

            connect(index[i], index[i+1], restDistance)
            connect(index[i+1], index[i+2], restDistance)
            connect(index[i], index[i+2], restDistance)
            
        }
        
        ready = true

    },

    /**
     * @description create a cloth body particles
     * @param  {Array} {index
     * @param  {Array} position
     * @param  {object} clothData}
     */
    createCloth: function({index,position,clothData}) {

        bufferPosition = new Float32Array(position)
        // positions = position
        // console.log(bufferPosition)
        // for(let p of position) {
        //     bufferPosition.array.push(p)
        // }

        clothMass = clothData.clothMass // 1 kg in total
        clothSize = clothData.clothSize // 1 meter
        Nx = clothData.Nx // number of horizontal particles in the cloth
        Nz = clothData.Nz // number of vertical particles in the cloth
        mass = clothData.mass
        restDistance = clothData.restDistance


        clothMaterial = new CANNON.Material('cloth')
        
        cloth_sphere = new CANNON.ContactMaterial(clothMaterial, sphereMaterial, {
          friction: 10.0,
          restitution: 0.0,
        })

        // sphere.material = sphereMaterial

         // Contact stiffness - use to make softer/harder contacts
        cloth_sphere.contactEquationStiffness = 1e9
        // Stabilization time in number of timesteps
        cloth_sphere.contactEquationRelaxation = 3

        world.addContactMaterial(cloth_sphere)


        for( let i = 0; i < position.length; i+=3) {

            const particle = new CANNON.Body({
              // Fix in place the first row
              mass: mass,
              material: clothMaterial
            })
            particle.addShape(new CANNON.Particle())
            particle.linearDamping = 0.7
            particle.position.set(position[i], position[i+1], position[i+2] )
            // particle.velocity.set(0, -0.10, 0)
        
            particles.push(particle)
            world.addBody(particle)
        }
        

        for( let i = 0; i < index.length; i+=3) { 

            connect(index[i], index[i+1], restDistance)
            connect(index[i+1], index[i+2], restDistance)
            connect(index[i], index[i+2], restDistance)
            
        }

        
        ready = true
        

    },
    createBody: function({mass, conf}) {

        // crea shape
        let body = new CANNON.Body({mass: mass})
        // console.log(body)
        // add shape to body
        // set position 
        // set quaternion

    },
    // addBody: function(ID) {
    //     // by ID
    //     // world.addBody(body)
    // },
    removeBody: function(ID) {
        // by ID
        // world.removeBody(body)
        let body = world.bodies.filter( el => el.id === ID)[0]
        if(body)
            world.removeBody(body)
    },
    jump: function() {
        // console.log('jump')
        // _.throttle(() => {
            if(player.position.y < 3.0 && player.position.y >= 1.0 ) {
                player.applyImpulse(new CANNON.Vec3(0,12,0))
            }
        // },500)
        
    },
    resetGame: function() {

        // console.log('reset game')
        player.position.copy( new CANNON.Vec3(0,10,0))
        player.velocity = new CANNON.Vec3(0,0,0)
        world.gravity = new CANNON.Vec3(0,-100,0)

        start = false
        reply('onResetGame');
        
    },
    startGame: function() {

        start = true
        player.applyImpulse(new CANNON.Vec3(0,0,-5))
    },
    receiveBuffer: function(buffer) {
        bufferPosition = buffer
        // console.log('receive buffer',bufferPosition)
    },
    step: function(fr,dt,sub) {

        if( !world ) {
            return
        }

        // if( start ) {
        //     player.applyImpulse(wind)
        //     // player.velocity = player.velocity.vadd(wind)
        //     // world.gravity = world.gravity.vadd(wind)

        //     player.position.y < -20 ? queryableFunction['resetGame'].apply(self) : null
            
        // }

        world.step(fr,dt,sub)

        if(sphere) {
            angle += 0.05
            let vel = new CANNON.Vec3(0,0.4*Math.sin(angle),0)
            sphere.angularVelocity = vel

            // console.log(sphere.angularVelocity)
        }
        // console.log(bufferPosition,ready)

        if(ready && bufferPosition.length) {
            
            for(let i = 0; i < particles.length; i++) {
                // let i = 210;
                bufferPosition[i*3] = particles[i].position.x
                bufferPosition[i*3+1] = particles[i].position.y
                bufferPosition[i*3+2] = particles[i].position.z

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
                // this.cloth.geometry.attributes.position.array[i*3] = this.particles[i].position.x
                // this.cloth.geometry.attributes.position.array[i*3+1] = this.particles[i].position.y
                // this.cloth.geometry.attributes.position.array[i*3+2] = this.particles[i].position.z
            }
    
            // console.log(bufferPosition)
            reply('updateParticles',null,bufferPosition)
            // reply('updateParticles',[bufferPosition.buffer],bufferPosition) //how this works worst??
           
            // console.log(vertexMap)

        }
        

        
        // world.step(fr)
        // console.log('step num',world.stepnumber)

        // player?.position && player?.quaternion ? reply('updateMeshes',{position: player.position, quaternion: player.quaternion, velocity: player.velocity}) : null  // pass bodies parameters
    }

}

function defaultReply(message) {
    // your default PUBLIC function executed only when main page calls the queryableWorker.postMessage() method directly
    // do something
    // postMessage(message)
}

function reply(...args) {
    if(args.length < 1) {
        throw new TypeError('reply - not enough arguments') 
        return
    }

    postMessage({
        'method' : args[0],
        'params' : Array.prototype.slice.call(args,2)
    },args[1])
}

function connect(i1,i2,distance) {

    let couple = [i1,i2];
    
    for(let c of constraintCouple) {
      if(c.includes(i1) && c.includes(i2)) {
        // console.log('punti gia collegati')
        return
      }
    }

    // console.log('punti da collegare')
    constraintCouple.push(couple)

    if(Math.abs(i1-i2) == Nx) {
        // return
      distance *= Math.sqrt(2)
    
    }

    world.addConstraint(new CANNON.DistanceConstraint(particles[i1], particles[i2]));
    // world.addConstraint(new CANNON.DistanceConstraint(particles[i1], particles[i2], distance));

    // let spring = new CANNON.Spring(particles[i1], particles[i2], {
    //   restLength: distance,
    //   stiffness: 300,
    //   damping: 1,
    // })

    // springs.push(spring)
    

}

function hingeConstraint() {

    for(let i = 0; i < trimeshes.length; i++) {

        let body = trimeshes[i].body
        let indexMap = trimeshes[i].posIndices
        

        // console.log(body)

        let mesh = body.shapes[0];

        // console.log(indexMap,mesh.edges)

        for(let i = 0; i < 3; i++) {

            let a = indexMap[ mesh.edges[i*2] ]
            let b = indexMap[ mesh.edges[i*2 + 1] ]

            

            let edge = ''+ a + '-' + b

            // console.log(a,b)

            if(!vertexMap[a]) {
                vertexMap[a] = trimeshes[i]
            }

            if(!vertexMap[b]) {
                vertexMap[b] = trimeshes[i]
            }

            if(hingeConstr[edge]){
                // console.log('just add')
                continue
            }

            let nearBody = trimeshes.find(el => {
                // let joined = el.edges.join('-')
                // el.edges.join('-').contains(edge)
                let mi = el.posIndices
                let m = el.body.shapes[0]
                
                return ( 
                    (edge === ''+ mi[m.edges[0]]+'-'+mi[m.edges[1]]) || 
                    (edge === ''+mi[m.edges[2]]+'-'+mi[m.edges[3]]) || 
                    (edge === ''+mi[m.edges[4]]+'-'+mi[m.edges[5]]) ) && m.id !== mesh.id
            })

            // console.log(mesh,edge,nearMesh)

            if(nearBody) {
                // console.log('add')
                hingeConstr[edge] = 1       
                hingeConstr.counter++

                // TODO add hinge constraint
                let pivotA = null
                let axisA = null
                let pivotB = null
                let axisB = null

                 
                // let constraint = new CANNON.HingeConstraint(body,nearBody,{
                //     pivotA,
                //     axisA,
                //     pivotB,
                //     axisB,
                // })
               

            }
        }

    }

    // console.log(hingeConstr.counter, vertexMap)

}

onmessage = function(oEvent) {

    if( 
        oEvent.data instanceof Object && 
        oEvent.data.hasOwnProperty('method') &&
        oEvent.data.hasOwnProperty('params')
    ) {
        // console.log(oEvent.data.method)
        queryableFunction[oEvent.data.method].apply(self, oEvent.data.params)
    } else {
        defaultReply(oEvent.data)
    }
}