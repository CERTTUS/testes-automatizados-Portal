import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { Page, TestInfo } from '@playwright/test';

const PONTUAL_PADRAO_MS = 2_500;
const PONTUAL_MIN_MS = 1_500;
const PONTUAL_MAX_MS = 8_000;
const PONTUAL_FPS = 8;

function duracaoPontualMs(): number {
  const bruto = Number(process.env.PRE_CR_VIDEO_PONTUAL_MS ?? PONTUAL_PADRAO_MS);
  const valor = Number.isFinite(bruto) ? bruto : PONTUAL_PADRAO_MS;
  return Math.min(PONTUAL_MAX_MS, Math.max(PONTUAL_MIN_MS, valor));
}

export function slugPassoVideo(passo: string): string {
  const slug = passo
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return slug || 'passo';
}

function nomeVideoPontual(passo: string): string {
  const slug = slugPassoVideo(passo);
  if (/^\d{2}-/.test(passo)) {
    return `pontual-${slug}.webm`;
  }
  return `pontual-${slug}.webm`;
}

function pastaVideosCt(runDir: string, ctId: string): string {
  const dir = path.join(runDir, 'smoke', 'videos', ctId.toUpperCase());
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function requireLocal(): (id: string) => unknown {
  return createRequire(path.join(process.cwd(), 'package.json'));
}

/** FFmpeg do Playwright (já usado no .webm do teste) ou PRE_CR_FFMPEG / PATH. */
export function caminhoFfmpegPreCr(): string | null {
  const envPath = process.env.PRE_CR_FFMPEG?.trim();
  if (envPath && fs.existsSync(envPath)) {
    return envPath;
  }
  try {
    const { registry } = requireLocal()('playwright-core/lib/server/registry') as {
      registry: {
        findExecutable: (nome: string) => { executablePathOrDie: (lang: string) => string };
      };
    };
    const exe = registry.findExecutable('ffmpeg').executablePathOrDie('javascript');
    if (exe && fs.existsSync(exe)) {
      return exe;
    }
  } catch {
    /* tenta cache ms-playwright */
  }
  const cache = process.env.LOCALAPPDATA
    ? path.join(process.env.LOCALAPPDATA, 'ms-playwright')
    : '';
  if (cache && fs.existsSync(cache)) {
    const encontrados: string[] = [];
    const walk = (dir: string, profundidade: number) => {
      if (profundidade > 3) return;
      let entries: fs.Dirent[] = [];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isFile() && /^ffmpeg-win64\.exe$/i.test(entry.name)) {
          encontrados.push(full);
        } else if (entry.isDirectory()) {
          walk(full, profundidade + 1);
        }
      }
    };
    walk(cache, 0);
    if (encontrados[0]) return encontrados[0];
  }
  return null;
}

function muxPngsParaWebm(pngs: Buffer[], destino: string, fps: number): Promise<boolean> {
  const ffmpeg = caminhoFfmpegPreCr();
  if (!ffmpeg || pngs.length === 0) {
    return Promise.resolve(false);
  }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'precr-pontual-'));
  try {
    pngs.forEach((buf, i) => {
      fs.writeFileSync(path.join(tmp, `frame_${String(i + 1).padStart(3, '0')}.jpg`), buf);
    });
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    return new Promise((resolve) => {
      const proc = spawn(
        ffmpeg,
        [
          '-y',
          '-loglevel',
          'error',
          '-framerate',
          String(fps),
          '-i',
          path.join(tmp, 'frame_%03d.jpg'),
          '-an',
          '-r',
          String(fps),
          '-c:v',
          'vp8',
          '-deadline',
          'realtime',
          '-speed',
          '8',
          '-b:v',
          '1M',
          destino,
        ],
        { windowsHide: true }
      );
      proc.on('error', () => resolve(false));
      proc.on('close', (code) => {
        try {
          fs.rmSync(tmp, { recursive: true, force: true });
        } catch {
          /* ignore */
        }
        resolve(code === 0 && fs.existsSync(destino));
      });
    });
  } catch {
    try {
      fs.rmSync(tmp, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
    return Promise.resolve(false);
  }
}

async function esperarMsNaPagina(page: Page, ms: number): Promise<void> {
  await page.evaluate((duracao) => {
    return new Promise<void>((resolve) => {
      const inicio = performance.now();
      const tick = () => {
        if (performance.now() - inicio >= duracao) {
          resolve();
          return;
        }
        requestAnimationFrame(tick);
      };
      tick();
    });
  }, ms);
}

async function mostrarOverlayPontual(page: Page, rotulo: string): Promise<void> {
  await page.evaluate((texto) => {
    const id = '__harness_precr_pontual';
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('div');
      el.id = id;
      el.setAttribute('aria-hidden', 'true');
      document.body.appendChild(el);
    }
    el.style.cssText =
      'position:fixed;left:8px;top:8px;z-index:2147483647;pointer-events:none;' +
      'font:13px/1.3 ui-monospace,monospace;color:#fff;background:rgba(0,80,160,0.82);' +
      'padding:6px 10px;border-radius:4px;max-width:70vw';
    el.textContent = texto;
  }, rotulo);
}

async function removerOverlayPontual(page: Page): Promise<void> {
  await page.evaluate(() => {
    document.getElementById('__harness_precr_pontual')?.remove();
  });
}

/**
 * Clipe pontual de um passo — smoke/videos/<CT>/pontual-NN-tela.webm
 * O ciclo inteiro fica em smoke/videos/<CT>/ciclo.webm (coletado do Playwright).
 */
export async function evidenciarVideoPontual(
  page: Page,
  testInfo: TestInfo,
  ctId: string,
  passo: string
): Promise<void> {
  if (process.env.PRE_CR !== '1' || page.isClosed()) {
    return;
  }
  const id = ctId.toUpperCase();
  const nomeArquivo = nomeVideoPontual(passo);
  const duracaoMs = duracaoPontualMs();
  const intervalo = Math.round(1000 / PONTUAL_FPS);
  const frames: Buffer[] = [];

  await mostrarOverlayPontual(page, `pontual · ${passo}`);
  const inicio = Date.now();
  while (Date.now() - inicio < duracaoMs) {
    frames.push(await page.screenshot({ type: 'jpeg', quality: 72, fullPage: false }));
    await esperarMsNaPagina(page, intervalo);
  }
  await removerOverlayPontual(page);

  const runDir = process.env.PRE_CR_RUN_DIR;
  const destino = runDir
    ? path.join(pastaVideosCt(runDir, id), nomeArquivo)
    : path.join(testInfo.outputDir, nomeArquivo);

  const ok = await muxPngsParaWebm(frames, destino, PONTUAL_FPS);
  if (!ok) {
    const pngFallback = nomeArquivo.replace(/\.webm$/i, '.png');
    const destPng = runDir
      ? path.join(runDir, 'smoke', 'prints', id, pngFallback)
      : path.join(testInfo.outputDir, pngFallback);
    fs.mkdirSync(path.dirname(destPng), { recursive: true });
    fs.writeFileSync(destPng, frames[frames.length - 1] ?? Buffer.alloc(0));
    await testInfo.attach(pngFallback, {
      body: frames[frames.length - 1],
      contentType: 'image/png',
    });
    testInfo.annotations.push({
      type: 'evidencia-pontual',
      description: `${id}:${passo}:png-fallback`,
    });
    return;
  }

  const body = fs.readFileSync(destino);
  await testInfo.attach(nomeArquivo, { body, contentType: 'video/webm' });
  testInfo.annotations.push({
    type: 'evidencia-pontual',
    description: `${id}:${passo}`,
  });
}
