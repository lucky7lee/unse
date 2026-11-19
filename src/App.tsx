import { useMemo, useState, useCallback, useEffect } from 'react';
import { Settings, Sparkles } from 'lucide-react';
import {
  AppSettings,
  FaceMetrics,
  FortuneResultData,
  UserProfile,
} from './types/fortune';
import { getMyeongriDay } from './lib/myeongri';
import {
  createDemoFaceMetrics,
  extractFaceMetrics,
  getImageFaceLandmarker,
} from './lib/faceAnalyzer';
import { generateFortune } from './lib/fortuneGenerator';
import { LandingView } from './components/LandingView';
import { CameraScanner } from './components/CameraScanner';
import { FortuneResult } from './components/FortuneResult';
import { SettingsModal } from './components/SettingsModal';

type AppStep = 'landing' | 'scanning' | 'generating' | 'result';

const SETTINGS_KEY = 'gwansang_settings_v1';
const USER_PROFILE_KEY = 'gwansang_user_profile_v1';

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        engine: parsed.engine === 'gemini' ? 'gemini' : 'local',
        geminiApiKey: typeof parsed.geminiApiKey === 'string' ? parsed.geminiApiKey : '',
        geminiModel:
          typeof parsed.geminiModel === 'string' && parsed.geminiModel
            ? parsed.geminiModel
            : 'gemini-2.5-flash',
      };
    }
  } catch {
    // ignore
  }
  return {
    engine: 'local',
    geminiApiKey: '',
    geminiModel: 'gemini-2.5-flash',
  };
}

function loadUserProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(USER_PROFILE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        name: typeof parsed.name === 'string' ? parsed.name : '',
        birthDate: typeof parsed.birthDate === 'string' ? parsed.birthDate : '',
      };
    }
  } catch {
    // ignore
  }
  return {
    name: '',
    birthDate: '',
  };
}

function createImageThumbnail(img: HTMLImageElement): string | undefined {
  const size = 260;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return undefined;
  const minSide = Math.min(img.naturalWidth, img.naturalHeight);
  const sx = (img.naturalWidth - minSide) / 2;
  const sy = (img.naturalHeight - minSide) / 2;
  ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
  return canvas.toDataURL('image/jpeg', 0.85);
}

export default function App() {
  const myeongri = useMemo(() => getMyeongriDay(new Date()), []);
  const [step, setStep] = useState<AppStep>('landing');
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [user, setUser] = useState<UserProfile>(() => loadUserProfile());
  const [showSettings, setShowSettings] = useState(false);

  const [fortune, setFortune] = useState<FortuneResultData | null>(null);
  const [isPhotoAnalyzing, setIsPhotoAnalyzing] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  // 성명 / 생년월일 변경 시 localStorage에 저장
  const handleUserChange = (next: UserProfile) => {
    setUser(next);
    try {
      localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const handleSaveSettings = (next: AppSettings) => {
    setSettings(next);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const runFortuneGeneration = useCallback(
    async (metrics: FaceMetrics) => {
      setStep('generating');
      window.scrollTo({ top: 0, behavior: 'smooth' });

      const minDelay = new Promise((r) => setTimeout(r, 1200));
      const [result] = await Promise.all([
        generateFortune(user, metrics, myeongri, settings),
        minDelay,
      ]);

      setFortune(result);
      setStep('result');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [myeongri, settings, user]
  );

  const handleUploadPhoto = useCallback(
    async (file: File) => {
      setPhotoError(null);
      setIsPhotoAnalyzing(true);
      try {
        const objectUrl = URL.createObjectURL(file);
        const img = new Image();
        img.src = objectUrl;
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('이미지를 불러올 수 없습니다.'));
        });

        const landmarker = await getImageFaceLandmarker();
        const result = landmarker.detect(img);
        URL.revokeObjectURL(objectUrl);

        if (!result.faceLandmarks || result.faceLandmarks.length === 0) {
          setPhotoError('사진에서 얼굴을 찾지 못했어요. 정면이 잘 나온 사진으로 다시 올려주세요.');
          setStep('landing');
          return;
        }

        const thumb = createImageThumbnail(img);
        const metrics = extractFaceMetrics(
          result.faceLandmarks[0],
          result.faceBlendshapes?.[0]?.categories,
          img.naturalWidth,
          img.naturalHeight,
          thumb
        );
        await runFortuneGeneration(metrics);
      } catch (err) {
        setPhotoError(
          err instanceof Error
            ? err.message
            : '사진 분석 중 문제가 발생했습니다. 다시 시도해 주세요.'
        );
        setStep('landing');
      } finally {
        setIsPhotoAnalyzing(false);
      }
    },
    [runFortuneGeneration]
  );

  const handleTryDemo = useCallback(() => {
    setPhotoError(null);
    const demoMetrics = createDemoFaceMetrics();
    void runFortuneGeneration(demoMetrics);
  }, [runFortuneGeneration]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step]);

  return (
    <div className="app-shell">
      <header className="top-bar">
        <button
          type="button"
          className="brand-pill"
          onClick={() => {
            setPhotoError(null);
            setStep('landing');
          }}
        >
          <Sparkles size={18} color="#f5d882" />
          <span>매일 관상 운세</span>
        </button>

        <button
          type="button"
          className="icon-btn"
          onClick={() => setShowSettings(true)}
          aria-label="설정"
          title="설정"
        >
          <Settings size={18} />
        </button>
      </header>

      {step === 'landing' && (
        <LandingView
          myeongri={myeongri}
          user={user}
          onChangeUser={handleUserChange}
          onStartCamera={() => {
            setPhotoError(null);
            setStep('scanning');
          }}
          onUploadPhoto={handleUploadPhoto}
          onTryDemo={handleTryDemo}
          isPhotoAnalyzing={isPhotoAnalyzing}
          photoError={photoError}
        />
      )}

      {step === 'scanning' && (
        <CameraScanner
          userName={user.name}
          onComplete={runFortuneGeneration}
          onCancel={() => setStep('landing')}
          onUploadPhoto={handleUploadPhoto}
          onTryDemo={handleTryDemo}
        />
      )}

      {step === 'generating' && (
        <main className="analyzing-view">
          <div className="spinner-oracle" />
          <div>
            <h2
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: 21,
                color: 'var(--gold-light)',
                margin: '0 0 8px',
              }}
            >
              오늘의 운세를 조합하고 있습니다...
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: 13.5,
                lineHeight: 1.6,
                color: 'var(--text-secondary)',
              }}
            >
              {user.name ? `${user.name}님의 생년월일과 ` : ''}
              오늘 스캔된 얼굴 표정을 분석해
              <br />
              사업, 재물, 연애, 학업 운세를 정리하고 있습니다.
            </p>
          </div>
        </main>
      )}

      {step === 'result' && fortune && (
        <FortuneResult
          fortune={fortune}
          onRescan={() => setStep('scanning')}
          onGoHome={() => setStep('landing')}
        />
      )}

      {showSettings && (
        <SettingsModal
          settings={settings}
          onSave={handleSaveSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
