/* ============================================================
   VC6 Mobile — камера от третьего лица: следит за игроком/машиной,
   орбитальный поворот пальцем или мышью, режимы follow / hood /
   cinematic (для скриншотов). Мягкое демпфирование — плавность
   даже при просадках FPS.
   ============================================================ */

class GameCamera {
  constructor(camera){
    this.cam=camera;
    this.yaw=0; this.pitch=0.32; this.dist=7.5;
    this.mode='follow';       // follow | first | cinematic
    this.target=new THREE.Vector3();
    this.cineT=0;
  }
  toggleMode(){
    this.mode=this.mode==='follow'?'first':(this.mode==='first'?'cinematic':'follow');
    return this.mode;
  }
  update(dt, focusPos, speedScale){
    if(this.mode==='cinematic'){
      // облёт вокруг цели — красивый ракурс для скриншотов
      this.cineT+=dt*0.25;
      const r=14+Math.sin(this.cineT*0.7)*5;
      this.cam.position.set(
        focusPos.x+Math.cos(this.cineT)*r,
        focusPos.y+6+Math.sin(this.cineT*0.5)*2.5,
        focusPos.z+Math.sin(this.cineT)*r);
      this.cam.lookAt(focusPos.x,focusPos.y+1.6,focusPos.z);
      return;
    }
    if(this.mode==='first'){
      this.cam.position.set(focusPos.x,focusPos.y+(focusPos.y>0.5?1.35:1.75),focusPos.z);
      const s=Math.sin(this.yaw),c=Math.cos(this.yaw);
      this.cam.lookAt(focusPos.x+s*10,focusPos.y+1.6-this.pitch*8,focusPos.z+c*10);
      return;
    }
    // follow: позади цели, дистанция растёт со скоростью (драйв!)
    const wantDist=this.dist+speedScale*3.2;
    const height=2.4+speedScale*0.8;
    const s=Math.sin(this.yaw), c=Math.cos(this.yaw);
    const tx=focusPos.x-s*wantDist*Math.cos(this.pitch);
    const tz=focusPos.z-c*wantDist*Math.cos(this.pitch);
    const ty=focusPos.y+height+wantDist*Math.sin(this.pitch)*0.55;
    const l=6;
    this.cam.position.x=damp(this.cam.position.x,tx,l,dt);
    this.cam.position.y=damp(this.cam.position.y,ty,l,dt);
    this.cam.position.z=damp(this.cam.position.z,tz,l,dt);
    this.target.x=damp(this.target.x,focusPos.x,l*1.4,dt);
    this.target.y=damp(this.target.y,focusPos.y+1.7,l*1.4,dt);
    this.target.z=damp(this.target.z,focusPos.z,l*1.4,dt);
    this.cam.lookAt(this.target);
  }
  rotate(dx,dy){ this.yaw-=dx; this.pitch=clamp(this.pitch+dy,-0.15,0.9); }
}
