/* ============================================================
   VC6 Mobile — трафик: AI-машины едут по сетке улиц.
   Маршрут = список узлов (перекрёстки). Поведение: газ до
   крейсерской, торможение перед узлом, поворот. Респавн далеко
   от игрока — толпа всегда живая без скачков.
   ============================================================ */

class Traffic {
  constructor(scene, grid, roads, count){
    this.scene=scene; this.grid=grid; this.roads=roads;
    this.cars=[]; this.count=count;
    srand(777);
    for(let i=0;i<count;i++)this.spawn(true);
  }

  randomIntersection(){
    const L=this.roads.lines;
    return {x:L[rint(0,L.length-1)], z:L[rint(0,L.length-1)]};
  }

  spawn(anywhere){
    let x,z;
    if(anywhere){
      const it=this.randomIntersection(); x=it.x; z=it.z;
    } else {
      // спавн на кольце 70..110 м от игрока
      const a=rand()*Math.PI*2, r=rrange(70,110);
      const it=this.randomIntersection();
      x=clamp(it.x, -CFG.WORLD_SIZE/2, CFG.WORLD_SIZE/2);
      z=clamp(it.z, -CFG.WORLD_SIZE/2, CFG.WORLD_SIZE/2);
    }
    const axis=rand()<0.5?'x':'z';
    const yaw=axis==='x'?(rand()<0.5?Math.PI/2:-Math.PI/2):(rand()<0.5?0:Math.PI);
    const isPolice=false;
    const v=new Vehicle(this.scene,this.grid,x,yaw?x:x, yaw, pick(CAR_COLORS), 'car');
    v.pos.set(x,0,z);
    v.ai={axis, cruise:rrange(7,13), target:this.nextTarget(x,z,axis)};
    this.cars.push(v);
    return v;
  }

  nextTarget(x,z,axis){
    const L=this.roads.lines;
    if(axis==='z'){ // едем вдоль Z к следующему перекрёстку X
      let best=L[0],bd=1e9;
      for(const l of L){const d=l-z;if(Math.abs(d)>18&&Math.abs(d)<bd){bd=Math.abs(d);best=l;}}
      return {x:x, z:best};
    } else {
      let best=L[0],bd=1e9;
      for(const l of L){const d=l-x;if(Math.abs(d)>18&&Math.abs(d)<bd){bd=Math.abs(d);best=l;}}
      return {x:best, z:z};
    }
  }

  update(dt, playerPos){
    for(let i=this.cars.length-1;i>=0;i--){
      const c=this.cars[i];
      if(c.driver==='player')continue;
      const dist=Math.hypot(c.pos.x-playerPos.x,c.pos.z-playerPos.z);
      // далеко — телепорт на свежий перекрёсток (экономим симуляцию)
      if(dist>150){
        const it=this.randomIntersection();
        c.pos.set(it.x,0,it.z);
        c.ai.axis=rand()<0.5?'x':'z';
        c.yaw=c.ai.axis==='x'?Math.PI/2:0;
        c.speed=0;
        c.ai.target=this.nextTarget(c.pos.x,c.pos.z,c.ai.axis);
        continue;
      }
      if(dist>60){c.mesh.visible=false;continue;}else c.mesh.visible=true;

      // рулим к цели
      const t=c.ai.target;
      const wantYaw=Math.atan2(t.x-c.pos.x,t.z-c.pos.z);
      c.yaw=angleLerp(c.yaw,wantYaw,3.2*dt);
      const dToT=Math.hypot(t.x-c.pos.x,t.z-c.pos.z);
      let thr=1;
      if(dToT<10){ // достигли узла — новый сегмент (иногда поворот)
        c.ai.target=this.nextTarget(c.pos.x,c.pos.z,c.ai.axis);
        if(rand()<0.35)c.ai.axis=c.ai.axis==='x'?'z':'x';
      }
      const slow=dToT<14?0.25:1;
      const overSpeed=c.speed>c.ai.cruise;
      c.drive(dt,{throttle:overSpeed?0:(playerPos&&Math.hypot(playerPos.x-c.pos.x,playerPos.z-c.pos.z)<8?0.2:slow),steer:0});
      // коррекция курса пропорциональна ошибке угла
      const err=(()=>{let e=wantYaw-c.yaw;while(e>Math.PI)e-=2*Math.PI;while(e<-Math.PI)e+=2*Math.PI;return e;})();
      c.yaw+=clamp(err,-1,1)*dt*2.5;
    }
  }
}
