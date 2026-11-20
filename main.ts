//% color=#e6a100 icon="" block="TSL2591"
namespace tsl2591 {
    const TSL2591_ADDR = 0x29;
    const COMMAND_BIT = 0xA0;
    const REG_ENABLE = 0x00;
    const REG_CONTROL = 0x01;
    const REG_ID = 0x12;
    const REG_C0DATAL = 0x14;
    const REG_C1DATAL = 0x16;

    let isInitialized = false;
    let currentGain = 0x10;
    let currentTime = 0x00;

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

    function readRegister8(reg: number): number {
        pins.i2cWriteNumber(TSL2591_ADDR, COMMAND_BIT | reg, NumberFormat.UInt8BE, true);
        return pins.i2cReadNumber(TSL2591_ADDR, NumberFormat.UInt8BE, false);
    }

    function readRegister16(reg: number): number {
        pins.i2cWriteNumber(TSL2591_ADDR, COMMAND_BIT | reg, NumberFormat.UInt8BE, true);
        return pins.i2cReadNumber(TSL2591_ADDR, NumberFormat.UInt16LE, false);
    }

    function gainMultiplier(): number {
        if (currentGain == Gain.Low) return 1;
        if (currentGain == Gain.Medium) return 25;
        if (currentGain == Gain.High) return 428;
        return 9876;
    }

    function integrationMs(): number {
        return (currentTime + 1) * 100;
    }

    // Highest count the ADC can reach before it is saturated
    function maxCount(): number {
        return currentTime == IntegrationTime.ms100 ? 36863 : 65535;
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
        currentGain = gain;
        currentTime = time;
        writeRegister(REG_ENABLE, 0x03);          // power on + light sensor enable
        writeRegister(REG_CONTROL, gain | time);
        isInitialized = true;
        // Wait for the first measurement to finish, otherwise the first reading is 0
        basic.pause(integrationMs() + 20);
    }

    /**
     * Read total light intensity in Lux.
     * Returns -1 if the sensor is saturated (too bright for the current gain).
     */
    //% blockId="tsl2591_read_lux" block="TSL2591 read lux"
    //% weight=90
    export function readLux(): number {
        autoInit();
        let ch0 = readRegister16(REG_C0DATAL);
        let ch1 = readRegister16(REG_C1DATAL);
        if (ch0 >= maxCount() || ch1 >= maxCount()) {
            return -1;
        }
        if (ch0 == 0) {
            return 0;
        }
        // Same lux formula as the Adafruit TSL2591 library
        let cpl = (integrationMs() * gainMultiplier()) / 408;
        let lux = (ch0 - ch1) * (1 - ch1 / ch0) / cpl;
        return Math.max(0, Math.round(lux * 100) / 100);
    }

    /**
     * Read estimated visible light level.
     */
    //% blockId="tsl2591_read_visible" block="TSL2591 read visible light"
    //% weight=80
    export function readVisible(): number {
        autoInit();
        let ch0 = readRegister16(REG_C0DATAL);
        let ch1 = readRegister16(REG_C1DATAL);
        return Math.max(0, ch0 - ch1);
    }

    /**
     * Read raw Full Spectrum channel (CH0).
     */
    //% blockId="tsl2591_read_full" block="TSL2591 read full spectrum (CH0)"
    //% weight=70
    //% advanced=true
    export function readFullSpectrum(): number {
        autoInit();
        return readRegister16(REG_C0DATAL);
    }

    /**
     * Read raw Infrared channel (CH1).
     */
    //% blockId="tsl2591_read_ir" block="TSL2591 read infrared (CH1)"
    //% weight=60
    //% advanced=true
    export function readInfrared(): number {
        autoInit();
        return readRegister16(REG_C1DATAL);
    }

    /**
     * Read the chip ID. A working TSL2591 returns 80 (0x50).
     * 0 means the sensor is not answering on I2C.
     */
    //% blockId="tsl2591_read_id" block="TSL2591 chip ID"
    //% weight=50
    //% advanced=true
    export function readID(): number {
        return readRegister8(REG_ID);
    }
}
