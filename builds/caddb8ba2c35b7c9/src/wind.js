import { WIND, WORLD } from './config.js';
import { BufferGeometry,Float32BufferAttribute,DynamicDrawUsage } from '../vendor/three.module.js';

const flexibility = {
  pine: .8, blue: .75, broadleaf: .85, fruit: .8,
  birch: 1.15, maple: .9, willow: 1.35, cherry: 1, cypress: .7,
  palm: 1.25, jungle: .85, acacia: .75, autumnOak: .85,
  snowPine: .75, snowSpruce: .7,
};

export function windForce(seconds) {
  const gust=.68+.32*Math.sin(seconds*.29+1.2);
  const flow=Math.sin(seconds*.8)+.2*Math.sin(seconds*1.47);
  return flow*WIND.strength*gust+Math.sin(seconds*2.15)*WIND.flutter*.5;
}

export function createTreeGeometry(width,height) {
  const geometry=new BufferGeometry(),positions=[],uvs=[],indices=[];
  for(let layer=0;layer<2;layer++) {
    positions.push(-width/2,height/2,0,width/2,height/2,0,-width/2,-height/2,0,width/2,-height/2,0);
    const left=layer/2,right=(layer+1)/2;
    uvs.push(left,1,right,1,left,0,right,0);
    const start=layer*4;indices.push(start,start+2,start+1,start+2,start+3,start+1);
  }
  geometry.setAttribute('position',new Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new Float32BufferAttribute(uvs,2));geometry.setIndex(indices);
  geometry.userData.canopyStart=4;
  return geometry;
}

export function createWind() {
  const trees=new Map();
  return {
    addTree(mesh,kind,height,foot=.9375) {
      const positions=mesh.geometry.attributes.position;positions.setUsage(DynamicDrawUsage);
      const base=positions.array.slice(),root=height*(.5-foot);
      const wind={base,version:0,cos:1,sin:0,offset:{x:0,y:0},offsetAt(x=0,y=height/2){
        const aboveRoot=y-root;
        return {x:x*(this.cos-1)-aboveRoot*this.sin,y:x*this.sin+aboveRoot*(this.cos-1)};
      }};
      mesh.userData.wind=wind;mesh.userData.treeKind=kind;
      mesh.geometry.computeBoundingSphere();mesh.geometry.boundingSphere.radius+=height*.15;
      trees.set(mesh,{mesh,wind,height,foot,root,flex:flexibility[kind]??1});
    },
    removeTree(mesh){trees.delete(mesh);delete mesh.userData.wind;},
    update(seconds) {
      const force=windForce(seconds);
      for(const {mesh,wind,height,foot,root,flex} of trees.values()) {
        // Rotate wood and foliage as one tree around its roots. The shared rigid
        // transform keeps the layers aligned and preserves the shape of the art.
        const lean=force*flex*(height/6)*.75;
        const x=Math.round(lean*WORLD.pixelsPerUnit)/WORLD.pixelsPerUnit;
        const angle=-Math.atan2(x,height*foot);
        wind.cos=Math.cos(angle);wind.sin=Math.sin(angle);
        const offset=wind.offsetAt();wind.offset.x=offset.x;wind.offset.y=offset.y;
        const positions=mesh.geometry.attributes.position;
        for(let i=0;i<positions.count;i++) {
          const at=i*3,bx=wind.base[at],by=wind.base[at+1]-root;
          positions.setXYZ(i,bx*wind.cos-by*wind.sin,root+bx*wind.sin+by*wind.cos,wind.base[at+2]);
        }
        positions.needsUpdate=true;wind.version++;
      }
    },
  };
}
