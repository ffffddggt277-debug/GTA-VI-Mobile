/* ============================================================
   VC6 Mobile — освещение и цикл дня/ночи.
   Солнце (DirectionalLight с тенями только на MEDIUM+),
   полусферический свет, градиентное небо-сфера, туман.
   Ночью включаются фонари (ограниченное число PointLight)
   и эмиссивные окна фасадов меняют оттенок.
   ============================================================ */

const SKY_COLORS = {
  day:    {top:0x3d9bff, bot:0xbfe3ff, fog:0xcfe8f5, sun:0xfff2cc, si:1.15},
  sunset: {top:0x2b2a6e, bot:0xff7a45, fog:0xd8785a, sun:0xff9a4d, si:0.85},
  night:  {top:0x05051e, bot:0x101838, fog:0x0a0e22, sun:0x6a86c9, si:0.28}
};

function mixCol(a,b,t){ const ca=new THREE.Color(a),cb=new THREE.Color(b); return ca.lerp(cb,t); }

function buildLighting(scene){
  const hemi=new THREE.HemisphereLight(0xbfe3ff,0x445533,0.7);
  scene.add(hemi);

  const sun=new THREE.DirectionalLight(0xfff2cc,1.15);
  sun.position.set(120,180,80);
  if(QP.shadows){
    sun.castShadow=true;
    sun.shadow.mapSize.set(QP.shadowMapSize,QP.shadowMapSize);
    const s=sun.shadow.camera;
    s.left=-90;s.right=90;s.top=90;s.bottom=-90;s.near=10;s.far=500;
    sun.shadow.bias=-0.0015;
  }
  scene.add(sun); scene.add(sun.target);

  // небо — invertированная сфера с вертикальным градиентом (canvas texture)
  const nc=document.createElement('canvas'); nc.width=4; nc.height=128;
  const ng=nc.getContext('2d');
  function paintSky(top,bot){
    const gr=ng.createLinearGradient(0,0,0,128);
    gr.addColorStop(0,'#'+new THREE.Color(top).getHexString());
    gr.addColorStop(1,'#'+new THREE.Color(bot).getHexString());
    ng.fillStyle=gr; ng.fillRect(0,0,4,128);
  }
  paintSky(SKY_COLORS.day.top,SKY_COLORS.day.bot);
  const skyTex=new THREE.CanvasTexture(nc);
  const sky=new THREE.Mesh(
    new THREE.SphereGeometry(600,QP.skySegments,QP.skySegments/2|0||4),
    new THREE.MeshBasicMaterial({map:skyTex,side:THREE.BackSide,fog:false})
  );
  scene.add(sky);

  scene.fog=new THREE.FogExp2(SKY_COLORS.day.fog,QP.fogDensity);

  // ночные фонари — немного, только рядом с игроком (пул + перестановка)
  const lampPool=[];
  const lampGeo=new THREE.CylinderGeometry(0.09,0.12,5.2,4);
  const lampMat=new THREE.MeshLambertMaterial({color:0x333344});
  const headGeo=new THREE.SphereGeometry(0.32,6,5);
  const headMat=new THREE.MeshBasicMaterial({color:0xffe9a8});
  const poleCount=Math.min(QP.lampposts,28);
  srand(4242);
  const half=CFG.WORLD_SIZE/2;
  for(let i=0;i<poleCount;i++){
    const g=new THREE.Group();
    const px=(-half+i*(CFG.WORLD_SIZE/poleCount))+rrange(-4,4);
    const pz=rint(-4,4)*CFG.BLOCK+rrange(-5,5);
    const pole=new THREE.Mesh(lampGeo,lampMat); pole.position.y=2.6;
    const head=new THREE.Mesh(headGeo,headMat); head.position.y=5.3;
    g.add(pole,head); g.position.set(px,0,pz);
    scene.add(g);
    lampPool.push({group:g,head,x:px,z:pz});
  }
  let pointLights=0;
  const maxPL=QP.buildingDetail==='low'?0:(QP.buildingDetail==='mid'?2:4);
  const pl=new THREE.PointLight(0xffd98a,0,26,2);
  scene.add(pl); if(maxPL>1){const pl2=pl.clone();scene.add(pl2);lampPool._pl2=pl2;}
  lampPool._pl=pl;

  const clock={t:0.28}; // стартуем днём (~10:00)

  return {
    sun,hemi,sky,skyTex,paintSky,clock,lampPool,maxPL,
    update(dt,playerPos){
      clock.t=(clock.t+dt/CFG.DAY_LENGTH)%1;
      const a=clock.t*Math.PI*2 - Math.PI/2;
      const elev=Math.sin(a);                    // 1=полдень, -1=полночь
      const dayF=clamp(elev*2+0.35,0,1);         // «дневность»
      const sunsetF=clamp(1-Math.abs(elev)*3.2,0,1)*clamp(elev+0.55,0,1);

      // интерполяция палитр
      const top=mixCol(SKY_COLORS.night.top,SKY_COLORS.day.top,dayF);
      const bot=mixCol(SKY_COLORS.night.bot,SKY_COLORS.day.bot,dayF);
      if(sunsetF>0.05){top.lerp(new THREE.Color(SKY_COLORS.sunset.top),sunsetF*.6);
        bot.lerp(new THREE.Color(SKY_COLORS.sunset.bot),sunsetF);}
      this.paintSky(top.getHex(),bot.getHex());
      this.skyTex.needsUpdate=true;

      sun.position.set(Math.cos(a)*200,Math.max(elev,-0.4)*220+20,80);
      sun.intensity=lerp(SKY_COLORS.night.si,SKY_COLORS.day.si,dayF)*(1-sunsetF*0.3)+sunsetF*0.5;
      sun.color.setHex(sunsetF>0.3?SKY_COLORS.sunset.sun:SKY_COLORS.day.sun);
      hemi.intensity=lerp(0.22,0.7,dayF);
      scene.fog.color.copy(mixCol(SKY_COLORS.night.fog,SKY_COLORS.day.fog,dayF));
      if(sunsetF>0.3)scene.fog.color.lerp(new THREE.Color(SKY_COLORS.sunset.fog),sunsetF);
      sky.position.set(playerPos.x,0,playerPos.z);

      // фонари горят ночью: ставим пул точечных источников к ближайшим столбам
      const nightF=1-dayF;
      lampPool._pl.intensity=nightF*1.6; lampPool._pl2&&(lampPool._pl2.intensity=nightF*1.6);
      if(nightF>0.35){
        const sorted=[...lampPool].sort((A,B)=>
          (A.x-playerPos.x)**2+(A.z-playerPos.z)**2 - ((B.x-playerPos.x)**2+(B.z-playerPos.z)**2));
        lampPool._pl.position.set(sorted[0].x,5.2,sorted[0].z);
        sorted.forEach(o=>o.head.visible=true);
        if(lampPool._pl2)lampPool._pl2.position.set(sorted[1]?sorted[1].x:sorted[0].x,5.2,sorted[1]?sorted[1].z:sorted[0].z);
      } else {
        lampPool._pl.intensity=0; if(lampPool._pl2)lampPool._pl2.intensity=0;
      }
      return {dayF,nightF,sunsetF};
    }
  };
}
