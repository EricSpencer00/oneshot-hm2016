### You said:
My goal is to craft a fully working web-based game in one go.

It should have 3d animations and enhanced graphics and state system as a priority. 

The functionality should work, and also look like a fully polished game from the start. 

Let's try to make a game that's already well-defined: Hitman 2016.

Create one mission with all of the MVP features (Target, stealth, guns, etc)

craft the ultimate one shot prompt to create a ThreeJS game with your suggested AI model (Opus 4.5)


### ChatGPT said:
Below is a **single, copy-paste “one-shot” prompt** designed to push a strong code-gen model (your suggested **Opus 4.5**) to generate a **fully working, polished Three.js stealth game** inspired by **Hitman (2016)** with real gameplay systems—not a tech demo.

This prompt is intentionally **long, explicit, and constraint-heavy** to reduce ambiguity and maximize first-pass success.

---

## 🎯 ONE-SHOT PROMPT (PASTE INTO OPUS 4.5)

> **Role & Goal**
>
> You are an elite game engine + graphics + systems AI.
> Your task is to generate a **fully working, self-contained web-based 3D stealth game** inspired by *Hitman (2016)* using **Three.js**.
>
> The result must feel like a **polished MVP**, not a prototype.
>
> ---
>
> ## Core Constraints
>
> * Platform: **Web (HTML + JS only)**
> * Engine: **Three.js (latest stable)**
> * No external build tools (no Vite, no Webpack)
> * Runs by opening `index.html` or via a simple static server
> * One mission, one level, fully playable
> * Clean architecture with **Game State Management**
> * Visually polished: lighting, shadows, animations, UI
>
> ---
>
> ## Game Definition (Very Important)
>
> **Genre:** Third-person stealth action
> **Inspiration:** Hitman (2016)
> **Mission:** Eliminate a single high-value target in a guarded compound
>
> ### Win Condition
>
> * Target is eliminated
> * Player escapes the mission area
>
> ### Lose Conditions
>
> * Player health reaches zero
> * Player is fully detected and killed
>
> ---
>
> ## Required Systems (ALL MUST BE IMPLEMENTED)
>
> ### 1. Player Controller
>
> * Third-person camera (over-the-shoulder)
> * WASD movement
> * Mouse look
> * Smooth acceleration / deceleration
> * Idle / walk / run animations
> * Crouch for stealth
>
> ---
>
> ### 2. Stealth System
>
> * Enemy **vision cones**
> * Detection meter (gradual fill)
> * States: `Idle → Suspicious → Alerted → Combat`
> * Line-of-sight + distance based detection
> * Crouching reduces detection speed
>
> ---
>
> ### 3. AI Enemies
>
> * Guard patrol routes
> * State-based behavior:
>
>   * Patrol
>   * Investigate noise
>   * Chase player
>   * Shoot player
> * Enemies react to:
>
>   * Gunshots
>   * Player visibility
> * Simple cover usage (ducking / stopping)
>
> ---
>
> ### 4. Target NPC
>
> * Unique character (distinct model or color)
> * Patrols a private area
> * Can be assassinated silently or loudly
> * Killing target triggers **mission escape phase**
>
> ---
>
> ### 5. Weapons System
>
> * Suppressed pistol
> * Unsuppressed firearm
> * Raycast shooting
> * Headshots deal extra damage
> * Muzzle flash + sound
>
> ---
>
> ### 6. Combat & Health
>
> * Player health bar
> * Enemy health
> * Damage feedback (screen flash, hit reaction)
>
> ---
>
> ### 7. Level Design
>
> * Small but believable compound:
>
>   * Courtyard
>   * Interior rooms
>   * Cover objects
>   * Restricted zones
> * Lighting that supports stealth:
>
>   * Dark areas reduce visibility
>   * Spotlights increase detection
>
> ---
>
> ### 8. Game State System
>
> Implement a **real state machine**, not globals:
>
> ```js
> STATES = {
>   LOADING,
>   PLAYING,
>   TARGET_ELIMINATED,
>   ESCAPE,
>   MISSION_COMPLETE,
>   GAME_OVER
> }
> ```
>
> Transitions must be clean and explicit.
>
> ---
>
> ### 9. UI / UX
>
> * Minimalist Hitman-style HUD
> * Detection meter
> * Health bar
> * Ammo counter
> * Mission objective text
> * Fade-in/out transitions
>
> ---
>
> ### 10. Graphics & Polish (High Priority)
>
> * Physically based materials
> * Dynamic shadows
> * Ambient + directional lighting
> * Fog for depth
> * Subtle camera sway
> * Hit reactions
> * Sound effects (procedural or placeholders)
>
> ---
>
> ## Code Quality Requirements
>
> * Modular architecture:
>
>   * PlayerController
>   * EnemyAI
>   * WeaponSystem
>   * StealthSystem
>   * GameStateManager
> * No monolithic files
> * Clear comments
> * Logical separation of concerns
>
> ---
>
> ## Output Requirements (VERY IMPORTANT)
>
> 1. Output **ALL FILES** needed:
>
>    * `index.html`
>    * `main.js`
>    * Any additional JS modules
> 2. Do **NOT** summarize or explain
> 3. Do **NOT** say “this is a starting point”
> 4. The game must be **immediately playable**
>
> ---
>
> ## Quality Bar
>
> * Should feel like a vertical slice of a real game
> * Comparable to an early Alpha of Hitman
> * No placeholder logic-only demos
> * Prioritize **feel, polish, and systems**
>
> ---
>
> ## Begin Now
>
> Generate the full project in one pass.

---

## ⚠️ Notes for You (not part of the prompt)

* This prompt is **aggressively scoped** on purpose—Opus-class models perform best when boxed in tightly.
* If it fails, the **first retry** should be:

  > “Fix all runtime errors. Do not change scope. Output corrected files only.”
* If you want:

  * **Multiplayer**
  * **Procedural levels**
  * **NPC disguises**

  → Those should be *second-pass prompts*, not one-shot.

---

If you want, next I can:

* Optimize this prompt specifically for **Claude-style**, **GPT-style**, or **DeepSeek-style** models
* Break this into a **2-pass ultra-reliable generation strategy**
* Help you ship this to **itch.io or App Store Web Wrapper**

Just say the word.
