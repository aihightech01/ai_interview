<%@ page language="java" contentType="text/html; charset=UTF-8"
    pageEncoding="UTF-8" isELIgnored="true"%>
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <title>화면(캔버스) + 마이크 녹화 → Spring 업로드 (WebAudio 믹싱)</title>
  <style>
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; padding: 20px; }
    h2 { margin-bottom: 12px; }
    .row { display: flex; gap: 24px; flex-wrap: wrap; }
    .col { flex: 1 1 360px; min-width: 360px; }
    canvas { border: 1px solid #333; max-width: 100%; background: #111; }
    video { max-width: 100%; background: #000; }
    .controls { margin: 12px 0; display: flex; gap: 8px; flex-wrap: wrap; }
    button { padding: 8px 14px; border: 1px solid #ccc; border-radius: 6px; background: #f6f6f6; cursor: pointer; }
    button[disabled] { opacity: 0.5; cursor: not-allowed; }
    .status { margin-top: 8px; color: #444; min-height: 1.4em; }
    .hint { color: #666; font-size: 0.92rem; }
    .meterWrap { margin-top: 8px; }
    #meter { width: 640px; height: 12px; display: block; background:#222; border:1px solid #444; }
  </style>
</head>
<body>
  <h2>🎥 캔버스(화면) + 마이크 녹화 → Spring 업로드</h2>

  <!-- 카메라 프리뷰(음소거). 캔버스에 복사하여 "화면"처럼 사용 -->
  <video id="cam" autoplay playsinline muted style="display:none;"></video>

  <div class="row">
    <div class="col">
      <h3>캔버스(녹화 대상)</h3>
      <canvas id="canvas" width="640" height="480"></canvas>
      <div class="hint">※ 이 캔버스의 영상 + 마이크 오디오가 하나로 녹화됩니다.</div>

      <div class="meterWrap">
        <div class="hint">마이크 입력 레벨</div>
        <canvas id="meter" width="640" height="12"></canvas>
      </div>

      <div>
        <label for="inputText">내용 입력:</label><br />
        <textarea id="inputText" rows="3" style="width:100%;" placeholder="녹화 관련 텍스트를 작성하세요"></textarea>
      </div>

      <div class="controls">
        <button id="startBtn" disabled>녹화 시작 🎬</button>
        <button id="stopBtn" disabled>녹화 종료 ⏹️</button>
        <button id="downloadBtn" disabled>로컬 저장 ⤵️</button>
        <button id="reinitBtn">카메라 다시잡기 ♻️</button>
      </div>
      <div class="status" id="status">대기 중…</div>
    </div>

    <div class="col">
      <h3>녹화 미리보기</h3>
      <video id="preview" controls></video>
      <div class="hint">※ 업로드 전 여기서 소리/영상이 정상인지 먼저 확인해 보세요.</div>
    </div>
  </div>

  <script>
    // ====== 전역 참조 ======
    const camVideo   = document.getElementById('cam');
    const canvas     = document.getElementById('canvas');
    const ctx        = canvas.getContext('2d');
    const meterCV    = document.getElementById('meter');
    const meterCtx   = meterCV.getContext('2d');

    const startBtn   = document.getElementById('startBtn');
    const stopBtn    = document.getElementById('stopBtn');
    const downloadBtn= document.getElementById('downloadBtn');
    const reinitBtn  = document.getElementById('reinitBtn');
    const statusEl   = document.getElementById('status');
    const previewEl  = document.getElementById('preview');
    const inputText  = document.getElementById('inputText');

    const userName   = 'user_name'; // 필요 시 서버 세션/EL로 교체

    // 스트림/레코더
    let camStream;        // 카메라+마이크 원본 스트림
    let canvasStream;     // 캔버스 비디오 스트림
    let mixedStream;      // (캔버스 비디오) + (WebAudio 믹싱 오디오)
    let mediaRecorder;
    let recordedChunks = [];
    let chosenMimeType = '';

    let drawReqId = null;
    let meterReqId = null;
    let objectUrlForPreview = null;

    // WebAudio
    let audioCtx, micSource, gainNode, analyser, destNode;

    // ====== 유틸 ======
    function logStatus(msg) { console.log('[STATUS]', msg); statusEl.textContent = msg; }
    function nowParts() {
      const d = new Date();
      return {
        yyyy: d.getFullYear(),
        mm: String(d.getMonth()+1).padStart(2,'0'),
        dd: String(d.getDate()).padStart(2,'0'),
        hh: String(d.getHours()).padStart(2,'0'),
        mi: String(d.getMinutes()).padStart(2,'0'),
        ss: String(d.getSeconds()).padStart(2,'0'),
      };
    }
    function isSecureContextOk() {
      return location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    }
    function isSafari() {
      return /^((?!chrome|chromium|android).)*safari/i.test(navigator.userAgent);
    }
    function pickSupportedMimeType() {
      const candidates = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm', // Chrome/Edge
        'video/mp4;codecs=avc1.42E01E,mp4a.40.2', // Safari 계열
        'video/mp4'
      ];
      for (const t of candidates) {
        if (window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) return t;
      }
      return '';
    }
    function extFromMime(mime) { return (mime && mime.includes('mp4')) ? 'mp4' : 'webm'; }
    function revokePreviewUrl() {
      if (objectUrlForPreview) { URL.revokeObjectURL(objectUrlForPreview); objectUrlForPreview = null; }
    }

    // ====== 오디오 레벨 미터 ======
    function startMeter() {
      if (!analyser) return;
      const buffer = new Uint8Array(analyser.fftSize);
      const W = meterCV.width, H = meterCV.height;

      function loop() {
        analyser.getByteTimeDomainData(buffer);
        // RMS 계산
        let sum = 0;
        for (let i=0;i<buffer.length;i++) {
          const v = (buffer[i]-128)/128;
          sum += v*v;
        }
        const rms = Math.sqrt(sum / buffer.length);
        const level = Math.min(1, rms * 3); // 0~1 스케일

        meterCtx.clearRect(0,0,W,H);
        // 바탕
        meterCtx.fillStyle = '#2c2c2c';
        meterCtx.fillRect(0,0,W,H);
        // 레벨
        meterCtx.fillStyle = level > 0.7 ? '#ff4d4f' : (level > 0.4 ? '#fadb14' : '#52c41a');
        meterCtx.fillRect(0,0,Math.floor(W*level),H);

        meterReqId = requestAnimationFrame(loop);
      }
      loop();
    }
    function stopMeter() {
      if (meterReqId) { cancelAnimationFrame(meterReqId); meterReqId = null; }
      meterCtx.clearRect(0,0,meterCV.width,meterCV.height);
    }

    // ====== 초기화(카메라+마이크) & 캔버스 드로잉 & WebAudio 믹싱 ======
    async function initAll() {
      // 정리
      revokePreviewUrl();
      previewEl.removeAttribute('src'); previewEl.load();
      stopMeter();

      if (camStream) { camStream.getTracks().forEach(t=>t.stop()); camStream=null; }
      if (canvasStream) { canvasStream.getTracks().forEach(t=>t.stop()); canvasStream=null; }
      if (mixedStream) { mixedStream.getTracks().forEach(t=>t.stop()); mixedStream=null; }
      if (drawReqId) { cancelAnimationFrame(drawReqId); drawReqId=null; }
      if (audioCtx) { try { audioCtx.close(); } catch(_){} audioCtx=null; }

      if (!isSecureContextOk()) {
        alert('마이크 권한은 HTTPS 또는 localhost에서만 동작합니다.');
        logStatus('보안 컨텍스트 아님(HTTPS/localhost 필요)');
        return;
      }

      try {
        logStatus('카메라/마이크 권한 요청 중…');
        camStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 } },
          audio: { echoCancellation:true, noiseSuppression:true, autoGainControl:true }
        });

        const aTrack = camStream.getAudioTracks()[0];
        console.log('Audio track label:', aTrack?.label, 'enabled?', aTrack?.enabled, 'muted?', aTrack?.muted);
        if (!aTrack) {
          logStatus('⚠️ 마이크 트랙이 없습니다. OS/브라우저 권한 및 입력 장치를 확인하세요.');
        } else {
          aTrack.onmute   = () => console.warn('[AUDIO] track muted');
          aTrack.onunmute = () => console.warn('[AUDIO] track unmuted');
          aTrack.onended  = () => console.warn('[AUDIO] track ended');
        }

        // 카메라 프리뷰 → 캔버스 복사
        camVideo.srcObject = camStream;
        await camVideo.play().catch(()=>{});
        function drawLoop() {
          try { ctx.drawImage(camVideo, 0, 0, canvas.width, canvas.height); } catch(_) {}
          drawReqId = requestAnimationFrame(drawLoop);
        }
        drawLoop();

        // 캔버스 비디오 스트림
        canvasStream = canvas.captureStream(30);

        // WebAudio 컨텍스트로 마이크 오디오를 안정적으로 믹싱
        audioCtx  = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 48000, latencyHint: 'interactive' });
        micSource = audioCtx.createMediaStreamSource(camStream);
        gainNode  = audioCtx.createGain();     // 필요 시 음량 조절
        gainNode.gain.value = 1.0;

        analyser  = audioCtx.createAnalyser();
        analyser.fftSize = 2048;

        destNode  = audioCtx.createMediaStreamDestination(); // 이 노드의 stream 오디오 트랙을 사용

        // 체인: mic → gain → (analyser & dest)
        micSource.connect(gainNode);
        gainNode.connect(destNode);
        gainNode.connect(analyser);

        // 최종 믹스: (비디오=캔버스) + (오디오=destNode.stream)
        mixedStream = new MediaStream([
          ...canvasStream.getVideoTracks(),
          ...destNode.stream.getAudioTracks()
        ]);

        // 레벨 미터 시작
        startMeter();

        logStatus('초기화 완료. 녹화를 시작할 수 있습니다.');
      } catch (err) {
        console.error(err);
        alert('카메라/마이크 접근 실패: ' + err);
        logStatus('카메라/마이크 접근 실패');
      }
    }

    // ====== 녹화 시작 버튼 활성화 제어 ======
    function updateStartBtnState() {
      startBtn.disabled = !inputText.value.trim();
    }
    updateStartBtnState();
    inputText.addEventListener('input', updateStartBtnState);

    // ====== 레코더 설정/제어 ======
    function setupRecorder() {
      chosenMimeType = pickSupportedMimeType();

      // Safari는 사용자 제스처 이후에만 오디오 재생/처리가 가능한 경우가 많습니다.
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().catch(()=>{});
      }

      const options = chosenMimeType ? { mimeType: chosenMimeType } : {};
      console.log('Selected mimeType:', chosenMimeType || '(browser default)');

      recordedChunks = [];
      mediaRecorder = new MediaRecorder(mixedStream, options);

      mediaRecorder.ondataavailable = e => {
        if (e.data && e.data.size > 0) recordedChunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const finalMime = chosenMimeType || mediaRecorder.mimeType || 'video/webm';
        const blob = new Blob(recordedChunks, { type: finalMime });
        const ext  = extFromMime(finalMime);

        // 미리보기
        revokePreviewUrl();
        objectUrlForPreview = URL.createObjectURL(blob);
        previewEl.src = objectUrlForPreview;
        previewEl.style.display = 'block';
        previewEl.load();

        // 다운로드 버튼
        downloadBtn.disabled = false;
        downloadBtn.onclick = () => {
          const a = document.createElement('a');
          const { yyyy, mm, dd, hh, mi, ss } = nowParts();
          a.href = objectUrlForPreview;
          a.download = `${userName}_${yyyy}${mm}${dd}_${hh}${mi}${ss}.${ext}`;
          document.body.appendChild(a);
          a.click();
          a.remove();
        };

        // 서버 업로드 (텍스트 포함)
        uploadToServer(blob, ext);
      };
    }

    function startRecording() {
      if (!mixedStream) { alert('스트림 준비 실패. 다시 초기화하세요.'); return; }
      setupRecorder();
      mediaRecorder.start(1000); // 1초 타임슬라이스
      startBtn.disabled = true;
      stopBtn.disabled = false;
      reinitBtn.disabled = true;
      downloadBtn.disabled = true;
      logStatus('녹화 중… (오디오+비디오)');
    }

    function stopRecording() {
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
        startBtn.disabled = false;
        stopBtn.disabled = true;
        reinitBtn.disabled = false;
        logStatus('녹화 종료. 업로드 중…');
      }
    }

    // ====== 업로드 ======
    function uploadToServer(blob, ext) {
      const formData = new FormData();
      const { yyyy, mm, dd, hh, mi, ss } = nowParts();
      const fileName = `${userName}_${yyyy}${mm}${dd}_${hh}${mi}${ss}.${ext}`;
      formData.append('file', blob, fileName);

      // 텍스트 추가
      formData.append('text', inputText.value.trim());

      fetch('/uploadVideo', { method: 'POST', body: formData })
        .then(res => { if (!res.ok) throw new Error('서버 응답 오류: ' + res.status); return res.text(); })
        .then(text => { logStatus('✅ 업로드 성공: ' + (text || '성공')); })
        .catch(err => { console.error(err); logStatus('❌ 업로드 실패: ' + err.message); alert('업로드 실패: ' + err.message); });
    }

    // ====== 이벤트 바인딩 & 시작 ======
    startBtn.addEventListener('click', startRecording);
    stopBtn.addEventListener('click', stopRecording);
    reinitBtn.addEventListener('click', () => { initAll(); });

    window.addEventListener('load', () => {
      if (!('MediaRecorder' in window)) {
        alert('이 브라우저는 MediaRecorder를 지원하지 않습니다.');
        logStatus('MediaRecorder 미지원');
        return;
      }
      initAll();
    });
  </script>
</body>
</html>
