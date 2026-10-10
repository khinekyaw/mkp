declare module "myanmar-tools" {
  export class ZawgyiDetector {
    /** 0–1 probability that the text is Zawgyi-encoded; -Infinity when it has no Myanmar characters. */
    getZawgyiProbability(text: string): number;
  }
  export class ZawgyiConverter {
    zawgyiToUnicode(text: string): string;
    unicodeToZawgyi(text: string): string;
  }
}
