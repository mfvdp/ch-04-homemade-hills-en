// The intro: a journey of 22 seconds through a small 3D scene. CINEMATIC_DURATION_MS holds this length (22000). It does
// not change the world, and it uses no video, no timers, no sprites and no new images for each frame. All the math uses
// whole numbers: places in the world and sine and cosine in 1024ths, points on the screen in 16ths of a pixel. The
// Calliope stores every decimal number as a small object in its memory. With thousands of them in every frame it had to
// tidy up all the time, and the intro stuttered. Order: flying between the islands, the portal charges up, flying
// through the portal (this first station is called the flight), then the card "Calliope Hacker presents" over the
// target island, then the game title.
let cinematicDone = false
let cinematicMs = 0
let cinematicCue = 0
const CINEMATIC_DURATION_MS = 22000
const CINEMATIC_CHARGE_START_MS = 4800
const CINEMATIC_PASSAGE_START_MS = 7200
const CINEMATIC_SUNSET_START_MS = 9700
const CINEMATIC_CARD_START_MS = 11200
const CINEMATIC_TITLE_START_MS = 15200
const CINEMATIC_CLOSE_START_MS = 20500
// A jumps to the next station (flight, card, title, end). It only works 500 ms after the intro started or after the
// last jump. So a player who hammers A cannot skip several stations at once, and holding A down counts as
// just one press.
const CINEMATIC_SKIP_MS = 500
let cinematicSkipFromMs = 0
let cinematicCalliope: Image = null
let cinematicHacker: Image = null
let cinematicPresents: Image = null
let cinematicTitle: Image = null
let cinematicRingX: number[] = []
let cinematicRingY: number[] = []
let cinematicBoxX: number[] = []
let cinematicBoxY: number[] = []
let cinematicBoxZ: number[] = []
let cinematicBoxWidth: number[] = []
let cinematicBoxHeight: number[] = []
let cinematicBoxDepth: number[] = []
let cinematicBoxType: number[] = []
let cinematicOrder: number[] = []
let cinematicDepths: number[] = []
let cinematicCornerX: number[] = []
let cinematicCornerY: number[] = []
let cinematicCornerDepth: number[] = []
let cinematicFaces = [0, 2, 3, 1, 4, 5, 7, 6, 0, 1, 5, 4, 2, 6, 7, 3, 0, 4, 6, 2, 1, 3, 7, 5]
let cinematicFaceOrder = [0, 0, 0]
let cinematicFaceDepth = [0, 0, 0]
let cinematicCameraX = 0
let cinematicCameraY = 3072
let cinematicCameraZ = 0
let cinematicYawSin = 0
let cinematicYawCos = 1024
let cinematicPitchSin = 0
let cinematicPitchCos = 1024
let cinematicBankSin = 0
let cinematicBankCos = 1024
let cinematicFocal = 1472
let cinematicScreenX = 0
let cinematicScreenY = 0
let cinematicScreenDepth = 0
let cinematicSunset = false

function cinematicAddBox(x: number, y: number, z: number,
    width: number, height: number, depth: number, type: number) {
    cinematicBoxX.push(Math.round(x * 1024))
    cinematicBoxY.push(Math.round(y * 1024))
    cinematicBoxZ.push(Math.round(z * 1024))
    cinematicBoxWidth.push(Math.round(width * 512))
    cinematicBoxHeight.push(Math.round(height * 512))
    cinematicBoxDepth.push(Math.round(depth * 512))
    cinematicBoxType.push(type)
    cinematicOrder.push(0)
    cinematicDepths.push(0)
}

function cinematicIsland(x: number, y: number, z: number, size: number, withTree: boolean) {
    let thickness = size > 10 ? 1.65 : 1
    cinematicAddBox(x, y - 0.65 * thickness, z, size, 1.3 * thickness, size * 0.85, 0)
    cinematicAddBox(x + 0.3, y - 2 * thickness, z, size * 0.8, 1.6 * thickness, size * 0.65, 1)
    cinematicAddBox(x - 0.2, y - 3.1 * thickness, z, size * 0.38, 0.9 * thickness, size * 0.35, 1)
    if (withTree) {
        cinematicAddBox(x - size * 0.14, y + 1, z + 0.2, 0.45, 2.2, 0.45, 2)
        cinematicAddBox(x - size * 0.14, y + 2.25, z + 0.2, 2.2, 1.35, 1.8, 3)
        cinematicAddBox(x - size * 0.14 + 0.3, y + 3.1, z + 0.2, 1.45, 0.65, 1.35, 3)
    } else cinematicAddBox(x + 0.2, y + 0.45, z, 0.65, 0.9, 0.65, 5)
}

function initCinematic() {
    cinematicDone = false
    cinematicMs = 0
    cinematicCue = 0
    cinematicSkipFromMs = 0
    if (cinematicCalliope) return
    cinematicCalliope = image.create(47, 8)
    cinematicCalliope.print("CALLIOPE", 0, 0, 1, image.font8)
    cinematicHacker = image.create(35, 8)
    cinematicHacker.print("HACKER", 0, 0, 1, image.font8)
    drawPresents()
    cinematicTitle = image.create(GAME_TITLE.length * 6, 8)
    cinematicTitle.print(GAME_TITLE, 0, 0, 1, image.font8)
    for (let i = 0; i <= 24; i++) {
        cinematicRingX.push(Math.round(Math.cos(i * Math.PI / 12) * 1024))
        cinematicRingY.push(Math.round(Math.sin(i * Math.PI / 12) * 1024))
    }
    for (let i = 0; i < 8; i++) {
        cinematicCornerX.push(0)
        cinematicCornerY.push(0)
        cinematicCornerDepth.push(0)
    }
    // The free corridor really leads through the scenery to the portal. The islands stand to the left and to the right
    // of the flight path, one after the other.
    for (let i = 0; i < 15; i++) {
        let side = i % 2 == 0 ? -1 : 1
        let x = side * (4.4 + (i * 7 % 4))
        let z = 10 + i * 8.5
        cinematicIsland(x, -0.4 + (i % 3) * 0.5, z, 3.2 + (i % 3) * 0.45, i % 3 != 1)
        if (i % 3 == 0) cinematicAddBox(-x * 1.8, 2.2, z + 3, 1.2, 1.2, 1.2, 5)
    }
    // A large portal in the same world as the islands: a base, two pillars, a beam on top and four small corner blocks.
    cinematicAddBox(0, -3, 53, 11, 1.1, 5, 1)
    cinematicAddBox(-4.1, 1.1, 53, 1.1, 8.2, 1.3, 4)
    cinematicAddBox(4.1, 1.1, 53, 1.1, 8.2, 1.3, 4)
    cinematicAddBox(0, 5.45, 53, 9.4, 0.9, 1.5, 4)
    cinematicAddBox(-4.1, -2.25, 53, 1.7, 1.1, 1.9, 6)
    cinematicAddBox(4.1, -2.25, 53, 1.7, 1.1, 1.9, 6)
    cinematicAddBox(-4.1, 5.4, 53, 1.6, 1.4, 1.8, 6)
    cinematicAddBox(4.1, 5.4, 53, 1.6, 1.4, 1.8, 6)
    // The goal of the journey: a big island with terraces, a tree and crystals.
    cinematicIsland(0, 0, 134, 15, false)
    cinematicAddBox(-2.2, 0.35, 134, 4.3, 0.7, 4, 0)
    cinematicAddBox(-2.4, 1.8, 134.5, 0.8, 2.9, 0.8, 2)
    cinematicAddBox(-2.7, 3.5, 134.5, 4.2, 1.9, 3.4, 3)
    cinematicAddBox(-2.2, 4.7, 134.4, 2.8, 0.9, 2.6, 3)
    cinematicAddBox(2.5, 0.7, 133.2, 1.2, 1.4, 1.2, 5)
    cinematicAddBox(3.9, 0.3, 134, 0.7, 0.6, 0.7, 5)
}

// Chapters for the sound, 0 to 5: island flight, portal charges, flight through the portal, card, title, fade out.
function cinematicCueAt(timeMs: number): number {
    return timeMs < CINEMATIC_CHARGE_START_MS ? 0
        : timeMs < CINEMATIC_PASSAGE_START_MS ? 1
        : timeMs < CINEMATIC_CARD_START_MS ? 2
        : timeMs < CINEMATIC_TITLE_START_MS ? 3
        : timeMs < CINEMATIC_CLOSE_START_MS ? 4
        : 5
}

function updateCinematic(dt: number) {
    if (cinematicDone) return
    cinematicMs = Math.min(CINEMATIC_DURATION_MS, cinematicMs + Math.max(0, dt))
    cinematicCue = cinematicCueAt(cinematicMs)
    cinematicDone = cinematicMs >= CINEMATIC_DURATION_MS
}

function skipCinematic() {
    cinematicMs = CINEMATIC_DURATION_MS
    cinematicCue = 5
    cinematicDone = true
}

// A new press of A: jump to the next station. Returns false if the press came too early or the intro is already over.
function advanceCinematic(): boolean {
    if (cinematicDone || cinematicMs - cinematicSkipFromMs < CINEMATIC_SKIP_MS) return false
    if (cinematicMs >= CINEMATIC_TITLE_START_MS) skipCinematic()
    else {
        cinematicMs = cinematicMs >= CINEMATIC_CARD_START_MS ? CINEMATIC_TITLE_START_MS : CINEMATIC_CARD_START_MS
        cinematicCue = cinematicCueAt(cinematicMs)
    }
    cinematicSkipFromMs = cinematicMs
    return true
}

function cinematicEase(value: number): number {
    value = Math.max(0, Math.min(1, value))
    return value * value * (3 - 2 * value)
}

function cinematicCamera(x: number, y: number, z: number, yaw: number, pitch: number, bank: number) {
    cinematicCameraX = Math.round(x * 1024)
    cinematicCameraY = Math.round(y * 1024)
    cinematicCameraZ = Math.round(z * 1024)
    cinematicYawSin = Math.round(Math.sin(yaw) * 1024)
    cinematicYawCos = Math.round(Math.cos(yaw) * 1024)
    cinematicPitchSin = Math.round(Math.sin(pitch) * 1024)
    cinematicPitchCos = Math.round(Math.cos(pitch) * 1024)
    cinematicBankSin = Math.round(Math.sin(bank) * 1024)
    cinematicBankCos = Math.round(Math.cos(bank) * 1024)
}

function cinematicProject(x: number, y: number, z: number) {
    let dx = x - cinematicCameraX
    let dy = y - cinematicCameraY
    let dz = z - cinematicCameraZ
    let turnedX = (dx * cinematicYawCos - dz * cinematicYawSin) >> 10
    let turnedZ = (dz * cinematicYawCos + dx * cinematicYawSin) >> 10
    let turnedY = (dy * cinematicPitchCos - turnedZ * cinematicPitchSin) >> 10
    cinematicScreenDepth = (turnedZ * cinematicPitchCos + dy * cinematicPitchSin) >> 10
    let scale = Math.max(512, cinematicScreenDepth)
    let flatX = Math.idiv(turnedX * cinematicFocal, scale)
    let flatY = -Math.idiv(turnedY * cinematicFocal, scale)
    cinematicScreenX = 1280 + ((flatX * cinematicBankCos - flatY * cinematicBankSin) >> 10)
    cinematicScreenY = 912 + ((flatY * cinematicBankCos + flatX * cinematicBankSin) >> 10)
}

// The built-in triangle filler (fillTriangle) works with whole numbers and cuts the shape off at the edge of the
// display, so the coordinates are only rounded first. Triangles can reach into the bar areas at the top and the bottom.
// At the end of drawCinematic the black bars are drawn again on top.
function cinematicTriangle(canvas: Image, aX: number, aY: number, bX: number, bY: number,
    cX: number, cY: number, ink: number) {
    canvas.fillTriangle(Math.round(aX), Math.round(aY), Math.round(bX), Math.round(bY),
        Math.round(cX), Math.round(cY), ink)
}

function cinematicFace(canvas: Image, face: number, ink: number, edgeColor: number) {
    let firstCorner = face * 4
    let cornerA = cinematicFaces[firstCorner]
    let cornerB = cinematicFaces[firstCorner + 1]
    let cornerC = cinematicFaces[firstCorner + 2]
    let cornerD = cinematicFaces[firstCorner + 3]
    canvas.fillTriangle(
        cinematicCornerX[cornerA], cinematicCornerY[cornerA],
        cinematicCornerX[cornerB], cinematicCornerY[cornerB],
        cinematicCornerX[cornerC], cinematicCornerY[cornerC], ink)
    canvas.fillTriangle(
        cinematicCornerX[cornerA], cinematicCornerY[cornerA],
        cinematicCornerX[cornerC], cinematicCornerY[cornerC],
        cinematicCornerX[cornerD], cinematicCornerY[cornerD], ink)
    // Edges near the camera can end up far outside the screen. A line is only drawn when both of its end points are in
    // a safe range around the screen.
    if (cinematicCornerX[cornerA] > -100 && cinematicCornerX[cornerA] < 260 &&
        cinematicCornerY[cornerA] > -100 && cinematicCornerY[cornerA] < 220 &&
        cinematicCornerX[cornerB] > -100 && cinematicCornerX[cornerB] < 260 &&
        cinematicCornerY[cornerB] > -100 && cinematicCornerY[cornerB] < 220) {
        canvas.drawLine(cinematicCornerX[cornerA], cinematicCornerY[cornerA],
            cinematicCornerX[cornerB], cinematicCornerY[cornerB], edgeColor)
    }
    if (cinematicCornerX[cornerB] > -100 && cinematicCornerX[cornerB] < 260 &&
        cinematicCornerY[cornerB] > -100 && cinematicCornerY[cornerB] < 220 &&
        cinematicCornerX[cornerC] > -100 && cinematicCornerX[cornerC] < 260 &&
        cinematicCornerY[cornerC] > -100 && cinematicCornerY[cornerC] < 220) {
        canvas.drawLine(cinematicCornerX[cornerB], cinematicCornerY[cornerB],
            cinematicCornerX[cornerC], cinematicCornerY[cornerC], edgeColor)
    }
}

function cinematicBox(canvas: Image, box: number) {
    let x = cinematicBoxX[box]
    let y = cinematicBoxY[box]
    let z = cinematicBoxZ[box]
    let type = cinematicBoxType[box]
    let halfWidth = cinematicBoxWidth[box]
    let halfHeight = cinematicBoxHeight[box]
    let halfDepth = cinematicBoxDepth[box]
    let minX = 10000
    let maxX = -10000
    let minY = 10000
    let maxY = -10000
    for (let i = 0; i < 8; i++) {
        let taper = type == 1 && (i & 2) == 0 ? 594 : 1024
        cinematicProject(x + ((((i & 1) == 0 ? -halfWidth : halfWidth) * taper) >> 10),
            y + ((i & 2) == 0 ? -halfHeight : halfHeight),
            z + ((((i & 4) == 0 ? -halfDepth : halfDepth) * taper) >> 10))
        // The near plane is the closest distance that gets drawn. A box with a corner closer than 1.25 is skipped
        // completely. All big scenery stands to the side of the flight path, so this never leaves a hole, and no
        // turned-inside-out shapes appear.
        if (cinematicScreenDepth < 1280) return
        cinematicCornerX[i] = (cinematicScreenX + 8) >> 4
        cinematicCornerY[i] = (cinematicScreenY + 8) >> 4
        cinematicCornerDepth[i] = cinematicScreenDepth
        minX = Math.min(minX, cinematicCornerX[i])
        maxX = Math.max(maxX, cinematicCornerX[i])
        minY = Math.min(minY, cinematicCornerY[i])
        maxY = Math.max(maxY, cinematicCornerY[i])
    }
    if (maxX < 0 || minX > 159 || maxY < 6 || minY > 111) return
    // Of each box, only the three faces that point toward the camera are drawn.
    cinematicFaceOrder[0] = cinematicCameraZ < z ? 0 : 1
    cinematicFaceOrder[1] = cinematicCameraY < y ? 2 : 3
    cinematicFaceOrder[2] = cinematicCameraX < x ? 4 : 5
    for (let i = 0; i < 3; i++) {
        let firstCorner = cinematicFaceOrder[i] * 4
        cinematicFaceDepth[i] = cinematicCornerDepth[cinematicFaces[firstCorner]] +
            cinematicCornerDepth[cinematicFaces[firstCorner + 1]] +
            cinematicCornerDepth[cinematicFaces[firstCorner + 2]] +
            cinematicCornerDepth[cinematicFaces[firstCorner + 3]]
    }
    for (let i = 0; i < 2; i++) {
        for (let j = i + 1; j < 3; j++) {
            if (cinematicFaceDepth[j] > cinematicFaceDepth[i]) {
                let swap = cinematicFaceOrder[i]
                cinematicFaceOrder[i] = cinematicFaceOrder[j]
                cinematicFaceOrder[j] = swap
                let depth = cinematicFaceDepth[i]
                cinematicFaceDepth[i] = cinematicFaceDepth[j]
                cinematicFaceDepth[j] = depth
            }
        }
    }
    for (let i = 0; i < 3; i++) {
        let face = cinematicFaceOrder[i]
        let top = face == 3
        let side = face >= 4
        let ink = 12
        let edgeColor = 12
        if (type == 0) {
            ink = top ? 7 : side ? 12 : 14
            edgeColor = top ? 6 : 12
        } else if (type == 1) {
            ink = top ? 11 : side ? 8 : 12
            edgeColor = top ? 13 : 12
        } else if (type == 2) {
            ink = top ? 13 : side ? 12 : 14
            edgeColor = 14
        } else if (type == 3) {
            ink = top ? 7 : side ? 6 : 7
            edgeColor = top ? 9 : 6
        } else if (type == 4) {
            ink = top ? 11 : side ? 15 : 8
            edgeColor = 11
        } else if (type == 5) {
            ink = top ? 1 : side ? 8 : 9
            edgeColor = 9
        } else {
            ink = top ? 5 : side ? 4 : 13
            edgeColor = 5
        }
        // Depth stays easy to see: islands and trees more than 48 units away (box types below 4: island grass, rock,
        // trunk and leaves) switch completely to the colors of the haze.
        if (z - cinematicCameraZ > 49152 && type < 4) {
            ink = top ? (type == 0 || type == 3 ? 6 : 11) : 12
            edgeColor = ink
        }
        cinematicFace(canvas, face, ink, edgeColor)
    }
}

function cinematicScene(canvas: Image) {
    let count = 0
    for (let i = 0; i < cinematicBoxX.length; i++) {
        let forward = ((cinematicBoxZ[i] - cinematicCameraZ) * cinematicYawCos +
            (cinematicBoxX[i] - cinematicCameraX) * cinematicYawSin) >> 10
        let depth = (forward * cinematicPitchCos + (cinematicBoxY[i] - cinematicCameraY) * cinematicPitchSin) >> 10
        if (depth < 1024 || depth > 86016) continue
        // Sorting happens in arrays that already exist (the farthest box comes first), so no new objects are made
        // for each frame.
        let j = count - 1
        while (j >= 0 && cinematicDepths[j] < depth) {
            cinematicDepths[j + 1] = cinematicDepths[j]
            cinematicOrder[j + 1] = cinematicOrder[j]
            j--
        }
        cinematicDepths[j + 1] = depth
        cinematicOrder[j + 1] = i
        count++
    }
    for (let i = 0; i < count; i++) cinematicBox(canvas, cinematicOrder[i])
}

// The center and the radii arrive in 16ths of a pixel. They are rounded to whole pixels only when drawing: + 8, then
// >> 4 (divided by 16).
function cinematicEllipse(canvas: Image, x: number, y: number, radiusX: number, radiusY: number, ink: number) {
    if (radiusX <= 0 || radiusY <= 0) return
    let previousX = x + radiusX
    let previousY = y
    for (let i = 1; i <= 24; i++) {
        let pointX = x + ((cinematicRingX[i] * radiusX) >> 10)
        let pointY = y + ((cinematicRingY[i] * radiusY) >> 10)
        canvas.fillTriangle((x + 8) >> 4, (y + 8) >> 4, (previousX + 8) >> 4, (previousY + 8) >> 4,
            (pointX + 8) >> 4, (pointY + 8) >> 4, ink)
        previousX = pointX
        previousY = pointY
    }
}

function cinematicSky(canvas: Image, sunset: boolean, passageStrength: number) {
    canvas.fill(15)
    let horizon = Math.max(33, Math.min(85, 57 + ((cinematicPitchSin * 92) >> 10)))
    canvas.fillRect(0, horizon - 15, 160, 127 - horizon, 8)
    canvas.fillRect(0, horizon + 9, 160, 111 - horizon, 12)
    canvas.fillRect(0, horizon + 35, 160, 112 - (horizon + 35), 15)
    if (sunset) {
        canvas.fillRect(0, horizon - 6, 160, 29, 12)
        canvas.fillRect(0, horizon + 14, 160, 21, 11)
        // A big sun straight ahead, against the light, made of circles and stripes of light in steps.
        let sunX = 2032 - (cinematicCameraX >> 5)
        cinematicEllipse(canvas, sunX, 832, 352, 352, 4)
        cinematicEllipse(canvas, sunX, 800, 272, 272, 5)
        sunX = (sunX + 8) >> 4
        canvas.fillRect(sunX - 28, 59, 57, 2, 12)
        canvas.fillRect(sunX - 24, 64, 49, 2, 12)
        canvas.fillTriangle(sunX - 6, 62, 5, 111, 27, 111, 8)
        canvas.fillTriangle(sunX - 2, 62, 47, 111, 57, 111, 12)
        canvas.fillTriangle(sunX + 6, 62, 137, 111, 159, 111, 8)
    } else {
        // Thin bands of sky move sideways when the camera turns.
        for (let i = 0; i < 5; i++) {
            let x = 14 + i * 29 - ((cinematicYawSin * 70) >> 10)
            canvas.drawLine(x, 24 + i * 3, x + 29, 20 + i * 3, 8)
        }
    }
    // The stars use 16ths of a pixel. drift (how far the stars have moved) and streak (length of the light streaks
    // while flying through the portal) are worked out only once per frame.
    let drift = Math.round((cinematicMs * (0.006 + passageStrength * 0.12)) % 128 * 16)
    let streak = Math.round(passageStrength * 307)
    for (let i = 0; i < 28; i++) {
        let depth = 480 + ((i * 592 + 2048 - drift) % 2048)
        let x = 1280 + Math.idiv(((i * 97 + 19) % 159 - 79) * 23296, depth) - ((cinematicYawSin * 960) >> 10)
        let y = 720 + Math.idiv(((i * 61 + 7) % 89 - 49) * 19200, depth)
        if (x < 0 || x > 2544 || y < 128 || y > (sunset ? 480 : 1600)) continue
        if (streak > 0) canvas.drawLine(x >> 4, y >> 4,
            (x - (((x - 1280) * streak) >> 10)) >> 4,
            (y - (((y - 880) * streak) >> 10)) >> 4, 8)
        canvas.setPixel(x >> 4, y >> 4, i % 5 == 0 ? 5 : depth < 992 ? 1 : 9)
    }
    // Flat clouds move with the 3D flight, instead of a fixed background picture.
    for (let i = 0; i < 4; i++) {
        let z = 18432 + ((i * 25600 + 153600 - cinematicCameraZ) % 102400)
        let x = 1280 + Math.idiv(((i % 2 == 0 ? -13312 : 12288) - cinematicCameraX) * 1472, z)
        let y = 784 + Math.idiv((3 + i % 2) * 1507328, z)
        let width = Math.min(880, Math.idiv(11468800, z))
        canvas.fillRect((x - (width >> 1)) >> 4, y >> 4, width >> 4, 1, sunset ? 13 : 11)
    }
}

function cinematicPortal(canvas: Image, charge: number) {
    if (cinematicCameraZ > 51200) return
    cinematicProject(0, 1178, 53760)
    if (cinematicScreenDepth < 2048) return
    // Centre and radii of the portal first in 16ths of a pixel; turning and size of the rings in 1024ths.
    let centerX = cinematicScreenX
    let centerY = cinematicScreenY
    let scale = cinematicFocal * 64 / cinematicScreenDepth
    let radiusX = Math.idiv(3328 * cinematicFocal, cinematicScreenDepth)
    let radiusY = Math.idiv(3891 * cinematicFocal, cinematicScreenDepth)
    cinematicEllipse(canvas, centerX, centerY, radiusX + 32, radiusY + 32, charge > 0.55 ? 9 : 8)
    cinematicEllipse(canvas, centerX, centerY, radiusX, radiusY, 15)
    let phase = cinematicMs * 0.0017
    let cosine = Math.round(Math.cos(phase) * 1024)
    let sine = Math.round(Math.sin(phase) * 1024)
    for (let ring = 0; ring < 3; ring++) {
        let radius = (Math.idiv(cinematicMs * 16384, 100000) + Math.idiv(ring * 1024, 3)) & 1023
        let previousX = centerX + ((((cosine * radiusX) >> 10) * radius) >> 10)
        let previousY = centerY + ((((sine * radiusY) >> 10) * radius) >> 10)
        for (let i = 1; i <= 24; i++) {
            let turnedX = (cinematicRingX[i] * cosine - cinematicRingY[i] * sine) >> 10
            let turnedY = (cinematicRingY[i] * cosine + cinematicRingX[i] * sine) >> 10
            let x = centerX + ((((turnedX * radiusX) >> 10) * radius) >> 10)
            let y = centerY + ((((turnedY * radiusY) >> 10) * radius) >> 10)
            canvas.drawLine(previousX >> 4, previousY >> 4, x >> 4, y >> 4, ring == 1 && charge > 0.5 ? 9 : 8)
            previousX = x
            previousY = y
        }
    }
    // Only a few calculations per frame follow from here, so whole pixels again.
    centerX = centerX / 16
    centerY = centerY / 16
    radiusX = radiusX / 16
    radiusY = radiusY / 16
    if (charge > 0.02) {
        let beam = Math.max(1, charge * 4)
        canvas.fillRect(centerX - beam - 2, 6, beam * 2 + 5, centerY + radiusY - 6, 8)
        canvas.fillRect(centerX - beam, 6, beam * 2 + 1, centerY + radiusY - 6, 9)
        canvas.fillRect(centerX - beam * 0.3, 6,
            Math.max(1, beam * 0.6), centerY + radiusY - 6, 1)
        // Two lightning bolts follow a fixed path that depends on the time, with no random flicker.
        for (let side = -1; side <= 1; side += 2) {
            let bend = Math.sin(cinematicMs * 0.006 + side) * 3
            canvas.drawLine(centerX, centerY - radiusY,
                centerX + side * (radiusX * 0.45 + bend), centerY - radiusY * 0.42, 9)
            canvas.drawLine(centerX + side * (radiusX * 0.45 + bend), centerY - radiusY * 0.42,
                centerX + side * radiusX * 0.18, centerY - radiusY * 0.12, 1)
        }
    }
    // A floating crystal with flat faces. Its width and its lit side change together while it turns.
    let rotation = cinematicMs * 0.0012
    let width = (0.55 + Math.abs(Math.cos(rotation)) * 0.22) * scale
    let height = 1.55 * scale
    let middle = centerX + Math.sin(rotation) * width * 0.5
    cinematicTriangle(canvas, centerX, centerY - height, centerX - width, centerY,
        middle, centerY + height, 8)
    cinematicTriangle(canvas, centerX, centerY - height, middle, centerY + height,
        centerX + width, centerY, 9)
    canvas.drawLine(centerX, centerY - height, middle, centerY + height, 1)
    canvas.drawLine(centerX, centerY - height, centerX + width, centerY, 1)
    if (charge > 0.3) {
        let flare = radiusX * charge * 1.3
        canvas.drawLine(centerX - flare, centerY, centerX + flare, centerY, 9)
        canvas.drawLine(centerX - flare * 0.6, centerY, centerX + flare * 0.6, centerY, 1)
    }
}

// Every letter flies along the same planned curve to its place, from above or below and from further out. Three layers
// of color are painted on top of each other (outline, shadow, face) instead of random wiggling letters.
function cinematicLetters(canvas: Image, mask: Image, y: number, scale: number, revealMs: number,
    shine: number, gold: boolean, direction: number) {
    // Whole numbers instead of decimals: size and height in 1024ths. shine already arrives in 1024ths.
    scale = Math.round(scale * 1024)
    y = Math.round(y * 1024)
    let originX = 81920 - ((mask.width * scale) >> 1)
    let verticalScale = mask == cinematicTitle ? Math.idiv(scale * 122, 100) : scale
    let letters = Math.idiv(mask.width + 5, 6)
    // The shadow and the outline grow with the size of the letters. A fixed offset would fill the gaps inside the
    // letters when the text is small.
    let shadow = Math.min(3, (scale + 512) >> 10)
    let outline = Math.min(5, (((scale * 7) >> 2) + 512) >> 10)
    let width = Math.max(1, (scale + 1023) >> 10)
    let height = Math.max(1, (verticalScale + 1023) >> 10)
    for (let layer = 0; layer < 3; layer++) {
        for (let letter = 0; letter < letters; letter++) {
            let progress = Math.max(0, Math.min(1024, Math.idiv((revealMs - letter * 85) * 1024, 650)))
            progress = (((progress * progress) >> 10) * (3072 - 2 * progress)) >> 10
            if (progress <= 0) continue
            let remaining = 1024 - progress
            let shiftX = (2 * letter - letters + 1) * remaining * 8
            let shiftY = ((remaining * remaining) >> 10) * 29 * direction
            for (let maskX = letter * 6; maskX < Math.min(mask.width, letter * 6 + 6); maskX++) {
                for (let maskY = 0; maskY < mask.height; maskY++) {
                    if (!mask.getPixel(maskX, maskY)) continue
                    let screenX = (originX + maskX * scale + shiftX + 512) >> 10
                    let screenY = (y + maskY * verticalScale + shiftY + 512) >> 10
                    if (layer == 0) {
                        canvas.fillRect(screenX - 1, screenY - 1, width + 2, height + 2, 15)
                        canvas.fillRect(screenX + 2, screenY + outline, width + 1, height + 1, 15)
                    }
                    else if (layer == 1) canvas.fillRect(screenX + 1, screenY + shadow,
                        width, height + 1, gold ? 4 : 8)
                    else {
                        let ink = maskY < Math.idiv(mask.height, 2) ? 1 : gold ? 5 : 9
                        if (Math.abs(maskX * 1024 - shine) < 2048) ink = 1
                        canvas.fillRect(screenX, screenY, width, height, ink)
                    }
                }
            }
        }
    }
}

// The radii are in 16ths of a pixel; amount becomes the length of the tail here.
function cinematicSpeedLines(canvas: Image, amount: number) {
    amount = Math.round((5 + amount * 22) * 16)
    for (let i = 0; i < 12; i++) {
        let index = i * 2
        let progress = (Math.idiv(cinematicMs * 1536, 1000) + Math.idiv(i * 31744, 100)) & 1023
        let radius = 320 + ((progress * 1472) >> 10)
        let x = 1280 + ((cinematicRingX[index] * radius) >> 10)
        let y = 880 + Math.idiv(cinematicRingY[index] * radius * 7, 10240)
        let tail = radius - amount
        canvas.drawLine(x >> 4, y >> 4,
            (1280 + ((cinematicRingX[index] * tail) >> 10)) >> 4,
            (880 + Math.idiv(cinematicRingY[index] * tail * 7, 10240)) >> 4,
            i % 3 == 0 ? 9 : 8)
    }
}

// Text in a dark box, centered from left to right.
function cinematicCaption(canvas: Image, text: string, y: number, ink: number) {
    let x = 80 - text.length * 3
    canvas.fillRect(x - 3, y - 2, text.length * 6 + 6, 10, 15)
    canvas.print(text, x, y, ink, image.font8)
}

function drawCinematic(canvas: Image) {
    let timeMs = cinematicMs
    cinematicFocal = 1472
    cinematicSunset = timeMs >= CINEMATIC_SUNSET_START_MS
    if (timeMs < CINEMATIC_CHARGE_START_MS) {
        let progress = timeMs / CINEMATIC_CHARGE_START_MS
        let curve = cinematicEase(progress)
        cinematicCamera(
            Math.sin(progress * Math.PI * 2) * 1.1,
            3.1 + Math.sin(progress * Math.PI) * 0.8,
            -4 + curve * 38,
            Math.sin(progress * Math.PI * 2) * 0.075,
            -0.04,
            Math.sin(progress * Math.PI * 2) * 0.055)
    } else if (timeMs < CINEMATIC_PASSAGE_START_MS) {
        let progress = cinematicEase((timeMs - CINEMATIC_CHARGE_START_MS) / 2400)
        cinematicCamera(0, 3.1 - progress * 0.7, 34 + progress * 3.2, 0, -0.04, 0)
    } else if (timeMs < CINEMATIC_CARD_START_MS) {
        let progress = (timeMs - CINEMATIC_PASSAGE_START_MS) / 4000
        // The camera speeds up through the portal, then slows down again in front of the target island.
        let travel = cinematicEase(progress)
        cinematicFocal = Math.round((92 - Math.sin(progress * Math.PI) * 16) * 16)
        cinematicCamera(
            Math.sin(progress * Math.PI * 2) * 0.8,
            2.4 + travel * 4,
            37.2 + travel * 72.8,
            Math.sin(progress * Math.PI * 2) * 0.04,
            -0.04 - travel * 0.12,
            Math.sin(progress * Math.PI * 2) * 0.09)
    } else {
        // Arrival: a calm flight over the target island, under the card and the title.
        let progress = Math.min(1,
            (timeMs - CINEMATIC_CARD_START_MS) / (CINEMATIC_CLOSE_START_MS - CINEMATIC_CARD_START_MS))
        cinematicCamera(progress * 1.1, 6.4 - progress * 0.6, 110 + progress * 6.2,
            progress * 0.025, -0.16, 0)
    }
    let passageStrength = timeMs >= CINEMATIC_PASSAGE_START_MS && timeMs < CINEMATIC_CARD_START_MS
        ? Math.sin((timeMs - CINEMATIC_PASSAGE_START_MS) / 4000 * Math.PI)
        : 0
    cinematicSky(canvas, cinematicSunset, passageStrength)
    cinematicScene(canvas)
    if (!cinematicSunset) {
        let charge = timeMs < CINEMATIC_CHARGE_START_MS ? 0
            : timeMs < CINEMATIC_PASSAGE_START_MS ? cinematicEase((timeMs - CINEMATIC_CHARGE_START_MS) / 1800)
            : 1
        cinematicPortal(canvas, charge)
    }
    if (timeMs < 1600) {
        // Out of black, the wide screen opens up into the camera flight (two black bars slide apart).
        let curtain = Math.round((1 - cinematicEase(timeMs / 1600)) * 53)
        canvas.fillRect(0, 6, 160, curtain, 15)
        canvas.fillRect(0, 112 - curtain, 160, curtain, 15)
    }
    if (timeMs >= CINEMATIC_CHARGE_START_MS && timeMs < CINEMATIC_PASSAGE_START_MS) {
        let energy = cinematicEase((timeMs - CINEMATIC_CHARGE_START_MS) / 2400)
        // The energy pulls visible sparks toward the portal before it opens.
        energy = 2 + energy * 2
        for (let i = 0; i < 8; i++) {
            let index = i * 3
            let radius = 288 + ((i * 208 + 1552 - Math.idiv((timeMs - CINEMATIC_CHARGE_START_MS) * 16, 17) % 1552) % 1552)
            let x = 1280 + ((cinematicRingX[index] * radius) >> 10)
            let y = 960 + Math.idiv(cinematicRingY[index] * radius * 17, 25600)
            canvas.fillRect(x >> 4, y >> 4, energy, energy, i % 3 == 0 ? 5 : 9)
        }
    }
    if (passageStrength > 0.1) cinematicSpeedLines(canvas, passageStrength)
    if (timeMs >= CINEMATIC_CARD_START_MS && timeMs < CINEMATIC_TITLE_START_MS) {
        let elapsedMs = timeMs - CINEMATIC_CARD_START_MS
        // Two huge words (CALLIOPE and HACKER) instead of a small label over the picture.
        cinematicLetters(canvas, cinematicCalliope, 19, 2.85,
            elapsedMs + 180, Math.idiv((elapsedMs - 1400) * 1024, 50), true, -1)
        cinematicLetters(canvas, cinematicHacker, 55, 3.45,
            elapsedMs - 180, Math.idiv((elapsedMs - 1700) * 1024, 48), false, 1)
        if (elapsedMs > 1200) {
            let reveal = cinematicEase((elapsedMs - 1200) / 550)
            let y = 98 + Math.round((1 - reveal) * 6)
            canvas.fillRect(Math.idiv(160 - cinematicPresents.width, 2) - 3, y - 2,
                cinematicPresents.width + 6, cinematicPresents.height + 3, 15)
            for (let pixelX = 0; pixelX < Math.floor(cinematicPresents.width * reveal); pixelX++) {
                for (let pixelY = 0; pixelY < cinematicPresents.height; pixelY++) {
                    if (cinematicPresents.getPixel(pixelX, pixelY)) {
                        canvas.setPixel(Math.idiv(160 - cinematicPresents.width, 2) + pixelX, y + pixelY, 1)
                    }
                }
            }
        }
        let extent = Math.min(56, Math.max(0, (elapsedMs - 1700) / 12))
        canvas.drawLine(80 - extent, 106, 80 + extent, 106, 4)
    }
    if (timeMs >= CINEMATIC_TITLE_START_MS) {
        let elapsedMs = timeMs - CINEMATIC_TITLE_START_MS
        let settle = 1 - cinematicEase(elapsedMs / 1000)
        // A calm, big title reveal. The camera flight goes on underneath.
        cinematicLetters(canvas, cinematicTitle, 15 - settle * 7,
            cinematicTitleScale(148) + settle * 0.12, elapsedMs + 120, Math.idiv((elapsedMs - 1800) * 1024, 33), true, -1)
        if (elapsedMs > 1600) cinematicCaption(canvas, "BUILD YOUR OWN WORLD", 51, 13)
        // Leaves and sparks in the front drift across the screen during the camera flight.
        for (let i = 0; i < 8; i++) {
            let x = (i * 43 + elapsedMs / 95) % 176 - 8
            let y = 65 + (i * 19 % 42) + Math.sin(elapsedMs * 0.0018 + i) * 3
            canvas.fillRect(x, y, i % 3 == 0 ? 2 : 1, 1, i % 3 == 0 ? 5 : 7)
        }
        if (timeMs >= CINEMATIC_CLOSE_START_MS) {
            let close = cinematicEase((timeMs - CINEMATIC_CLOSE_START_MS) / 1500)
            let curtain = Math.round(close * 32)
            canvas.fillRect(0, 6, 160, curtain, 15)
            canvas.fillRect(0, 112 - curtain, 160, curtain, 15)
            cinematicCaption(canvas, "YOUR ADVENTURE BEGINS", Math.round(87 - close * 16), 9)
        }
    }
    canvas.fillRect(0, 0, 160, 6, 15)
    canvas.fillRect(0, 110, 160, 10, 15)
    canvas.drawLine(0, 110, Math.idiv(Math.min(timeMs, CINEMATIC_DURATION_MS) * 159, CINEMATIC_DURATION_MS), 110, 4)
    if (timeMs - cinematicSkipFromMs >= CINEMATIC_SKIP_MS) {
        let hint = "A: Skip"
        canvas.print(hint, 80 - hint.length * 3, 112, 11, image.font8)
    }
}

// Size of the game title: at most 2.36 times, and never wider than width pixels.
function cinematicTitleScale(width: number): number {
    return Math.min(2.36, width / cinematicTitle.width)
}

function drawPresents() {
    let text = "presents"
    cinematicPresents = image.create(text.length * 6, 8)
    cinematicPresents.print(text, 0, 0, 1, image.font8)
}
