import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  SwitchCamera,
  ArrowLeft,
  ImagePlus,
  AlertTriangle,
  Wand2,
  CheckCircle2,
} from 'lucide-react';
import { FaceMetrics } from '../types/fortune';
import {
  checkIsFaceFrontal,
  drawMysticalOverlay,
  extractFaceMetrics,
  getVideoFaceLandmarker,
} from '../lib/faceAnalyzer';

interface CameraScannerProps {
  userName: string;
  onComplete: (metrics: FaceMetrics) => void;
  onCancel: () => void;
  onUploadPhoto: (file: File) => void;
  onTryDemo: () => void;
}

const SCAN_DURATION_MS = 5000; // 정확히 5초 동안 정면 유지

export const CameraScanner: React.FC<CameraScannerProps> = ({
  userName,
  onComplete,
  onCancel,
  onUploadPhoto,
  onTryDemo,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [statusText, setStatusText] = useState('카메라와 얼굴 인식 모델 준비 중...');
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  const [faceDetected, setFaceDetected] = useState(false);
  const [isFrontal, setIsFrontal] = useState(false);
  const [guideMessage, setGuideMessage] = useState('화면 중앙 가이드 안에 얼굴을 맞춰주세요');
  const [scanProgress, setScanProgress] = useState(0);
  const [countdownSec, setCountdownSec] = useState<number | null>(null);

  const [liveSmile, setLiveSmile] = useState<number | null>(null);
  const [liveVitality, setLiveVitality] = useState<number | null>(null);

  const latestMetricsRef = useRef<FaceMetrics | null>(null);
  const completedRef = useRef(false);
  const frontalStartTimeRef = useRef<number | null>(null);

  const captureSnapshot = useCallback(
    (isMirrored: boolean): string | undefined => {
      const video = videoRef.current;
      if (!video || video.videoWidth === 0) return undefined;

      const size = 260;
      const off = document.createElement('canvas');
      off.width = size;
      off.height = size;
      const ctx = off.getContext('2d');
      if (!ctx) return undefined;

      const vw = video.videoWidth;
      const vh = video.videoHeight;
      const minSide = Math.min(vw, vh);
      const sx = (vw - minSide) / 2;
      const sy = (vh - minSide) / 2;

      ctx.save();
      if (isMirrored) {
        ctx.translate(size, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, sx, sy, minSide, minSide, 0, 0, size, size);
      ctx.restore();
      return off.toDataURL('image/jpeg', 0.85);
    },
    []
  );

  const finalizeScan = useCallback(
    (metrics: FaceMetrics) => {
      if (completedRef.current) return;
      completedRef.current = true;
      const snapshot = captureSnapshot(facingMode === 'user');
      onComplete({
        ...metrics,
        snapshotDataUrl: snapshot,
      });
    },
    [captureSnapshot, facingMode, onComplete]
  );

  useEffect(() => {
    let active = true;
    let stream: MediaStream | null = null;
    let rafId = 0;
    let lastVideoTime = -1;

    completedRef.current = false;
    frontalStartTimeRef.current = null;
    setScanProgress(0);
    setCountdownSec(null);
    setFaceDetected(false);
    setIsFrontal(false);
    setStatus('loading');
    setErrorDetail(null);
    setStatusText('스마트폰 카메라와 얼굴 인식 엔진을 여는 중...');

    async function init() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error(
            '이 브라우저 환경에서는 카메라를 열 수 없습니다. 사진 업로드 기능을 이용해 주세요.'
          );
        }

        const [mediaStream, landmarker] = await Promise.all([
          navigator.mediaDevices.getUserMedia({
            video: {
              facingMode,
              width: { ideal: 720 },
              height: { ideal: 960 },
            },
            audio: false,
          }),
          getVideoFaceLandmarker(),
        ]);

        if (!active) {
          mediaStream.getTracks().forEach((t) => t.stop());
          return;
        }

        stream = mediaStream;
        const video = videoRef.current;
        if (!video) return;

        video.srcObject = mediaStream;
        await video.play();

        if (!active) return;
        setStatus('ready');
        setStatusText('얼굴 인식 대기 중');

        const loop = () => {
          if (!active || completedRef.current) return;

          const v = videoRef.current;
          const canvas = canvasRef.current;
          if (v && canvas && v.readyState >= 2 && v.videoWidth > 0) {
            if (v.currentTime !== lastVideoTime) {
              lastVideoTime = v.currentTime;

              const rect = canvas.getBoundingClientRect();
              const dpr = Math.min(window.devicePixelRatio || 1, 2);
              const cw = Math.max(1, Math.round(rect.width * dpr));
              const ch = Math.max(1, Math.round(rect.height * dpr));
              if (canvas.width !== cw || canvas.height !== ch) {
                canvas.width = cw;
                canvas.height = ch;
              }

              const ctx = canvas.getContext('2d');
              const now = performance.now();
              const result = landmarker.detectForVideo(v, now);

              if (result.faceLandmarks && result.faceLandmarks.length > 0 && ctx) {
                const landmarks = result.faceLandmarks[0];
                const blendshapes = result.faceBlendshapes?.[0]?.categories;

                const frontalCheck = checkIsFaceFrontal(landmarks);
                const metrics = extractFaceMetrics(
                  landmarks,
                  blendshapes,
                  v.videoWidth,
                  v.videoHeight
                );
                latestMetricsRef.current = metrics;
                setFaceDetected(true);
                setLiveSmile(metrics.smileScore);
                setLiveVitality(metrics.vitalityScore);

                if (frontalCheck.isFrontal) {
                  // 정면이 정확하게 포착되었을 때 5초 타이머 동작
                  setIsFrontal(true);
                  if (frontalStartTimeRef.current === null) {
                    frontalStartTimeRef.current = now;
                  }
                  const elapsed = now - frontalStartTimeRef.current;
                  const progress = Math.min(1, elapsed / SCAN_DURATION_MS);
                  const remaining = Math.max(1, Math.ceil((SCAN_DURATION_MS - elapsed) / 1000));

                  setScanProgress(progress);
                  setCountdownSec(remaining);
                  setGuideMessage(`정면 포착! ${remaining}초간 가만히 유지해 주세요 ✨`);

                  // 비디오 object-fit: cover 보정
                  const videoAspect = v.videoWidth / v.videoHeight;
                  const canvasAspect = cw / ch;
                  let drawW = cw;
                  let drawH = ch;
                  let offsetX = 0;
                  let offsetY = 0;
                  if (videoAspect > canvasAspect) {
                    drawH = ch;
                    drawW = ch * videoAspect;
                    offsetX = (cw - drawW) / 2;
                  } else {
                    drawW = cw;
                    drawH = cw / videoAspect;
                    offsetY = (ch - drawH) / 2;
                  }

                  ctx.clearRect(0, 0, cw, ch);
                  ctx.save();
                  ctx.translate(offsetX, offsetY);
                  drawMysticalOverlay(
                    ctx,
                    landmarks,
                    drawW,
                    drawH,
                    progress,
                    true,
                    facingMode === 'user'
                  );
                  ctx.restore();

                  if (progress >= 1) {
                    finalizeScan(metrics);
                    return;
                  }
                } else {
                  // 정면을 벗어나면 타이머 리셋 및 안내
                  frontalStartTimeRef.current = null;
                  setIsFrontal(false);
                  setScanProgress(0);
                  setCountdownSec(null);
                  setGuideMessage(frontalCheck.message);

                  if (ctx) ctx.clearRect(0, 0, cw, ch);
                }
              } else {
                // 얼굴 미인식
                frontalStartTimeRef.current = null;
                setScanProgress(0);
                setCountdownSec(null);
                setFaceDetected(false);
                setIsFrontal(false);
                setGuideMessage('화면 중앙 가이드 안에 얼굴을 맞춰주세요');
                if (ctx) ctx.clearRect(0, 0, cw, ch);
              }
            }
          }

          rafId = requestAnimationFrame(loop);
        };

        rafId = requestAnimationFrame(loop);
      } catch (err) {
        if (!active) return;
        setStatus('error');
        const msg =
          err instanceof Error
            ? err.message
            : '카메라 권한이 거부되었거나 카메라를 열 수 없습니다.';
        setErrorDetail(msg);
      }
    }

    init();

    return () => {
      active = false;
      cancelAnimationFrame(rafId);
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [facingMode, finalizeScan]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadPhoto(file);
      e.target.value = '';
    }
  };

  return (
    <section className="scanner-wrap">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <button
          type="button"
          className="btn-ghost"
          onClick={onCancel}
          style={{ padding: '8px 12px' }}
        >
          <ArrowLeft size={16} />
          <span>뒤로</span>
        </button>

        <span style={{ fontSize: 13, color: 'var(--gold-light)', fontWeight: 600 }}>
          {userName ? `${userName}님의 관상 스캔` : '얼굴 관상 스캔'}
        </span>

        <button
          type="button"
          className="icon-btn"
          onClick={() =>
            setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'))
          }
          aria-label="카메라 전환"
          title="카메라 전환"
        >
          <SwitchCamera size={18} />
        </button>
      </div>

      <div className="camera-stage">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className={`camera-video ${facingMode === 'user' ? 'mirrored' : ''}`}
        />
        <canvas ref={canvasRef} className="camera-canvas" />

        {/* 정면 아닐 때 타원 가이드 */}
        {status === 'ready' && !isFrontal && (
          <div className="camera-guide-oval">
            <div className="guide-oval-shape" />
          </div>
        )}

        {/* 상단 상태 뱃지 */}
        <div className="camera-hud-top">
          <div className="status-pill">
            <span className={`live-dot ${isFrontal ? '' : 'warn'}`} />
            <span>
              {status === 'loading'
                ? '준비 중...'
                : isFrontal
                ? '정면 포착 · 스캔 중'
                : faceDetected
                ? '정면을 바라봐 주세요'
                : '얼굴을 찾는 중...'}
            </span>
          </div>

          {isFrontal && (
            <div className="status-pill" style={{ color: '#34d399', borderColor: '#34d399' }}>
              <CheckCircle2 size={13} />
              <span>정면 일치</span>
            </div>
          )}
        </div>

        {/* 5초 카운트다운 중앙 오버레이 */}
        {isFrontal && countdownSec !== null && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
              zIndex: 15,
            }}
          >
            <div
              style={{
                width: 96,
                height: 96,
                borderRadius: '50%',
                background: 'rgba(11, 13, 23, 0.75)',
                border: '3px solid #fde68a',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 24px rgba(253, 230, 138, 0.45)',
              }}
            >
              <span
                style={{
                  fontSize: 38,
                  fontWeight: 800,
                  color: '#fef08a',
                  lineHeight: 1,
                }}
              >
                {countdownSec}
              </span>
              <span style={{ fontSize: 11, color: 'var(--gold-light)', marginTop: 2 }}>
                초 남음
              </span>
            </div>
          </div>
        )}

        {/* 로딩 상태 화면 */}
        {status === 'loading' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(9, 11, 20, 0.88)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 14,
              padding: 24,
              textAlign: 'center',
            }}
          >
            <div className="spinner-oracle" style={{ width: 56, height: 56 }} />
            <strong style={{ color: 'var(--gold-light)', fontSize: 15 }}>
              {statusText}
            </strong>
            <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
              잠시만 기다려 주세요 (2~3초 소요)
            </span>
          </div>
        )}

        {/* 카메라 에러 화면 */}
        {status === 'error' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(9, 11, 20, 0.94)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              padding: 22,
              textAlign: 'center',
            }}
          >
            <AlertTriangle size={36} color="#fbbf24" />
            <strong style={{ fontSize: 16 }}>카메라를 열 수 없습니다</strong>
            <p
              style={{
                margin: 0,
                fontSize: 13,
                lineHeight: 1.55,
                color: 'var(--text-secondary)',
              }}
            >
              {errorDetail}
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="user"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <button
              type="button"
              className="btn-gold"
              onClick={() => fileInputRef.current?.click()}
              style={{ marginTop: 6 }}
            >
              <ImagePlus size={18} />
              <span>사진 찍기 / 앨범에서 선택하기</span>
            </button>
            <button type="button" className="btn-secondary" onClick={onTryDemo}>
              <Wand2 size={16} />
              <span>샘플 관상으로 체험해보기</span>
            </button>
          </div>
        )}

        {/* 하단 실시간 안내 말풍선 */}
        {status === 'ready' && (
          <div className="commentary-bubble">
            <p style={{ textAlign: 'center', fontWeight: 600 }}>{guideMessage}</p>
          </div>
        )}
      </div>

      {/* 3초 진행 바 */}
      <div className="scan-progress-track">
        <div
          className="scan-progress-fill"
          style={{ width: `${Math.round(scanProgress * 100)}%` }}
        />
      </div>

      {/* 실시간 수치 칩 (미소, 눈빛) */}
      <div className="live-metrics-bar" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="metric-chip">
          <span className="metric-chip-label">오늘의 미소 지수</span>
          <span className="metric-chip-val">
            {liveSmile !== null && faceDetected ? `${liveSmile}%` : '--'}
          </span>
        </div>
        <div className="metric-chip">
          <span className="metric-chip-label">표정 활력도</span>
          <span className="metric-chip-val">
            {liveVitality !== null && faceDetected ? `${liveVitality}%` : '--'}
          </span>
        </div>
      </div>
    </section>
  );
};
