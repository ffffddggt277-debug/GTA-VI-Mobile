/* ============================================================
   VC6 Mobile — процедурная низкополигональная модель человека.
   11 примитивов, анимация ходьбы/бега через ротацию конечностей
   (синус от фазы шага). Переиспользуется игроком и NPC.
   ============================================================ */

function makeHumanMesh(colors){
  const g=new THREE.Group();
  const mat=c=>new THREE.MeshLambertMaterial({color:c});
  const skin=mat(colors.skin), shirt=mat(colors.shirt), pants=mat(colors.pants);

  const torso=new THREE.Mesh(new THREE.BoxGeometry(0.62,0.8,0.34),shirt);
  torso.position.y=1.28; g.add(torso);

  const head=new THREE.Mesh(new THREE.BoxGeometry(0.34,0.36,0.32),skin);
  head.position.y=1.92; g.add(head);
  const hair=new THREE.Mesh(new THREE.BoxGeometry(0.37,0.12,0.35),mat(colors.hair));
  hair.position.y=2.08; g.add(hair);

  function limb(w,h,m,x,y){
    const pivot=new THREE.Group(); pivot.position.set(x,y,0);
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,w),m);
    mesh.position.y=-h/2; pivot.add(mesh);
    mesh.castShadow=QP.shadows;
    return pivot;
  }
  g.userData.armL=limb(0.17,0.68,skin,-0.42,1.62);
  g.userData.armR=limb(0.17,0.68,skin,0.42,1.62);
  g.userData.legL=limb(0.2,0.78,pants,-0.16,0.88);
  g.userData.legR=limb(0.2,0.78,pants,0.16,0.88);
  g.add(g.userData.armL,g.userData.armR,g.userData.legL,g.userData.legR);

  [torso,head,hair].forEach(m=>m.castShadow=QP.shadows);
  g.traverse(o=>{if(o.isMesh)o.castShadow=QP.shadows;});
  return g;
}

/* Анимация: phase растёт со скоростью, yaw — куда смотрит */
function animateHuman(g,phase,speedScale){
  const amp=0.7*Math.min(speedScale,1.6);
  const s=Math.sin(phase), c=Math.cos(phase);
  g.userData.armL.rotation.x=s*amp;
  g.userData.armR.rotation.x=-s*amp;
  g.userData.legL.rotation.x=-s*amp;
  g.userData.legR.rotation.x=s*amp;
  // лёгкая покачка корпуса
  g.children[0].rotation.z=c*amp*0.08;
}

const SKIN_TONES=[0xd9a066,0xf0c8a0,0x8d5524,0xc68642,0xffdbac];
const SHIRT_COLORS=[0xff4d6d,0x00c2a8,0xffd23d,0x3d8bff,0xff8a3d,0xa855f7,0x2ee59d];
const PANTS_COLORS=[0x2b3a55,0x222228,0x6b5544,0x3a5a40,0x44444f];
const HAIR_COLORS=[0x1a1a1a,0x4a2f1a,0x8a6a3a,0xd8d8de,0xff6a3d];

function randomOutfit(){
  return {
    skin:pick(SKIN_TONES), shirt:pick(SHIRT_COLORS),
    pants:pick(PANTS_COLORS), hair:pick(HAIR_COLORS)
  };
}
