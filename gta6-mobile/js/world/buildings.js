/* ============================================================
   VC6 Mobile — генерация зданий и стрит-каркас города.
   Все геометрии сливаются (merge) в несколько меши-чанков по
   кварталам → меньше draw calls → быстро на слабых GPU.
   Окна — эмиссивная текстура на канвасе (свечение ночью).
   ============================================================ */

const PALETTES = [
  ['#c96f4a','#e8b37a','#d88c5f'],   // терракота
  ['#7fb2c9','#a8d8e8','#5f93a8'],   // пастельный Майями-стиль
  ['#b0b0b8','#d8d8de','#8a8a94'],   // бетон
  ['#caa64a','#e8d08a','#a88a3a'],   // песок
  ['#8a5f9e','#b98ad8','#6f4a80'],   // закатный
  ['#4a8a6f','#7ac9a8','#3a7a5f']    // морской
];

/* Текстура фасада с окнами рисуется на canvas 1 раз на стиль */
const facadeCache = {};
function makeFacadeTexture(color, glowing){
  const key = color+(glowing?':glow':'');
  if(facadeCache[key]) return facadeCache[key];
  const c=document.createElement('canvas'); c.width=128; c.height=256;
  const g=c.getContext('2d');
  g.fillStyle=color; g.fillRect(0,0,128,256);
  // лёгкая грязь/бетонные полосы
  g.globalAlpha=.08; g.fillStyle='#000';
  for(let i=0;i<10;i++)g.fillRect(0,rand()*256,128,rrange(1,4));
  g.globalAlpha=1;
  // окна 4 колонки × 8 рядов
  for(let ry=0;ry<8;ry++)for(let cx=0;cx<4;cx++){
    const lit = rand()<.5;
    g.fillStyle = glowing ? (lit?'#ffe9a8':'#1a2430') : '#28323e';
    g.fillRect(10+cx*30, 8+ry*32, 18, 22);
    if(glowing&&lit){ g.fillStyle='rgba(255,230,150,.35)'; g.fillRect(6+cx*30,4+ry*32,26,30); }
  }
  const tex=new THREE.CanvasTexture(c);
  tex.magFilter=THREE.NearestFilter;
  facadeCache[key]=tex;
  return tex;
}

/* Слияние BoxGeometry-ов в одну геометрию без BufferGeometryUtils (экономия трафика):
   используем InstancedMesh вместо merge — ещё дешевле. */
function buildCityBlocks(scene, grid){
  const half=CFG.WORLD_SIZE/2;
  const n=CFG.BLOCK, road=CFG.ROAD_W;
  const boxesPerBlock=[];

  for(let bx=0;bx<8;bx++)for(let bz=0;bz<8;bz++){
    const ox=-half+bx*n+n*0.5, oz=-half+bz*n+n*0.5;
    // центральный деловой район — небоскрёбы
    const distC=Math.hypot(bx-3.5,bz-3.5);
    const downtown=distC<1.8;
    const count=downtown?rint(1,2):rint(2,4);
    for(let i=0;i<count;i++){
      const w=downtown?rrange(14,22):rrange(7,14);
      const d=downtown?rrange(14,22):rrange(7,14);
      const h=downtown?rrange(38,86):rrange(6,22);
      const px=ox+rrange(-(n/2-road-w/2-2),(n/2-road-w/2-2));
      const pz=oz+rrange(-(n/2-road-d/2-2),(n/2-road-d/2-2));
      const pal=pick(PALETTES);
      boxesPerBlock.push({w,h,d,x:px,z:pz,color:pick(pal)});
      grid.insert({minX:px-w/2,maxX:px+w/2,minZ:pz-d/2,maxZ:pz+d/2});
    }
  }

  // один InstancedMesh на оттенок → ~6 draw calls на весь город
  const byColor={};
  for(const b of boxesPerBlock)(byColor[b.color]=byColor[b.color]||[]).push(b);
  const meshes=[];
  const dummy=new THREE.Object3D();
  for(const color in byColor){
    const list=byColor[color];
    const geo=new THREE.BoxGeometry(1,1,1);
    const mat=new THREE.MeshLambertMaterial({map:makeFacadeTexture(color,QP.windowGlow)});
    const im=new THREE.InstancedMesh(geo,mat,list.length);
    im.castShadow=QP.shadows; im.receiveShadow=QP.shadows;
    list.forEach((b,i)=>{
      dummy.position.set(b.x,b.h/2,b.z);
      dummy.scale.set(b.w,b.h,b.d);
      // уникальные UV нельзя в instancing cheap-way — имитируем вариативность масштабом текстуры через rotation
      dummy.rotation.y=0;
      dummy.updateMatrix();
      im.setMatrixAt(i,dummy.matrix);
    });
    im.instanceMatrix.needsUpdate=true;
    scene.add(im); meshes.push(im);
  }
  return {buildings:boxesPerBlock, meshes};
}
