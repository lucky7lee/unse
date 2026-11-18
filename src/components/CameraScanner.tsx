import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  SwitchCamera,
  Sparkles,
  ArrowLeft,
  ImagePlus,
  AlertTriangle,
  Wand2,
} from 'lucide-react';
import { FaceMetrics } from '../types/fortune';
import {
  drawMysticalOverlay,
  extractFaceMetrics,
  generateLiveCommentary,
  getVideoFaceLandmarker,
} from '../lib/faceAnalyzer';

interface CameraScannerProps {
  onComplete: (metrics: FaceMetrics) => void;
  onCancel: () => void;
  onUploadPhoto: (file: File) => void;
  onTryDemo: () => void;
}

const SCAN_HOLD_MS = 2800;

export const CameraScanner: React.FC<CameraScannerProps> = ({
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
  const [statusText, setStatusText] = useState('AI 관상 모델과 카메라 준비 중...');
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  const [faceDetected, setFaceDetected] = useState(false);
  const [liveMetrics, setLiveMetrics] = useState<FaceMetrics | null>(null);
  const [commentary, setCommentary] = useState<string>(
    '얼굴을 화면 중앙 점선 안에 맞춰주세요. 가볍게 미소 지으면 더 좋습니다 ✨'
  );
  const [scanProgress, setScanProgress] = useState(0);

  const latestMetricsRef = useRef<FaceMetrics | null>(null);
  const completedRef = useRef(false);
  const commentaryIndexRef = useRef(0);
  const lastCommentaryTimeRef = useRef(0);
  const faceStartTimeRef = useRef<number | null>(null);

  const captureSnapshot = useCallback(
    (isMirrored: boolean): string | undefined => {
      const video = videoRef.current;
      if (!video || video.videoWidth === 0) return undefined;

      const size = 240;
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
      return off.toDataURL('image/jpeg', 0.82);
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
    faceStartTimeRef.current = null;
    setScanProgress(0);
    setFaceDetected(false);
    setStatus('loading');
    setErrorDetail(null);
    setStatusText('스마트폰 카메라와 AI 관상 엔진을 여는 중...');

    async function init() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error(
            '이 브라우저 환경에서는 카메라에 접근할 수 없습니다. 스마트폰에서는 HTTPS 주소로 접속하거나 아래 사진 업로드 기능을 이용해 주세요.'
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
        setStatusText('실시간 관상 스캔 대기 중');

        const loop = () => {
          if (!active || completedRef.current) return;

          const v = videoRef.current;
          const canvas = canvasRef.current;
          if (v && canvas && v.readyState >= 2 && v.videoWidth > 0) {
            if (v.currentTime !== lastVideoTime) {
              lastVideoTime = v.currentTime;

              // 캔버스 내부 해상도를 비디오 표시 영역에 맞춰 동기화
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

              if (
                result.faceLandmarks &&
                result.faceLandmarks.length > 0 &&
                ctx
              ) {
                const landmarks = result.faceLandmarks[0];
                const blendshapes = result.faceBlendshapes?.[0]?.categories;

                const metrics = extractFaceMetrics(
                  landmarks,
                  blendshapes,
                  v.videoWidth,
                  v.videoHeight
                );
                latestMetricsRef.current = metrics;
                setLiveMetrics(metrics);
                setFaceDetected(true);

                // 자동 스캔 진행률 업데이트
                if (faceStartTimeRef.current === null) {
                  faceStartTimeRef.current = now;
                }
                const elapsed = now - faceStartTimeRef.current;
                const progress = Math.min(1, elapsed / SCAN_HOLD_MS);
                setScanProgress(progress);

                // 실시간 재미 피드백 문구 교체 (1.1초 간격)
                if (now - lastCommentaryTimeRef.current > 1100) {
                  lastCommentaryTimeRef.current = now;
                  const lines = generateLiveCommentary(metrics);
                  const msg = lines[commentaryIndexRef.current % lines.length];
                  commentaryIndexRef.current += 1;
                  setCommentary(msg);
                }

                // 비디오 object-fit: cover 오프셋 보정해 랜드마크 정합성 높이기
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
                  facingMode === 'user'
                );
                ctx.restore();

                if (progress >= 1) {
                  finalizeScan(metrics);
                  return;
                }
              } else {
                faceStartTimeRef.current = null;
                setScanProgress(0);
                setFaceDetected(false);
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

  const handleManualCapture = () => {
    if (latestMetricsRef.current) {
      finalizeScan(latestMetricsRef.current);
    }
  };

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
        <button type="button" className="btn-ghost" onClick={onCancel} style={{ padding: '8px 12px' }}>
          <ArrowLeft size={16} />
          <span>뒤로</span>
        </button>

        <span style={{ fontSize: 13, color: 'var(--gold-light)', fontWeight: 600 }}>
          1단계 · 실시간 얼굴 특징 추출
        </span>

        <button
          type="button"
          className="icon-btn"
          onClick={() =>
            setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'))
          }
          aria-label="전면/후면 카메라 전환"
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

        {status === 'ready' && !faceDetected && (
          <div className="camera-guide-oval">
            <div className="guide-oval-shape" />
          </div>
        )}

        <div className="camera-hud-top">
          <div className="status-pill">
            <span className={`live-dot ${faceDetected ? '' : 'warn'}`} />
            <span>
              {status === 'loading'
                ? 'AI 로딩 중'
                : faceDetected
                ? `관상 스캔 중 ${Math.round(scanProgress * 100)}%`
                : '얼굴을 찾는 중...'}
            </span>
          </div>

          {liveMetrics && faceDetected && (
            <div className="status-pill">
              <span>{liveMetrics.faceShape}</span>
            </div>
          )}
        </div>

        {status === 'loading' && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(9, 11, 20, 0.85)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 14,
              padding: 24,
              textAlign: 'center',
            }}
          >
            <div className="spinner-oracle" style={{ width: 64, height: 64 }} />
            <strong style={{ color: 'var(--gold-light)', fontSize: 15 }}>
              {statusText}
            </strong>
            <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
              최초 1회 Google MediaPipe 모델을 불러옵니다 (약 2~4초 소요)
            </span>
          </div>
        )}

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
            <AlertTriangle size={38} color="#fbbf24" />
            <strong style={{ fontSize: 16 }}>카메라를 시작할 수 없습니다</strong>
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
              <span>샘플 관상으로 바로 체험하기</span>
            </button>
          </div>
        )}

        {status === 'ready' && (
          <div className="commentary-bubble">
            <p>{commentary}</p>
          </div>
        )}
      </div>

      {/* 스캔 진행 바 */}
      <div className="scan-progress-track">
        <div
          className="scan-progress-fill"
          style={{ width: `${Math.round(scanProgress * 100)}%` }}
        />
      </div>

      {/* 실시간 추출 수치 카드 */}
      <div className="live-metrics-bar">
        <div className="metric-chip">
          <span className="metric-chip-label">미소 지수</span>
          <span className="metric-chip-val">
            {liveMetrics && faceDetected ? `${liveMetrics.smileScore}%` : '--'}
          </span>
        </div>
        <div className="metric-chip">
          <span className="metric-chip-label">눈꼬리 각도</span>
          <span className="metric-chip-val">
            {liveMetrics && faceDetected
              ? `${liveMetrics.eyeTiltDeg > 0 ? '+' : ''}${liveMetrics.eyeTiltDeg}°`
              : '--'}
          </span>
        </div>
        <div className="metric-chip">
          <span className="metric-chip-label">재백궁 기운</span>
          <span className="metric-chip-val">
            {liveMetrics && faceDetected ? `${liveMetrics.wealthZoneScore}점` : '--'}
          </span>
        </div>
      </div>

      <button
        type="button"
        className="btn-gold"
        onClick={handleManualCapture}
        disabled={!faceDetected || status !== 'ready'}
      >
        <Sparkles size={19} />
        <span>
          {faceDetected
            ? '지금 바로 오늘의 운세 풀이 보기'
            : '얼굴이 인식되면 자동으로 스캔됩니다'}
        </span>
      </button>
    </section>
  );
};
