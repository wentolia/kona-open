// リスニングパーティーの通話: 曲と同じ WebRTC の接続に、声の通り道（音声の 2 本目）を足す。
//  - つなぎ方はホストを真ん中にした星形のまま。ホストは、届いた声と自分の声を混ぜて、その人以外の声を一人ずつに送り返す
//  - 話せるかどうかはホストが決める（権限の「通話」）。話せない人の声は、ホストのところで止める
//  - マイクは本人が入れたときだけ開く。入れ方は「オン／ミュートの切り替え」と「押している間だけ」
//  - 誰かが話している間は、曲を少し下げて声を聞き取りやすくする（参加者の手元の音で）

const MIC: MediaTrackConstraints = { echoCancellation: true, noiseSuppression: true, autoGainControl: true };
const TALK = 0.008;  // 話していると見なす声の大きさ（RMS）

async function openMic(): Promise<MediaStream | undefined> {
  try { return await navigator.mediaDevices.getUserMedia({ audio: MIC }); } catch { return undefined; }
}
function rms(a: AnalyserNode, buf: Float32Array<ArrayBuffer>) {
  a.getFloatTimeDomainData(buf);
  let n = 0; for (const v of buf) n += v * v;
  return Math.sqrt(n / buf.length);
}
// 受け取った WebRTC の音は、audio 要素で流しておかないと WebAudio に届かないことがある（音は出さない）
function keepFlowing(stream: MediaStream) {
  const el = new Audio(); el.muted = true; el.srcObject = stream; el.play().catch(() => {});
  return el;
}

interface HostPeer { dest: MediaStreamAudioDestinationNode; gate?: GainNode; src?: MediaStreamAudioSourceNode; el?: HTMLAudioElement; meter?: AnalyserNode }

/** ホスト: 声を混ぜて配る */
export class HostVoice {
  private ac?: AudioContext;
  private peers = new Map<string, HostPeer>();
  private mic?: MediaStream;
  private micGain?: GainNode;
  private micMeter?: AnalyserNode;
  private buf = new Float32Array(512);
  private ctx() { if (!this.ac) this.ac = new AudioContext(); if (this.ac.state === "suspended") this.ac.resume().catch(() => {}); return this.ac; }

  /** 新しい人の送り口（その人に届ける声の混ぜ先） */
  addPeer(cid: string, sender: RTCRtpSender) {
    const ac = this.ctx(), dest = ac.createMediaStreamDestination();
    sender.replaceTrack(dest.stream.getAudioTracks()[0]).catch(() => {});
    this.micGain?.connect(dest);
    for (const p of this.peers.values()) p.gate?.connect(dest);
    this.peers.set(cid, { dest });
  }
  /** その人から届いた声。ほかの人とホストに流す（話せない人は止める） */
  incoming(cid: string, track: MediaStreamTrack, allowed: boolean) {
    const p = this.peers.get(cid);
    if (!p) return;
    const ac = this.ctx(), stream = new MediaStream([track]);
    p.gate?.disconnect(); p.src?.disconnect(); p.el?.pause();
    p.el = keepFlowing(stream);
    p.src = ac.createMediaStreamSource(stream);
    p.gate = ac.createGain(); p.gate.gain.value = allowed ? 1 : 0;
    p.meter = ac.createAnalyser(); p.meter.fftSize = 512;
    p.src.connect(p.gate);
    p.gate.connect(p.meter);
    p.gate.connect(ac.destination);
    for (const [id, o] of this.peers) if (id !== cid) p.gate.connect(o.dest);
  }
  allow(cid: string, on: boolean) { const g = this.peers.get(cid)?.gate; if (g && this.ac) g.gain.setTargetAtTime(on ? 1 : 0, this.ac.currentTime, .02); }
  removePeer(cid: string) {
    const p = this.peers.get(cid);
    if (!p) return;
    p.gate?.disconnect(); p.src?.disconnect(); p.el?.pause();
    this.micGain?.disconnect(p.dest);
    for (const o of this.peers.values()) try { o.gate?.disconnect(p.dest); } catch { /* つないでいない */ }
    this.peers.delete(cid);
  }
  /** ホストのマイク。入れられなかったら false */
  async setMic(on: boolean): Promise<boolean> {
    if (on && !this.mic) {
      this.mic = await openMic();
      if (!this.mic) return false;
      const ac = this.ctx(), src = ac.createMediaStreamSource(this.mic);
      this.micGain = ac.createGain(); this.micGain.gain.value = 0;
      this.micMeter = ac.createAnalyser(); this.micMeter.fftSize = 512;
      src.connect(this.micGain); this.micGain.connect(this.micMeter);
      for (const p of this.peers.values()) this.micGain.connect(p.dest);
    }
    if (this.micGain && this.ac) this.micGain.gain.setTargetAtTime(on ? 1 : 0, this.ac.currentTime, .015);
    return true;
  }
  /** いま話している人（"h" はホスト） */
  talking(): string[] {
    const out: string[] = [];
    if (this.micMeter && rms(this.micMeter, this.buf) > TALK) out.push("h");
    for (const [id, p] of this.peers) if (p.meter && rms(p.meter, this.buf) > TALK) out.push(id);
    return out;
  }
  close() {
    for (const id of [...this.peers.keys()]) this.removePeer(id);
    this.mic?.getTracks().forEach(t => t.stop()); this.mic = undefined; this.micGain = undefined; this.micMeter = undefined;
    this.ac?.close().catch(() => {}); this.ac = undefined;
  }
}

/** 参加者: 自分の声を送り、ほかの人の声を聞く */
export class GuestVoice {
  private sender?: RTCRtpSender;
  private mic?: MediaStream;
  private el?: HTMLAudioElement;
  private ac?: AudioContext;
  private meter?: AnalyserNode;
  private buf = new Float32Array(512);
  private duckT = 0;
  private lastTalk = 0;
  /** 曲を下げる割合（1 はそのまま）。変わったら onDuck を呼ぶ */
  duck = 1;
  onDuck?: () => void;

  setSender(s: RTCRtpSender) { this.sender = s; }
  /** ほかの人の声（ホストが混ぜたもの）を鳴らす。出力先はこの端末の出力先 */
  hear(track: MediaStreamTrack, sink: string) {
    const stream = new MediaStream([track]);
    this.el?.pause();
    this.el = new Audio(); this.el.autoplay = true; this.el.srcObject = stream;
    this.setSink(sink);
    this.el.play().catch(() => {});
    try {
      this.ac?.close().catch(() => {});
      this.ac = new AudioContext();
      this.meter = this.ac.createAnalyser(); this.meter.fftSize = 512;
      this.ac.createMediaStreamSource(stream).connect(this.meter);
    } catch { /* 曲を下げられないだけ */ }
    clearInterval(this.duckT);
    this.duckT = window.setInterval(() => this.watch(), 120);
  }
  setSink(sink: string) {
    const a = this.el as (HTMLAudioElement & { setSinkId?: (id: string) => Promise<void>; sinkId?: string }) | undefined;
    if (a?.setSinkId && a.sinkId !== sink) a.setSinkId(sink).catch(() => {});
  }
  /** 止められた音（自動再生の決まり）を、操作のあとに鳴らし直す */
  resume() { this.el?.play().catch(() => {}); if (this.ac?.state === "suspended") this.ac.resume().catch(() => {}); }
  // 誰かが話している間は曲を下げ、話し終えて少したったら戻す
  private watch() {
    if (!this.meter) return;
    const now = performance.now();
    if (rms(this.meter, this.buf) > TALK) this.lastTalk = now;
    const want = now - this.lastTalk < 700 ? .45 : 1;
    if (want !== this.duck) { this.duck = want; this.onDuck?.(); }
  }
  /** 自分のマイク。入れられなかったら false */
  async setMic(on: boolean): Promise<boolean> {
    if (on && !this.mic) {
      this.mic = await openMic();
      if (!this.mic) return false;
    }
    const t = this.mic?.getAudioTracks()[0];
    if (!t || !this.sender) return !on;
    t.enabled = on;
    if (this.sender.track !== t) await this.sender.replaceTrack(t).catch(() => {});
    return true;
  }
  close() {
    clearInterval(this.duckT); this.duckT = 0;
    this.mic?.getTracks().forEach(t => t.stop()); this.mic = undefined;
    this.el?.pause(); this.el = undefined;
    this.ac?.close().catch(() => {}); this.ac = undefined; this.meter = undefined;
    this.duck = 1; this.sender = undefined;
  }
}
