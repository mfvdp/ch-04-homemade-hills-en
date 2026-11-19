// The training: eight short tasks on a separate place to practice.
// startTraining keeps a copy of the real game (trainingSnapshot) and finishTraining puts it back at the end.
let trainingActive = false
let trainingStep = 0
let trainingMs = 0
let trainingProgress = 0
let trainingSnapshot: Buffer = null
let trainingStartZ = 0
let trainingReady = false
let unsavedBeforeTraining = false
// Step 8 practises jumping and building up in a hole; step 9 is the final card.
const TUTORIAL_JUMP = 8
const TUTORIAL_END = 9
let trainingHeadings = [
    "YOUR ADVENTURE BEGINS",
    "01  MOVE",
    "02  LOOK AROUND",
    "03  UP & DOWN",
    "04  COLLECT WOOD",
    "05  YOUR FIRST BLOCK",
    "06  CHANGE MATERIAL",
    "07  THE WORKBENCH",
    "08  OUT OF THE HOLE",
    "READY FOR YOUR WORLD"
]
let trainingLine1 = [
    "Get to know the world.",
    "Hold UP to walk.",
    "Hold LEFT or RIGHT.",
    "Hold B and UP/DOWN.",
    "Aim at the wood.",
    "Tap B briefly.",
    "Hold B + RIGHT.",
    "Open MENU.",
    "Tap A: you jump.",
    "Explore. Gather. Build."
]
let trainingLine2 = [
    "Eight little tasks.",
    "Walk to the test block.",
    "This turns your view.",
    "Move your view.",
    "Hold A to mine.",
    "Build before the stone.",
    "Choose a material.",
    "Craft a pickaxe.",
    "Then B: block under you.",
    "A: start the adventure!"
]

function startTraining() {
    // The real world, the bag and the position come back after the training, even when the training is played again.
    unsavedBeforeTraining = unsavedChanges
    trainingSnapshot = encodeSave()
    generateWorld()
    for (let x = 9; x <= 15; x++) {
        for (let z = 3; z <= 10; z++) {
            writeBlock(x, 3, z, Block.Grass)
            for (let y = 4; y < HEIGHT; y++) writeBlock(x, y, z, Block.Air)
        }
    }
    writeBlock(12, 4, 7, Block.Wood)
    writeBlock(12, 5, 7, Block.Wood)
    writeBlock(12, 4, 8, Block.Stone)
    writeBlock(12, 5, 8, Block.Stone)
    trainingActive = true
    trainingStep = 0
    trainingMs = 0
    trainingProgress = 0
    trainingStartZ = posZ
    trainingReady = false
    titleOpen = false
    menuOpen = false
    inputLocked = true
    bHandled = true
    mineMs = 0
    messageUntilMs = 0
    updateTarget()
    invalidateScene()
}
function finishTraining(completed: boolean) {
    if (!trainingActive) return
    if (trainingSnapshot) decodeSave(trainingSnapshot)
    unsavedChanges = unsavedBeforeTraining
    trainingSnapshot = null
    trainingActive = false
    trainingReady = false
    menuOpen = false
    titleOpen = false
    inputLocked = true
    bHandled = true
    mineMs = 0
    if (completed) {
        trainingDone = true
        unsavedChanges = true
        saveGame()
        notifyPlayer("Your adventure begins!")
    } else notifyPlayer("Training ended")
    updateTarget()
    invalidateScene()
}
function nextTrainingStep() {
    trainingStep++
    trainingMs = 0
    trainingProgress = 0
    mineMs = 0
    inputLocked = true
    bHandled = true
    feedback(2)
    if (trainingStep == 3 || trainingStep == 4 || trainingStep == 5) {
        yaw = 0
        pitch = -0.16
    }
    if (trainingStep == 4) {
        posX = 12 * UNIT + 128
        posZ = 5 * UNIT + 128
        posY = 4 * UNIT
        fallSpeed = 0
    }
    if (trainingStep == TUTORIAL_JUMP) {
        // A hole two blocks deep: walking out does not work, building up does.
        menuOpen = false
        writeBlock(10, 1, 5, Block.Stone)
        writeBlock(10, 2, 5, Block.Air)
        writeBlock(10, 3, 5, Block.Air)
        posX = 10 * UNIT + 128
        posZ = 5 * UNIT + 128
        posY = 2 * UNIT
        fallSpeed = 0
        jumping = false
        yaw = 0
        pitch = -0.16
    }
    if (trainingStep == TUTORIAL_END) {
        trainingReady = true
        menuOpen = false
    }
    updateTarget()
    invalidateScene()
}
function trainingAction(action: number) {
    if (!trainingActive) return
    if ((trainingStep == 4 && action == 0) || (trainingStep == 5 && action == 1) ||
        (trainingStep == 6 && action == 2) || (trainingStep == 7 && action == 3)) nextTrainingStep()
}
function tickTraining(dt: number, turn: number, looking: number) {
    if (!trainingActive) return
    trainingMs += dt
    if (trainingStep == 0 && trainingMs >= 2600) nextTrainingStep()
    else if (trainingStep == 1) {
        trainingProgress = Math.min(1, Math.max(0, (posZ - trainingStartZ) / 160))
        if (trainingProgress >= 1) nextTrainingStep()
    } else if (trainingStep == 2) {
        trainingProgress += Math.abs(turn) * dt / 260
        if (trainingProgress >= 1) nextTrainingStep()
    } else if (trainingStep == 3) {
        trainingProgress += Math.abs(looking) * dt / 260
        if (trainingProgress >= 1) nextTrainingStep()
    } else if (trainingStep == TUTORIAL_JUMP && posY >= 4 * UNIT && bodyBlocked(posX, posY - 1, posZ)) {
        // Done as soon as the player stands on the meadow again.
        nextTrainingStep()
    }
}
function drawTraining(canvas: Image) {
    if (trainingStep == 0 || trainingStep == TUTORIAL_END) {
        canvas.fillRect(4, 30, 152, 61, 15)
        canvas.drawRect(4, 30, 152, 61, 6)
        let title = trainingHeadings[trainingStep]
        canvas.print(title.substr(0, Math.min(title.length, Math.idiv(trainingMs, 35))),
            9, 38, 7, image.font8)
        canvas.print(trainingLine1[trainingStep], 11, 53, 1, image.font8)
        canvas.print(trainingLine2[trainingStep], 11, 64, 13, image.font8)
        if (trainingStep == 0) {
            canvas.fillRect(11, 81, Math.min(138, Math.idiv(trainingMs * 138, 2600)), 2, 9)
        } else {
            let glow = Math.idiv(trainingMs, 250) % 2 == 0 ? 5 : 13
            let goText = "A: GO!"
            canvas.print(goText, 80 - goText.length * 3, 79, glow, image.font8)
        }
    } else if (!menuOpen) {
        canvas.fillRect(0, 80, 160, 32, 15)
        canvas.drawLine(0, 80, 159, 80, 6)
        canvas.print(trainingHeadings[trainingStep], 4, 84, 5, image.font8)
        canvas.print(trainingLine1[trainingStep], 4, 94, 1, image.font8)
        canvas.print(trainingLine2[trainingStep], 4, 103, 13, image.font8)
        for (let i = 0; i < 8; i++) {
            canvas.fillRect(114 + i * 6, 73, 4, 3,
                i < trainingStep - 1 ? 7 : i == trainingStep - 1 ? 5 : 12)
        }
    }
    canvas.fillRect(0, 0, 160, 8, 15)
    canvas.print("TRAINING " + Math.min(8, trainingStep) + "/8", 2, 1, 9, image.font8)
    canvas.print(trainingStep == 7 ? "MENU" : "MENU: EXIT",
        trainingStep == 7 ? 134 : 88, 1, 13, image.font8)
}
