// The flash memory that holds the saved game.
// RAFFS is the small file system that settings uses in the flash memory. It splits the flash into two halves. When the
// game saves again, the old save and the new save (3522 bytes each, plus some bookkeeping data) must both fit into one
// half. PXT, the build tool of MakeCode, takes this reserved space away from the flash that is left for the program. So
// SETTINGS_SIZE below is the amount of flash (16 KiB) that the saves get. Its name must stay exactly like this, because
// MakeCode reads it when it builds the game.
namespace userconfig {
    export const SETTINGS_SIZE = 16 * 1024
}

const onDevice = control.deviceDalVersion() != "sim"
