import { VideoExtensionOptions } from 'wam-extensions';

export function videoOptionsEqual(lhs: VideoExtensionOptions | undefined, rhs: VideoExtensionOptions | undefined): boolean {
    if ((!lhs && !!rhs) || (!!lhs && !rhs)) {
        return false
    }
    if (!lhs && !rhs) {
        return true
    }
    
    return lhs.gl == rhs.gl && lhs.height == rhs.height && lhs.width == rhs.width
}