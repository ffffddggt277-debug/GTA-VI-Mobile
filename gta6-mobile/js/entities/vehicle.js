/* ============================================================
   VC6 Mobile — транспорт: процедурные машины (~14 примитивов),
   аркадная физика (газ/тормоз/руль), вращение колёс, фары ночью.
   ============================================================ */

const CAR_COLORS=[0xff3355,0x2266ff,0xffcc22,0x22cc88,0xffffff,0x111116,0xff7a1a,0xa855f7,0x39d0ff];

function makeCarMesh(color){
  const g=new THREE.Group();
  const bodyMat=new THREE.MeshLambertMaterial({color});
  const glassMat=new THREE.MeshLambertMaterial({color:0x223344});
  const darkMat=new THREE.MeshLambertMaterial({color:0x15151a});

  const body=new THREE.Mesh(new THREE.BoxGeometry(2.1,0.62,4.5),bodyMat);
  body.position.y=0.72; g.add(body);
  const hood=new THREE.Mesh(new THREE.BoxGeometry(2.0,0.28,1.5),bodyMat);
  hood.position.set(0,0.62,1.55); g.add(hood);
  const cabin=new THREE.Mesh(new THREE.BoxGeometry(1.8,0.66,2.1),glassMat);
  cabin.position.set(0,1.32,-0.25); g.add(cabin);
  const roof=new THREE.Mesh(new THREE.BoxGeometry(1.86,0.12,2.0),bodyMat);
  roof.position.set(0,1.68,-0.25); g.add(roof);
  // бамперы
  for(const z of [2.25,-2.25]){
    const b=new THREE.Mesh(new THREE.BoxGeometry(2.12,0.3,0.34),darkMat);
    b.position.set(0,0.5,z); g.add(b);
  }
  // фары и фонари
  const headMat=new THREE.MeshBasicMaterial({color:0xfff6c8});
  const tailMat=new THREE.MeshBasicMaterial({color:0xff2233});
  for(const x of [-0.72,0.72]){
    const hl=new THREE.Mesh(new THREE.BoxGeometry(0.42,0.2,0.08),headMat);
    hl.position.set(x,0.82,2.28); g.add(hl);
    const tl=new THREE.Mesh(new THREE.BoxGeometry(0.42,0.18,0.08),tailMat);
    tl.position.set(x,0.86,-2.28); g.add(tl);
  }
  // колёса
  const wheelGeo=new THREE.CylinderGeometry(0.42,0.42,0.34,8);
  wheelGeo.rotateZ(Math.PI/2);
  const wheels=[];
  for(const [x,z] of [[-1.05,1.45],[1.05,1.45],[-1.05,-1.45],[1.05,-1.45]]){
    const w=new THREE.Mesh(wheelGeo,darkMat);
    w.position.set(x,0.42,z); g.add(w); wheels.push(w);
  }
  g.traverse(o=>{if(o.isMesh)o.castShadow=QP.shadows;});
  g.userData.wheels=wheels;
  return g;
}

class Vehicle {
  constructor(scene, grid, x, z, yaw, color, kind){
    this.grid=grid; this.kind=kind||'car';
    this.pos=new THREE.Vector3(x,0,z);
    this.yaw=yaw; this.speed=0;
    this.driver=null;           // 'player' | 'ai' | null
    this.ai={};                 // данные трафика
    this.mesh=makeCarMesh(color);
    this.mesh.rotation.y=yaw;
    scene.add(this.mesh);
    this.radius=2.3;
    this.color=color;
  }

  /* Аркадная модель: input={throttle:-1..1, steer:-1..1} */
  drive(dt,input){
    const maxF=input.throttle>=0?CFG.CAR_MAX_SPEED:-CFG.CAR_MAX_SPEED*0.45;
    this.speed+=input.throttle*CFG.CAR_ACCEL*dt*(this.kind==='police'?1.25:1);
    if(input.throttle===0)this.speed*=Math.exp(-1.4*dt);         // катится на нейтралке
    this.speed=clamp(this.speed,maxF,CFG.CAR_MAX_SPEED*(this.kind==='police'?1.3:1));
    if(Math.abs(this.speed)>0.5){
      const grip=clamp(Math.abs(this.speed)/10,0,1);
      this.yaw-=input.steer*CFG.CAR_TURN*dt*grip*Math.sign(this.speed);
    }
    this.moveAlong(dt);
    this.spinWheels(dt);
  }

  moveAlong(dt){
    const fx=Math.sin(this.yaw), fz=Math.cos(this.yaw);
    const np={x:this.pos.x+fx*this.speed*dt, z:this.pos.z+fz*this.speed*dt, y:0};
    // столкновение со зданиями → отскок/остановка
    const before={x:np.x,z:np.z};
    const hit=resolveCircleBoxes(this.grid,np,1.5);
    if(hit && Math.abs(this.speed)>12){ this.health=(this.health||100)-Math.abs(this.speed); }
    if(hit){ this.speed*=-0.25; } // лёгкий отскок
    this.pos.x=np.x; this.pos.z=np.z;
    const half=CFG.WORLD_SIZE/2+60;
    this.pos.x=clamp(this.pos.x,-half,half); this.pos.z=clamp(this.pos.z,-half,half);
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.y=this.yaw;
  }

  spinWheels(dt){
    const rot=this.speed*dt/0.42;
    for(const w of this.mesh.userData.wheels)w.rotation.x+=rot;
  }

  kmh(){ return Math.abs(this.speed)*3.6; }
}
