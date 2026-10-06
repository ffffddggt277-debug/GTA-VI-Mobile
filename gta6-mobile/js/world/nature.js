/* ============================================================
   VC6 Mobile — природа: пальмы, пляж и океан с анимацией волн.
   Пальмы = два InstancedMesh (ствол-цилиндр + крестовина листьев).
   Океан = одна плоскость, вершины двигаются в шейдере-заменителе
   (простая синусоидальная деформация через onBeforeRender —
   дёшево и без скачивания библиотек).
   ============================================================ */

function buildNature(scene){
  srand(911); // отдельный сид для природы — стабильный ландшафт
  const half=CFG.WORLD_SIZE/2;
  const trees=[];

  // ---- Стволы пальм ----
  const trunkGeo=new THREE.CylinderGeometry(0.18,0.32,5,5);
  const trunkMat=new THREE.MeshLambertMaterial({color:0x8a6a4a});
  const trunks=new THREE.InstancedMesh(trunkGeo,trunkMat,QP.trees);
  trunks.castShadow=QP.shadows;

  // ---- Листва: две скрещенные плоскости с альфа-маской ----
  const leafCanvas=document.createElement('canvas'); leafCanvas.width=leafCanvas.height=128;
  const lg=leafCanvas.getContext('2d');
  lg.clearRect(0,0,128,128);
  lg.strokeStyle='#2f7a3a'; lg.lineCap='round';
  for(let i=0;i<9;i++){
    const a=(i/9)*Math.PI*2;
    lg.beginPath(); lg.moveTo(64,64);
    lg.quadraticCurveTo(64+Math.cos(a)*40,64+Math.sin(a)*40-14,64+Math.cos(a)*58,64+Math.sin(a)*58+10);
    lg.lineWidth=7; lg.stroke();
  }
  const leafTex=new THREE.CanvasTexture(leafCanvas);
  const leafGeo=new THREE.PlaneGeometry(4.4,4.4);
  const leafMat=new THREE.MeshLambertMaterial({map:leafTex,transparent:true,alphaTest:0.4,side:THREE.DoubleSide});
  const leavesA=new THREE.InstancedMesh(leafGeo,leafMat,QP.trees);
  const leavesB=new THREE.InstancedMesh(leafGeo,leafMat,QP.trees);
  leavesA.rotateX(-Math.PI/2); // не используем — вместо этого зададим матрицы

  const dummy=new THREE.Object3D();
  let ti=0;
  function placePalm(x,z){
    if(ti>=QP.trees)return;
    const lean=rrange(-0.12,0.12), rotY=rrange(0,Math.PI*2), s=rrange(.8,1.25);
    dummy.position.set(x,2.5*s,z); dummy.rotation.set(lean,rotY,lean*0.6); dummy.scale.setScalar(s);
    dummy.updateMatrix(); trunks.setMatrixAt(ti,dummy.matrix);
    // листья — горизонтальный крест на макушке
    const topX=x+Math.sin(lean)* -2.5*s*0.5, topZ=z;
    dummy.position.set(topX,5.1*s,topZ); dummy.rotation.set(-Math.PI/2,rotY,0); dummy.scale.setScalar(s);
    dummy.updateMatrix(); leavesA.setMatrixAt(ti,dummy.matrix);
    dummy.rotation.set(-Math.PI/2,rotY+Math.PI/2,0);
    dummy.updateMatrix(); leavesB.setMatrixAt(ti,dummy.matrix);
    trees.push({x,z,r:0.6});
    ti++;
  }

  // пальмы вдоль улиц между зданиями (внутренние «дворы»)
  const n=CFG.BLOCK;
  for(let bx=0;bx<8;bx++)for(let bz=0;bz<8;bz++){
    const cx=-half+bx*n+n/2, cz=-half+bz*n+n/2;
    const k=rint(1,2);
    for(let i=0;i<k;i++)placePalm(cx+rrange(-n/2+8,n/2-8),cz+rrange(-n/2+8,n/2-8));
  }
  // пальмовая аллея у пляжа
  for(let i=0;i<QP.trees-ti;i++)placePalm(rrange(-half,half),half+rrange(6,20));

  trunks.count=leavesA.count=leavesB.count=ti;
  [trunks,leavesA,leavesB].forEach(m=>{m.instanceMatrix.needsUpdate=true;scene.add(m);});

  // ---- Пляж и океан (южная граница карты) ----
  const sandMat=new THREE.MeshLambertMaterial({color:0xe8d59a});
  const sand=new THREE.Mesh(new THREE.PlaneGeometry(CFG.WORLD_SIZE+120,60),sandMat);
  sand.rotation.x=-Math.PI/2; sand.position.set(0,0.06,half+34);
  scene.add(sand);

  const waterGeo=new THREE.PlaneGeometry(1400,700,QP.waterSegments,QP.waterSegments/2|0||4);
  const waterMat=new THREE.MeshPhongMaterial({color:0x1a7ac9,shininess:90,specular:0x88ccff,transparent:true,opacity:.92});
  const water=new THREE.Mesh(waterGeo,waterMat);
  water.rotation.x=-Math.PI/2; water.position.set(0,-0.4,half+380);
  scene.add(water);
  // сохраняем базовые позиции вершин для волн
  const basePos=waterGeo.attributes.position.array.slice();

  return {
    trees, water, basePos,
    update(t){ // вызывается из main-цикла: волны + блики
      const p=waterGeo.attributes.position.array;
      for(let i=0;i<p.length;i+=1){
        const bx=basePos[i*3], by=basePos[i*3+1];
        p[i*3+2]=Math.sin(bx*0.04+t*1.4)*0.7+Math.cos(by*0.05+t*1.1)*0.5;
      }
      waterGeo.attributes.position.needsUpdate=true;
      waterGeo.computeVertexNormals();
    }
  };
}
