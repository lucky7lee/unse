import React, { useState, useRef } from 'react';
import {
  RotateCcw,
  Briefcase,
  Coins,
  Heart,
  GraduationCap,
  Smile,
  Sparkles,
  Activity,
  Home,
  Compass,
  ZoomIn,
} from 'lucide-react';
import { FortuneCategory, FortuneResultData } from '../types/fortune';

interface FortuneResultProps {
  fortune: FortuneResultData;
  onRescan: () => void;
  onGoHome: () => void;
}

const CATEGORY_ICONS: Record<FortuneCategory['id'], React.ReactNode> = {
  business: <Briefcase size={18} color="#60a5fa" />,
  wealth: <Coins size={18} color="#fbbf24" />,
  love: <Heart size={18} color="#f472b6" />,
  study: <GraduationCap size={18} color="#a78bfa" />,
  health: <Activity size={18} color="#34d399" />,
};

const CATEGORY_COLORS: Record<FortuneCategory['id'], string> = {
  business: '#60a5fa',
  wealth: '#fbbf24',
  love: '#f472b6',
  study: '#a78bfa',
  health: '#34d399',
};

export const FortuneResult: React.FC<FortuneResultProps> = ({
  fortune,
  onRescan,
  onGoHome,
}) => {
  const { user, zodiac, metrics, myeongri, scanMode } = fortune;
  const isNoScan = scanMode === 'no-scan';

  // 두 손가락 핀치 줌(Pinch-to-zoom) 글자 크기 동적 조절 상태
  const [fontScale, setFontScale] = useState<number>(1.0);
  const [showScaleIndicator, setShowScaleIndicator] = useState<boolean>(false);
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartScaleRef = useRef<number>(1.0);
  const indicatorTimerRef = useRef<number | null>(null);

  const triggerIndicator = () => {
    setShowScaleIndicator(true);
    if (indicatorTimerRef.current) clearTimeout(indicatorTimerRef.current);
    indicatorTimerRef.current = window.setTimeout(() => {
      setShowScaleIndicator(false);
    }, 1500);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      pinchStartDistRef.current = dist;
      pinchStartScaleRef.current = fontScale;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchStartDistRef.current !== null && pinchStartDistRef.current > 10) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = dist / pinchStartDistRef.current;
      // 0.85배(85%)부터 1.7배(170%)까지 유연하게 글자 크기 확대/축소
      const nextScale = Math.min(1.7, Math.max(0.85, pinchStartScaleRef.current * ratio));
      setFontScale(Number(nextScale.toFixed(2)));
      triggerIndicator();
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      pinchStartDistRef.current = null;
    }
  };

  const handleScaleStep = (delta: number) => {
    setFontScale((prev) => {
      const next = Math.min(1.7, Math.max(0.85, Math.round((prev + delta) * 10) / 10));
      return next;
    });
    triggerIndicator();
  };

  const handleResetScale = () => {
    setFontScale(1.0);
    triggerIndicator();
  };

  return (
    <main
      className="result-wrap"
      style={
        {
          gap: 14,
          '--fortune-font-scale': fontScale,
        } as React.CSSProperties
      }
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* 글자 크기 변경 시 중앙 플로팅 뱃지 */}
      {showScaleIndicator && (
        <div className="result-scale-indicator">
          <ZoomIn size={16} />
          <span>글자 크기 {Math.round(fontScale * 100)}%</span>
        </div>
      )}

      {/* 글자 크기 조절 안내 & 퀵 버튼 (두 손가락 제스처 지원) */}
      <div className="font-size-ctrl-bar">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <ZoomIn size={14} color="var(--gold-light)" />
          <span>두 손가락을 벌려 글자를 크게 볼 수 있어요</span>
        </span>
        <div className="font-size-btn-group">
          <button
            type="button"
            className="font-size-btn"
            onClick={() => handleScaleStep(-0.1)}
            aria-label="글자 작게"
            title="글자 작게"
          >
            가-
          </button>
          <button
            type="button"
            className="font-size-btn"
            onClick={handleResetScale}
            style={{
              fontWeight: fontScale !== 1.0 ? 700 : 500,
              minWidth: 44,
              textAlign: 'center',
            }}
            title="기본 크기로 복원"
          >
            {Math.round(fontScale * 100)}%
          </button>
          <button
            type="button"
            className="font-size-btn"
            onClick={() => handleScaleStep(0.1)}
            aria-label="글자 크게"
            title="글자 크게"
          >
            가+
          </button>
        </div>
      </div>
      {/* 1. 상단 사용자 프로필 & 오늘 운세 메인 카드 */}
      <section className="gold-card" style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '18px 16px' }}>
        {/* 상단 프로필 및 일진 바 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            paddingBottom: 10,
            gap: 8,
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              color: 'var(--gold-light)',
            }}
          >
            <Sparkles size={14} color="#fde68a" />
            <strong style={{ fontSize: 14.5, color: '#ffffff' }}>{user.name}님</strong>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              ({user.gender || '남성'} · {zodiac})
            </span>
          </div>

          <span
            style={{
              fontSize: 11.5,
              padding: '3px 10px',
              borderRadius: 999,
              background: 'rgba(255, 255, 255, 0.07)',
              border: '1px solid rgba(212, 175, 55, 0.25)',
              color: 'var(--gold-light)',
              flexShrink: 0,
            }}
          >
            {myeongri.dateText} {isNoScan ? '· 사주' : '· 관상'}
          </span>
        </div>

        {/* 중앙 비주얼: 사진(또는 사주엠블럼) & 종합 점수 듀얼 배칭 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 20,
            padding: '4px 0 8px',
          }}
        >
          {/* 얼굴 스냅샷 또는 사주 엠블럼 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
            {!isNoScan && metrics.snapshotDataUrl ? (
              <img
                src={metrics.snapshotDataUrl}
                alt="스캔된 얼굴"
                style={{
                  width: 74,
                  height: 74,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '2.5px solid var(--gold-main)',
                  boxShadow: '0 0 18px rgba(212, 175, 55, 0.35)',
                }}
              />
            ) : (
              <div
                style={{
                  width: 74,
                  height: 74,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(212, 175, 55, 0.25), rgba(15, 18, 32, 0.95))',
                  border: '2.5px solid var(--gold-main)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 18px rgba(212, 175, 55, 0.35)',
                }}
              >
                <Compass size={30} color="#fde68a" />
              </div>
            )}
            <span style={{ fontSize: 11, color: 'var(--gold-light)' }}>
              {isNoScan ? '사주 명리' : '오늘의 관상'}
            </span>
          </div>

          {/* 중앙 연결 장식선 */}
          <div
            style={{
              width: 1,
              height: 52,
              background: 'linear-gradient(180deg, rgba(212, 175, 55, 0.05), rgba(212, 175, 55, 0.35), rgba(212, 175, 55, 0.05))',
            }}
          />

          {/* 종합 점수 원형 링 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
            <div
              style={{
                width: 74,
                height: 74,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(212, 175, 55, 0.2), rgba(15, 18, 32, 0.95))',
                border: '2.5px solid var(--gold-main)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 0 18px rgba(212, 175, 55, 0.35)',
              }}
            >
              <span
                style={{
                  fontSize: 28,
                  fontWeight: 800,
                  color: '#fef08a',
                  lineHeight: 1,
                }}
              >
                {fortune.overallScore}
              </span>
              <span
                style={{
                  fontSize: 10,
                  color: 'var(--gold-light)',
                  marginTop: 3,
                  fontWeight: 600,
                }}
              >
                오늘 운세
              </span>
            </div>
            <span style={{ fontSize: 11, color: 'var(--gold-light)' }}>
              100점 만점
            </span>
          </div>
        </div>

        {/* 타이틀 및 부제 (중앙 집중 레이아웃) */}
        <div style={{ textAlign: 'center', padding: '0 4px 4px' }}>
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'calc(21px * var(--fortune-font-scale, 1))',
              lineHeight: 1.35,
              color: '#fff9e5',
              margin: '0 0 6px',
              textShadow: '0 2px 10px rgba(0, 0, 0, 0.5)',
            }}
          >
            {fortune.title}
          </h1>
          <p
            style={{
              fontSize: 'calc(12.8px * var(--fortune-font-scale, 1))',
              color: 'var(--text-secondary)',
              margin: 0,
              lineHeight: 1.45,
            }}
          >
            {fortune.subtitle}
          </p>
        </div>

        {/* 총운 분석 내용 박스 */}
        <div
          style={{
            background: 'rgba(9, 11, 20, 0.55)',
            border: '1px solid rgba(212, 175, 55, 0.2)',
            borderRadius: 14,
            padding: '13px 15px',
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
          }}
        >
          <div
            style={{
              fontSize: 11.5,
              fontWeight: 700,
              color: 'var(--gold-light)',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <span>✦</span>
            <span>오늘의 총운 풀이</span>
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 'calc(13.8px * var(--fortune-font-scale, 1))',
              lineHeight: 1.72,
              color: '#f1ede2',
            }}
          >
            {fortune.overallReading}
          </p>
        </div>
      </section>

      {/* 2. 오늘 얼굴 표정 또는 사주 기운 상태 요약 카드 */}
      <section className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {isNoScan ? (
            <Compass size={16} color="#fde68a" />
          ) : (
            <Smile size={16} color="#fde68a" />
          )}
          <strong style={{ fontSize: 14.5, color: 'var(--gold-light)' }}>
            {isNoScan ? '오늘의 사주 일진 & 기운 분석' : '오늘 스캔된 얼굴 표정 상태'}
          </strong>
        </div>

        <div className="tag-row">
          {isNoScan ? (
            <>
              <span className="tag-pill">일진 · {myeongri.dayGanji}</span>
              <span className="tag-pill">오행 · {myeongri.element}</span>
              <span className="tag-pill">에너지 · {myeongri.elementKeyword}</span>
            </>
          ) : (
            <>
              <span className="tag-pill">미소 지수 {metrics.smileScore}%</span>
              <span className="tag-pill">얼굴형 · {metrics.faceShape}</span>
              <span className="tag-pill">{metrics.expression}</span>
            </>
          )}
        </div>

        <p
          style={{
            margin: 0,
            fontSize: 'calc(13.5px * var(--fortune-font-scale, 1))',
            lineHeight: 1.6,
            color: 'var(--text-secondary)',
          }}
        >
          {fortune.faceReading}
        </p>

        {fortune.faceHighlights && fortune.faceHighlights.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 5,
              background: 'rgba(9, 11, 20, 0.4)',
              borderRadius: 12,
              padding: '10px 12px',
              marginTop: 2,
            }}
          >
            {fortune.faceHighlights.map((hl, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  gap: 6,
                  fontSize: 'calc(12.5px * var(--fortune-font-scale, 1))',
                  lineHeight: 1.5,
                  color: 'var(--gold-light)',
                }}
              >
                <span>✦</span>
                <span>{hl}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 3. 5대 핵심 운세 (사업, 재물, 연애, 학업, 건강) */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {fortune.categories.map((cat) => {
          const icon = CATEGORY_ICONS[cat.id] || <Sparkles size={18} />;
          const color = CATEGORY_COLORS[cat.id] || '#fbbf24';

          return (
            <article className="cat-card" key={cat.id}>
              <div className="cat-head">
                <div className="cat-title" style={{ color }}>
                  {icon}
                  <span>{cat.title}</span>
                </div>
                <span className="cat-score-pill" style={{ color }}>
                  {cat.score}점
                </span>
              </div>
              <strong style={{ fontSize: 'calc(14px * var(--fortune-font-scale, 1))', color: '#fff8e7' }}>{cat.summary}</strong>
              <p
                style={{
                  margin: 0,
                  fontSize: 'calc(13.5px * var(--fortune-font-scale, 1))',
                  lineHeight: 1.6,
                  color: 'var(--text-secondary)',
                }}
              >
                {cat.detail}
              </p>
            </article>
          );
        })}
      </section>

      {/* 4. 오늘의 행운 팁 */}
      <section className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Sparkles size={16} color="#fae49e" />
          <strong style={{ fontSize: 14.5, color: 'var(--gold-light)' }}>
            오늘의 행운 팁
          </strong>
        </div>

        <div className="lucky-grid">
          <div className="lucky-box">
            <span>행운의 색상</span>
            <strong style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <i
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: fortune.lucky.colorHex,
                  display: 'inline-block',
                }}
              />
              {fortune.lucky.color}
            </strong>
          </div>
          <div className="lucky-box">
            <span>행운의 숫자</span>
            <strong>{fortune.lucky.number}</strong>
          </div>
          <div className="lucky-box" style={{ gridColumn: '1 / -1' }}>
            <span>오늘 하면 좋은 일</span>
            <strong style={{ fontSize: 'calc(13.5px * var(--fortune-font-scale, 1))' }}>{fortune.lucky.action}</strong>
          </div>
          <div className="lucky-box" style={{ gridColumn: '1 / -1' }}>
            <span>오늘 주의할 점</span>
            <strong style={{ color: '#fcd34d', fontSize: 'calc(13.5px * var(--fortune-font-scale, 1))' }}>{fortune.lucky.caution}</strong>
          </div>
        </div>
      </section>

      {/* 5. 하단 버튼 (처음(메인)으로 / 다시 스캔하기) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 }}>
        <button type="button" className="btn-gold" onClick={onGoHome}>
          <Home size={16} />
          <span>처음(메인)으로</span>
        </button>

        <button type="button" className="btn-secondary" onClick={onRescan}>
          <RotateCcw size={16} />
          <span>{isNoScan ? '다시 보기' : '다시 스캔하기'}</span>
        </button>
      </div>
    </main>
  );
};
