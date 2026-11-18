import React, { useState } from 'react';
import {
  Share2,
  RotateCcw,
  Coins,
  Heart,
  Briefcase,
  Activity,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Compass,
} from 'lucide-react';
import { FortuneCategory, FortuneResultData } from '../types/fortune';
import { shareOrDownloadCard } from '../lib/shareCard';

interface FortuneResultProps {
  fortune: FortuneResultData;
  onRescan: () => void;
  onGoHome: () => void;
}

const CAT_STYLE: Record<
  FortuneCategory['id'],
  { color: string; icon: React.ReactNode }
> = {
  wealth: { color: '#fbbf24', icon: <Coins size={18} color="#fbbf24" /> },
  love: { color: '#f472b6', icon: <Heart size={18} color="#f472b6" /> },
  career: { color: '#60a5fa', icon: <Briefcase size={18} color="#60a5fa" /> },
  health: { color: '#34d399', icon: <Activity size={18} color="#34d399" /> },
};

export const FortuneResult: React.FC<FortuneResultProps> = ({
  fortune,
  onRescan,
  onGoHome,
}) => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareToast, setShareToast] = useState<string | null>(null);

  const { metrics, myeongri } = fortune;

  const handleShare = async () => {
    setSharing(true);
    setShareToast(null);
    try {
      const mode = await shareOrDownloadCard(fortune);
      setShareToast(
        mode === 'shared'
          ? '운세 카드를 공유했습니다!'
          : '운세 카드 이미지를 저장했습니다!'
      );
      setTimeout(() => setShareToast(null), 2600);
    } catch {
      setShareToast('이미지 저장 중 오류가 발생했습니다.');
    } finally {
      setSharing(false);
    }
  };

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(fortune.promptUsed);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    } catch {
      // 클립보드 권한 불가 시 무시
    }
  };

  return (
    <main className="result-wrap">
      {/* 메인 타이틀 & 점수 히어로 카드 */}
      <section className="gold-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              color: 'var(--gold-light)',
            }}
          >
            <Compass size={13} />
            {myeongri.dateText} · {myeongri.dayGanji}
          </span>
          <span
            style={{
              fontSize: 11,
              padding: '3px 9px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.08)',
              color: 'var(--text-secondary)',
            }}
          >
            {fortune.source === 'gemini-api' ? 'Gemini AI 풀이' : '관상·명리 엔진'}
            {metrics.isDemo ? ' · 샘플' : ''}
          </span>
        </div>

        <div className="score-header">
          <div className="score-ring">
            <span className="score-num">{fortune.overallScore}</span>
            <span className="score-label">오늘의 점</span>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 className="result-title">{fortune.title}</h1>
            <p className="result-sub">{fortune.subtitle}</p>
          </div>

          {metrics.snapshotDataUrl && (
            <img
              src={metrics.snapshotDataUrl}
              alt="스캔된 얼굴"
              className="snapshot-avatar"
            />
          )}
        </div>

        <p
          style={{
            margin: 0,
            fontSize: 14,
            lineHeight: 1.72,
            color: '#ebe7dc',
            paddingTop: 10,
            borderTop: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {fortune.overallReading}
        </p>

        {fortune.gwansangPoints.length > 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              background: 'rgba(9, 11, 20, 0.45)',
              borderRadius: 14,
              padding: '11px 13px',
            }}
          >
            {fortune.gwansangPoints.map((pt, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  gap: 8,
                  fontSize: 12.5,
                  lineHeight: 1.5,
                  color: 'var(--gold-light)',
                }}
              >
                <span>✦</span>
                <span>{pt}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 1단계 추출된 얼굴 관상 수치 리포트 */}
      <section className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <strong style={{ fontSize: 15, color: 'var(--gold-light)' }}>
            스캔된 얼굴 데이터 리포트
          </strong>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            오행 {myeongri.element}
          </span>
        </div>

        <div className="tag-row">
          <span className="tag-pill">얼굴형 · {metrics.faceShape}</span>
          <span className="tag-pill">{metrics.expression}</span>
          <span className="tag-pill">{metrics.eyebrowShape}</span>
          <span className="tag-pill">{metrics.eyeTilt}</span>
        </div>

        {/* 삼정 비율 바 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="stat-row-head">
            <span>삼정(三停) 비율 · {metrics.samjeong.dominant} 발달</span>
            <span>
              상 {metrics.samjeong.upper}% · 중 {metrics.samjeong.middle}% · 하{' '}
              {metrics.samjeong.lower}%
            </span>
          </div>
          <div className="samjeong-bar">
            <div
              style={{
                width: `${metrics.samjeong.upper}%`,
                background: '#a78bfa',
              }}
            />
            <div
              style={{
                width: `${metrics.samjeong.middle}%`,
                background: '#fbbf24',
              }}
            />
            <div
              style={{
                width: `${metrics.samjeong.lower}%`,
                background: '#34d399',
              }}
            />
          </div>
        </div>

        {/* 수치 게이지 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { label: '미소 · 복덕 지수', val: metrics.smileScore },
            { label: '재백궁(코) 재물 기운', val: metrics.wealthZoneScore },
            { label: '도화 · 호감 매력도', val: metrics.charmScore },
            { label: '눈빛 활력 · 집중력', val: metrics.vitalityScore },
            { label: '좌우 대칭 균형도', val: metrics.symmetryScore },
          ].map((stat) => (
            <div className="stat-row" key={stat.label}>
              <div className="stat-row-head">
                <span>{stat.label}</span>
                <strong style={{ color: 'var(--gold-light)' }}>{stat.val}점</strong>
              </div>
              <div className="stat-track">
                <div className="stat-fill" style={{ width: `${stat.val}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 카테고리별 상세 운세 (재물/연애/직장/건강) */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {fortune.categories.map((cat) => {
          const style = CAT_STYLE[cat.id] || CAT_STYLE.wealth;
          return (
            <article className="cat-card" key={cat.id}>
              <div className="cat-head">
                <div className="cat-title" style={{ color: style.color }}>
                  {style.icon}
                  <span>{cat.title}</span>
                </div>
                <span className="cat-score-pill" style={{ color: style.color }}>
                  {cat.score}점
                </span>
              </div>
              <strong style={{ fontSize: 14, color: '#fff8e7' }}>{cat.summary}</strong>
              <p
                style={{
                  margin: 0,
                  fontSize: 13.5,
                  lineHeight: 1.65,
                  color: 'var(--text-secondary)',
                }}
              >
                {cat.detail}
              </p>
            </article>
          );
        })}
      </section>

      {/* 오늘의 행운 처방전 */}
      <section className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <Sparkles size={16} color="#fae49e" />
          <strong style={{ fontSize: 15, color: 'var(--gold-light)' }}>
            오늘의 개운(開運) 처방전
          </strong>
        </div>

        <div className="lucky-grid">
          <div className="lucky-box">
            <span>행운의 컬러</span>
            <strong style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <i
                style={{
                  width: 11,
                  height: 11,
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
            <span>행운의 아이템</span>
            <strong>{fortune.lucky.item}</strong>
          </div>
          <div className="lucky-box" style={{ gridColumn: '1 / -1' }}>
            <span>오늘의 개운 액션</span>
            <strong>{fortune.lucky.action}</strong>
          </div>
          <div className="lucky-box" style={{ gridColumn: '1 / -1' }}>
            <span>살짝 주의할 점</span>
            <strong style={{ color: '#fcd34d' }}>{fortune.lucky.caution}</strong>
          </div>
        </div>
      </section>

      {/* 2단계 AI 프롬프트 확인 아코디언 */}
      <section className="glass-card" style={{ padding: '13px 16px' }}>
        <button
          type="button"
          onClick={() => setShowPrompt((v) => !v)}
          style={{
            width: '100%',
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            padding: 0,
          }}
        >
          <span>2단계 · 조합된 관상·명리 AI 프롬프트 보기</span>
          {showPrompt ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showPrompt && (
          <div>
            <pre className="prompt-pre">{fortune.promptUsed}</pre>
            <button
              type="button"
              className="btn-ghost"
              onClick={handleCopyPrompt}
              style={{ marginTop: 10, width: '100%' }}
            >
              {copiedPrompt ? <Check size={15} color="#34d399" /> : <Copy size={15} />}
              <span>{copiedPrompt ? '프롬프트 복사 완료!' : '프롬프트 복사하기'}</span>
            </button>
          </div>
        )}
      </section>

      {/* 하단 공유 & 재스캔 액션 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
        <button
          type="button"
          className="btn-gold"
          onClick={handleShare}
          disabled={sharing}
        >
          <Share2 size={18} />
          <span>{sharing ? '카드 이미지 만드는 중...' : '운세 카드 저장 / 공유하기'}</span>
        </button>

        {shareToast && (
          <p
            style={{
              margin: 0,
              textAlign: 'center',
              fontSize: 12.5,
              color: '#34d399',
            }}
          >
            {shareToast}
          </p>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button type="button" className="btn-secondary" onClick={onRescan}>
            <RotateCcw size={16} />
            <span>다시 스캔</span>
          </button>
          <button type="button" className="btn-ghost" onClick={onGoHome}>
            <span>처음으로</span>
          </button>
        </div>
      </div>
    </main>
  );
};
