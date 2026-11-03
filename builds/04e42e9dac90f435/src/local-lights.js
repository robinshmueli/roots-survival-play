import {Color,Vector4} from '../vendor/three.module.js';

export const MAX_FIRE_LIGHTS=16;
export function createLocalLights() {
  const ambient={value:new Color(1,1,1)},sources={value:Array.from({length:MAX_FIRE_LIGHTS},()=>new Vector4())},registered=new WeakSet();
  return {
    attach(material) {
      if(!material.isMeshBasicMaterial||registered.has(material))return;
      registered.add(material);
      material.customProgramCacheKey=()=>`roots-fire-lights-${MAX_FIRE_LIGHTS}`;
      material.onBeforeCompile=shader=>{
        shader.uniforms.rootsAmbient=ambient;shader.uniforms.rootsFireLights=sources;
        shader.vertexShader='varying vec2 rootsWorld;\n'+shader.vertexShader;
        shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
          vec4 rootsPosition = vec4(transformed, 1.0);
          #ifdef USE_INSTANCING
            rootsPosition = instanceMatrix * rootsPosition;
          #endif
          rootsWorld = (modelMatrix * rootsPosition).xy;
        `);
        shader.fragmentShader=`varying vec2 rootsWorld; uniform vec3 rootsAmbient; uniform vec4 rootsFireLights[${MAX_FIRE_LIGHTS}];\n`+shader.fragmentShader;
        shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
          float rootsStrength = 0.0;
          for (int i = 0; i < ${MAX_FIRE_LIGHTS}; i++) {
            vec4 fire = rootsFireLights[i];
            float falloff = max(0.0, 1.0 - distance(rootsWorld, fire.xy) / max(fire.z, 0.001));
            rootsStrength = max(rootsStrength, falloff * falloff * fire.w);
          }
          vec3 rootsWarm = vec3(1.0, 0.76, 0.43);
          diffuseColor.rgb *= mix(vec3(1.0), rootsWarm / max(rootsAmbient, vec3(0.004)), clamp(rootsStrength, 0.0, 1.0));
        `);
      };
      material.needsUpdate=true;
    },
    update(tint,lights=[]) {
      ambient.value.copy(tint);
      const night=.12+.88*(1-Math.max(tint.r,tint.g,tint.b));
      sources.value.forEach((vector,i)=>{const light=lights[i];if(light)vector.set(light.x,light.y,light.radius??7,(light.power??1.7)*night);else vector.set(0,0,0,0);});
    },
    get sources(){return sources.value;},
  };
}
