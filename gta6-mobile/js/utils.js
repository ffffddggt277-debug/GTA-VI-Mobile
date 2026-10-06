/* ============================================================
   VC6 Mobile — утилиты: сид-генератор, математика, коллизии.
   Коллизии со зданиями через пространственную сетку (grid hash),
   чтобы не перебирать все боксы каждый кадр (важно для слабых CPU).
   ============================================================ */

/* Детерминированный ПСЧ (mulberry32) — город одинаковый у всех игроков */
let _seed = 1337;
function srand(s){ _seed = s >>> 0; }
function rand(){
  let t = _seed += 0x6D2B79F5;
  t = Math.imul(t ^ t >>> 15, t | 1);
  t ^= t + Math.imul(t ^ t >>> 7, t | 61);
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
}
const rrange = (a,b)=> a + rand()*(b-a);
const rint = (a,b)=> Math.floor(rrange(a,b+1));
const pick = arr => arr[Math.floor(rand()*arr.length)];

const clamp = (v,a,b)=> v<a?a:(v>b?b:v);
const lerp = (a,b,t)=> a+(b-a)*t;
const damp = (a,b,l,dt)=> lerp(a,b,1-Math.exp(-l*dt)); // кадрово-независимое сглаживание
function angleLerp(a,b,t){
  let d = b-a;
  while(d>Math.PI)d-=Math.PI*2;
  while(d<-Math.PI)d+=Math.PI*2;
  return a+d*t;
}

/* Пространственная сетка AABB-боксов зданий/объектов */
class SpatialGrid {
  constructor(cell){ this.cell = cell; this.map = new Map(); }
  key(cx,cz){ return cx+','+cz; }
  insert(box){ // box: {minX,minZ,maxX,maxZ, ref}
    const x0=Math.floor(box.minX/this.cell), x1=Math.floor(box.maxX/this.cell);
    const z0=Math.floor(box.minZ/this.cell), z1=Math.floor(box.maxZ/this.cell);
    for(let cx=x0;cx<=x1;cx++)for(let cz=z0;cz<=z1;cz++){
      const k=this.key(cx,cz);
      if(!this.map.has(k))this.map.set(k,[]);
      this.map.get(k).push(box);
    }
  }
  query(x,z,r){
    const out=new Set();
    const x0=Math.floor((x-r)/this.cell), x1=Math.floor((x+r)/this.cell);
    const z0=Math.floor((z-r)/this.cell), z1=Math.floor((z+r)/this.cell);
    for(let cx=x0;cx<=x1;cx++)for(let cz=z0;cz<=z1;cz++){
      const arr=this.map.get(this.key(cx,cz));
      if(arr)for(const b of arr)out.add(b);
    }
    return [...out];
  }
}

/* Разрешение коллизии круга (x,z,r) с набором AABB: выталкивание по минимальной оси */
function resolveCircleBoxes(grid, pos, radius){
  const boxes = grid.query(pos.x,pos.z,radius+2);
  let hit = false;
  for(const b of boxes){
    const minX=b.minX, maxX=b.maxX, minZ=b.minZ, maxZ=b.maxZ;
    if(pos.x>minX-radius && pos.x<maxX+radius && pos.z>minZ-radius && pos.z<maxZ+radius){
      // пересечение есть — выталкиваем по ближайшей грани
      const dl=pos.x-(minX-radius), dr=(maxX+radius)-pos.x;
      const dt=pos.z-(minZ-radius), db=(maxZ+radius)-pos.z;
      const m=Math.min(dl,dr,dt,db);
      if(m===dl)pos.x=minX-radius; else if(m===dr)pos.x=maxX+radius;
      else if(m===dt)pos.z=minZ-radius; else pos.z=maxZ+radius;
      hit=true;
    }
  }
  return hit;
}

/* Проверка «можно ли встать» в точке (для посадки в машину) */
function pointBlocked(grid,x,z,r){
  const boxes=grid.query(x,z,r+1);
  for(const b of boxes){
    if(x>b.minX-r&&x<b.maxX+r&&z>b.minZ-r&&z<b.maxZ+r)return true;
  }
  return false;
}
