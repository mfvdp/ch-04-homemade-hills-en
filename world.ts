// The world and the player: blocks, walking, mining, placing, crafting and saving.
// Positions are counted in 256ths of a block (UNIT is 256), so 3200 means 12.5 blocks. Y points up.
const SIZE = 24
const HEIGHT = 12
const UNIT = 256
const RADIUS = 62
const BODY = 410
const EYE = 350
const BLOCK_COUNT = SIZE * SIZE * HEIGHT
const SAVE_SIZE = 64 + BLOCK_COUNT / 2 + 2
enum Block { Air, Grass, Dirt, Stone, Wood, Leaves, Planks, Crystal, BaseRock }
let blocks = control.createBuffer(BLOCK_COUNT)
let bag = [0, 0, 24, 16, 8, 0, 12, 0, 0]
let materials = [Block.Dirt, Block.Stone, Block.Wood, Block.Leaves, Block.Planks, Block.Crystal]
let blockNames = ["Air", "Grass", "Dirt", "Stone", "Wood", "Leaves", "Planks", "Crystal", "Base rock"]
let selected = 0
let crystalsFound = 0
let posX = 3200
let posY = 1024
let posZ = 1152
let yaw = 0
let pitch = -0.16
let fallSpeed = 0
let onGround = true
let unsavedChanges = false
let rayWidth = 4
let hasPickaxe = false
let trainingDone = false

function insideWorld(x: number, y: number, z: number): boolean {
    return x >= 0 && x < SIZE && y >= 0 && y < HEIGHT && z >= 0 && z < SIZE
}
function blockAt(x: number, y: number, z: number): number {
    if (!insideWorld(x, y, z)) return Block.Air
    return blocks[x + SIZE * (z + SIZE * y)]
}
function writeBlock(x: number, y: number, z: number, value: number) {
    if (insideWorld(x, y, z) && y > 0) {
        blocks[x + SIZE * (z + SIZE * y)] = value
        unsavedChanges = true
    }
}
function bodyBlocked(x: number, y: number, z: number): boolean {
    if (x - RADIUS < 0 || z - RADIUS < 0 ||
        x + RADIUS >= SIZE * UNIT || z + RADIUS >= SIZE * UNIT ||
        y < UNIT) return true
    for (let blockY = y >> 8; blockY <= (y + BODY - 1) >> 8; blockY++) {
        for (let blockZ = (z - RADIUS) >> 8; blockZ <= (z + RADIUS - 1) >> 8; blockZ++) {
            for (let blockX = (x - RADIUS) >> 8;
                blockX <= (x + RADIUS - 1) >> 8; blockX++) {
                if (blockAt(blockX, blockY, blockZ) != Block.Air) return true
            }
        }
    }
    return false
}
function overlapsPlayer(x: number, y: number, z: number): boolean {
    return x * UNIT < posX + RADIUS && (x + 1) * UNIT > posX - RADIUS &&
        z * UNIT < posZ + RADIUS && (z + 1) * UNIT > posZ - RADIUS &&
        y * UNIT < posY + BODY && (y + 1) * UNIT > posY
}
function plantTree(x: number, z: number, floor: number) {
    for (let y = floor + 3; y <= floor + 4; y++) {
        for (let dz = -1; dz <= 1; dz++) {
            for (let dx = -1; dx <= 1; dx++) writeBlock(x + dx, y, z + dz, Block.Leaves)
        }
    }
    for (let y = floor + 1; y <= floor + 3; y++) writeBlock(x, y, z, Block.Wood)
}
function generateWorld() {
    blocks.fill(0)
    let terrainX = randint(0, 628) / 100
    let terrainZ = randint(0, 628) / 100
    for (let z = 0; z < SIZE; z++) {
        for (let x = 0; x < SIZE; x++) {
            let top = 3 +
                Math.floor((Math.sin(x * 0.43 + terrainX) + Math.cos(z * 0.38 + terrainZ) + 2) * 0.65)
            // The path to the first tree stays flat, even in new worlds.
            if (x >= 9 && x <= 15 && z <= 9) top = 3
            for (let y = 0; y <= top; y++) {
                let blockType = y == 0 ? Block.BaseRock
                    : y == top ? Block.Grass
                    : y == top - 1 ? Block.Dirt
                    : Block.Stone
                if (y > 0 && y < top - 1 && randint(0, 29) == 0) blockType = Block.Crystal
                blocks[x + SIZE * (z + SIZE * y)] = blockType
            }
            if (x % 5 == 2 && z % 6 == 3 && z > 7) plantTree(x, z, top)
        }
    }
    // Seven crystals that are always there, just above the base rock (height 1), and a small cave under the ground.
    for (let i = 0; i < 7; i++) writeBlock(3 + i * 2, 1, 18, Block.Crystal)
    for (let x = 4; x <= 7; x++) {
        for (let z = 15; z <= 18; z++) {
            writeBlock(x, 2, z, Block.Air)
            writeBlock(x, 3, z, Block.Air)
        }
    }
    plantTree(12, 9, 3)
    // A few blocks of stone and planks already stand near the start, so you can try mining and placing right away.
    writeBlock(15, 4, 7, Block.Stone)
    writeBlock(15, 5, 7, Block.Stone)
    writeBlock(16, 4, 7, Block.Planks)
    bag = [0, 0, 24, 16, 8, 0, 12, 0, 0]
    selected = 0
    crystalsFound = 0
    hasPickaxe = false
    yaw = 0
    pitch = -0.16
    returnToStart()
    unsavedChanges = true
}
function returnToStart() {
    posX = 12 * UNIT + 128
    posZ = 4 * UNIT + 128
    posY = 4 * UNIT
    writeBlock(12, 3, 4, Block.Grass)
    writeBlock(12, 4, 4, Block.Air)
    writeBlock(12, 5, 4, Block.Air)
    fallSpeed = 0
    onGround = true
}
function moveAxis(dx: number, dz: number) {
    if (!bodyBlocked(posX + dx, posY, posZ + dz)) {
        posX += dx
        posZ += dz
    } else if (onGround && !bodyBlocked(posX, posY + UNIT, posZ) &&
        !bodyBlocked(posX + dx, posY + UNIT, posZ + dz)) {
        posY += UNIT
        posX += dx
        posZ += dz
        // After a step up, onGround is set to false. So the player climbs only one block per physics step, even when
        // walking diagonally (that calls moveAxis twice).
        onGround = false
        fallSpeed = 0
    }
}
function movePlayer(forward: number, dt: number) {
    dt = Math.max(0, Math.min(80, dt))
    if (dt == 0) return
    onGround = bodyBlocked(posX, posY - 2, posZ)
    let distance = Math.idiv(forward * dt * 7, 10)
    moveAxis(Math.round(Math.sin(yaw) * distance), 0)
    moveAxis(0, Math.round(Math.cos(yaw) * distance))
    fallSpeed = Math.max(-1100, fallSpeed - dt * 2)
    let movement = Math.idiv(fallSpeed * dt, 1000)
    let steps = Math.max(1, Math.ceil(Math.abs(movement) / 24))
    for (let i = 0; i < steps; i++) {
        let dy = Math.idiv(movement * (i + 1), steps) - Math.idiv(movement * i, steps)
        if (!bodyBlocked(posX, posY + dy, posZ)) posY += dy
        else {
            // Move right up to the floor or the ceiling, one unit at a time, so the player does not hover above it.
            let direction = dy < 0 ? -1 : 1
            for (let rest = 0; rest < Math.abs(dy); rest++) {
                if (bodyBlocked(posX, posY + direction, posZ)) break
                posY += direction
            }
            fallSpeed = 0
            break
        }
    }
    onGround = bodyBlocked(posX, posY - 1, posZ)
}
function mineBlock(x: number, y: number, z: number): boolean {
    let blockType = blockAt(x, y, z)
    if (blockType == Block.Air || blockType == Block.BaseRock || !insideWorld(x, y, z)) return false
    let item = blockType == Block.Grass ? Block.Dirt : blockType
    if (bag[item] >= 999) return false
    bag[item]++
    // crystalsFound is the most crystals the player has held at once. So placing a crystal and mining it again does
    // not count twice.
    if (blockType == Block.Crystal) crystalsFound = Math.max(crystalsFound, bag[blockType])
    writeBlock(x, y, z, Block.Air)
    return true
}
function placeBlock(x: number, y: number, z: number): boolean {
    let blockType = materials[selected]
    if (!insideWorld(x, y, z) || y == 0 || blockAt(x, y, z) != Block.Air || bag[blockType] == 0 ||
        overlapsPlayer(x, y, z)) return false
    writeBlock(x, y, z, blockType)
    bag[blockType]--
    return true
}
function craftPlanks(): boolean {
    if (bag[Block.Wood] < 1 || bag[Block.Planks] > 995) return false
    bag[Block.Wood]--
    bag[Block.Planks] += 4
    unsavedChanges = true
    return true
}
function craftPickaxe(): boolean {
    if (hasPickaxe || bag[Block.Wood] < 2 || bag[Block.Stone] < 3) return false
    bag[Block.Wood] -= 2
    bag[Block.Stone] -= 3
    hasPickaxe = true
    unsavedChanges = true
    return true
}
function saveChecksum(data: Buffer): number {
    let sum = 0
    for (let i = 0; i < data.length - 2; i++) sum = (sum * 31 + data[i]) & 65535
    return sum
}
function encodeSave(): Buffer {
    let data = control.createBuffer(SAVE_SIZE)
    data[0] = 67
    data[1] = 51
    data[2] = 1
    data[3] = selected
    data[4] = rayWidth
    data[5] = hasPickaxe ? 1 : 0
    data.setNumber(NumberFormat.UInt16LE, 6, posX)
    data.setNumber(NumberFormat.UInt16LE, 8, posY)
    data.setNumber(NumberFormat.UInt16LE, 10, posZ)
    data.setNumber(NumberFormat.UInt16LE, 12, Math.floor(yaw * 10000))
    data.setNumber(NumberFormat.UInt16LE, 14, Math.floor((pitch + 1.2) * 10000))
    data.setNumber(NumberFormat.UInt16LE, 16, Math.min(65535, crystalsFound))
    for (let i = 0; i < bag.length; i++) data.setNumber(NumberFormat.UInt16LE, 18 + i * 2, bag[i])
    data[40] = trainingDone ? 1 : 0
    for (let i = 0; i < BLOCK_COUNT; i += 2) data[64 + i / 2] = blocks[i] | (blocks[i + 1] << 4)
    data.setNumber(NumberFormat.UInt16LE, SAVE_SIZE - 2, saveChecksum(data))
    return data
}
function decodeSave(data: Buffer): boolean {
    if (!data || data.length != SAVE_SIZE || data[0] != 67 || data[1] != 51 || data[2] != 1 ||
        data[3] >= materials.length || (data[4] != 2 && data[4] != 4 && data[4] != 8) ||
        data[5] > 1 || data[40] > 1 ||
        data.getNumber(NumberFormat.UInt16LE, SAVE_SIZE - 2) != saveChecksum(data)) return false
    let x = data.getNumber(NumberFormat.UInt16LE, 6)
    let y = data.getNumber(NumberFormat.UInt16LE, 8)
    let z = data.getNumber(NumberFormat.UInt16LE, 10)
    if (x < RADIUS || z < RADIUS ||
        x >= SIZE * UNIT - RADIUS || z >= SIZE * UNIT - RADIUS ||
        y < UNIT || y > HEIGHT * UNIT ||
        data.getNumber(NumberFormat.UInt16LE, 12) >= 62832 ||
        data.getNumber(NumberFormat.UInt16LE, 14) > 24000) return false
    for (let i = 0; i < bag.length; i++) {
        if (data.getNumber(NumberFormat.UInt16LE, 18 + i * 2) > 999) return false
    }
    for (let i = 64; i < SAVE_SIZE - 2; i++) {
        if ((data[i] & 15) > Block.BaseRock || (data[i] >> 4) > Block.BaseRock) return false
        if (i < 64 + SIZE * SIZE / 2 && data[i] != 136) return false
    }
    for (let i = 0; i < BLOCK_COUNT; i += 2) {
        blocks[i] = data[64 + i / 2] & 15
        blocks[i + 1] = data[64 + i / 2] >> 4
    }
    posX = x
    posY = y
    posZ = z
    yaw = data.getNumber(NumberFormat.UInt16LE, 12) / 10000
    pitch = data.getNumber(NumberFormat.UInt16LE, 14) / 10000 - 1.2
    selected = data[3]
    rayWidth = data[4]
    hasPickaxe = data[5] == 1
    trainingDone = data[40] == 1
    crystalsFound = data.getNumber(NumberFormat.UInt16LE, 16)
    for (let i = 0; i < bag.length; i++) {
        bag[i] = data.getNumber(NumberFormat.UInt16LE, 18 + i * 2)
    }
    fallSpeed = 0
    unsavedChanges = false
    if (bodyBlocked(posX, posY, posZ)) returnToStart()
    else onGround = bodyBlocked(posX, posY - 1, posZ)
    return true
}
