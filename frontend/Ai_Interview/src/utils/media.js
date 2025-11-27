export async function getDevices() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  return {
    cams:  devices.filter(d => d.kind === "videoinput"),
    mics:  devices.filter(d => d.kind === "audioinput"),
    outs:  devices.filter(d => d.kind === "audiooutput"),
  };
}

export async function openStream({video=true, audio=true}) {
  return navigator.mediaDevices.getUserMedia({ video, audio });
}

// 간단한 마이크 레벨 미터
export function createMicMeter(stream, onLevel) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const src = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 2048;
  const data = new Uint8Array(analyser.frequencyBinCount);
  src.connect(analyser);

  let raf;
  const tick = () => {
    analyser.getByteTimeDomainData(data);
    // 0~1 RMS 근사
    let sum = 0; for (let i=0;i<data.length;i++){ const v=(data[i]-128)/128; sum += v*v; }
    onLevel?.(Math.sqrt(sum/data.length));
    raf = requestAnimationFrame(tick);
  };
  tick();
  return () => { cancelAnimationFrame(raf); ctx.close(); };
}
