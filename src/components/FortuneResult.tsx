import React from 'react';
import {
  RotateCcw,
  Briefcase,
  Coins,
  Heart,
  GraduationCap,
  Smile,
  Sparkles,
  User,
  Activity,
  Home,
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
  const { user, zodiac, metrics, myeongri } = fortune;

  return (
    <main className="result-wrap" style={{ gap: 14 }}>
      {/* 1. 상단 사용자 프로필 & 오늘 운세 메인 카드 */}
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
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12.5,
              color: 'var(--gold-light)',
            }}
          >
            <User size={14} />
            <strong>{user.name}님</strong>
            <span>({zodiac || '오늘의 운세'})</span>
          </div>

          <span
            style={{
              fontSize: 11.5,
              padding: '3px 10px',
              borderRadius: 999,
              background: 'rgba(255, 255, 255, 0.08)',
              color: 'var(--text-secondary)',
            }}
          >
            {myeongri.dateText}
          </span>
        </div>

        <div className="score-header">
          <div className="score-ring">
            <span className="score-num">{fortune.overallScore}</span>
            <span className="score-label">오늘 운세</span>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 className="result-title" style={{ fontSize: 22 }}>
              {fortune.title}
            </h1>
            <p className="result-sub" style={{ fontSize: 13 }}>
              {fortune.subtitle}
            </p>
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
            lineHeight: 1.7,
            color: '#ebe7dc',
            paddingTop: 10,
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          {fortune.overallReading}
        </p>
      </section>

      {/* 2. 오늘 얼굴 표정 & 상태 요약 카드 */}
      <section className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Smile size={16} color="#fde68a" />
          <strong style={{ fontSize: 14.5, color: 'var(--gold-light)' }}>
            오늘 스캔된 얼굴 표정 상태
          </strong>
        </div>

        <div className="tag-row">
          <span className="tag-pill">미소 지수 {metrics.smileScore}%</span>
          <span className="tag-pill">얼굴형 · {metrics.faceShape}</span>
          <span className="tag-pill">{metrics.expression}</span>
        </div>

        <p
          style={{
            margin: 0,
            fontSize: 13.5,
            lineHeight: 1.6,
            color: 'var(--text-secondary)',
          }}
        >
          {fortune.faceReading}
        </p>
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
              <strong style={{ fontSize: 14, color: '#fff8e7' }}>{cat.summary}</strong>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
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
            <strong>{fortune.lucky.action}</strong>
          </div>
          <div className="lucky-box" style={{ gridColumn: '1 / -1' }}>
            <span>오늘 주의할 점</span>
            <strong style={{ color: '#fcd34d' }}>{fortune.lucky.caution}</strong>
          </div>
        </div>
      </section>

      {/* 5. 하단 버튼 (다시 스캔 / 처음으로) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 4 }}>
        <button type="button" className="btn-gold" onClick={onRescan}>
          <RotateCcw size={16} />
          <span>다시 스캔하기</span>
        </button>

        <button type="button" className="btn-secondary" onClick={onGoHome}>
          <Home size={16} />
          <span>처음(메인)으로</span>
        </button>
      </div>
    </main>
  );
};
