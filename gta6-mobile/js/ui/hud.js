/* ============================================================
   VC6 Mobile — HUD: деньги, звёзды розыска, спидометр, тосты
   и миникарта (2D-канвас: улицы, здания, игрок, цели, копы).
   ============================================================ */

class HUD {
  constructor(){
    this.el={
      money:document.getElementById('money'),
      stars:[...document.querySelectorAll('#wanted-stars span')],
      fps:document.getElementById('fps'),
      quality:document.getElementById('quality-tag'),
      speedo:document.getElementById('speedo'),
      speedVal:document.getElementById('speed-val'),
      hint:document.getElementById('interact-hint'),
      toast:document.getElementById('mission-toast'),
      health:document.getElementById('healthfill'),
      mini:document.getElementById('minimap').getContext('2d')
    };
    this.miniCanvas=document.getElementById('minimap');
    this.toastT=0; this.miniT=0;
    this.world=null; // {roads, buildings, peds, cars, police}
  }

  toast(msg){
    const t=this.el.toast; t.textContent=msg; t.classList.remove('hidden');
    clearTimeout(this._tt); this._tt=setTimeout(()=>t.classList.add('hidden'),3200);
  }
  addMoney(n){ this.moneyShown=(this.moneyShown||0)+n; }

  setStars(l){
    this.el.stars.forEach((s,i)=>s.classList.toggle('on',i<l));
  }

  update(dt, player, wanted, camYaw){
    this.el.money.textContent='$'+Math.floor(player.money+(this.moneyShown||0));
    this.setStars(wanted.level);
    this.el.health.style.width=player.health+'%';
    if(player.inCar){
      this.el.speedo.classList.remove('hidden');
      this.el.speedVal.textContent=Math.round(player.inCar.kmh());
    } else this.el.speedo.classList.add('hidden');
    // FPS + качество
    this.el.fps.textContent=Math.round(GAME.fps)+' FPS';
    this.el.quality.textContent='QUALITY: '+QK;
    // подсказка взаимодействия
    this.el.hint.classList.toggle('hidden',!(GAME.nearCar&&!player.inCar||player.inCar));
    // миникарта ~15 раз/сек (не каждый кадр — экономия)
    this.miniT-=dt;
    if(this.miniT<=0){this.drawMinimap(player,camYaw,wanted);this.miniT=1/15;}
  }

  drawMinimap(player,camYaw,wanted){
    const g=this.el.mini, S=150, R=90; // радиус мира на миникарте, м
    g.clearRect(0,0,S,S);
    g.fillStyle='#101820'; g.fillRect(0,0,S,S);
    const cx=S/2, cy=S/2, k=S/(2*R);
    const toMini=(x,z)=>{
      const dx=x-player.pos.x, dz=z-player.pos.z;
      const s=Math.sin(-camYaw),c=Math.cos(-camYaw);
      return [cx+(dx*c-dz*s)*k, cy+(dx*s+dz*c)*k];
    };
    // улицы
    g.strokeStyle='#3a4a5a'; g.lineWidth=3;
    for(const l of this.world.roads.lines){
      let[a,b]=toMini(l,-CFG.WORLD_SIZE/2),[c,d]=toMini(l,CFG.WORLD_SIZE/2);
      g.beginPath();g.moveTo(a,b);g.lineTo(c,d);g.stroke();
      [a,b]=toMini(-CFG.WORLD_SIZE/2,l);[c,d]=toMini(CFG.WORLD_SIZE/2,l);
      g.beginPath();g.moveTo(a,b);g.lineTo(c,d);g.stroke();
    }
    // здания рядом
    g.fillStyle='#4a5568';
    for(const b of this.world.buildings){
      if(Math.abs(b.x-player.pos.x)>R||Math.abs(b.z-player.pos.z)>R)continue;
      const[mx,my]=toMini(b.x,b.z);
      g.fillRect(mx-b.w*k/2,my-b.d*k/2,b.w*k,b.d*k);
    }
    // трафик и копы
    for(const c of this.world.cars){
      const[mx,my]=toMini(c.pos.x,c.pos.z);
      g.fillStyle=c.kind==='police'?'#4da6ff':'#889';
      g.fillRect(mx-2,my-2,4,4);
    }
    // маркер миссии
    if(this.world.marker){
      const[mx,my]=toMini(this.world.marker.x,this.world.marker.z);
      g.fillStyle='#ffd23d';
      g.beginPath();g.arc(clamp(mx,6,S-6),clamp(my,6,S-6),4,0,7);g.fill();
    }
    // игрок — стрелка в центре
    g.save();g.translate(cx,cy);g.rotate(Math.PI);
    g.fillStyle='#2ee59d';g.beginPath();g.moveTo(0,-6);g.lineTo(4,5);g.lineTo(-4,5);g.closePath();g.fill();
    g.restore();
  }
}
