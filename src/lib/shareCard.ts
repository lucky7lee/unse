import { FortuneResultData } from '../types/fortune';

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number
): number {
  const words = text.split(' ');
  let line = '';
  let lineCount = 0;
  let currentY = y;

  for (let n = 0; n < words.length; n++) {
    const testLine = line ? `${line} ${words[n]}` : words[n];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && line) {
      ctx.fillText(line, x, currentY);
      line = words[n];
      currentY += lineHeight;
      lineCount++;
      if (lineCount >= maxLines - 1) {
        const remaining = [line, ...words.slice(n + 1)].join(' ');
        let clipped = remaining;
        while (ctx.measureText(clipped + '…').width > maxWidth && clipped.length > 1) {
          clipped = clipped.slice(0, -1);
        }
        ctx.fillText(
          clipped.length < remaining.length ? `${clipped}…` : clipped,
          x,
          currentY
        );
        return currentY + lineHeight;
      }
    } else {
      line = testLine;
    }
  }
  if (line) {
    ctx.fillText(line, x, currentY);
    currentY += lineHeight;
  }
  return currentY;
}

export async function renderFortuneCardBlob(
  fortune: FortuneResultData
): Promise<Blob> {
  const width = 1080;
  const height = 1440;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // 배경 그라데이션
  const bg = ctx.createRadialGradient(540, 260, 40, 540, 720, 960);
  bg.addColorStop(0, '#221b42');
  bg.addColorStop(0.55, '#111426');
  bg.addColorStop(1, '#090b14');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  // 외곽 황금 프레임
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.55)';
  ctx.lineWidth = 4;
  ctx.strokeRect(42, 42, width - 84, height - 84);
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.22)';
  ctx.lineWidth = 2;
  ctx.strokeRect(56, 56, width - 112, height - 112);

  // 상단 헤더
  ctx.textAlign = 'center';
  ctx.fillStyle = '#d4af37';
  ctx.font = '600 28px "Noto Sans KR", sans-serif';
  ctx.fillText('천 기 누 설  ·  A I  관 상  운 세', 540, 126);

  ctx.fillStyle = '#a5b4cf';
  ctx.font = '500 24px "Noto Sans KR", sans-serif';
  ctx.fillText(
    `${fortune.myeongri.dateText}  |  ${fortune.myeongri.dayGanji} · ${fortune.myeongri.element}`,
    540,
    172
  );

  // 점수 원형 배지
  ctx.beginPath();
  ctx.arc(540, 325, 108, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(212, 175, 55, 0.1)';
  ctx.fill();
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#e5c158';
  ctx.stroke();

  ctx.fillStyle = '#fef08a';
  ctx.font = '700 84px "Noto Sans KR", sans-serif';
  ctx.fillText(`${fortune.overallScore}`, 540, 344);
  ctx.fillStyle = '#d4af37';
  ctx.font = '600 24px "Noto Sans KR", sans-serif';
  ctx.fillText('오늘의 관상 점수', 540, 386);

  // 타이틀
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 44px "Gowun Batang", "Noto Sans KR", serif';
  wrapText(ctx, fortune.title, 540, 505, 880, 58, 2);

  // 핵심 수치 칩 4개
  const chips = [
    `얼굴형 · ${fortune.metrics.faceShape}`,
    `미소 지수 · ${fortune.metrics.smileScore}%`,
    `재백궁 · ${fortune.metrics.wealthZoneScore}점`,
    `도화력 · ${fortune.metrics.charmScore}점`,
  ];
  ctx.font = '600 24px "Noto Sans KR", sans-serif';
  chips.forEach((chip, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const bx = 110 + col * 440;
    const by = 606 + row * 72;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.fillRect(bx, by, 420, 54);
    ctx.strokeStyle = 'rgba(212, 175, 55, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bx, by, 420, 54);
    ctx.fillStyle = '#f8e6a0';
    ctx.textAlign = 'center';
    ctx.fillText(chip, bx + 210, by + 36);
  });

  // 총운 요약 박스
  ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
  ctx.fillRect(96, 774, 888, 240);
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.25)';
  ctx.strokeRect(96, 774, 888, 240);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#f3d478';
  ctx.font = '700 26px "Noto Sans KR", sans-serif';
  ctx.fillText('오늘의 관상 총평', 130, 824);

  ctx.fillStyle = '#e5e9f5';
  ctx.font = '400 25px "Noto Sans KR", sans-serif';
  wrapText(ctx, fortune.overallReading, 130, 870, 820, 38, 4);

  // 카테고리별 점수 4개
  const catColors: Record<string, string> = {
    wealth: '#fbbf24',
    love: '#f472b6',
    career: '#60a5fa',
    health: '#34d399',
  };
  fortune.categories.forEach((cat, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 96 + col * 454;
    const y = 1044 + row * 116;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.fillRect(x, y, 434, 96);
    ctx.fillStyle = catColors[cat.id] || '#fbbf24';
    ctx.font = '700 25px "Noto Sans KR", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(cat.title, x + 22, y + 40);

    ctx.textAlign = 'right';
    ctx.fillText(`${cat.score}점`, x + 410, y + 40);

    ctx.textAlign = 'left';
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '400 20px "Noto Sans KR", sans-serif';
    wrapText(ctx, cat.summary, x + 22, y + 76, 390, 26, 1);
  });

  // 행운 처방 푸터
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f8e6a0';
  ctx.font = '600 24px "Noto Sans KR", sans-serif';
  ctx.fillText(
    `행운의 색: ${fortune.lucky.color}  ·  행운의 숫자: ${fortune.lucky.number}  ·  아이템: ${fortune.lucky.item}`,
    540,
    1325
  );

  ctx.fillStyle = '#64748b';
  ctx.font = '500 20px "Noto Sans KR", sans-serif';
  ctx.fillText('천기누설 AI 관상 운세 · 재미로 보는 오늘의 관상과 명리', 540, 1372);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('이미지 생성에 실패했습니다.'));
    }, 'image/png');
  });
}

export async function shareOrDownloadCard(fortune: FortuneResultData): Promise<'shared' | 'downloaded'> {
  const blob = await renderFortuneCardBlob(fortune);
  const file = new File([blob], `gwansang-${fortune.myeongri.isoDate}.png`, {
    type: 'image/png',
  });

  if (
    typeof navigator !== 'undefined' &&
    navigator.canShare &&
    navigator.canShare({ files: [file] })
  ) {
    try {
      await navigator.share({
        title: `오늘의 AI 관상: ${fortune.title}`,
        text: `${fortune.myeongri.dateText} 나의 관상 점수는 ${fortune.overallScore}점! (${fortune.title})`,
        files: [file],
      });
      return 'shared';
    } catch {
      // 사용자가 공유 창을 닫은 경우 다운로드로 폴백하지 않음 — 에러가 AbortError면 조용히 처리
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `gwansang-${fortune.myeongri.isoDate}.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'downloaded';
}
