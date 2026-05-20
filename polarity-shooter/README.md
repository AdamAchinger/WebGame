# Polarity Shooter 🚀

[![Graj teraz!](https://img.shields.io/badge/Zagraj-Online-success?style=for-the-badge)](https://twoj-link-do-gry.com) <!-- Zmień na prawdziwy link po wdrożeniu -->

**Polarity Shooter** to dynamiczna, przeglądarkowa gra z gatunku "Vertical Shoot 'em Up", mocno inspirowana takimi klasykami jak *Ikaruga*. Wyróżnia się unikalną mechaniką zmiany polaryzacji statku (czerwony/niebieski), która wymusza na graczu taktyczne podejście do walki, absorbowanie pocisków i unikanie wrogiego ostrzału.

![Wymagania](https://img.shields.io/badge/HTML5-Canvas-E34F26?style=flat-square&logo=html5&logoColor=white)
![Wymagania](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=flat-square&logo=javascript&logoColor=black)

---

## 📸 Zrzuty ekranu z gry

*Poniżej znajdziesz zrzuty ekranu prezentujące rozgrywkę. (Zapisz swoje screeny w folderze `screenshots/` i podmień poniższe linki)*

<div align="center">
  <img src="screenshots/gameplay1.png" alt="Ekran tytułowy" width="400" />
  <img src="screenshots/gameplay2.png" alt="Walka z przeciwnikami" width="400" />
  <br>
  <img src="screenshots/gameplay3.png" alt="Intensywny Bullet Hell" width="400" />
  <img src="screenshots/gameplay4.png" alt="Epicka Walka z Bossem" width="400" />
</div>

---

## ✨ Główne funkcje

- ☯️ **Mechanika polaryzacji:** Zmieniaj kolor swojego statku w locie. Absorbowanie pocisków tego samego koloru ładuje specjalny pasek ataku, a uderzenie pociskiem przeciwnego koloru zadaje podwójne obrażenia!
- 🛸 **Różnorodni wrogowie:** Od zwykłych "gruntów", przez zwinne "flankery", po opancerzone czołgi i snajperów.
- 👹 **Wymagający Boss:** Po przetrwaniu fal wrogów czeka Cię starcie z potężnym bossem posiadającym unikalne wzorce ataków (Lasery, rakiety, chmary pocisków).
- 🎮 **Pełne wsparcie dla Gamepada:** Graj wygodnie na padzie dzięki obsłudze Gamepad API.
- 🎵 **Udźwiękowienie:** Dynamiczna muzyka w tle oraz efekty dźwiękowe pasujące do neonowego klimatu.
- 🚀 **Płynna rozgrywka:** Zoptymalizowana pętla gry (60 FPS) działająca na HTML5 Canvas.

## 🕹️ Sterowanie

Gra obsługuje zarówno klawiaturę, jak i kontroler (Gamepad).

| Akcja | Klawiatura | Gamepad |
| :--- | :--- | :--- |
| **Ruch** | `Strzałki` (←, →, ↑, ↓) | `D-pad` lub `Lewa gałka (L-Stick)` |
| **Strzał** | `Z` | `Prawy spust (RT)` |
| **Zmiana koloru** | `X` | `Lewy spust (LT)` |
| **Start / Restart** | Kliknięcie w przycisk na ekranie | `Start` |

## 🚀 Jak uruchomić lokalnie?

Gra wykorzystuje moduły ES6 (`<script type="module">`), dlatego do uruchomienia wymaga prostego serwera HTTP (nie zadziała otwierając po prostu plik `index.html` z dysku w niektórych przeglądarkach z powodu zabezpieczeń CORS).

1. Sklonuj repozytorium:
   ```bash
   git clone https://github.com/twoj-profil/polarity-shooter.git
   cd polarity-shooter
   ```

2. Uruchom serwer lokalny (wybierz jedną z opcji):
   - **Używając Pythona (wbudowane):**
     ```bash
     python -m http.server 3000
     # (lub python3 -m http.server 3000)
     ```
   - **Używając Node.js (npx):**
     ```bash
     npx serve
     ```
   - **Używając VS Code:** Uruchom rozszerzenie "Live Server".

3. Otwórz przeglądarkę i wejdź na adres:
   `http://localhost:3000`

## 🛠️ Technologie

- **HTML5 Canvas:** Do renderowania grafiki 2D
- **Vanilla JavaScript (ES6+):** Logika gry oparta na klasach (OOP) i RequestAnimationFrame
- **CSS3:** Do stylizacji nakładek UI, fontów i animacji
- **Gamepad API:** Integracja padów z poziomu przeglądarki

## 📁 Struktura plików

Główna logika gry jest podzielona na mniejsze moduły zlokalizowane w folderze `src/`:

- `src/main.js` - Punkt wejścia i pętla główna.
- `src/Game.js` - Zarządzanie stanem, falami i odpalaniem bossa.
- `src/entities/` - Klasy dla gracza, przeciwników, bossa i pocisków.
- `src/managers/` - System kolizji, system cząsteczek, zarządzanie falami.

---

*Gra stworzona w ramach projektu rozwijającego umiejętności budowania gier webowych.*
