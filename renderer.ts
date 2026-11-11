// Drawing the world in 3D.
// It uses rays that travel through blocks. For each ray the code steps from block to block through the world, using
// only whole numbers (this method is called DDA). The code uses no sprites and makes no new objects for each ray.
let hitX = 0
let hitY = 0
let hitZ = 0
let hitFaceX = 0
let hitFaceY = 0
let hitFaceZ = 0
let hitBlock = 0
let hitDistance = 0
let viewX = 0
let viewY = 0
let viewZ = 1024
let rightX = 1024
let rightZ = 0
let upX = 0
let upY = 1024
let upZ = 0
let targetValid = false
let targetX = 0
let targetY = 0
let targetZ = 0
let placeX = 0
let placeY = 0
let placeZ = 0
let targetBlock = 0
let baseColors = [9, 14, 14, 11, 14, 7, 13, 9, 12]
let darkColors = [9, 12, 12, 12, 12, 6, 14, 6, 15]
let hazeColors = [9, 1, 4, 13, 13, 13, 11, 7, 11, 9, 11, 11, 11, 13, 11, 11]
// Seven 16 x 16 patterns in ONE 4-bit image: 7 x 16 x 16 pixels at 4 bits each is 896 bytes, much less than big texture
// arrays. In the patterns, 0 = base color, 1 = dark spot, 2 = light spot. They are drawn only once, the first
// time renderWorld runs.
let blockTextures = image.create(112, 16)
let texturesReady = false
let vectorYaw = -10000
let vectorPitch = -10000
let rayYaw = -10000
let rayPitch = -10000
let preparedRayWidth = 0
let columnX: number[] = []
let columnZ: number[] = []
let rowX: number[] = []
let rowY: number[] = []
let rowZ: number[] = []

function cameraVectors() {
    // updateTarget and the drawing code share the same direction vectors. When yaw (turning left and right) and pitch
    // (looking up and down) did not change, the sin and cos calculations are skipped. That also holds while the player
    // walks straight ahead.
    if (yaw == vectorYaw && pitch == vectorPitch) return
    vectorYaw = yaw
    vectorPitch = pitch
    let sinYaw = Math.sin(yaw)
    let cosYaw = Math.cos(yaw)
    let sinPitch = Math.sin(pitch)
    let cosPitch = Math.cos(pitch)
    viewX = Math.round(sinYaw * cosPitch * 1024)
    viewY = Math.round(sinPitch * 1024)
    viewZ = Math.round(cosYaw * cosPitch * 1024)
    rightX = Math.round(cosYaw * 1024)
    rightZ = Math.round(-sinYaw * 1024)
    upX = Math.round(-sinYaw * sinPitch * 1024)
    upY = Math.round(cosPitch * 1024)
    upZ = Math.round(-cosYaw * sinPitch * 1024)
}
// Fixed-point numbers are whole numbers that stand for fractions. A direction of length 1 is written as 1024. A
// distance along the ray counts 1024 per block, and the start position counts 256 per block.
function traceRay(startX: number, startY: number, startZ: number,
    dx: number, dy: number, dz: number, limit: number): boolean {
    hitBlock = 0
    if (dx == 0 && dy == 0 && dz == 0) return false
    let x = startX >> 8
    let y = startY >> 8
    let z = startZ >> 8
    let stepX = dx < 0 ? -1 : 1
    let stepY = dy < 0 ? -1 : 1
    let stepZ = dz < 0 ? -1 : 1
    let index = x + SIZE * (z + SIZE * y)
    let strideY = SIZE * SIZE * stepY
    let strideZ = SIZE * stepZ
    let deltaX = dx == 0 ? 1073741823 : Math.idiv(1048576, Math.abs(dx))
    let deltaY = dy == 0 ? 1073741823 : Math.idiv(1048576, Math.abs(dy))
    let deltaZ = dz == 0 ? 1073741823 : Math.idiv(1048576, Math.abs(dz))
    // delta is the distance a ray travels to cross one more block on one axis. With whole-number directions delta is at
    // most 1048576, so a product is at most 2^28 and still fits. Because the numbers are positive, a shift to the right
    // by 8 (>> 8) can be used instead of three more divisions.
    let nextX = dx == 0 ? 1073741823
        : ((dx < 0 ? startX & 255 : 256 - (startX & 255)) * deltaX) >> 8
    let nextY = dy == 0 ? 1073741823
        : ((dy < 0 ? startY & 255 : 256 - (startY & 255)) * deltaY) >> 8
    let nextZ = dz == 0 ? 1073741823
        : ((dz < 0 ? startZ & 255 : 256 - (startZ & 255)) * deltaZ) >> 8
    let distance = 0
    let axis = 0
    for (let step = 0; step < 48; step++) {
        if (nextX <= nextY && nextX <= nextZ) {
            distance = nextX
            nextX += deltaX
            x += stepX
            index += stepX
            axis = 0
        } else if (nextY <= nextZ) {
            distance = nextY
            nextY += deltaY
            y += stepY
            index += strideY
            axis = 1
        } else {
            distance = nextZ
            nextZ += deltaZ
            z += stepZ
            index += strideZ
            axis = 2
        }
        if (distance > limit || x < 0 || x >= SIZE || z < 0 || z >= SIZE || y < 0) return false
        // Rays that start above the world can come back down into it. So a ray above the world only stops when
        // it points upward.
        if (y >= HEIGHT) {
            if (dy >= 0) return false
            continue
        }
        let blockType = blocks[index]
        if (blockType != 0) {
            hitX = x
            hitY = y
            hitZ = z
            hitBlock = blockType
            hitDistance = distance
            hitFaceX = axis == 0 ? -stepX : 0
            hitFaceY = axis == 1 ? -stepY : 0
            hitFaceZ = axis == 2 ? -stepZ : 0
            return true
        }
    }
    return false
}
function updateTarget() {
    cameraVectors()
    targetValid = traceRay(posX, posY + EYE, posZ, viewX, viewY, viewZ, 4 * 1024)
    if (targetValid) {
        targetX = hitX
        targetY = hitY
        targetZ = hitZ
        targetBlock = hitBlock
        placeX = hitX + hitFaceX
        placeY = hitY + hitFaceY
        placeZ = hitZ + hitFaceZ
    } else targetBlock = 0
}
function makeBlockTextures() {
    if (texturesReady) return
    texturesReady = true
    // Grass: two tiny blades. No random color spots on every face.
    blockTextures.drawLine(3, 4, 4, 3, 1)
    blockTextures.setPixel(4, 5, 1)
    blockTextures.drawLine(11, 11, 12, 12, 1)
    // Dirt: a few small pebbles, not a regular tile pattern.
    blockTextures.drawLine(19, 5, 20, 5, 1)
    blockTextures.setPixel(20, 4, 2)
    blockTextures.drawLine(26, 11, 28, 11, 1)
    blockTextures.setPixel(27, 10, 2)
    blockTextures.setPixel(22, 14, 1)
    // Stone: short cracks and two soft light edges.
    blockTextures.drawLine(35, 5, 39, 5, 1)
    blockTextures.drawLine(38, 6, 40, 6, 1)
    blockTextures.drawLine(42, 11, 45, 11, 1)
    blockTextures.drawLine(35, 4, 38, 4, 2)
    blockTextures.drawLine(43, 10, 45, 10, 2)
    // Bark: broken, shifted grain instead of long unbroken stripes.
    blockTextures.fillRect(52, 3, 2, 3, 1)
    blockTextures.drawLine(53, 6, 53, 8, 1)
    blockTextures.fillRect(59, 10, 2, 3, 1)
    blockTextures.drawLine(60, 2, 60, 4, 2)
    blockTextures.drawLine(56, 11, 56, 13, 2)
    // End grain on the top and bottom of a log: two closed rings around a small core.
    blockTextures.drawRect(66, 2, 12, 12, 1)
    blockTextures.drawRect(69, 5, 6, 6, 1)
    blockTextures.fillRect(71, 7, 2, 2, 2)
    // Planks: board ends that are shifted against each other, and a little wood grain.
    blockTextures.drawLine(80, 7, 95, 7, 1)
    blockTextures.drawLine(80, 15, 95, 15, 1)
    blockTextures.drawLine(84, 0, 84, 6, 1)
    blockTextures.drawLine(92, 8, 92, 14, 1)
    blockTextures.drawLine(88, 3, 92, 3, 2)
    blockTextures.drawLine(82, 11, 85, 11, 2)
    // Leaves: two small groups of leaves, and large calm areas of green.
    blockTextures.drawLine(99, 4, 102, 4, 2)
    blockTextures.drawLine(100, 5, 101, 5, 2)
    blockTextures.drawLine(106, 11, 109, 11, 1)
    blockTextures.setPixel(107, 10, 1)
}

function shade(dx: number, dy: number, dz: number): number {
    let pointX = posX + ((dx * hitDistance) >> 12)
    let pointY = posY + EYE + ((dy * hitDistance) >> 12)
    let pointZ = posZ + ((dz * hitDistance) >> 12)
    let faceU = (hitFaceX != 0 ? pointZ : pointX) & 255
    // On the side faces, faceV counts from the top down. faceU is flipped on the faces that point toward +x or +z,
    // because opposite faces are mirrored.
    let faceV = hitFaceY != 0 ? pointZ & 255 : 255 - (pointY & 255)
    if (hitFaceY == 0 && (hitFaceX > 0 || hitFaceZ > 0)) faceU = 255 - faceU
    let blockType = hitBlock
    let darkSide = hitFaceY < 0 || hitFaceX != 0 || hitFaceZ > 0
    let texture = blockType == Block.Grass ? (hitFaceY > 0 ? 0 : 1)
        : blockType == Block.Dirt ? 1
        : blockType == Block.Stone || blockType == Block.BaseRock ? 2
        : blockType == Block.Wood ? (hitFaceY != 0 ? 4 : 3)
        : blockType == Block.Planks ? 5
        : 6
    // Small details disappear in the distance instead of flickering as colorful pixels.
    let detailLimit = texture < 2 ? 3 * 1024 : 6 * 1024
    let textureX = faceU >> 4
    let textureY = faceV >> 4
    if (texture < 3 || texture == 6) {
        // The same small pattern is shifted by a different amount for each block, fixed in the world, so no regular
        // grid of spots shows.
        textureX = (textureX + hitX * 5 + hitZ * 3) & 15
        textureY = (textureY + hitX * 7 + hitZ * 11 + hitY * 3) & 15
    }
    let tone = hitDistance < detailLimit ? blockTextures.getPixel(texture * 16 + textureX, textureY) : 0
    if (hitDistance > 4 * 1024 && tone == 2 && blockType == Block.Stone) tone = 0
    let ink = baseColors[blockType]
    if (blockType == Block.Grass && hitFaceY > 0) {
        ink = tone == 1 ? 6 : 7
    } else if (blockType == Block.Grass || blockType == Block.Dirt) {
        ink = darkSide ? 12 : 14
        if (tone == 1 && !darkSide) ink = 12
        // The green strip of a grass block follows the top edge of the block, a little uneven. The dirt
        // below stays brown.
        if (blockType == Block.Grass && hitFaceY == 0 &&
            faceV < 35 + ((faceU >> 6) & 1) * 8) ink = darkSide ? 6 : 7
    } else if (blockType == Block.Stone) {
        ink = hitFaceY > 0 ? 13 : darkSide ? 12 : 11
        if (tone == 1 && !darkSide) ink = hitFaceY > 0 ? 11 : 12
        else if (tone == 2 && !darkSide && hitFaceY <= 0) ink = 13
    } else if (blockType == Block.Wood) {
        ink = darkSide ? 12 : 14
        if (hitFaceY > 0) ink = tone == 1 ? 14 : tone == 2 ? 13 : 4
        else if (!darkSide && tone == 1) ink = 12
        else if (!darkSide && tone == 2) ink = 4
    } else if (blockType == Block.Planks) {
        ink = darkSide ? 14 : 13
        if (tone == 1) ink = darkSide ? 12 : 14
        else if (tone == 2 && !darkSide) ink = 4
    } else if (blockType == Block.Leaves) {
        ink = hitFaceY > 0 || !darkSide ? 7 : 6
        if (tone == 1) ink = 6
        else if (tone == 2 && !darkSide) ink = 7
    } else if (blockType == Block.Crystal) {
        // Crystal: large connected facets instead of random sparkles.
        ink = darkSide ? 8 : 9
        if (!darkSide && faceU < 112 && faceV < 144 && faceU + faceV < 176) ink = 1
        else if (faceU > 160 && faceV > 96) ink = 8
    } else if (blockType == Block.BaseRock) {
        ink = tone == 1 || hitFaceY < 0 ? 15 : 12
    }
    // Contact shadows only appear next to neighbors that really are higher. A flat patch of grass gets no dark grid.
    // There are no extra rays for light or shadow.
    if (hitFaceY > 0 && hitDistance < 5 * 1024) {
        let contact = false
        if (faceU < 20)
            contact = blockAt(hitX - 1, hitY + 1, hitZ) != Block.Air
        else if (faceU > 235)
            contact = blockAt(hitX + 1, hitY + 1, hitZ) != Block.Air
        if (!contact && faceV < 20)
            contact = blockAt(hitX, hitY + 1, hitZ - 1) != Block.Air
        else if (!contact && faceV > 235)
            contact = blockAt(hitX, hitY + 1, hitZ + 1) != Block.Air
        if (contact) ink = blockType == Block.Grass || blockType == Block.Leaves ? 6
            : blockType == Block.Stone ? 11
            : darkColors[blockType]
    }
    // Far away, stone and base rock lose contrast (hazeColors). Leaves stay green; wood hardly changes: only its orange
    // color turns pale beige. So whole trees do not turn into gray stone pillars.
    if (hitDistance > 6 * 1024) {
        if (blockType == Block.Stone || blockType == Block.BaseRock) ink = hazeColors[ink]
        else if (blockType == Block.Wood && ink == 4) ink = 13
    }
    // The outline of the target block is drawn on top of texture and shadow. Blocks have no permanent outline.
    if (targetValid && hitX == targetX && hitY == targetY && hitZ == targetZ &&
        (faceU < 16 || faceU > 239 || faceV < 16 || faceV > 239)) ink = 5
    return ink
}

function prepareRays() {
    if (rayYaw == yaw && rayPitch == pitch && preparedRayWidth == rayWidth) return
    rayYaw = yaw
    rayPitch = pitch
    preparedRayWidth = rayWidth
    // At most 316 numbers are stored when rayWidth is 2: 80 columns with 2 numbers and 52 rows with 3 numbers. No new
    // arrays are made for each frame or ray.
    for (let column = 0, x = 0; x < 160; column++, x += rayWidth) {
        let columnOffset = Math.idiv((x + rayWidth / 2 - 80) * 1024, 110)
        columnX[column] = (rightX * columnOffset) >> 10
        columnZ[column] = (rightZ * columnOffset) >> 10
    }
    for (let row = 0, y = 8; y < 112; row++, y += rayWidth) {
        let rowOffset = Math.idiv((60 - y - rayWidth / 2) * 1024, 110)
        rowX[row] = viewX + ((upX * rowOffset) >> 10)
        rowY[row] = viewY + ((upY * rowOffset) >> 10)
        rowZ[row] = viewZ + ((upZ * rowOffset) >> 10)
    }
}

// Sky objects are fixed in the world. The sun is always 14 x 14 pixels, but its position follows the view. The clouds
// change both position and size with the perspective.
function skyObject(canvas: Image, x: number, y: number, z: number, isSun: boolean) {
    let depth = (x * viewX + y * viewY + z * viewZ) >> 10
    if (depth < 160) return
    let screenX = 80 + Math.idiv(((x * rightX + z * rightZ) >> 10) * 110, depth)
    let screenY = 60 - Math.idiv(((x * upX + y * upY + z * upZ) >> 10) * 110, depth)
    if (screenX < -40 || screenX > 200 || screenY < -20 || screenY > 135) return
    if (isSun) {
        canvas.fillRect(screenX - 7, screenY - 5, 14, 10, 1)
        canvas.fillRect(screenX - 5, screenY - 7, 10, 14, 1)
        canvas.fillRect(screenX - 5, screenY - 5, 10, 10, 5)
        canvas.fillRect(screenX - 3, screenY - 4, 5, 2, 1)
    } else {
        let half = Math.max(6, Math.min(30, Math.idiv(20000, depth)))
        let rise = Math.max(2, half >> 2)
        canvas.fillRect(screenX - half, screenY, half * 2, rise, 13)
        canvas.fillRect(screenX - half + 2, screenY - rise, half * 2 - 4, rise + 1, 1)
        canvas.fillRect(screenX - (half >> 1), screenY - rise * 2, half, rise + 1, 1)
    }
}

function renderWorld(canvas: Image) {
    cameraVectors()
    prepareRays()
    makeBlockTextures()
    canvas.fill(9)
    // A few wide bands of color make the air look hazy near the horizon, instead of one hard line.
    // rowY is the up-and-down direction of each screen row in the world, so the horizon moves up or down when the
    // player looks up or down.
    for (let row = 0, y = 8; y < 112; row++, y += rayWidth) {
        let elevation = rowY[row]
        if (elevation < -95) canvas.fillRect(0, y, 160, rayWidth, 6)
        else if (elevation < -35) canvas.fillRect(0, y, 160, rayWidth, 11)
        else if (elevation < 0) canvas.fillRect(0, y, 160, rayWidth, 13)
        else if (elevation < 25) canvas.fillRect(0, y, 160, rayWidth, 1)
    }
    skyObject(canvas, 530, 570, 1024, true)
    skyObject(canvas, -650, 420, 1600, false)
    skyObject(canvas, 1100, 350, 1700, false)
    skyObject(canvas, 1600, 470, -1050, false)
    skyObject(canvas, -900, 560, -1800, false)
    let eyeY = posY + EYE
    // There are 40 x 26 rays (20 x 13 when fast, 80 x 52 when fine). A ray that hits nothing needs no drawing call,
    // because the sky is already painted.
    for (let row = 0, y = 8; y < 112; row++, y += rayWidth) {
        let directionX = rowX[row]
        let directionY = rowY[row]
        let directionZ = rowZ[row]
        for (let column = 0, x = 0; x < 160; column++, x += rayWidth) {
            let dx = directionX + columnX[column]
            let dz = directionZ + columnZ[column]
            if (traceRay(posX, eyeY, posZ, dx, directionY, dz, 8 * 1024)) {
                canvas.fillRect(x, y, rayWidth, rayWidth, shade(dx, directionY, dz))
            }
        }
    }
}
