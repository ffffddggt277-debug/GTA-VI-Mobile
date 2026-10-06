#!/usr/bin/env python3
"""VC6 Mobile — автоматические скриншоты игровых сцен."""
import asyncio, os
from playwright.async_api import async_playwright

OUT = os.path.join(os.path.dirname(__file__), "screenshots")
os.makedirs(OUT, exist_ok=True)

async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(args=[
            "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
            "--disable-gpu-sandbox", "--no-sandbox"])
        # --- Desktop screenshot (portrait-ish 1280x720) ---
        page = await browser.new_page(viewport={"width":1280,"height":720})
        errors = []
        page.on("console", lambda m: errors.append(m.text) if m.type=="error" else None)
        page.on("pageerror", lambda e: errors.append(str(e)))
        await page.goto("http://localhost:8777/index.html")
        await page.wait_for_selector("#btn-start:not(.hidden)", timeout=30000)
        await page.click("#btn-start")
        await asyncio.sleep(4)   # прогресс симуляции, миссия стартует
        await page.screenshot(path=f"{OUT}/01_day_city_walk.png")

        # Идём вперёд к машине: зажмём W
        await page.keyboard.down("KeyW")
        await asyncio.sleep(3.5)
        await page.keyboard.up("KeyW")
        await page.screenshot(path=f"{OUT}/02_street_pedestrians.png")

        # Прыжок + поворот камеры мышью
        await page.keyboard.press("Space")
        await asyncio.sleep(0.4)
        await page.screenshot(path=f"{OUT}/03_jump.png")

        # Сесть в ближайшую машину: телепортируем игрока к припаркованной
        await page.evaluate("""() => {
            const c = parkedCars[0];
            player.pos.set(c.pos.x+3, 0, c.pos.z);
        }""")
        await asyncio.sleep(0.3)
        await page.keyboard.press("KeyE")     # enter car
        await asyncio.sleep(0.6)
        # Езда: газ + лёгкий руль
        await page.keyboard.down("KeyW")
        await asyncio.sleep(2.2)
        await page.keyboard.down("KeyA")
        await asyncio.sleep(1.2)
        await page.keyboard.up("KeyA")
        await asyncio.sleep(1.0)
        await page.keyboard.up("KeyW")
        await page.screenshot(path=f"{OUT}/04_driving_turn.png")

        # Розыск: угнали — уже есть звёзды; добавим ещё и покажем копов
        await page.evaluate("Wanted.add(3,'Демо погоня')")
        await asyncio.sleep(3.5)
        await page.keyboard.down("KeyW")
        await asyncio.sleep(2.5)
        await page.keyboard.up("KeyW")
        await page.screenshot(path=f"{OUT}/05_police_chase.png")

        # Ночь + cinematic-камера
        await page.evaluate("lighting.clock.t = 0.88")
        await page.evaluate("""() => { while(gameCam.mode!=='cinematic') gameCam.toggleMode(); }""")
        await asyncio.sleep(3.0)
        await page.screenshot(path=f"{OUT}/06_night_cinematic.png")

        print("DESKTOP ERRORS:", errors[:10] if errors else "none")
        await page.close()

        # --- Mobile portrait (iPhone-like, touch UI visible) ---
        mob = await browser.new_page(viewport={"width":390,"height":844}, is_mobile=True, has_touch=True,
                                     device_scale_factor=2)
        merr=[]
        mob.on("pageerror", lambda e: merr.append(str(e)))
        await mob.goto("http://localhost:8777/index.html")
        await mob.wait_for_selector("#btn-start:not(.hidden)", timeout=30000)
        await mob.tap("#btn-start")
        await asyncio.sleep(4)
        await mob.screenshot(path=f"{OUT}/07_mobile_touch_hud.png")
        print("MOBILE ERRORS:", merr[:10] if merr else "none")
        await mob.close()
        await browser.close()

asyncio.run(main())
print("DONE ->", OUT)
