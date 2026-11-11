// Start of the game, controls, workbench menu and drawing of the screen.
// The game name is written only here in the code. The intro and the title picture read it from here.
// The project name in pxt.json is also the settings area where the saves are kept.
const GAME_TITLE = "HOMEMADE HILLS"
// The save is kept in settings under this key.
const SAVE_KEY = "homemade-hills-v1"
// After a screen change, a button press only counts after this many milliseconds. So quickly repeated presses do
// not skip screens.
const SCREEN_QUIET_MS = 500
// Picture on the wall of the workbench: the top left corner of the picture (a frame of 1 pixel is drawn around it).
const WALL_X = 129
const WALL_Y = 11
let titleOpen = true
let titleSinceMs = 0
let menuQuietUntilMs = 0
let volumeUnsaved = false
let menuOpen = false
let menuRow = 0
const MENU_COUNT = 12
let newWorldConfirm = false
let bHandled = false
let inputLocked = true
let introReplay = false
let mineMs = 0
let mineX = -1
let mineY = -1
let mineZ = -1
let lastTickMs = 0
let lastSaveMs = -11000
let lastAutoSaveMs = 0
let message = ""
let messageUntilMs = 0
let hadSave = false
let lastSwingMs = -1000
let lastWalkMs = -1000
let walkPhase = 0
let debrisStartMs = -1000
let debrisColor = 14
let iconTop = [9, 7, 4, 13, 4, 7, 13, 1, 11]
let iconFront = [9, 6, 14, 11, 14, 6, 4, 9, 12]
let iconSide = [9, 14, 12, 12, 12, 6, 14, 8, 15]
let sceneRevision = 0
let renderedRevision = -1
let cachedX = -1
let cachedY = -1
let cachedZ = -1
let cachedYaw = -1
let cachedPitch = -2
let cachedRayWidth = 0
let worldFrame = image.create(160, 120)
let titleLogo: Image = null

function invalidateScene() {
    sceneRevision++
}
function notifyPlayer(text: string) {
    message = text
    messageUntilMs = game.runtime() + 2500
}
function saveGame(): boolean {
    // The training place must never replace the real save, so nothing is saved during the training.
    if (trainingActive) return false
    if (game.runtime() - lastSaveMs < 11000) {
        notifyPlayer("Save: please wait")
        return false
    }
    settings.writeBuffer(SAVE_KEY, encodeSave())
    lastSaveMs = game.runtime()
    unsavedChanges = false
    notifyPlayer("Game saved")
    return true
}
function startGame() {
    titleOpen = false
    menuOpen = false
    inputLocked = true
    bHandled = true
    mineMs = 0
    updateTarget()
    invalidateScene()
    notifyPlayer(hasPickaxe ? "Pickaxe ready. Let's go!" : "MENU: craft your pick")
}
function afterCinematic() {
    music.stopAllSounds()
    if (introReplay) {
        introReplay = false
        startGame()
    } else if (!trainingDone) startTraining()
    else {
        titleOpen = true
        titleSinceMs = game.runtime()
        inputLocked = true
        invalidateScene()
    }
}
function titleReady(): boolean {
    return game.runtime() - titleSinceMs >= SCREEN_QUIET_MS
}
function changeSelection(delta: number) {
    selected = (selected + delta + materials.length) % materials.length
    unsavedChanges = true
    notifyPlayer(blockNames[materials[selected]])
    trainingAction(2)
}
function toggleMenu() {
    menuOpen = !menuOpen
    menuRow = 0
    newWorldConfirm = false
    bHandled = true
    inputLocked = true
    mineMs = 0
}
function menuAction() {
    if (trainingActive) {
        if (trainingStep == 7 && craftPickaxe()) {
            trainingAction(3)
        }
        return
    }
    if (menuRow == 0) changeSelection(1)
    else if (menuRow == 1) {
        let made = craftPickaxe()
        notifyPlayer(made ? "Pickaxe crafted!"
            : hasPickaxe ? "Already have a pickaxe"
            : "Need 2 wood + 3 stone")
        if (made) feedback(2)
    } else if (menuRow == 2) {
        let made = craftPlanks()
        notifyPlayer(made ? "4 planks crafted" : "Need 1 wood / full")
        if (made) feedback(2)
    } else if (menuRow == 3) saveGame()
    else if (menuRow == 4) {
        rayWidth = onDevice ? (rayWidth == 8 ? 4 : 8) : (rayWidth == 4 ? 8 : rayWidth == 8 ? 2 : 4)
        unsavedChanges = true
        notifyPlayer(rayWidth == 8 ? "Graphics: Fast"
            : rayWidth == 2 ? "Fine: higher CPU usage"
            : "Graphics: Normal")
        invalidateScene()
    } else if (menuRow == 5) {
        pitch = -0.16
        updateTarget()
        unsavedChanges = true
        notifyPlayer("Look straight ahead")
    } else if (menuRow == 6) {
        returnToStart()
        startGame()
        notifyPlayer("Back at spawn")
    } else if (menuRow == 7) startTraining()
    else if (menuRow == 8) {
        menuOpen = false
        titleOpen = true
        introReplay = true
        inputLocked = true
        lastCinematicCue = -1
        music.stopAllSounds()
        initCinematic()
    } else if (menuRow == 9) {
        soundEnabled = !soundEnabled
        if (!soundEnabled) music.stopAllSounds()
    } else if (menuRow == 11) {
        // The volume is written to settings only after the menu closes (tickGame checks volumeUnsaved), not
        // at every press.
        music.setVolume(music.volume() >= 255 ? 0 : Math.min(255, music.volume() + 64))
        volumeUnsaved = true
    } else if (!newWorldConfirm) {
        newWorldConfirm = true
        notifyPlayer("New world? B confirms")
    } else {
        generateWorld()
        let saved = saveGame()
        startGame()
        notifyPlayer(saved ? "New world saved" : "New world: save needed")
    }
}
controller.menu.onEvent(ControllerButtonEvent.Pressed, function () {
    // MENU skips the intro, the title screen and the training and goes straight into the game. In the workbench step of
    // the training, MENU opens the workbench instead. A second quick press must not open the workbench right away.
    let now = game.runtime()
    if (now < menuQuietUntilMs) return
    if (!cinematicDone) {
        skipCinematic()
        music.stopAllSounds()
        introReplay = false
        startGame()
        menuQuietUntilMs = now + SCREEN_QUIET_MS
    } else if (trainingActive) {
        if (trainingStep == 7 && !menuOpen) {
            menuOpen = true
            menuRow = 1
            inputLocked = true
            bHandled = true
        } else {
            finishTraining(false)
            menuQuietUntilMs = now + SCREEN_QUIET_MS
        }
    } else if (titleOpen) {
        if (titleReady()) {
            startGame()
            menuQuietUntilMs = now + SCREEN_QUIET_MS
        }
    } else toggleMenu()
})
controller.A.onEvent(ControllerButtonEvent.Pressed, function () {
    if (!cinematicDone) {
        // Each press jumps one station ahead: flight, card, title, then the training or the title screen. After "Watch
        // intro" in the workbench the game starts right after the title.
        if (advanceCinematic()) {
            music.stopAllSounds()
            if (cinematicDone) afterCinematic()
        }
    } else if (trainingActive && trainingReady) finishTraining(true)
    else if (titleOpen) {
        if (titleReady()) startGame()
    } else if (menuOpen) {
        menuOpen = false
        newWorldConfirm = false
        inputLocked = true
    }
})
controller.B.onEvent(ControllerButtonEvent.Pressed, function () {
    bHandled = !cinematicDone || titleOpen || menuOpen || inputLocked
    if (!cinematicDone) return
    if (titleOpen) {
        if (titleReady()) startTraining()
    }
    else if (menuOpen) menuAction()
})
controller.B.onEvent(ControllerButtonEvent.Released, function () {
    if (cinematicDone && !titleOpen && !menuOpen && !bHandled && !inputLocked &&
        (!trainingActive || trainingStep == 5)) {
        updateTarget()
        if (!targetValid) notifyPlayer("Target out of reach")
        else if (placeBlock(placeX, placeY, placeZ)) {
            feedback(1)
            lastSwingMs = game.runtime()
            invalidateScene()
            trainingAction(1)
        } else notifyPlayer("No space / material")
        updateTarget()
    }
})
controller.up.onEvent(ControllerButtonEvent.Pressed, function () {
    if (menuOpen && !trainingActive) {
        menuRow = (menuRow + MENU_COUNT - 1) % MENU_COUNT
        newWorldConfirm = false
    }
})
controller.down.onEvent(ControllerButtonEvent.Pressed, function () {
    if (menuOpen && !trainingActive) {
        menuRow = (menuRow + 1) % MENU_COUNT
        newWorldConfirm = false
    }
})
controller.left.onEvent(ControllerButtonEvent.Pressed, function () {
    if (cinematicDone && !titleOpen && !menuOpen && !inputLocked && controller.B.isPressed() &&
        (!trainingActive || trainingStep == 6)) {
        bHandled = true
        changeSelection(-1)
    } else if (menuOpen && menuRow == 0 && !trainingActive) changeSelection(-1)
})
controller.right.onEvent(ControllerButtonEvent.Pressed, function () {
    if (cinematicDone && !titleOpen && !menuOpen && !inputLocked && controller.B.isPressed() &&
        (!trainingActive || trainingStep == 6)) {
        bHandled = true
        changeSelection(1)
    } else if (menuOpen && menuRow == 0 && !trainingActive) changeSelection(1)
})
function tickGame() {
    let now = game.runtime()
    let elapsedMs = Math.max(1, now - lastTickMs)
    let dt = Math.min(80, elapsedMs)
    lastTickMs = now
    if (!controller.A.isPressed() && !controller.B.isPressed()) inputLocked = false
    if (volumeUnsaved && !menuOpen) {
        settings.writeNumber("#volume", music.volume())
        volumeUnsaved = false
    }
    if (!cinematicDone) {
        updateCinematic(Math.min(250, elapsedMs))
        cinematicAudio(cinematicCue)
        if (cinematicDone) afterCinematic()
        return
    }
    if (titleOpen || menuOpen) return
    if (trainingActive && (trainingStep == 0 || trainingStep == 8)) {
        tickTraining(dt, 0, 0)
        return
    }
    let forward = (controller.up.isPressed() ? 1 : 0) - (controller.down.isPressed() ? 1 : 0)
    let turn = (controller.right.isPressed() ? 1 : 0) - (controller.left.isPressed() ? 1 : 0)
    let looking = 0
    if (trainingActive && trainingStep != 1 && trainingStep != 3) forward = 0
    if (trainingActive && trainingStep != 2 && trainingStep != 6) turn = 0
    if (controller.B.isPressed()) {
        if (controller.up.isPressed() || controller.down.isPressed() || controller.left.isPressed() ||
            controller.right.isPressed() || controller.A.isPressed()) bHandled = true
        if (forward != 0 && (!trainingActive || trainingStep == 3)) {
            looking = forward
            pitch = Math.max(-1.2, Math.min(1.2, pitch + forward * dt * 0.0017))
            unsavedChanges = true
        }
        forward = 0
        turn = 0
    } else {
        if (trainingActive && trainingStep == 3) forward = 0
        yaw = (yaw + turn * dt * 0.0019 + 2 * Math.PI) % (2 * Math.PI)
    }
    let beforeX = posX
    let beforeY = posY
    let beforeZ = posZ
    movePlayer(forward, dt)
    if (posX != beforeX || posZ != beforeZ) {
        lastWalkMs = now
        walkPhase += dt * 0.014
    }
    if (posX != beforeX || posY != beforeY || posZ != beforeZ || turn != 0) unsavedChanges = true
    updateTarget()
    if (!inputLocked && controller.A.isPressed() && !controller.B.isPressed() && targetValid &&
        (!trainingActive || trainingStep == 4)) {
        if (mineX != targetX || mineY != targetY || mineZ != targetZ) mineMs = 0
        mineX = targetX
        mineY = targetY
        mineZ = targetZ
        mineMs += dt
        let miningDurationMs = targetBlock == Block.Stone || targetBlock == Block.Crystal
            ? (hasPickaxe ? 220 : 600) : 300
        if (mineMs >= miningDurationMs) {
            let minedBlock = targetBlock
            if (mineBlock(targetX, targetY, targetZ)) {
                lastSwingMs = now
                debrisStartMs = now
                debrisColor = iconFront[minedBlock]
                invalidateScene()
                feedback(minedBlock == Block.Crystal ? 3 : 0)
                if (crystalsFound == 5 && minedBlock == Block.Crystal) notifyPlayer("5 crystals! You did it!")
                trainingAction(0)
            } else notifyPlayer(minedBlock == Block.BaseRock ? "Base rock stays put"
                : "Inventory full")
            mineMs = 0
            updateTarget()
        }
    } else mineMs = 0
    tickTraining(dt, turn, looking)
    if (!trainingActive && now - lastAutoSaveMs >= 60000) {
        lastAutoSaveMs = now
        if (unsavedChanges) saveGame()
    }
}
function drawCachedWorld(canvas: Image) {
    if (renderedRevision != sceneRevision ||
        cachedX != posX || cachedY != posY || cachedZ != posZ ||
        cachedYaw != yaw || cachedPitch != pitch || cachedRayWidth != rayWidth) {
        renderWorld(worldFrame)
        renderedRevision = sceneRevision
        cachedX = posX
        cachedY = posY
        cachedZ = posZ
        cachedYaw = yaw
        cachedPitch = pitch
        cachedRayWidth = rayWidth
    }
    canvas.drawImage(worldFrame, 0, 0)
}
function drawTool(canvas: Image) {
    let ageMs = game.runtime() - lastSwingMs
    let swing = ageMs < 220 ? Math.sin(ageMs * Math.PI / 220) : 0
    if (mineMs > 0) swing = (1 + Math.sin(mineMs * 0.027)) / 2
    let walking = game.runtime() - lastWalkMs < 120
    let x = Math.round(141 - swing * 13 + (walking ? Math.sin(walkPhase) * 2 : 0))
    let y = Math.round(97 - swing * 9 + (walking ? Math.abs(Math.cos(walkPhase)) * 2 : 0))
    // Broad stripes of color make the forearm and the tool look solid on a screen of only 160 x 120 pixels.
    for (let row = 0; row < 21; row++) {
        let left = x - 2 + Math.idiv(row, 3)
        canvas.fillRect(left, y + row - 5, 15, 1, row < 11 ? 14 : 15)
        canvas.fillRect(left + 1, y + row - 5, 10, 1, row < 10 ? 3 : 8)
        if (row < 9) canvas.fillRect(left + 1, y + row - 5, 3, 1, 13)
        else if (row > 11) canvas.fillRect(left + 2, y + row - 5, 3, 1, 12)
    }
    canvas.drawLine(x, y - 5, x + 8, y - 5, 1)
    canvas.drawLine(x + 8, y - 2, x + 8, y + 3, 14)
    if (hasPickaxe) {
        for (let i = 0; i < 5; i++) {
            canvas.drawLine(x - 5 + i, y + 5, x + 5 + i, y - 22,
                i == 0 || i == 4 ? 15 : i == 1 ? 4 : 14)
        }
        for (let row = 0; row < 5; row++) {
            canvas.drawLine(x - 7, y - 24 + row, x + 11, y - 20 + row,
                row == 0 ? 1 : row < 3 ? 13 : 11)
        }
        canvas.drawLine(x - 7, y - 24, x - 12, y - 17, 11)
        canvas.drawLine(x - 6, y - 23, x - 11, y - 17, 13)
        canvas.drawLine(x + 11, y - 20, x + 15, y - 12, 11)
        canvas.drawLine(x + 12, y - 20, x + 16, y - 11, 12)
    }
}
function drawDebris(canvas: Image) {
    let ageMs = game.runtime() - debrisStartMs
    if (ageMs < 0 || ageMs > 480) return
    // Ten splinters on paths that come from a formula, so no particle objects are kept in memory (the heap).
    for (let i = 0; i < 10; i++) {
        let flightTime = Math.max(0, ageMs - i * 7) / 65
        let x = Math.round(80 + ((i * 7 % 11) - 5) * flightTime)
        let y = Math.round(60 - (3 + i % 4) * flightTime + flightTime * flightTime * 0.65)
        let size = ageMs < 180 ? 3 : 2
        canvas.fillRect(x, y, size, size, i % 3 == 0 ? 13 : debrisColor)
        if (size == 3) canvas.setPixel(x, y, 1)
    }
}
function drawBlockIcon(canvas: Image, x: number, y: number, blockType: number) {
    canvas.drawLine(x + 4, y, x + 8, y + 2, iconTop[blockType])
    canvas.drawLine(x + 2, y + 1, x + 7, y + 3, iconTop[blockType])
    canvas.drawLine(x, y + 2, x + 4, y + 4, iconTop[blockType])
    for (let i = 0; i < 5; i++) {
        canvas.drawLine(x, y + 3 + i, x + 4, y + 5 + i, iconFront[blockType])
        canvas.drawLine(x + 5, y + 5 + i, x + 9, y + 3 + i, iconSide[blockType])
    }
    if (blockType == Block.Wood) canvas.drawLine(x + 2, y + 5, x + 2, y + 8, 12)
    if (blockType == Block.Planks) canvas.drawLine(x, y + 6, x + 4, y + 8, 14)
    if (blockType == Block.Crystal) canvas.setPixel(x + 2, y + 5, 1)
}
function drawHud(canvas: Image) {
    canvas.fillRect(0, 0, 160, 10, 15)
    canvas.print(hasPickaxe ? "PICK" : "HAND", 2, 1, hasPickaxe ? 5 : 1, image.font8)
    canvas.print("*" + crystalsFound + "/5", 58, 1, 9, image.font8)
    canvas.print("MENU", 134, 1, 1, image.font8)
    if (trainingActive || titleOpen) {
        canvas.fillRect(0, 112, 160, 10, 15)
        canvas.print(blockNames[materials[selected]] + " " + bag[materials[selected]],
            2, 111, 5, image.font8)
        if (targetValid) {
            canvas.print(blockNames[targetBlock],
                160 - blockNames[targetBlock].length * 6, 111, 1, image.font8)
        }
    } else {
        // The six materials are visible at a glance, each with its count.
        for (let i = 0; i < 6; i++) {
            let x = 20 + i * 20
            canvas.fillRect(x, 100, 20, 20, 15)
            canvas.drawRect(x, 100, 20, 20, i == selected ? 5 : 12)
            if (i == selected) canvas.drawLine(x + 2, 101, x + 17, 101, 13)
            drawBlockIcon(canvas, x + 5, 102, materials[i])
            let count = "" + bag[materials[i]]
            canvas.print(count, x + 19 - count.length * 6, 113, i == selected ? 5 : 13, image.font5)
        }
        let label = blockNames[materials[selected]]
        canvas.fillRect(78 - label.length * 3, 91, label.length * 6 + 4, 8, 15)
        canvas.print(label, 80 - label.length * 3, 92, 1, image.font8)
    }
    canvas.drawLine(75, 60, 85, 60, 15)
    canvas.drawLine(80, 55, 80, 65, 15)
    let crosshairColor = targetValid ? 5 : 1
    canvas.drawLine(76, 60, 78, 60, crosshairColor)
    canvas.drawLine(82, 60, 84, 60, crosshairColor)
    canvas.drawLine(80, 56, 80, 58, crosshairColor)
    canvas.drawLine(80, 62, 80, 64, crosshairColor)
    if (mineMs > 0) {
        let miningDurationMs = targetBlock == Block.Stone || targetBlock == Block.Crystal
            ? (hasPickaxe ? 220 : 600) : 300
        canvas.fillRect(73, 68, Math.min(15, Math.idiv(mineMs * 15, miningDurationMs)), 2, 5)
    }
    if (messageUntilMs > game.runtime() && !menuOpen && !trainingActive) {
        canvas.fillRect(0, 82, 160, 10, 15)
        canvas.print(message, 2, 83, 5, image.font8)
    }
}
function drawMenu(canvas: Image) {
    canvas.fillRect(5, 9, 150, 101, 15)
    canvas.drawRect(5, 9, 150, 101, 6)
    // Picture on the wall: the Calliope Hacker at the desk, in a wooden frame.
    canvas.drawRect(WALL_X - 1, WALL_Y - 1, hacker.WALL.width + 2, hacker.WALL.height + 2, 14)
    canvas.drawImage(hacker.WALL, WALL_X, WALL_Y)
    if (trainingActive) {
        canvas.print("YOUR FIRST PICKAXE", 15, 17, 7)
        canvas.print("2 wood + 3 stone", 20, 38, 1, image.font8)
        canvas.print("Wood: " + bag[Block.Wood], 20, 51, 13, image.font8)
        canvas.print("Stone: " + bag[Block.Stone], 20, 61, 13, image.font8)
        canvas.fillRect(14, 77, 131, 13, 8)
        canvas.print("B: CRAFT PICKAXE", 23, 81, 5, image.font8)
        canvas.print("A: Back", 50, 98, 1, image.font8)
        return
    }
    canvas.print("WORKBENCH & PAUSE", 11, 14, 7)
    canvas.print("Wood " + bag[Block.Wood] +
        "  Stone " + bag[Block.Stone], 11, 26, 13, image.font8)
    let rows = [
        "Block: " + blockNames[materials[selected]],
        hasPickaxe ? "Pickaxe: ready" : "Pick: 2 wood+3 stone",
        "4 planks: 1 wood",
        "Save game",
        rayWidth == 4 ? "Graphics: Normal"
            : rayWidth == 8 ? "Graphics: Fast"
            : "Graphics: Fine (PC)",
        "Look straight ahead",
        "Return to spawn",
        "Replay training",
        "Watch intro",
        soundEnabled ? "Sound: on" : "Sound: off",
        newWorldConfirm ? "New world? B = Yes" : "New world",
        "Volume " + music.volume()
    ]
    let first = Math.max(0, Math.min(MENU_COUNT - 6, menuRow - 2))
    for (let i = 0; i < 6; i++) {
        let index = first + i
        // The bar shows the selected row, so the rows need no "> " in front. That way every row fits before
        // the scroll bar.
        if (index == menuRow) canvas.fillRect(9, 36 + i * 9, 142, 9, 8)
        canvas.print(rows[index], 11, 38 + i * 9, 1, image.font8)
    }
    canvas.print(messageUntilMs > game.runtime() ? message : "B: OK A/MENU: Back",
        10, 98, 5, image.font8)
    canvas.fillRect(152, 36, 2, 54, 12)
    canvas.fillRect(152, 36 + Math.idiv(menuRow * 46, MENU_COUNT - 1), 2, 8, 9)
}
function titleLine(canvas: Image, text: string, y: number, ink: number) {
    canvas.print(text, 80 - text.length * 3, y, ink, image.font8)
}
function drawTitle(canvas: Image) {
    canvas.fillRect(7, 12, 146, 98, 15)
    canvas.drawRect(7, 12, 146, 98, 6)
    // The game title as in the intro, drawn once into one image. Its size depends on how long the name is.
    if (!titleLogo) {
        titleLogo = image.create(160, 30)
        cinematicLetters(titleLogo, cinematicTitle, 2, cinematicTitleScale(136), 100000, -10, true, -1)
    }
    canvas.drawTransparentImage(titleLogo, 0, 13)
    // The Calliope Hacker at the desk, in front of a wall of the color hacker.WALL_COLOR.
    canvas.fillRect(48, 39, hacker.TITLE.width, hacker.TITLE.height, hacker.WALL_COLOR)
    canvas.drawTransparentImage(hacker.TITLE, 48, 39)
    titleLine(canvas,
        hadSave ? "A: continue adventure" : "A: your adventure", 84, 5)
    titleLine(canvas, "B: play training", 96, 1)
}

hadSave = decodeSave(settings.readBuffer(SAVE_KEY))
if (!hadSave) {
    rayWidth = onDevice ? 8 : 2
    generateWorld()
}
// Every start on the device uses the fast setting (rayWidth 8) to save time, even when an older or imported save says
// something else. The player can still switch to Normal in the menu for the current session.
if (onDevice) rayWidth = 8
updateTarget()
initCinematic()
music.setVolume(settings.exists("#volume") ? settings.readNumber("#volume") : 90)
lastTickMs = game.runtime()
lastAutoSaveMs = lastTickMs
game.onUpdate(tickGame)
scene.createRenderable(0, function (canvas: Image) {
    if (!cinematicDone) {
        drawCinematic(canvas)
        return
    }
    drawCachedWorld(canvas)
    if (!titleOpen && !menuOpen) drawDebris(canvas)
    if (!titleOpen) drawTool(canvas)
    drawHud(canvas)
    if (titleOpen) drawTitle(canvas)
    if (menuOpen) drawMenu(canvas)
    if (trainingActive) drawTraining(canvas)
})
