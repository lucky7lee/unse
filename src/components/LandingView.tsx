import React, { useRef, useState } from 'react';
import {
  Camera,
  ImagePlus,
  ShieldCheck,
  Sparkles,
  Calendar,
  User,
  Wand2,
  AlertCircle,
} from 'lucide-react';
import { MyeongriDay, UserProfile } from '../types/fortune';

interface LandingViewProps {
  myeongri: MyeongriDay;
  user: UserProfile;
  onChangeUser: (next: UserProfile) => void;
  onStartCamera: () => void;
  onUploadPhoto: (file: File) => void;
  onTryDemo: () => void;
  isPhotoAnalyzing: boolean;
  photoError: string | null;
}

export const LandingView: React.FC<LandingViewProps> = ({
  myeongri,
  user,
  onChangeUser,
  onStartCamera,
  onUploadPhoto,
  onTryDemo,
  isPhotoAnalyzing,
  photoError,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const birthInputRef = useRef<HTMLInputElement>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValidationError(null);
    onChangeUser({ ...user, name: e.target.value });
  };

  const handleBirthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValidationError(null);
    onChangeUser({ ...user, birthDate: e.target.value });
  };

  const validateAndProceed = (action: () => void) => {
    if (!user.name.trim()) {
      setValidationError('성명을 입력해 주세요.');
      nameInputRef.current?.focus();
      return;
    }
    if (!user.birthDate.trim()) {
      setValidationError('생년월일을 입력해 주세요.');
      birthInputRef.current?.focus();
      return;
    }
    setValidationError(null);
    action();
  };

  const handleStartCameraClick = () => {
    validateAndProceed(onStartCamera);
  };

  const handleUploadPhotoClick = () => {
    validateAndProceed(() => {
      fileInputRef.current?.click();
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadPhoto(file);
      e.target.value = '';
    }
  };

  return (
    <main className="landing-wrap" style={{ gap: 20 }}>
      {/* 상단 날짜 및 헤더 */}
      <div style={{ textAlign: 'center', marginTop: 6 }}>
        <div className="day-badge" style={{ marginBottom: 14 }}>
          <Sparkles size={13} />
          <span>{myeongri.dateText} 오늘의 운세</span>
        </div>

        <h1 className="hero-title" style={{ fontSize: 30, margin: '0 0 8px' }}>
          매일 관상 운세
        </h1>
        <p className="hero-sub" style={{ fontSize: 14 }}>
          오늘의 얼굴 상태와 생년월일을 확인해
          <br />
          사업, 재물, 연애, 학업 운세를 풀어드립니다.
        </p>
      </div>

      {/* 정보 입력 및 스캔 시작 카드 */}
      <div className="gold-card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* 성명 입력 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--gold-light)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <User size={15} />
            <span>성명 (이름)</span>
          </label>
          <input
            ref={nameInputRef}
            type="text"
            className="input-field"
            placeholder="이름을 입력하세요 (예: 홍길동)"
            value={user.name}
            onChange={handleNameChange}
            maxLength={20}
          />
        </div>

        {/* 생년월일 입력 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--gold-light)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <Calendar size={15} />
            <span>생년월일</span>
          </label>
          <input
            ref={birthInputRef}
            type="date"
            className="input-field"
            value={user.birthDate}
            onChange={handleBirthChange}
            max={new Date().toISOString().split('T')[0]}
            style={{ colorScheme: 'dark' }}
          />
        </div>

        {/* 유효성 검사 에러 메시지 */}
        {validationError && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              borderRadius: 12,
              padding: '10px 12px',
              fontSize: 13,
              color: '#fca5a5',
            }}
          >
            <AlertCircle size={16} />
            <span>{validationError}</span>
          </div>
        )}

        {photoError && (
          <p
            style={{
              margin: '0',
              fontSize: 12.5,
              color: '#fca5a5',
              textAlign: 'center',
            }}
          >
            {photoError}
          </p>
        )}

        {/* 메인 얼굴 스캔 버튼 */}
        <button
          type="button"
          className="btn-gold"
          onClick={handleStartCameraClick}
          disabled={isPhotoAnalyzing}
          style={{ marginTop: 4 }}
        >
          <Camera size={20} />
          <span>얼굴 스캔하고 오늘 운세 보기</span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleUploadPhotoClick}
            disabled={isPhotoAnalyzing}
            style={{ padding: '12px 10px', fontSize: 13.5 }}
          >
            <ImagePlus size={16} />
            <span>{isPhotoAnalyzing ? '분석 중...' : '사진 올리기'}</span>
          </button>

          <button
            type="button"
            className="btn-ghost"
            onClick={onTryDemo}
            disabled={isPhotoAnalyzing}
            style={{ padding: '12px 10px', fontSize: 13.5 }}
          >
            <Wand2 size={15} />
            <span>샘플 체험</span>
          </button>
        </div>
      </div>

      {/* 하단 보안 안내 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          fontSize: 12,
          color: 'var(--text-muted)',
          marginTop: 'auto',
          paddingTop: 8,
        }}
      >
        <ShieldCheck size={14} color="#34d399" />
        <span>카메라 영상은 외부로 전송되지 않고 기기에서만 안전하게 분석됩니다</span>
      </div>
    </main>
  );
};
