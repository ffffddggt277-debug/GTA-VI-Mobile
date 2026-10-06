/* ============================================================
   VC6 Mobile — система розыска: звёзды 1–6, полиция-преследование.
   Полицейские машины спавнятся по уровню розыска и таранят/догоняют
   игрока. Розыск падает, если игрок скрылся >25 сек вдали от копов.
   ============================================================ */

const Wanted = {
  level:0, scene:null, grid:null, cars:[], lastSeenT:0, toastFn:null,

  init(scene,grid){ this.scene=scene; this.grid=grid; },

  add(n,msg){
    const old=this.level;
    this.level=clamp(this.level+n,0,6);
    if(this.level>old&&msg)this.toastFn&&this.toastFn(msg||'Розыск повышен!');
    this.lastSeenT=0;
  },

  update(dt, player, trafficCars){
    // decay: далеко от полиции и не виделись долго → минус звезда
    const nearCop=this.cars.some(c=>Math.hypot(c.pos.x-player.pos.x,c.pos.z-player.pos.z)<70);
    if(!nearCop)this.lastSeenT+=dt; else this.lastSeenT=0;
    if(this.level>0&&this.lastSeenT>25){this.level--;this.lastSeenT=0;}

    // поддержание числа патрульных
    const want=Math.min(this.level,3);
    while(this.cars.length<want){
      const a=rand()*Math.PI*2;
      const x=clamp(player.pos.x+Math.cos(a)*80,-CFG.WORLD_SIZE/2,CFG.WORLD_SIZE/2);
      const z=clamp(player.pos.z+Math.sin(a)*80,-CFG.WORLD_SIZE/2,CFG.WORLD_SIZE/2);
      const c=new Vehicle(this.scene,this.grid,x,z,0,0x1e2c6e,'police');
      // мигалка
      const beacon=new THREE.Mesh(new THREE.BoxGeometry(1.4,0.22,0.5),
        new THREE.MeshBasicMaterial({color:0xff2244}));
      beacon.position.set(0,1.95,-0.2); c.mesh.add(beacon);
      c.beacon=beacon;
      this.cars.push(c);
      this.toastFn&&this.toastFn('Полиция: вас заметили! ★'+this.level);
    }
    while(this.cars.length>want){
      const c=this.cars.pop(); this.scene.remove(c.mesh);
    }

    // ИИ преследования
    for(const c of this.cars){
      const dx=player.pos.x-c.pos.x, dz=player.pos.z-c.pos.z;
      const dist=Math.hypot(dx,dz);
      const wantYaw=Math.atan2(dx,dz);
      c.yaw=angleLerp(c.yaw,wantYaw,(dist>15?2.2:4)*dt);
      const thr=dist>9?1:0;
      c.drive(dt,{throttle:thr,steer:0});
      // мигалка
      c.beacon.material.color.setHex(Math.floor(performance.now()/180)%2?0xff2244:0x2255ff);
      // арест при контакте на малой скорости
      if(dist<3.2&&Math.abs(player.inCar?player.inCar.speed:10)<2&&this.level>=3){
        this.toastFn&&this.toastFn('Вы арестованы! Штраф $'+(200*this.level));
        player.money=Math.max(0,player.money-200*this.level);
        this.level=0; this.cars.forEach(cc=>this.scene.remove(cc.mesh)); this.cars=[];
        // отправить игрока на «участок» — центр карты
        player.exitCar&&player.inCar===null||0;
        if(player.inCar){player.exitCar();}
        player.pos.set(0,0,0);
      }
    }
  }
};
