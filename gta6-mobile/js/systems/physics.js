/* ============================================================
   VC6 Mobile — физический мир: тонкий слой над утилитами.
   Деревья добавляются в коллизионную сетку один раз; толчки
   машин о пешеходов (пассивный ragdoll-«полёт» — комедийный,
   как в GTA: пешеход убегает/падает, health игрока не тратим).
   ============================================================ */

const Physics = {
  addTreeColliders(grid,trees){
    for(const t of trees)grid.insert({minX:t.x-t.r,maxX:t.x+t.r,minZ:t.z-t.r,maxZ:t.z+t.r});
  },

  /* Столкновения машин между собой — простые, только рядом с игроком */
  carPairResolve(cars, playerPos){
    const near=cars.filter(c=>Math.abs(c.pos.x-playerPos.x)<50&&Math.abs(c.pos.z-playerPos.z)<50);
    for(let i=0;i<near.length;i++)for(let j=i+1;j<near.length;j++){
      const a=near[i],b=near[j];
      const dx=b.pos.x-a.pos.x, dz=b.pos.z-a.pos.z;
      const d2=dx*dx+dz*dz, min=3.4;
      if(d2<min*min&&d2>1e-6){
        const d=Math.sqrt(d2), push=(min-d)/2;
        const nx=dx/d,nz=dz/d;
        a.pos.x-=nx*push;a.pos.z-=nz*push;b.pos.x+=nx*push;b.pos.z+=nz*push;
        // обмен скоростью (упрощённо)
        const rel=(a.speed-b.speed)*0.4;
        a.speed-=rel;b.speed+=rel;
        a.mesh.position.copy(a.pos); b.mesh.position.copy(b.pos);
      }
    }
  },

  /* Сбивание пешехода машиной → паника и «отбрасывание» */
  hitPeds(car,peds){
    if(Math.abs(car.speed)<3)return;
    for(const p of peds){
      const dx=p.pos.x-car.pos.x,dz=p.pos.z-car.pos.z;
      if(dx*dx+dz*dz<9){
        p.panic();
        p.pos.x+=dx*0.8;p.pos.z+=dz*0.8;
        if(car.driver==='player')Wanted.add(1,'Врезались в пешехода!');
      }
    }
  }
};
