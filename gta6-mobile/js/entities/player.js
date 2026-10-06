/* ============================================================
   VC6 Mobile — игрок: движение от камеры, прыжок/гравитация,
   коллизии со зданиями, посадка в транспорт.
   ============================================================ */

class Player {
  constructor(scene, grid){
    this.grid=grid;
    this.pos=new THREE.Vector3(0,0,0);
    this.velY=0; this.onGround=true;
    this.yaw=0; this.phase=0;
    this.health=100; this.money=CFG.START_MONEY;
    this.inCar=null;
    this.mesh=makeHumanMesh({skin:0xd9a066,shirt:0x00c2a8,pants:0x2b3a55,hair:0x1a1a1a});
    scene.add(this.mesh);
    this.radius=0.45;
  }

  update(dt, input, camYaw, sceneRef){
    if(this.inCar){
      // игрок «пристёгнут» — меш скрыт, позиция = позиция машины
      this.mesh.visible=false;
      this.pos.copy(this.inCar.pos);
      return;
    }
    this.mesh.visible=true;

    // направление движения от ориентации камеры
    let mx=0,mz=0;
    if(input.moveLen>0.12){
      const s=Math.sin(camYaw), c=Math.cos(camYaw);
      mx = -s*input.my + c*input.mx;
      mz = -c*input.my - s*input.mx;
      const len=Math.hypot(mx,mz)||1; mx/=len; mz/=len;
    }
    const run=input.run;
    const speed=(run?CFG.PLAYER_RUN:CFG.PLAYER_SPEED)*Math.min(input.moveLen,1);
    const tx=this.pos.x+mx*speed*dt, tz=this.pos.z+mz*speed*dt;
    this.pos.x=tx; this.pos.z=tz;

    // поворот модели к направлению хода
    if(input.moveLen>0.12){
      const targetYaw=Math.atan2(mx,mz);
      this.yaw=angleLerp(this.yaw,targetYaw,10*dt*(run?1.6:1));
    }

    // гравитация/прыжок
    if(input.jump && this.onGround){ this.velY=CFG.PLAYER_JUMP; this.onGround=false; }
    this.velY-=CFG.GRAVITY*dt;
    this.pos.y+=this.velY*dt;
    if(this.pos.y<=0){this.pos.y=0;this.velY=0;this.onGround=true;}

    // коллизии со зданиями и деревьями
    resolveCircleBoxes(this.grid,this.pos,this.radius);
    const half=CFG.WORLD_SIZE/2+70;
    this.pos.x=clamp(this.pos.x,-half,half); this.pos.z=clamp(this.pos.z,-half,half);

    // анимация шага
    const moving=input.moveLen>0.12&&this.onGround;
    if(moving)this.phase+=dt*(run?13:8.5); else this.phase=0;
    animateHuman(this.mesh,this.phase,moving?(run?1.5:1):0);
    if(!this.onGround){ // поза в прыжке
      this.mesh.userData.armL.rotation.x=-2.2; this.mesh.userData.armR.rotation.x=-2.2;
    }

    this.mesh.position.copy(this.pos);
    this.mesh.rotation.y=this.yaw;
  }

  enterCar(car){ this.inCar=car; car.driver='player'; }
  exitCar(scene){
    if(!this.inCar)return null;
    const car=this.inCar; car.driver=null;
    this.inCar=null;
    // выйти сбоку, не внутри стены
    const side=new THREE.Vector3(Math.cos(car.yaw+Math.PI/2),0,-Math.sin(car.yaw+Math.PI/2)).multiplyScalar(2.2);
    this.pos.set(car.pos.x+side.x,0,car.pos.z+side.z);
    let tries=0;
    while(pointBlocked(this.grid,this.pos.x,this.pos.z,this.radius)&&tries<8){
      side.applyAxisAngle(new THREE.Vector3(0,1,0),Math.PI/4);
      this.pos.set(car.pos.x+side.x,0,car.pos.z+side.z); tries++;
    }
    return true;
  }
}
