/* ============================================================
   VC6 Mobile — ввод: клавиатура (WASD/стрелки/E/F/Shift/Space)
   + сенсорный джойстик и кнопки. Единый объект input для игры.
   ============================================================ */

const Input = {
  mx:0, my:0, moveLen:0,        // вектор движения -1..1
  run:false, jump:false, action:false, actionEdge:false,
  throttle:0, steer:0,          // управление авто
  lookDX:0,                     // поворот камеры свайпом справа
  _keys:{}, _actionQueued:false,

  init(){
    addEventListener('keydown',e=>{
      this._keys[e.code]=true;
      if(e.code==='KeyE'||e.code==='KeyF')this._actionQueued=true;
      if(e.code==='Space')this.jump=true;
    });
    addEventListener('keyup',e=>{
      this._keys[e.code]=false;
      if(e.code==='Space')this.jump=false;
    });

    /* --- Сенсорный джойстик --- */
    const base=document.getElementById('stick-base');
    const knob=document.getElementById('stick-knob');
    let stickId=null, cx=0, cy=0;
    const setKnob=(dx,dy)=>{knob.style.transform=`translate(${dx}px,${dy}px)`;};
    base.addEventListener('touchstart',e=>{
      const t=e.changedTouches[0]; stickId=t.identifier;
      const r=base.getBoundingClientRect(); cx=r.left+r.width/2; cy=r.top+r.height/2;
      e.preventDefault();
    },{passive:false});
    addEventListener('touchmove',e=>{
      for(const t of e.changedTouches){
        if(t.identifier===stickId){
          let dx=t.clientX-cx, dy=t.clientY-cy;
          const len=Math.hypot(dx,dy), max=55;
          if(len>max){dx*=max/len;dy*=max/len;}
          setKnob(dx,dy);
          this.mx=dx/max; this.my=-dy/max;
        } else if(t.identifier===lookId && Math.abs(t.clientX-lookX)>0){
          this.lookDX+=(t.clientX-lookX)*0.005; lookX=t.clientX;
        }
      }
    },{passive:true});
    const resetStick=()=>{this.mx=0;this.my=0;setKnob(0,0);};
    addEventListener('touchend',e=>{
      for(const t of e.changedTouches)if(t.identifier===stickId){stickId=null;resetStick();}
      for(const t of e.changedTouches)if(t.identifier===lookId)lookId=null;
    });

    /* --- Кнопки --- */
    const bind=(id,down,up)=>{
      const el=document.getElementById(id);
      el.addEventListener('touchstart',e=>{e.preventDefault();down();},{passive:false});
      el.addEventListener('touchend',e=>{e.preventDefault();up&&up();},{passive:false});
    };
    bind('btn-jump',()=>this.jump=true,()=>this.jump=false);
    bind('btn-action',()=>this._actionQueued=true);
    bind('btn-fps',()=>{window.toggleCameraMode&&window.toggleCameraMode();});

    /* --- Свайп справа от джойстика = поворот камеры --- */
    let lookId=null, lookX=0;
    window.lookIdRef={get id(){return lookId;}};
    document.getElementById('game').addEventListener('touchstart',e=>{
      for(const t of e.changedTouches){
        if(t.clientX>innerWidth*0.35&&stickId===null||t.clientX>innerWidth*0.35){
          if(lookId===null){lookId=t.identifier;lookX=t.clientX;}
        }
      }
    },{passive:true});
    // ссылки для обработчика выше
    var stickIdGetter=()=>stickId;
    this._getLook=()=>({lookId,lookX});
  },

  update(dt){
    // слияние клавиатуры и стика
    let kx=0,ky=0;
    if(this._keys.KeyW||this._keys.ArrowUp)ky+=1;
    if(this._keys.KeyS||this._keys.ArrowDown)ky-=1;
    if(this._keys.KeyA||this._keys.ArrowLeft)kx-=1;
    if(this._keys.KeyD||this._keys.ArrowRight)kx+=1;
    const useKbd=kx!==0||ky!==0;
    if(useKbd){this.mx=kx;this.my=ky;}
    this.moveLen=Math.min(1,Math.hypot(this.mx,this.my));
    this.run=!!(this._keys.ShiftLeft||this._keys.ShiftRight)||this.moveLen>0.92;
    this.action=this._actionQueued;
    this.actionEdge=this._actionQueued;
    this._actionQueued=false;

    // аркадные оси авто из тех же кнопок
    this.throttle=(this.my>0.2?1:this.my<-0.2?-1:0);
    this.steer=(this.mx<-0.2?-1:this.mx>0.2?1:0); // инверсия: право = вправо руля
  }
};
