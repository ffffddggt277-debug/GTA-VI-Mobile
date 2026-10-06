/* ============================================================
   VC6 Mobile — точка входа: сцена, рендер-цикл, динамическое
   качество (downscale при FPS<35, upscale при стабильных 60),
   оркестрация всех систем.
   ============================================================ */

const GAME = { fps:60, nearCar:null, running:false };

let renderer, scene, camera, gameCam, player, grid, hud, missions, traffic, lighting, nature;
let peds=[], parkedCars=[];
let camYawGlobal=0;

/* ---------- Инициализация рендера ---------- */
function initRenderer(){
  const canvas=document.getElementById('game');
  renderer=new THREE.WebGLRenderer({canvas,antialias:QP.antialias,powerPreference:'high-performance'});
  renderer.shadowMap.enabled=QP.shadows;
  renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  applyResolution();
  scene=new THREE.Scene();
  camera=new THREE.PerspectiveCamera(62,innerWidth/innerHeight,0.1,900);
  gameCam=new GameCamera(camera);
  addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();applyResolution();});
}
function applyResolution(){
  const dpr=Math.min(devicePixelRatio||1,QP.pixelRatioCap)*QP.renderScale;
  renderer.setPixelRatio(dpr);
  renderer.setSize(innerWidth,innerHeight,false);
}

/* ---------- Построение мира (с «полосой» загрузки) ---------- */
async function buildWorld(onProgress){
  srand(1337);
  grid=new SpatialGrid(24);
  onProgress(10,'Строим здания…'); await frame();
  const city=buildCityBlocks(scene,grid);
  onProgress(35,'Асфальтируем улицы…'); await frame();
  const roads=buildRoads(scene);
  onProgress(55,'Сажаем пальмы…'); await frame();
  nature=buildNature(scene);
  Physics.addTreeColliders(grid,nature.trees);
  onProgress(70,'Включаем свет…'); await frame();
  lighting=buildLighting(scene);
  // параллельные машины у тротуаров (угоняемые)
  onProgress(82,'Паркуем машины…'); await frame();
  srand(555);
  for(let i=0;i<Math.max(6,QP.cars/2);i++){
    const l1=roads.lines[rint(0,8)], l2=roads.lines[rint(0,8)];
    const axis=rand()<0.5;
    const v=new Vehicle(scene,grid,axis?l1+4:l2,l1,rand()<0.5?Math.PI/2:-Math.PI/2,pick(CAR_COLORS),'car');
    if(!axis)v.pos.set(l2,0,l1+4), v.yaw=rand()<0.5?0:Math.PI;
    v.mesh.position.copy(v.pos); v.mesh.rotation.y=v.yaw;
    parkedCars.push(v);
  }
  onProgress(90,'Спавним жителей…'); await frame();
  // трафик и пешеходы
  traffic=new Traffic(scene,grid,roads,QP.cars);
  srand(31337);
  for(let i=0;i<QP.peds;i++){
    const it=traffic.randomIntersection();
    peds.push(new Ped(scene,grid,it.x+rrange(-6,6),it.z+rrange(-6,6)));
  }
  // игрок на улице в центре
  const sp=nearestStreetPoint(roads,0,-60);
  player=new Player(scene,grid);
  player.pos.set(sp.x,0,sp.z);
  onProgress(100,'Готово!');
  return {roads,buildings:city.buildings};
}
const frame=()=>new Promise(r=>requestAnimationFrame(r));

/* ---------- Динамическое качество ---------- */
let _fpsHist=[], _qCheckT=0;
function autoQuality(dt,fps){
  _fpsHist.push(fps); if(_fpsHist.length>4)_fpsHist.shift();
  _qCheckT-=dt;
  if(_qCheckT>0)return; _qCheckT=4;
  const avg=_fpsHist.reduce((a,b)=>a+b,0)/_fpsHist.length;
  if(avg<32&&QK!=='LOW'){ QK='LOW'; QP=QUALITY.LOW; applyResolution(); }
  else if(avg>57&&QK==='LOW'){ QK='MEDIUM'; QP=QUALITY.MEDIUM; applyResolution(); }
  else if(avg>58&&QK==='MEDIUM'&&!(navigator.hardwareConcurrency<=4)){ QK='HIGH'; QP=QUALITY.HIGH; applyResolution(); }
}

/* ---------- Основной цикл ---------- */
let lastT=performance.now(), fpsAcc=0, fpsN=0;
function loop(now){
  requestAnimationFrame(loop);
  let dt=(now-lastT)/1000; lastT=now;
  dt=Math.min(dt,0.05); // защита от «прыжка времени» после сворачивания вкладки
  fpsAcc+=dt;fpsN++;
  if(fpsAcc>0.5){GAME.fps=fpsN/fpsAcc;autoQuality(fpsAcc,GAME.fps);fpsAcc=0;fpsN=0;}
  if(!GAME.running)return;

  Input.update(dt);
  // поворот камеры свайпом / мышью
  if(Input.lookDX){gameCam.rotate(Input.lookDX,0);Input.lookDX=0;}
  camYawGlobal=gameCam.yaw;

  // взаимодействие: сесть/выйти из машины
  if(Input.actionEdge){
    if(player.inCar){ player.exitCar(scene); hud.toast('Вы вышли из машины'); }
    else if(GAME.nearCar){
      const c=GAME.nearCar;
      if(c.driver==='ai')c.driver=null;
      player.enterCar(c);
      hud.toast(c.kind==='police'?'Вы угнали ПОЛИЦЕЙСКУЮ машину!':'Вы за рулём — газуйте!');
      Wanted.add(c.kind==='police'?2:1,c.kind==='police'?'Кража полицейского транспорта!':'Угон автомобиля');
    }
  }

  if(player.inCar){
    player.inCar.drive(dt,{throttle:Input.throttle,steer:Input.steer});
    Physics.hitPeds(player.inCar,peds);
  }
  player.update(dt,Input,gameCam.yaw,scene);

  // ближайшая машина для подсказки
  GAME.nearCar=null;
  let bd=4.2*4.2;
  for(const c of [...parkedCars,...traffic.cars,...Wanted.cars]){
    const d=(c.pos.x-player.pos.x)**2+(c.pos.z-player.pos.z)**2;
    if(d<bd&&!c.driver){bd=d;GAME.nearCar=c;}
  }

  traffic.update(dt,player.pos);
  Wanted.update(dt,player,traffic.cars);
  Physics.carPairResolve([...traffic.cars,...Wanted.cars,...parkedCars],player.pos);

  // пешеходы: LOD — активны только ближние
  for(const p of peds){
    const d=Math.hypot(p.pos.x-player.pos.x,p.pos.z-player.pos.z);
    p.update(dt,player.pos,0,d<55);
  }

  lighting.update(dt,player.pos);
  nature.update(now/1000);
  missions.update(dt,player);

  // камера следует за игроком/машиной
  const focus=player.inCar?player.inCar.pos:player.pos;
  const spd=player.inCar?clamp(Math.abs(player.inCar.speed)/CFG.CAR_MAX_SPEED,0,1):0;
  if(player.inCar&&!Input.mx&&!Input.my===false){}
  gameCam.update(dt,focus,spd);

  hud.update(dt,player,Wanted,gameCam.yaw);
  renderer.render(scene,camera);
}

/* ---------- Мышь для десктопа ---------- */
function initMouseLook(){
  let down=false,lx=0,ly=0;
  const cv=document.getElementById('game');
  cv.addEventListener('mousedown',e=>{down=true;lx=e.clientX;ly=e.clientY;});
  addEventListener('mouseup',()=>down=false);
  addEventListener('mousemove',e=>{if(down)gameCam.rotate((e.clientX-lx)*0.005,(e.clientY-ly)*0.004),lx=e.clientX,ly=e.clientY;});
  window.toggleCameraMode=()=>hud.toast('Камера: '+gameCam.toggleMode());
  addEventListener('keydown',e=>{if(e.code==='KeyC')window.toggleCameraMode();});
  addEventListener('keydown',e=>{if(e.code==='KeyK')Wanted.add(1,'Демо: розыск +1');});
}

/* ---------- Старт ---------- */
(async function boot(){
  const fill=document.getElementById('loader-fill'), status=document.getElementById('loader-status');
  initRenderer();
  Input.init(); initMouseLook();
  hud=new HUD();
  Wanted.init(scene,grid||null); Wanted.toastFn=m=>hud.toast(m);
  const world=await buildWorld((p,msg)=>{fill.style.width=p+'%';status.textContent=msg;});
  Wanted.grid=grid;
  missions=new Missions(scene,hud);
  hud.world={roads:world.roads,buildings:world.buildings,cars:[...traffic.cars,...parkedCars],marker:null};
  // синхронизация маркера миссии в hud.world
  Object.defineProperty(hud.world,'marker',{get:()=>missions.marker?{x:missions.marker.position.x,z:missions.marker.position.z}:null});
  setInterval(()=>{hud.world.cars=[...traffic.cars,...Wanted.cars,...parkedCars];},1000);

  document.getElementById('btn-start').classList.remove('hidden');
  document.getElementById('btn-start').addEventListener('click',()=>{
    document.getElementById('loader').style.display='none';
    document.getElementById('hud').classList.remove('hidden');
    const touch=/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent)||('ontouchstart'in window&&innerWidth<1100);
    if(touch)document.getElementById('touch-controls').classList.remove('hidden');
    GAME.running=true;
    setTimeout(()=>missions.start(),1200);
    hud.toast('VC6 Mobile: добро пожаловать в Voss City!');
  });
  requestAnimationFrame(loop);
})();
