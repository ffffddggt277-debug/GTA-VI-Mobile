/* ============================================================
   VC6 Mobile — NPC-пешеходы: блуждание по тротуарам, обход
   игрока-машины, «паника» при стрельбе/быстрой езде рядом.
   Обновляются только в радиусе активности (LOD по дистанции).
   ============================================================ */

class Ped {
  constructor(scene, grid, x, z){
    this.grid=grid;
    this.pos=new THREE.Vector3(x,0,z);
    this.yaw=rand()*Math.PI*2;
    this.speed=rrange(1.2,2.2);
    this.phase=0;
    this.state='walk';          // walk | flee
    this.fleeT=0;
    this.targetYaw=this.yaw;
    this.repathT=0;
    this.mesh=makeHumanMesh(randomOutfit());
    this.mesh.scale.setScalar(rrange(0.9,1.1));
    scene.add(this.mesh);
    this.radius=0.4;
  }

  panic(){ this.state='flee'; this.fleeT=rrange(4,8); }

  update(dt, playerPos, playerSpeed, active){
    if(!active){ // LOD: далеко — не считаем, меш скрыт
      this.mesh.visible=false; return;
    }
    this.mesh.visible=true;

    if(this.state==='flee'){
      this.fleeT-=dt;
      if(this.fleeT<=0)this.state='walk';
      // убегаем от игрока
      const dx=this.pos.x-playerPos.x, dz=this.pos.z-playerPos.z;
      this.targetYaw=Math.atan2(dx,dz);
    } else {
      this.repathT-=dt;
      if(this.repathT<=0){
        this.repathT=rrange(3,8);
        // иногда сворачиваем на перекрёстке
        this.targetYaw=this.yaw+(rand()<0.35?rrange(-1,1)*Math.PI/2:rrange(-0.3,0.3));
      }
      // не врезаться в игрока пешком
      const ddx=this.pos.x-playerPos.x, ddz=this.pos.z-playerPos.z;
      if(ddx*ddx+ddz*ddz<6){ this.targetYaw=Math.atan2(ddx,ddz); }
    }
    this.yaw=angleLerp(this.yaw,this.targetYaw,4*dt);

    const sp=this.state==='flee'?this.speed*2.4:this.speed;
    const mx=Math.sin(this.yaw), mz=Math.cos(this.yaw);
    this.pos.x+=mx*sp*dt; this.pos.z+=mz*sp*dt;

    resolveCircleBoxes(this.grid,this.pos,this.radius);
    const half=CFG.WORLD_SIZE/2;
    if(Math.abs(this.pos.x)>half||Math.abs(this.pos.z)>half){ // отразить обратно в город
      if(Math.abs(this.pos.x)>half)this.targetYaw=-this.yaw; else this.targetYaw=Math.PI-this.yaw;
      this.pos.x=clamp(this.pos.x,-half,half); this.pos.z=clamp(this.pos.z,-half,half);
    }

    this.phase+=dt*sp*3.4;
    animateHuman(this.mesh,this.phase,sp/1.6);
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.y=this.yaw;
  }
}
