# Homemade Hills

Hi! This is **Homemade Hills**, a game by **Calliope Hacker** for the **Calliope mini 3 with GameKit**.

You look out over a little world made of blocks: grass, dirt, stone, trees and, deep down, a cave with crystals. Walk
around, mine blocks, put them down somewhere else, and use the workbench to craft planks and a pickaxe. Your goal: find
5 crystals. At the start, a short training shows you everything step by step. The Calliope Hacker sits at the desk in
the picture on the workbench wall.

## How to play

- **D-pad up and down:** walk forward and back
- **D-pad left and right:** turn
- **Hold B and press up or down:** look up or down
- **Hold A:** mine the block in the crosshair
- **Tap B:** put down a block from your bag
- **Hold B and press left or right:** choose another material
- **MENU:** workbench with crafting, save game, return to spawn and more (B picks a row, A closes it)

## Change the game yourself

The whole source code is inside this game file. Open it in MakeCode Arcade (arcade.makecode.com, "Import").
Change a number, start the simulator and see what happens:

- **Faster walking:** In `world.ts`, function `movePlayer`, you will find `Math.idiv(forward * dt * 7, 10)`. Use `14`
  instead of `7` and the player runs twice as fast.
- **More dirt at the start:** In `world.ts`, function `generateWorld`, you will find `bag = [0, 0, 24, 16, 8, 0, 12, 0,
  0]`. The 24 is the dirt you start with; try 99. It applies to every new world (workbench, "New world").
- **Mine faster:** In `main.ts`, function `tickGame`, you will find `? (hasPickaxe ? 220 : 600) : 300`. The 300 is how
  many milliseconds mining a block of dirt takes. Try 100.

An explanation of the source code for kids, parents and teachers is on calliope-hacker.de.
