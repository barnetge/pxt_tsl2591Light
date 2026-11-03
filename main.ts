namespace tsl2591 {
    const TSL2591_ADDR = 0x29;
    const COMMAND_BIT = 0xA0;
    let isInitialized = false;

    export enum Gain {
        //% block="1x (Low)"
        Low = 0x00,
        //% block="25x (Medium)"
        Medium = 0x10,
        //% block="428x (High)"
        High = 0x20,
        //% block="9876x (Max)"
        Max = 0x30
    }

    export enum IntegrationTime {
        //% block="100ms"
        ms100 = 0x00,
        //% block="200ms"
        ms200 = 0x01,
        //% block="300ms"
        ms300 = 0x02,
        //% block="400ms"
        ms400 = 0x03,
        //% block="500ms"
        ms500 = 0x04,
        //% block="600ms"
        ms600 = 0x05
    }

    function writeRegister(reg: number, val: number): void {
        let word = ((COMMAND_BIT | reg) << 8) | val;
        pins.i2cWriteNumber(TSL2591_ADDR, word, NumberFormat.UInt16BE, false);
    }

    function readRegister16(reg: number): number {
        pins.i2cWriteNumber(TSL2591_ADDR, COMMAND_BIT | reg, NumberFormat.UInt8BE, true);
        return pins.i2cReadNumber(TSL2591_ADDR, NumberFormat.UInt16LE, false);
    }

    // Auto-initializes sensor with default settings if not already run
    function autoInit(): void {
        if (!isInitialized) {
            init(Gain.Medium, IntegrationTime.ms100);
        }
    }

    /**
     * Initialize the TSL2591 sensor manually with custom settings.
     */
    //% blockId="tsl2591_init" block="initialize TSL2591 | gain %gain | integration time %time"
    //% gain.defl=tsl2591.Gain.Medium
    //% time.defl=tsl2591.IntegrationTime.ms100
    //% weight=100
    export function init(gain: Gain = Gain.Medium, time: IntegrationTime = IntegrationTime.ms100): void {
        writeRegister(0x00, 0x03);
        writeRegister(0x01, gain | time);
        isInitialized = true;
    }

    /**
     * Read total light intensity in Lux.
     */
    //% blockId="tsl2591_read_lux" block="TSL2591 read lux"
    //% weight=90
    export function readLux(): number {
        autoInit();
        let ch0 = readRegister16(0x14);
        let ch1 = readRegister16(0x16);
        let cpl = (100 * 25) / 408;
        let lux = (ch0 - 1.64 * ch1) / cpl;
        return Math.max(0, Math.round(lux));
    }

    /**
     * Read estimated visible light level.
     */
    //% blockId="tsl2591_read_visible" block="TSL2591 read visible light"
    //% weight=80
    export function readVisible(): number {
        autoInit();
        let ch02 = readRegister16(0x14);
        let ch12 = readRegister16(0x16);
        return Math.max(0, ch02 - ch12);
    }

    /**
     * Read raw Full Spectrum channel (CH0).
     */
    //% blockId="tsl2591_read_full" block="TSL2591 read full spectrum (CH0)"
    //% weight=70
    //% advanced=true
    export function readFullSpectrum(): number {
        autoInit();
        return readRegister16(0x14);
    }

    /**
     * Read raw Infrared channel (CH1).
     */
    //% blockId="tsl2591_read_ir" block="TSL2591 read infrared (CH1)"
    //% weight=60
    //% advanced=true
    export function readInfrared(): number {
        autoInit();
        return readRegister16(0x16);
    }
}

