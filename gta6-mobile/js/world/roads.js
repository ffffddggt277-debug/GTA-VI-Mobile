/* ============================================================
   VC6 Mobile — дороги, тротуары, разметка. Одна плоскость с
   процедурной canvas-текстурой асфальта (256px, tileable) +
   тонкие боксы разметки через InstancedMesh.
   ============================================================ */

function makeAsphaltTexture(){
  const c=document.createElement('canvas'); c.width=c.height=256;
  const g=c.getContext('2d');
  g.fillStyle='#3a3a40'; g.fillRect(0,0,256,256);
  // зерно асфальта
  for(let i=0;i<900;i++){
    g.fillStyle=`rgba(${rint(60,110)},${rint(60,110)},${rint(65,115)},.5)`;
    g.fillRect(rand()*256,rand()*256,2,2);
  }
  const tex=new THREE.CanvasTexture(c);
  tex.wrapS=tex.wrapT=THREE.RepeatWrapping; tex.repeat.set(60,60);
  return tex;
}

/* Дорожная сеть: сетка улиц. Возвращает список «путей» для трафика. */
function buildRoads(scene){
  const half=CFG.WORLD_SIZE/2, n=CFG.BLOCK, rw=CFG.ROAD_W;
  const lines=[]; // координаты центров улиц по X и Z
  for(let i=0;i<=8;i++)lines.push(-half+i*n);

  // земля под городом (асфальт повсюду, кварталы перекроим тротуарными плитами)
  const groundMat=new THREE.MeshLambertMaterial({map:makeAsphaltTexture()});
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(CFG.WORLD_SIZE+40,CFG.WORLD_SIZE+40),groundMat);
  ground.rotation.x=-Math.PI/2; ground.receiveShadow=QP.shadows;
  scene.add(ground);

  // тротуарные плиты кварталов (InstancedMesh, один box на квартал)
  const swGeo=new THREE.BoxGeometry(1,0.24,1);
  const swMat=new THREE.MeshLambertMaterial({color:0x9aa0a8});
  const sw=new THREE.InstancedMesh(swGeo,swMat,64);
  const dummy=new THREE.Object3D(); let si=0;
  for(let bx=0;bx<8;bx++)for(let bz=0;bz<8;bz++){
    dummy.position.set(-half+bx*n+n/2,0.12,-half+bz*n+n/2);
    dummy.scale.set(n-rw,1,n-rw); dummy.updateMatrix();
    sw.setMatrixAt(si++,dummy.matrix);
  }
  sw.instanceMatrix.needsUpdate=true; sw.receiveShadow=QP.shadows;
  scene.add(sw);

  // жёлтая осевая разметка вдоль всех улиц — InstancedMesh сегментов
  const dashGeo=new THREE.BoxGeometry(1,0.02,0.22);
  const dashMat=new THREE.MeshBasicMaterial({color:0xd8c23a});
  const perLine=Math.floor((CFG.WORLD_SIZE)/4);
  const total=lines.length*perLine*2;
  const dash=new THREE.InstancedMesh(dashGeo,dashMat,Math.min(total,QP.buildingDetail==='low'?600:1600));
  let di=0;
  const step = CFG.WORLD_SIZE/Math.min(perLine, QP.buildingDetail==='low'?14:30);
  for(const l of lines){
    for(let t=-half;t<half;t+=step){
      if(di>=dash.count)break;
      dummy.position.set(l,0.02,t); dummy.scale.set(0.22,1,step*0.45);
      dummy.rotation.set(0,0,0); dummy.updateMatrix(); dash.setMatrixAt(di++,dummy.matrix);
      if(di>=dash.count)break;
      dummy.position.set(t,0.02,l); dummy.scale.set(step*0.45,1,0.22);
      dummy.updateMatrix(); dash.setMatrixAt(di++,dummy.matrix);
    }
  }
  dash.count=di; dash.instanceMatrix.needsUpdate=true;
  scene.add(dash);

  return {lines, half};
}

/* Позиция на ближайшей улице (для спавна игрока/машин) */
function nearestStreetPoint(roads, x, z){
  let best=null,bd=1e9;
  for(const l of roads.lines){
    const d1=Math.abs(x-l); if(d1<bd){bd=d1;best={x:l,z:z,axis:'z'};}
    const d2=Math.abs(z-l); if(d2<bd){bd=d2;best={x:x,z:l,axis:'x'};}
  }
  return best;
}
