import '../scss/app.scss';

import * as CANNON from 'cannon-es'
import * as THREE from 'three'
// import { threeToCannon , ShapeType } from 'three-to-cannon'

import { Dubai, AlcamoFSC, AccraGold } from './fabrics-data'
import Fabric from './fabric';


// import CannonUtils from './utils/cannonUtils';

if (process.env.NODE_ENV === 'development') {
    require('../index.html');
  }

// console.log('hello world');

// import QueryableWorker from './QueryableWorker';
import BasicScene from './scene'

let _APP
// let _GAME

const clothMass = 0.1 // 1 kg in total
const clothSize = 120 // 1 meter
const Nx = 24// number of horizontal particles in the cloth
const Nz = Nx // number of vertical particles in the cloth
const mass = (clothMass / Nx) * Nz
const restDistance = clothSize / Nx
const particles = []

const clothData = {
  clothMass,
  clothSize,
  Nx,
  Nz,
  mass,
  restDistance
}

// Parametric function
// https://threejs.org/docs/index.html#api/en/geometries/ParametricGeometry
function clothFunction(u, v, target) {
  const x =  (u - 0.5) * restDistance * Nx
  const z = (v - 0.5) * restDistance * Nz
  const y = 103

  target.set(x, y, z)

  return target
}

window.addEventListener('DOMContentLoaded', () => {
  let world = {
    forces: [],
    clothData
  }

  let g = new CANNON.Vec3(0,-250,0);
  world.forces.push(g);

  // let wind = new CANNON.Vec3(0,0,-5)
  // world.forces.push(wind);

  let TSHIRT_MESH, TSHIRT_BODY, SKIRT_MESH, BODY_MESH, DRAPE_MESH

  let config = {}

  _APP = new BasicScene({
    camera: { type: 'orto', fov: 45, near: 0, far: 10000 }, 
    enableShadow: true, 
    world
  });


  // _APP.world.solver.iterations = 20 //moved to worker
  let conf = {
    x: 0,
    y: -20,
    z: 0,
    l: 200,
    h: 5,
    d: 200
  }

  const phongMaterial = new THREE.MeshPhongMaterial({color: new THREE.Color(0.1,0.1,0.1)})
  phongMaterial.side = THREE.DoubleSide;

  const planeGeometry = new THREE.BoxGeometry(conf.l,conf.h,conf.d)
  const planeMesh = new THREE.Mesh(planeGeometry, phongMaterial)
  // planeMesh.rotateX(-Math.PI / 2)
  planeMesh.receiveShadow = true
  planeMesh.position.set(conf.x,conf.y,conf.z)

  // _APP.scene.add(planeMesh)

  // _APP.worker.sendQuery('createBox',null,{mass: 0, conf})
  _APP.createBox({mass: 0, conf})


  // const clothMaterial = new CANNON.Material('cloth')
  // const sphereMaterial = new CANNON.Material('sphere')
  // const cloth_sphere = new CANNON.ContactMaterial(clothMaterial, sphereMaterial, {
  //   friction: 0,
  //   restitution: 0,
  // })

  // Adjust constraint equation parameters
  // // Contact stiffness - use to make softer/harder contacts
  // cloth_sphere.contactEquationStiffness = 1e9
  // // Stabilization time in number of timesteps
  // cloth_sphere.contactEquationRelaxation = 10

  // // _APP.world.addContactMaterial(cloth_sphere)




  // _APP.loadModel('/models/drappo_sfera3.gltf').then((model) => {
  {
    // let box = new THREE.Box3().setFromObject(model.children[0]);
    let radius =  25 ;
    let y = 75;

    // console.log(box,model.children[0],model.children[0].geometry.boundingBox)

    let conf = {
      x: 0,
      y: y,
      z: 0,
      r: radius,
      edge: 36
    }


    BODY_MESH = new THREE.Mesh( new THREE.SphereGeometry(conf.r,conf.edge,conf.edge), phongMaterial);

    BODY_MESH.receiveShadow = true
    BODY_MESH.castShadow = true
    
    BODY_MESH.position.copy( new THREE.Vector3(conf.x,conf.y,conf.z));
    // DRAPE_MESH = model.children[1]

    // let res = threeToCannon(BODY_MESH, {type: ShapeType.SPHERE})

    // _APP.worker.sendQuery('createSphere',null,{mass: 0, conf})
    _APP.createSphere({mass: 0, conf})

    _APP.scene.add(BODY_MESH)
    

    createCloth()
  }
    // console.log(BODY)
  // });

  // Create cannon particles
  // for (let i = 0; i < Nx + 1; i++) {
  //   particles.push([])
  //   for (let j = 0; j < Nz + 1; j++) {
  //     const index = j * (Nx + 1) + i

  //     const point = clothFunction(i / (Nx + 1), j / (Nz + 1), new THREE.Vector3())
  //     const particle = new CANNON.Body({
  //       // Fix in place the first row
  //       mass: mass,
  //     })
  //     particle.addShape(new CANNON.Particle())
  //     particle.linearDamping = 0.1
  //     particle.position.set(point.x, point.y, point.z - Nz * 0.9 * restDistance )
  //     // particle.velocity.set(0, -0.10, 0)

  //     particles[i].push(particle)
  //     _APP.world.addBody(particle)
      
  //     console.log(particle)
  //   }
  // }


  function createCloth() {

    let clothGeometry = new THREE.ParametricGeometry(clothFunction, Nx, Nz)
    clothGeometry.attributes.position.needsUpdate = true

    // console.log(clothGeometry)

    const clothPhongMaterial = new THREE.MeshPhongMaterial()
    clothPhongMaterial.side = THREE.DoubleSide;
    clothPhongMaterial.color = new THREE.Color('#25fbac')

    // console.log(AccraGold)
    Fabric.createMaterial(AlcamoFSC.material).then((clothMaterial) => {


      // console.log(clothMaterial)


      const clothMesh = new THREE.Mesh(clothGeometry, clothMaterial.frontSideMaterial)
      
      clothMesh.castShadow = true
      clothMesh.receiveShadow = true
      // console.log(clothGeometry)

      // reset uv attribute
      
      var uvAttribute = clothGeometry.attributes.uv;
		
      for ( var i = 0; i < uvAttribute.count; i ++ ) {
          
          var u = uvAttribute.getX( i );
          var v = uvAttribute.getY( i );
            
          // do something with uv
          u *= 2
          v *= 2

          // write values back to attribute
            
          uvAttribute.setXY( i, u, v );
          
      }


      _APP.cloth = clothMesh;

      let index = clothGeometry.index.array;
      let position = clothGeometry.attributes.position.array;

      // _APP.worker.sendQuery('createCloth',null,{index,position,clothData})
      let r = 0.2 //restDistance*0.30*Math.sqrt(2)

      for( let i = 0; i < position.length; i+=3) {

        addParticle({
          r,
          x: position[i],
          y: position[i+1],
          z: position[i+2],
          edge: 4
        })

        
        // const particle = new CANNON.Body({
        //   // Fix in place the first row
        //   mass: mass,
        //   material: clothMaterial
        // })
        // particle.addShape(new CANNON.Sphere(restDistance*0.30*Math.sqrt(2)))
        // particle.linearDamping = 0.7
        // particle.position.set(position[i], position[i+1], position[i+2] )
        // // particle.velocity.set(0, -0.10, 0)
    
        // particles.push(particle)
        // world.addBody(particle)

        
      }

      // _APP.worker.sendQuery('createClothSphere',null,{index,position,clothData})
      _APP.createClothSphere({index,position,clothData})
      _APP.scene.add(clothMesh)

    })
    


    

    // _APP.worker.sendQuery('createClothMesh',null,{index,position,clothData})

    // _APP.worker.addListener('updateParticle',(i,position) => {
    //   _APP.cloth.geometry.attributes.position.array[i*3] = position.x
    //   _APP.cloth.geometry.attributes.position.array[i*3+1] = position.y
    //   _APP.cloth.geometry.attributes.position.array[i*3+2] = position.z
    // })

    // _APP.worker.addListener('updateParticles',(positions) => {
    //   // for(let i = positions.length - 1; i >= 0; i--) {
    //   //   _APP.cloth.geometry.attributes.position.array[i] = positions[i]
    //   //   // _APP.cloth.geometry.attributes.position = positions
    //   // }

    //   for(let i = 0; i < particles.length; i++) {
    //     _APP.cloth.geometry.attributes.position.array[i*3] = positions[i*3]
    //     _APP.cloth.geometry.attributes.position.array[i*3+1] = positions[i*3+1]
    //     _APP.cloth.geometry.attributes.position.array[i*3+2] = positions[i*3+2]
    //     // _APP.cloth.geometry.attributes.position = positions
    //     particles[i].position.set(positions[i*3],positions[i*3+1],positions[i*3+2])
    //   }

    //   _APP.cloth.geometry.computeVertexNormals()
    //   _APP.cloth.geometry.attributes.position.needsUpdate = true;
    //   _APP.cloth.geometry.attributes.normal.needsUpdate = true;

    //   _APP.render()

    //   // _APP.worker.sendQuery('receiveBuffer',null,positions)
    //   // _APP.worker.sendQuery('receiveBuffer',[positions.buffer],positions) //how this works worst???
    // })

    // _APP.worker.addListener('updateGeometry',() => {
    //   _APP.cloth.geometry.computeVertexNormals()
    //   _APP.cloth.geometry.attributes.position.needsUpdate = true;
    //   _APP.cloth.geometry.attributes.normal.needsUpdate = true;
    // })

  /*
  for( let i = 0; i < position.length; i+=3) {

    const particle = new CANNON.Body({
      // Fix in place the first row
      mass: mass,
    })
    particle.addShape(new CANNON.Particle())
    particle.linearDamping = 0.5
    particle.position.set(position[i], position[i+1], position[i+2] )
    // particle.velocity.set(0, -0.10, 0)

    particles.push(particle)
    _APP.world.addBody(particle)
  }
*/
  

  // function connect(i1, j1, i2, j2) {
  //   _APP.world.addConstraint(new CANNON.DistanceConstraint(particles[i1][j1], particles[i2][j2], restDistance))
  // }

  /*
  const constraintCouple = [];

  const springs = []

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
      distance *= Math.sqrt(2)

    }

    _APP.world.addConstraint(new CANNON.DistanceConstraint(particles[i1], particles[i2], distance));

    // let spring = new CANNON.Spring(particles[i1], particles[i2], {
    //   restLength: distance,
    //   stiffness: 300,
    //   damping: 1,
    // })

    // springs.push(spring)
    

    }
  

    for( let i = 0; i < index.length; i+=3) { 

      connect(index[i], index[i+1], restDistance)
      connect(index[i+1], index[i+2], restDistance)
      connect(index[i], index[i+2], restDistance)
      
    }

    _APP.particles = particles;
    */

  }


  function addParticle(conf) {

    let phongMaterial = new THREE.MeshPhongMaterial({ color: new THREE.Color(1,0,0)});

    let mesh = new THREE.Mesh( new THREE.SphereGeometry(conf.r,conf.edge,conf.edge), phongMaterial);
    mesh.position.copy( new THREE.Vector3(conf.x,conf.y,conf.z));

    // console.log(mesh.position)

    particles.push(mesh)

    // _APP.scene.add(mesh)

  }
  
  

});
