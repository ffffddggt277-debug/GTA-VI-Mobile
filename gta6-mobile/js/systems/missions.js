/* ============================================================
   VC6 Mobile — цепочка миссий (мини-сюжет «Доберись до пляжа»).
   Маркер цели + чекпоинты на машине. Награда — деньги.
   ============================================================ */

class Missions {
  constructor(scene, hud){
    this.scene=hud.scene=scene; this.hud=hud;
    this.step=-1;              // -1 = ожидание старта
    this.chain=[
      {type:'goto', pos:new THREE.Vector3(-180,0,-120), msg:'Доберитесь до жёлтого маркера'},
      {type:'car',  msg:'Угоните любую машину', needCar:true},
      {type:'cp',   pts:[new THREE.Vector3(120,0,-60),new THREE.Vector3(180,0,60),new THREE.Vector3(-60,0,150)],
       msg:'Гонка: 3 чекпоинта за 60 секунд', time:60},
      {type:'goto', pos:new THREE.Vector3(0,0,CFG.WORLD_SIZE/2+30), msg:'Финал: отдыхайте на пляже Voss City'}
    ];
    this.marker=null; this.cpIdx=0; this.timer=0;
  }

  makeMarker(pos,color=0xffd23d){
    if(this.marker)this.scene.remove(this.marker);
    const g=new THREE.Group();
    const cyl=new THREE.Mesh(new THREE.CylinderGeometry(1.6,1.6,4.5,10,1,true),
      new THREE.MeshBasicMaterial({color,transparent:true,opacity:.45,side:THREE.DoubleSide}));
    cyl.position.y=2.6;
    const ring=new THREE.Mesh(new THREE.TorusGeometry(1.7,0.14,6,16),
      new THREE.MeshBasicMaterial({color}));
    ring.rotation.x=Math.PI/2; ring.position.y=0.3;
    g.add(cyl,ring); g.position.copy(pos);
    this.scene.add(g); this.marker=g; return g;
  }

  start(){ this.step=0; this.beginStep(); }

  beginStep(){
    const s=this.chain[this.step];
    if(!s){this.hud.toast('Все миссии выполнены! Свободный режим 🌴');this.step=-1;this.marker&&this.scene.remove(this.marker);return;}
    if(s.time){this.timer=s.time;}
    if(s.type==='goto'){this.makeMarker(s.pos);}
    if(s.type==='car'){this.marker&&this.scene.remove(this.marker);this.marker=null;}
    if(s.type==='cp'){this.cpIdx=0;this.makeMarker(s.pts[0]);}
    this.hud.toast('МИССИЯ: '+s.msg);
  }

  complete(){
    this.hud.toast('✔ Миссия выполнена! +$'+CFG.MISSION_REWARD);
    this.hud.addMoney(CFG.MISSION_REWARD);
    this.step++; this.beginStep();
  }

  update(dt, player){
    if(this.step<0)return;
    const s=this.chain[this.step];
    if(this.marker)this.marker.rotation.y+=dt*1.5;
    if(s.time){this.timer-=dt;if(this.timer<=0){this.hud.toast('✖ Провал! Перезапуск…');this.beginStep();return;}}

    if(s.type==='goto'&&player.pos.distanceTo(s.pos)<4)this.complete();
    else if(s.type==='car'&&player.inCar)this.complete();
    else if(s.type==='cp'){
      const p=s.pts[this.cpIdx];
      if(player.pos.distanceTo(p)<5){
        this.cpIdx++;
        if(this.cpIdx>=s.pts.length)this.complete();
        else{this.makeMarker(s.pts[this.cpIdx]);this.hud.toast(`Чекпоинт ${this.cpIdx}/${s.pts.length}`);}
      }
    }
  }
}
