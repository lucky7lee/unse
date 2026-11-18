import React, { useRef } from 'react';
import {
  Camera,
  ImagePlus,
  ShieldCheck,
  ScanFace,
  Compass,
  Wand2,
} from 'lucide-react';
import { MyeongriDay } from '../types/fortune';

interface LandingViewProps {
  myeongri: MyeongriDay;
  onStartCamera: () => void;
  onUploadPhoto: (file: File) => void;
  onTryDemo: () => void;
  isPhotoAnalyzing: boolean;
  photoError: string | null;
}

export const LandingView: React.FC<LandingViewProps> = ({
  myeongri,
  onStartCamera,
  onUploadPhoto,
  onTryDemo,
  isPhotoAnalyzing,
  photoError,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadPhoto(file);
      e.target.value = '';
    }
  };

  return (
    <main className="landing-wrap">
      <div className="day-badge">
        <Compass size={14} />
        <span>
          {myeongri.dateText} · {myeongri.dayGanji} ({myeongri.element})
        </span>
      </div>

      <div className="mystic-emblem" aria-hidden="true">
        <div className="mystic-ring-outer" />
        <div className="mystic-ring-inner" />
        <ScanFace size={52} color="#fae49e" strokeWidth={1.6} style={{ position: 'relative', zIndex: 2 }} />
      </div>

      <div>
        <h1 className="hero-title">
          얼굴에 담긴 오늘의 천기,
          <br />
          AI 관상으로 읽다
        </h1>
        <p className="hero-sub">
          실시간 AI 얼굴 스캔으로 미소·눈매·얼굴형·재백궁을 분석하고,
          <br />
          오늘의 명리학 일진과 엮어 유쾌한 운세를 풀어드립니다.
        </p>
      </div>

      <div className="gold-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button
          type="button"
          className="btn-gold"
          onClick={onStartCamera}
          disabled={isPhotoAnalyzing}
        >
          <Camera size={20} />
          <span>카메라로 실시간 관상 스캔하기</span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />

        <button
          type="button"
          className="btn-secondary"
          onClick={() => fileInputRef.current?.click()}
          disabled={isPhotoAnalyzing}
        >
          <ImagePlus size={18} />
          <span>{isPhotoAnalyzing ? '사진에서 관상 분석 중...' : '셀카 사진 올려서 분석하기'}</span>
        </button>

        {photoError && (
          <p
            style={{
              margin: '2px 0 0',
              fontSize: 12.5,
              color: '#fca5a5',
              textAlign: 'center',
            }}
          >
            {photoError}
          </p>
        )}

        <button
          type="button"
          className="btn-ghost"
          onClick={onTryDemo}
          disabled={isPhotoAnalyzing}
          style={{ width: '100%' }}
        >
          <Wand2 size={15} />
          <span>카메라 없이 샘플 관상 체험해 보기</span>
        </button>
      </div>

      <div className="feature-grid">
        <div className="feature-item">
          <strong>1단계 · 실시간 얼굴 추출</strong>
          <span>
            Google MediaPipe AI가 478개 랜드마크와 52개 표정 수치를 즉시 분석
          </span>
        </div>
        <div className="feature-item">
          <strong>2단계 · 관상+명리 운세</strong>
          <span>
            오늘의 60갑자 오행({myeongri.element})과 이목구비 수치를 조합한 맞춤 풀이
          </span>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          fontSize: 12,
          color: 'var(--text-muted)',
          marginTop: 'auto',
          paddingTop: 6,
        }}
      >
        <ShieldCheck size={14} color="#34d399" />
        <span>카메라 영상은 서버로 전송되지 않고 기기 내에서만 분석됩니다</span>
      </div>
    </main>
  );
};
