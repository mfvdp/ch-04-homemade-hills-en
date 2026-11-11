# Technical notes: Homemade Hills

This file briefly explains how the source code is organized and how to build it. The welcome and the first ideas for
changing the game are in `README.md`.

## How the project is organized

This is a project for MakeCode Arcade, written in TypeScript. `pxt.json` gives the project name `homemade-hills` and
lists all files in the order in which MakeCode reads them. `mkc.json` says which device to build for: the Calliope
mini 3 with GameKit (variant "n3").

The files of the game:

- `config.ts`: The flash memory that holds the saved game.
- `world.ts`: The world and the player: blocks, walking, mining, placing, crafting and saving.
- `renderer.ts`: Drawing the world in 3D.
- `cinematic.ts`: The intro: a journey of 22 seconds through a small 3D scene.
- `audio.ts`: The sounds of the game.
- `training.ts`: The training: seven short tasks on a separate place to practice.
- `hacker.ts`: The pictures of the Calliope Hacker, painted in the colors of this game's palette.
- `main.ts`: Start of the game, controls, workbench menu and drawing of the screen.

## How the game runs

1. `decodeSave` loads the saved game from `settings`. If there is none, or it is damaged, `generateWorld` builds a new
   world.
2. `initCinematic` builds the scenery of the intro. The intro flies through floating islands and a portal, then shows
   the studio card and the title. A jumps to the next station, MENU skips all of it.
3. After the intro, the first game starts with the training (`startTraining`). Later starts show the title screen.
4. `tickGame` runs on every update: turn and walk (`movePlayer`), find the block in the crosshair (`updateTarget`),
   mine, place, training.
5. The function in `scene.createRenderable` draws every frame: the intro, or the world (`drawCachedWorld`), the tool,
   the bar (`drawHud`), the title screen, the workbench menu and the training texts.

The world has 24 × 24 blocks on the ground and is 12 blocks high. Every block is one number in `blocks`; which number is
which block is listed in the enumeration `Block`. To draw the world, `renderWorld` sends one ray from the eye through
every small square of the screen (`traceRay`) and colors the square like the block it hits (`shade`).

## Building

- **In the browser:** Open arcade.makecode.com, choose "Import" and open the game file `homemade-hills.hex`. The whole
  source code is inside the game file. The simulator shows the game right away.
- **On your computer:** With the MakeCode command-line tool (npm package `makecode`), run `makecode build` in this
  folder. The game file for the device is then in `built/n3/binary.hex`.

## Putting it on the device

Plug the Calliope mini 3 into your computer with the USB cable. It shows up as a drive. Drag the game file (`.hex`) onto
that drive; the game then starts by itself. The GameKit screen has 160 × 120 pixels and 16 colors. The game saves
through the workbench menu ("Save game") and by itself about once a minute if something has changed. If you load a
different program, MakeCode may delete the saved game.

This game also exists in German, French and Spanish. All four versions are built from the same source project.
