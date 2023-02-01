export function unpackKorg(packed: Uint8Array, startIndex: number, endIndex: number = packed.length): number[] {
    let result: number[] = []

    let i
    for (i = startIndex; i < endIndex; i += 8) {

        for (let j = 0; j < 7; j++) {
            const topBit = ((packed[i] & (0x1 << j)) != 0) ? 0x80 : 0
            
            if (j + i + 1 < endIndex) {
                result.push(packed[j+i+1] | topBit)
            }
        }
    }

    return result
}

export function packKorg(unpacked: number[]): number[] {
    let result: number[] = []

    let i
    for (i = 0; i < unpacked.length; i += 7) {
        let dataSet: number[] = []
        let topbitByte = 0

        for (let j = 0; j < 7; j++) {
            if (i+j < unpacked.length) {
                let incoming = unpacked[i + j]
                if ((incoming & 0x80) != 0) {
                    topbitByte |= 0x1 << j
                    incoming &= 0x7f
                }
                dataSet.push(incoming)
            }
        }

        result.push(topbitByte)
        result.push(...dataSet)
    }

    return result
}