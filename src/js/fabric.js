import * as THREE from 'three'
import { textures } from './textures-data'


export default class Fabric {

    frontSideMaterial
    backSideMaterial

    selectedFabric = null
    defaultFabric = null
    loaders = {
      texture: new THREE.TextureLoader(),
    }

    blendingTexture = 'roughness'
    transparent = true

    transmission = 0.005

    map = {
        src: '',
    }

    alphaMap = {
        src: '',
        intensity: 1.9,
    }

    bumpMap = {
        src: '',
        scale: 0.1,
    }

    roughnessMap = {
        src: '',
        scale: 1,
    }


    material
    userData

    uniforms = {
        repeatX: { value: 1.0 },
        repeatY: { value: 1.0 },
        tScale: { value: 1.0 },
        tRotation: { value: 0.0 },
        tOffsetX: { value: 0.0 },
        tOffsetY: { value: 0.0 },
        tSelfMap: { value: null },
        alphaIntensity: { value: 1.8 },
    }

    constructor({ transparent, alphaMap, map, bumpMap, roughnessMap, transmission, blendingTexture }) {


        transparent ? this.transparent = transparent : null
        alphaMap ? this.alphaMap = alphaMap : null
        map ? this.map = map : null
        bumpMap ? this.bumpMap = bumpMap : null
        roughnessMap ? this.roughnessMap = roughnessMap : null
        transmission ? this.transmission = transmission : null
        blendingTexture ? this.blendingTexture = blendingTexture : null


        this.frontSideMaterial = new THREE.MeshPhysicalMaterial({
            // this.frontSideMaterial = new THREE.MeshStandardMaterial({
            transparent: true,
            bumpScale: this.bumpMap.scale,
            side: THREE.DoubleSide,
            roughness: this.roughnessMap.scale,
            transmission: this.transmission,
            opacity: 1,
        })

        // let userData = {
        //     material: material,
        //     uniforms: JSON.parse( JSON.stringify( state.uniforms ) ),
        // }

                

    }

    fragShaderPrepend = `
uniform float alphaIntensity;
uniform float repeatX;
uniform float repeatY;
uniform float tScale;
uniform float tRotation;
uniform float tOffsetX;
uniform float tOffsetY;
uniform sampler2D tSelfMap;
`
    //'uniform float alphaIntensity;\n' + 'uniform float repeatX;\n' + 'uniform float repeatY;\n' + 'uniform float tScale;\n' + 'uniform float tRotation;\n' + 'uniform float tOffsetX;\n' + 'uniform float tOffsetY;\n'  + 'uniform sampler2D tSelfMap;\n'
    fragShaderReplace = 
`
#ifdef USE_COLOR

    diffuseColor.rgb *= vColor;

#endif
#ifdef USE_MAP

    float angle = radians(tRotation);
    float s = sin(angle);
    float c = cos(angle);
    mat2 matrixRotation = mat2(c, -s, s, c);
    
    float scale = 1.0/tScale;
    mat2 matrixScale = mat2(scale*repeatX, 0.0, 0.0, -scale*repeatY);
    
    vec2 translate = vec2(tOffsetX,tOffsetY)*scale;
    
    vec2 uvMap = vUv - vec2(0.5,0.5);
    
    mat2 m = matrixRotation*matrixScale;

    vec4 texelColor;

    vec4 texelMapColor = texture2D( map, (uvMap + translate)*m );
    texelMapColor = mapTexelToLinear( texelMapColor );
    
    vec4 texelSelfMapColor = texture2D( tSelfMap, vUv );
    texelSelfMapColor = mapTexelToLinear( texelSelfMapColor );

    texelColor = mix(texelMapColor,texelSelfMapColor, clamp(texelSelfMapColor.r*1.5, 0.0, 0.9 ));
    diffuseColor = vec4(clamp(texelColor.r,0.10,0.9),clamp(texelColor.g,0.10,0.9),clamp(texelColor.b,0.10,0.9),texelColor.a);

#else

    vec4 texelColor;
    vec4 texelSelfMapColor = texture2D( tSelfMap, vUv );  
    texelColor = mix(diffuseColor,texelSelfMapColor, clamp(texelSelfMapColor.r*1.5, 0.0, 0.9 ) );
    diffuseColor = vec4(clamp(texelColor.r,0.15,0.85),clamp(texelColor.g,0.15,0.85),clamp(texelColor.b,0.15,0.85),texelColor.a);

#endif
`
    uploadTexture(src) {
        
        return new Promise((resolve,reject) => {
            try {
    
            this.loaders.texture.load(src,(texture) => {
                // this.texture = texture;
                texture.wrapT = texture.wrapS = THREE.RepeatWrapping;
                // texture.repeat.set( payload.repeat.x, payload.repeat.y );
                resolve(texture);
            });
    
            } catch(e) {
                reject(`An error occurred: ${e}.`);
            }
        })
    }

    setMap(data) {
        if( data.src ) {

            this.uploadTexture(data.src).then( (t) => {
                

                if(data.width_cm && data.height_cm) {

                    this.uniforms.repeatX.value = 25 / data.width_cm; //uv map 25x25 cm
                    this.uniforms.repeatY.value = 25 / data.height_cm ; //uv map 25x25 cm
        
                } else if(data.dpcm) {
        
                    let height = data.inst.img.height / data.dpcm;
                    let width = data.inst.img.width / data.dpcm;
            
                    this.uniforms.repeatX.value = 25 / width; //uv map 25x25 cm
                    this.uniforms.repeatY.value = 25 / height; //uv map 25x25 cm
        
                }

                console.log('setMap',t)
                this.frontSideMaterial.map = t
                this.frontSideMaterial.map.anisotropy = 16
            })
      
        }
    }

    setSelfMap() {

        return new Promise((resolve,reject) => {
            if( this.map && this.map.src) {

                this.uploadTexture(this.map.src).then( (t) => {
                    console.log('setMap',t)
                    this.uniforms.tSelfMap = { type: "t", value: t };

                    resolve()
                })
          
            } else {
                resolve()
            }
        })
        
        
    }

    setBump() {

        return new Promise((resolve,reject) => {
            if( this.bumpMap && this.bumpMap.src) {

                this.uploadTexture(this.bumpMap.src).then( (t) => {
                    console.log('setBump',t)
                    this.frontSideMaterial.bumpMap = t
                    resolve()
                })
          
            } else {
                resolve()
            }
        })
        
    }

    setAlpha() {
        if( this.transparent && this.alphaMap && this.alphaMap.src) {
            // material.alphaMap.repeat = repeat;
      
            this.uploadTexture(this.alphaMap.src).then( (t) => {
                console.log('setAlpha',t)
                this.frontSideMaterial.alphaMap = t
            })
      
        } else if( this.transparent ) {
            //altrimenti uso il bump per la trasparenza
            this.frontSideMaterial.alphaMap = this.frontSideMaterial.bumpMap;
      
        }
    }

    setRoughness() {
        
        if( this.roughnessMap && this.roughnessMap.src) {
            // material.roughnessMap.repeat = repeat;
      
            this.uploadTexture(this.roughnessMap.src).then( (t) => {
                console.log('setRoughness',t)
                this.frontSideMaterial.roughnessMap = t
            })
      
        } else {
            //altrimenti uso il bump per la trasparenza
            this.frontSideMaterial.roughness =  this.roughnessMap.scale;
        }
    }

    static createMaterial(data) {

        return new Promise((resolve,reject) => {
            try {

                let material = new Fabric(data)
                
                
                material.setSelfMap().then(() => {
                    
                    
                    
        
                    material.setMap(textures[14])
                    return material.setBump()
                    
                    
                }).then(() => {
                    material.setRoughness()
                    material.setAlpha()
                    material.init()
                }),
                
                // this.uploadTexture('/textures/DIS29099-CL1.jpg').then((t) => {
                //     this.frontSideMaterial.map = t
                // })
                
    
                //Promise.all(promisies).then(() => {
                resolve(material)
                //}).then((e) => {
                    //reject(e)
                //})
    
            } catch(e) {
                reject(`An error occurred: ${e}.`);
            }

        })        
        
        

    }

    init() {

        console.log('init')
        this.frontSideMaterial.needsUpdate = true;

        this.frontSideMaterial.color = new THREE.Color(0.2,0.2,0.2);

        if( this.transparent && this.alphaMap.intensity) {
            // this.uniforms.alphaIntensity.value = this.alphaMap.intensity;
            this.uniforms.alphaIntensity.value = this.alphaMap.intensity;
        }

        this.frontSideMaterial.onBeforeCompile = (shader) => {

            // console.log(shader);

            console.log(THREE.ShaderChunk.map_fragment)
      
            shader.uniforms = Object.assign( shader.uniforms, this.uniforms );      
      
            shader.fragmentShader = this.fragShaderPrepend + shader.fragmentShader;
      
            //rimpiazzo il map fragment con quello personalizzato e ci prependo il color fragment
            shader.fragmentShader =
              shader.fragmentShader.replace('#include <map_fragment>', this.fragShaderReplace );
      
            //rimuovo il color fragment perchè lo inserisco prima del map fragment
            shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `` );
      
            //rimpiazzo l'alphamap fragment con uno personalizzato in cui vado a modificare il calcolo della traspareza
            //in questo modo per la trasparenza uso la stessa mappa del bump
            shader.fragmentShader = shader.fragmentShader.replace('#include <alphamap_fragment>', `
#ifdef USE_ALPHAMAP
    diffuseColor.a *= clamp(texture2D( alphaMap, vUv ).g*alphaIntensity,0.0,1.0);
#endif
`);
      
        }
    }
    

}