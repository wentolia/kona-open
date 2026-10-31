// ピッチだけを変える（速さはそのまま）。遅延線を 2 つの読み出し口で、ずらした速さで読み、
// 継ぎ目が聞こえないよう、半周期ずらした 2 つを sin² の窓で重ねる（足すと常に 1）
const WINDOW = 0.06; // 秒。長いほど音程は安定し、短いほど遅れが少ない

class KonaPitch extends AudioWorkletProcessor {
  static get parameterDescriptors() { return [{ name: "ratio", defaultValue: 1, minValue: 0.25, maxValue: 4, automationRate: "k-rate" }]; }
  constructor() {
    super();
    this.size = Math.round(sampleRate * WINDOW);
    this.len = 1; while (this.len < this.size * 2 + 4) this.len <<= 1;
    this.mask = this.len - 1;
    this.bufs = [];
    this.w = 0;
    this.phase = 0;
  }
  read(buf, pos) {
    const i = Math.floor(pos), f = pos - i;
    return buf[i & this.mask] * (1 - f) + buf[(i + 1) & this.mask] * f;
  }
  process(inputs, outputs, params) {
    const input = inputs[0], output = outputs[0];
    const ratio = params.ratio[0], n = output[0].length, size = this.size;
    while (this.bufs.length < output.length) this.bufs.push(new Float32Array(this.len));
    const step = (1 - ratio) / size;
    for (let s = 0; s < n; s++) {
      let p = this.phase + step;
      p -= Math.floor(p);
      this.phase = p;
      const q = p + 0.5 - Math.floor(p + 0.5);
      const g1 = Math.sin(Math.PI * p) ** 2, g2 = 1 - g1;
      const w = this.w;
      for (let c = 0; c < output.length; c++) {
        const buf = this.bufs[c], src = input[c] ?? input[0];
        buf[w] = src ? src[s] : 0;
        const r1 = w - p * size - 1 + this.len, r2 = w - q * size - 1 + this.len;
        output[c][s] = this.read(buf, r1) * g1 + this.read(buf, r2) * g2;
      }
      this.w = (w + 1) & this.mask;
    }
    return true;
  }
}
registerProcessor("kona-pitch", KonaPitch);
