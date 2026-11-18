import React, { useState } from 'react';
import { X, Sparkles, KeyRound, Cpu } from 'lucide-react';
import { AppSettings } from '../types/fortune';

interface SettingsModalProps {
  settings: AppSettings;
  onSave: (next: AppSettings) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onSave,
  onClose,
}) => {
  const [engine, setEngine] = useState<'local' | 'gemini'>(settings.engine);
  const [geminiApiKey, setGeminiApiKey] = useState(settings.geminiApiKey);
  const [geminiModel, setGeminiModel] = useState(
    settings.geminiModel || 'gemini-2.5-flash'
  );

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      engine,
      geminiApiKey: geminiApiKey.trim(),
      geminiModel: geminiModel.trim() || 'gemini-2.5-flash',
    });
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form
        className="modal-sheet"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSave}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={18} color="#fae49e" />
            <strong style={{ fontSize: 16 }}>운세 생성 엔진 설정</strong>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="닫기">
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              padding: 12,
              borderRadius: 14,
              border:
                engine === 'local'
                  ? '1px solid var(--gold-main)'
                  : '1px solid var(--border-subtle)',
              background:
                engine === 'local' ? 'rgba(212, 175, 55, 0.1)' : 'rgba(255,255,255,0.03)',
              cursor: 'pointer',
            }}
          >
            <input
              type="radio"
              name="engine"
              checked={engine === 'local'}
              onChange={() => setEngine('local')}
              style={{ marginTop: 3 }}
            />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 14 }}>
                <Cpu size={14} color="#fae49e" />
                <span>내장 관상·명리 엔진 (기본 · API 키 불필요)</span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
                얼굴 스캔 수치와 오늘의 60갑자 오행을 조합해 무료로 즉시 운세를 생성합니다.
              </p>
            </div>
          </label>

          <label
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              padding: 12,
              borderRadius: 14,
              border:
                engine === 'gemini'
                  ? '1px solid var(--gold-main)'
                  : '1px solid var(--border-subtle)',
              background:
                engine === 'gemini' ? 'rgba(212, 175, 55, 0.1)' : 'rgba(255,255,255,0.03)',
              cursor: 'pointer',
            }}
          >
            <input
              type="radio"
              name="engine"
              checked={engine === 'gemini'}
              onChange={() => setEngine('gemini')}
              style={{ marginTop: 3 }}
            />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 14 }}>
                <KeyRound size={14} color="#fae49e" />
                <span>Google Gemini AI 실시간 생성 (선택)</span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>
                직접 발급받은 Gemini API 키를 입력하면 매번 새로운 문장의 AI 운세를 생성합니다.
              </p>
            </div>
          </label>
        </div>

        {engine === 'gemini' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                Gemini API Key (브라우저 로컬에만 저장됨)
              </label>
              <input
                type="password"
                className="input-field"
                placeholder="AIzaSy..."
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                모델 이름
              </label>
              <input
                type="text"
                className="input-field"
                value={geminiModel}
                onChange={(e) => setGeminiModel(e.target.value)}
              />
            </div>
          </div>
        )}

        <button type="submit" className="btn-gold">
          설정 저장하기
        </button>
      </form>
    </div>
  );
};
