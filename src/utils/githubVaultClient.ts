/**
 * Server-Proxied GitHub HLS Vault Uploader
 * Zero client-side secrets: all GitHub tokens & repository URLs stay exclusively on the server.
 * Browser only receives an opaque internal stream path (`/api/github-hls/{videoId}/master.m3u8`).
 */
import { getClientAuthHeaders } from './authToken';

export interface VaultUploadProgress {
  percentage: number;
  uploadedMB: string;
  totalMB: string;
  speedMBps: string;
  statusText: string;
}

export interface VaultUploadResult {
  success: boolean;
  videoUrl: string;
  rawDownloadUrl: string;
  fileName: string;
  fileSizeBytes: number;
  durationFormatted: string;
}

/**
 * Uploads a video in 4MB chunks directly to the platform backend (`/api/github-hls/upload/*`),
 * where the server encrypts (AES-128) and stores it in the hidden Private Vault repository.
 */
export async function uploadVideoDirectlyToVault(
  file: File,
  videoTitle: string,
  onProgress?: (prog: VaultUploadProgress) => void,
  signal?: AbortSignal
): Promise<VaultUploadResult> {
  const totalBytes = file.size;
  const totalMB = (totalBytes / (1024 * 1024)).toFixed(1);
  const startTime = Date.now();

  onProgress?.({
    percentage: 5,
    uploadedMB: '0.0',
    totalMB,
    speedMBps: '0.0',
    statusText: `جاري تجهيز الاتصال الآمن بالسيرفر (${totalMB} MB)...`,
  });

  // 1. Initialize server-side upload session
  const initHeaders = await getClientAuthHeaders({ 'Content-Type': 'application/json' });
  const initRes = await fetch('/api/github-hls/upload/init', {
    method: 'POST',
    headers: initHeaders,
    body: JSON.stringify({
      title: videoTitle || file.name.replace(/\.[^/.]+$/, ''),
      fileName: file.name,
      fileSize: totalBytes,
    }),
    signal,
  });

  const initData = await initRes.json().catch(() => ({}));
  if (!initRes.ok || !initData?.success || !initData?.sessionId) {
    throw new Error(
      initData?.error ||
        initData?.message ||
        'يرجى تفعيل مفتاح حساب GitHub السري على السيرفر أولاً.'
    );
  }

  const sessionId: string = initData.sessionId;
  const chunkSize: number = Number(initData.chunkSize) || 4 * 1024 * 1024;
  let uploadedBytes = 0;

  // 2. Upload chunks sequentially/pipelined to backend
  for (let offset = 0; offset < totalBytes; offset += chunkSize) {
    if (signal?.aborted) throw new Error('تم إلغاء عملية الرفع.');

    const slice = file.slice(offset, Math.min(totalBytes, offset + chunkSize));
    const chunkBuf = await slice.arrayBuffer();
    const chunkHeaders = await getClientAuthHeaders({
      'Content-Type': 'application/octet-stream',
    });

    const chunkRes = await fetch(
      `/api/github-hls/upload/chunk?sessionId=${encodeURIComponent(sessionId)}&offset=${offset}`,
      {
        method: 'POST',
        headers: chunkHeaders,
        body: chunkBuf,
        signal,
      }
    );

    if (!chunkRes.ok) {
      const errBody = await chunkRes.json().catch(() => ({}));
      throw new Error(errBody?.error || 'فشل رفع جزء الفيديو إلى السيرفر.');
    }

    uploadedBytes = Math.min(totalBytes, offset + chunkBuf.byteLength);
    const elapsedSec = Math.max(0.2, (Date.now() - startTime) / 1000);
    const speed = (uploadedBytes / (1024 * 1024) / elapsedSec).toFixed(1);
    const pct = Math.min(88, Math.max(8, Math.round((uploadedBytes / Math.max(1, totalBytes)) * 85)));

    onProgress?.({
      percentage: pct,
      uploadedMB: (uploadedBytes / (1024 * 1024)).toFixed(1),
      totalMB,
      speedMBps: speed,
      statusText: `جاري الرفع المشفر إلى السيرفر (${(uploadedBytes / (1024 * 1024)).toFixed(1)} / ${totalMB} MB)...`,
    });
  }

  // 3. Finalize, encrypt (AES-128), and upload to private GitHub vault in background
  onProgress?.({
    percentage: 90,
    uploadedMB: totalMB,
    totalMB,
    speedMBps: '0.0',
    statusText: 'جاري تقطيع وتشفير الفيديو وحفظه في المخزن السري...',
  });

  const completeHeaders = await getClientAuthHeaders({ 'Content-Type': 'application/json' });
  const completeRes = await fetch('/api/github-hls/upload/complete', {
    method: 'POST',
    headers: completeHeaders,
    body: JSON.stringify({
      sessionId,
      asyncPoll: true,
      title: videoTitle || file.name.replace(/\.[^/.]+$/, ''),
    }),
    signal,
  });

  const completeData = await completeRes.json().catch(() => ({}));
  if (!completeRes.ok || !completeData?.success) {
    throw new Error(completeData?.error || 'فشل إتمام معالجة وتشفير الفيديو.');
  }

  let masterPlaylistUrl: string = completeData.masterPlaylistUrl || '';
  let durationSec: number = Number(completeData.durationSec || 0);

  if (completeData.processing && completeData.jobId) {
    // Poll job status until completed
    for (let pollAttempt = 0; pollAttempt < 180; pollAttempt++) {
      if (signal?.aborted) throw new Error('تم إلغاء عملية الرفع.');
      await new Promise((r) => setTimeout(r, 1000));

      const jobHeaders = await getClientAuthHeaders();
      const jobRes = await fetch(
        `/api/github-hls/upload/job/${encodeURIComponent(completeData.jobId)}`,
        { headers: jobHeaders, signal }
      );
      const jobData = await jobRes.json().catch(() => ({}));

      if (jobData.status === 'completed' && jobData.masterPlaylistUrl) {
        masterPlaylistUrl = jobData.masterPlaylistUrl;
        durationSec = Number(jobData.durationSec || 0);
        break;
      }
      if (jobData.status === 'error' || !jobRes.ok) {
        throw new Error(jobData.error || 'فشل تشفير الفيديو على السيرفر.');
      }

      onProgress?.({
        percentage: Number(jobData.percentage || 92),
        uploadedMB: totalMB,
        totalMB,
        speedMBps: '0.0',
        statusText: jobData.statusText || 'جاري التشفير بتقنية HLS AES-128...',
      });
    }
  }

  if (!masterPlaylistUrl) {
    throw new Error('انتهت مهلة معالجة الفيديو، يرجى المحاولة مرة أخرى.');
  }

  const elapsedSec = Math.max(0.5, (Date.now() - startTime) / 1000);
  const avgSpeed = (totalBytes / (1024 * 1024) / elapsedSec).toFixed(1);
  const estMinutes =
    durationSec > 0 ? Math.max(1, Math.round(durationSec / 60)) : Math.max(1, Math.round(totalBytes / (1024 * 1024 * 3)));

  onProgress?.({
    percentage: 100,
    uploadedMB: totalMB,
    totalMB,
    speedMBps: avgSpeed,
    statusText: 'تم رفع وتشفير الفيديو وحفظه بأمان تام ✅',
  });

  return {
    success: true,
    videoUrl: masterPlaylistUrl,
    rawDownloadUrl: masterPlaylistUrl,
    fileName: file.name,
    fileSizeBytes: totalBytes,
    durationFormatted: `${estMinutes} دقيقة`,
  };
}
