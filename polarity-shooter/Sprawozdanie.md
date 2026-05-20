# Sprawozdanie z projektu: Polarity Shooter 🚀

## 1. Wstęp i Opis Projektu
**Polarity Shooter** to dwuwymiarowa gra zręcznościowa typu *vertical shoot 'em up* (shmup) uruchamiana bezpośrednio w przeglądarce internetowej. Projekt powstał z myślą o odtworzeniu i unowocześnieniu klasycznych mechanik gier arkadowych, ze szczególnym uwzględnieniem spersonalizowanej mechaniki polaryzacji kolorów.

Głównym zadaniem gracza jest manewrowanie statkiem kosmicznym, niszczenie kolejnych fal wrogów i ostateczne pokonanie potężnego Bossa. Kluczem do przetrwania jest ciągła zmiana polaryzacji (koloru) statku pomiędzy **czerwonym (RED)** a **niebieskim (BLUE)**:
- Będąc **Niebieskim**, gracz niszczy tylko niebieskie statki/pociski, nie otrzymuje od nich obrażeń, ale od czerwonych otrzymuje podwójne obrażenia (traci 2 życia).
- Będąc **Czerwonym**, gracz niszczy tylko czerwone statki/pociski, nie otrzymuje od nich obrażeń, ale od niebieskich otrzymuje podwójne obrażenia (traci 2 życia).

---

## 2. Zrzuty Ekranu z Opisem Rozgrywki

### Ekran Rozgrywki (Gameplay)
![Rozgrywka w Polarity Shooter](screenshots/gameplay.png)
*Rysunek 1: Standardowa faza rozgrywki. Gracz steruje niebieskim statkiem (dół ekranu) i odpiera ataki czerwonych oraz niebieskich jednostek wroga. Widoczny jest efekt smugi za statkiem podczas korzystania z uniku (Boost) oraz wskaźniki HUD pokazujące liczbę żyć, aktualny łańcuch punktowy (chain) oraz stan naładowania paska umiejętności specjalnych.*

### Walka z Bossem (Boss Fight)
![Walka z Bossem](screenshots/boss.png)
*Rysunek 2: Faza finałowa – starcie z Bossem. Boss generuje skomplikowane wzorce pocisków (tzw. bullet hell) o obu polaryzacjach. Gracz musi dynamicznie zmieniać polaryzację swojego statku, aby absorbować pociski tego samego koloru (co ładuje jego pasek energii) i jednocześnie unikać laserów oraz pocisków o przeciwnej polaryzacji, które zadają krytyczne obrażenia.*

---

## 3. Architektura i Pętla Gry
Projekt został napisany w czystym języku JavaScript (zgodnie ze standardem ES6+) z wykorzystaniem programowania zorientowanego obiektowo (OOP). Renderowanie opiera się na elemencie `HTML5 Canvas` i kontekście `2d`.

Pętla gry zarządzana jest za pomocą metody `requestAnimationFrame`, która synchronizuje odświeżanie gry z częstotliwością monitora (docelowo 60 FPS), zapewniając płynność działania. Do obliczania fizyki i ruchu obiektów stosowany jest tzw. **Delta Time (dt)** – różnica czasu między klatkami, co gwarantuje taką samą prędkość rozgrywki niezależnie od wydajności sprzętu.

---

## 4. Analiza i Opis Fragmentów Kodu

### A. Główna Pętla Aktualizacji Stanu Gry (`Game.js`)
Poniższy fragment kodu z klasy `Game` odpowiada za sekwencyjne aktualizowanie wszystkich obiektów na ekranie w każdej klatce:

```javascript
_update(dt) {
  // 1. Aktualizacja tła
  this.background.update(dt);

  // 2. Aktualizacja gracza i zbieranie nowych pocisków
  const newPlayerBullets = this.player.update(dt, this.input);
  this.playerBullets.push(...newPlayerBullets);

  // 3. Sprawdzenie fal wrogów i generowanie nowych przeciwników
  const liveEnemies  = this.enemies.filter(e => e.isAlive).length;
  const liveMinions  = this.enemies.filter(e => e.isAlive && !e.isBoss).length;
  const newEnemies = this.waves.update(dt, this.waves.bossSpawned ? liveMinions : liveEnemies);
  this.enemies.push(...newEnemies);

  // 4. Aktualizacja wrogów i ich pocisków
  for (const e of this.enemies) {
    if (!e.isAlive) continue;
    const eBullets = e.update(dt, this.player.position);
    this.enemyBullets.push(...eBullets);
  }

  // 5. Aktualizacja fizyki pocisków
  for (const b of this.playerBullets) b.update(dt, this.enemies);
  for (const b of this.enemyBullets)  b.update(dt);

  // 6. Detekcja kolizji i czyszczenie nieaktywnych obiektów
  this.collisions.check(this.playerBullets, this.enemyBullets, this.enemies);
  
  this.playerBullets = this.playerBullets.filter(b => b.isAlive);
  this.enemyBullets  = this.enemyBullets.filter(b => b.isAlive);
  this.enemies       = this.enemies.filter(e => e.isAlive);
}
```
**Opis działania:**
Metoda ta jest sercem gry. W każdym cyklu:
- Pobiera dane wejściowe (klawiatura/gamepad) i przekazuje je do obiektu gracza.
- Aktualizuje pozycje przeciwników, gracza oraz wszystkich pocisków na podstawie czasu `dt`.
- Wywołuje menedżer kolizji (`CollisionManager`), który rozstrzyga trafienia.
- Filtruje tablice obiektów, usuwając te, które zostały zniszczone lub wyleciały poza ekran (optymalizacja pamięci).

---

### B. Mechanika Zmiany Polaryzacji Gracza (`Player.js`)
Klasa `Player` implementuje kluczową mechanikę gry – przełączanie kolorów statku:

```javascript
switchPolarity() {
  // Przełączanie między BLUE a RED
  this.polarity = this.polarity === POLARITY.BLUE ? POLARITY.RED : POLARITY.BLUE;
  
  // Efekty wizualne
  this._switchFlash = 0.25; // Czas błysku tarczy przy zmianie
  this._flipTimer = 0.3;    // Czas trwania animacji obrotu statku wokół własnej osi
  this._flipDir = Math.random() > 0.5 ? 1 : -1; // Losowy kierunek obrotu (lewo/prawo)
  
  // Zresetowanie łańcucha punktowego
  this.chain = 0;
}
```
**Opis działania:**
Przełączenie polaryzacji natychmiast zmienia właściwość `this.polarity`. Powoduje to, że statek zaczyna absorbować pociski o nowym kolorze, a pociski starego koloru stają się dla niego śmiertelne. Dodatkowo uruchamiane są zmienne kontrolujące efekty wizualne (błysk `_switchFlash` oraz obrót 3D za pomocą skalowania macierzy Canvas `_flipTimer`). Zresetowanie właściwości `this.chain` nakłada na gracza karę punktową za zmianę, promując dłuższą grę w jednym kolorze.

---

### C. Kolizja z Laserem Bossa (`Game.js`)
Ciekawym rozwiązaniem matematycznym jest detekcja kolizji gracza z ciągłym laserem Bossa (linią/promieniem) połączona z nowymi zasadami polaryzacji:

```javascript
if (perp < 14 && dot > 0) {
  if (e._attackPolarity === this.player.polarity) {
    // Ta sama polaryzacja: bezpiecznie, absorpcja lasera
    this.player.onAbsorb();
    this.particles.spawnAbsorb(this.player.position.x, this.player.position.y, e._attackPolarity);
  } else {
    // Przeciwna polaryzacja: podwójne obrażenia (strata 2 żyć)
    this.particles.spawnPlayerDeath(this.player.position.x, this.player.position.y);
    soundManager.playExplosion();
    this.player.die(2);
  }
}
```
**Opis działania:**
Po wyznaczeniu odległości gracza od linii lasera metodami geometrycznymi (`perp` oraz `dot`), sprawdzany jest warunek polaryzacji. Jeśli kolor gracza zgadza się z polaryzacją lasera Bossa (`e._attackPolarity`), laser nie zadaje obrażeń, lecz jest bezpiecznie absorbowany. W przeciwnym razie gracz otrzymuje podwójne obrażenia (traci 2 życia zamiast 1), co realizowane jest poprzez wywołanie `this.player.die(2)`.

---

## 5. Podsumowanie i Wnioski
Projekt **Polarity Shooter** z powodzeniem łączy elementy klasycznych gier zręcznościowych z nowoczesnymi standardami programowania webowego. 

**Kluczowe osiągnięcia projektowe:**
1. **Wydajność:** Dzięki renderowaniu na Canvas 2D i optymalnemu zarządzaniu obiektami gra utrzymuje stałe 60 FPS.
2. **Sterowanie:** Implementacja Gamepad API znacząco podnosi komfort rozgrywki, upodabniając projekt do gier konsolowych.
3. **Projektowanie OOP:** Modułowa architektura ułatwia dodawanie nowych typów przeciwników, ulepszeń czy efektów cząsteczkowych bez modyfikowania rdzenia silnika gry.

Napotkane podczas prac trudności (np. precyzyjne dopasowanie hitboxów pocisków czy płynne obracanie sprite'ów przy zmianie polaryzacji) zostały rozwiązane za pomocą zaawansowanych operacji na kontekście graficznym (`ctx.save()`, `ctx.translate()`, `ctx.scale()`) oraz matematyki wektorowej.
