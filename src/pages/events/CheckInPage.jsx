import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import * as pdfjsLib from 'pdfjs-dist';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  QrCode,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Camera,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  History,
  Keyboard,
  Calendar,
  Volume2,
  VolumeX,
  UploadCloud,
  FileText,
} from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import { ENDPOINTS } from '../../api/endpoints';
import { useNotification } from '../../context/NotificationContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Alert } from '../../components/ui/Alert';

// Configure pdfjs worker to unpkg/cdnjs CDN for seamless client-side PDF canvas rendering
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * Web Audio API Sound Synthesizer
 * Generates instant acoustic feedback for pass scan validation outcomes without external media downloads.
 */
const playAudioFeedback = (type) => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    if (type === 'success') {
      // High-pitched pleasant double chime (D5 -> A5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, ctx.currentTime);
      gain1.gain.setValueAtTime(0.3, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.2);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
      gain2.gain.setValueAtTime(0.4, ctx.currentTime + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(ctx.currentTime + 0.12);
      osc2.stop(ctx.currentTime + 0.4);
    } else if (type === 'warning') {
      // Amber warning double pulse (440Hz triangle wave)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.setValueAtTime(370, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    } else if (type === 'error') {
      // Low error buzz (220Hz -> 110Hz square wave)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(110, ctx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.35);
    }
  } catch (e) {
    console.warn('Web Audio API unavailable:', e);
  }
};

const CheckInPage = () => {
  const queryClient = useQueryClient();
  const { addNotification } = useNotification();
  const [selectedEventId, setSelectedEventId] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [scanMode, setScanMode] = useState('camera'); // 'camera' | 'file'
  const [scanning, setScanning] = useState(false);
  const [availableCameras, setAvailableCameras] = useState([]);
  const [selectedCameraId, setSelectedCameraId] = useState('');
  const [lastScannedResult, setLastScannedResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [checkInLogs, setCheckInLogs] = useState([]);
  const [scannerError, setScannerError] = useState('');
  const [audioMuted, setAudioMuted] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileScanning, setFileScanning] = useState(false);

  const html5QrcodeRef = useRef(null);
  const fileInputRef = useRef(null);

  // Fetch events list for Target Event dropdown
  const { data: events = [] } = useQuery({
    queryKey: ['eventsList'],
    queryFn: async () => {
      const res = await axiosClient.get(ENDPOINTS.EVENT.BASE);
      return Array.isArray(res.data) ? res.data : res.data?.items ?? [];
    },
  });

  // Query connected cameras on component mount
  useEffect(() => {
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length > 0) {
          setAvailableCameras(devices);
          setSelectedCameraId(devices[0].id);
        }
      })
      .catch((err) => {
        console.warn('Could not enumerate cameras on load:', err);
      });
  }, []);

  // Stop current camera instance safely
  const stopCameraScanner = async () => {
    if (html5QrcodeRef.current) {
      try {
        if (html5QrcodeRef.current.isScanning) {
          await html5QrcodeRef.current.stop();
        }
      } catch (e) {
        console.warn('Error stopping camera:', e);
      }
      html5QrcodeRef.current = null;
    }
    setScanning(false);
  };

  useEffect(() => {
    return () => {
      stopCameraScanner();
    };
  }, []);

  // Start Camera Scanner using enumerated camera ID or intelligent fallback
  const startCameraScanner = async () => {
    setScannerError('');
    setScanning(true);

    try {
      await stopCameraScanner();

      const container = document.getElementById('qr-reader');
      if (!container) {
        setScannerError('Scanner element viewport not ready.');
        setScanning(false);
        return;
      }

      const html5Qrcode = new Html5Qrcode('qr-reader');
      html5QrcodeRef.current = html5Qrcode;

      const config = { fps: 10, qrbox: { width: 240, height: 240 } };

      const onScanSuccess = (decodedText) => {
        stopCameraScanner();
        processCheckInPayload(decodedText);
      };

      const onScanError = () => {
        // Frame scan error, ignore
      };

      let cameras = availableCameras;
      if (cameras.length === 0) {
        try {
          cameras = await Html5Qrcode.getCameras();
          setAvailableCameras(cameras);
        } catch {
          cameras = [];
        }
      }

      const cameraIdToUse = selectedCameraId || (cameras.length > 0 ? cameras[0].id : null);

      if (cameraIdToUse) {
        await html5Qrcode.start(cameraIdToUse, config, onScanSuccess, onScanError);
        return;
      }

      try {
        await html5Qrcode.start({ facingMode: 'user' }, config, onScanSuccess, onScanError);
        return;
      } catch (userErr) {
        console.warn('User camera fallback failed:', userErr);
      }

      await html5Qrcode.start({ facingMode: 'environment' }, config, onScanSuccess, onScanError);
    } catch (err) {
      console.error('Camera access error:', err);
      setScannerError(
        'Could not access camera stream. Please check browser camera permissions or try File Drop / Manual Input.'
      );
      setScanning(false);
    }
  };

  // Process PDF file to extract QR code or pass text
  const processPdfFile = async (file, html5Qrcode) => {
    // 1. Direct Regex scan on PDF raw text
    try {
      const text = await file.text();
      const match = text.match(/EVENTHUB-(\d+)-(\d+)-([a-f0-9-]+)/i);
      if (match) {
        return match[0];
      }
    } catch {
      // Ignore text read error and proceed to canvas rendering
    }

    // 2. Render PDF pages to Canvas & decode QR code images via PDF.js
    const arrayBuffer = await file.arrayBuffer();
    const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2.0 });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: ctx, viewport }).promise;

      // Extract text content from page
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((i) => i.str).join(' ');
      const textMatch = pageText.match(/EVENTHUB-(\d+)-(\d+)-([a-f0-9-]+)/i);
      if (textMatch) {
        return textMatch[0];
      }

      // Convert Canvas page rendering to PNG Blob File and scan for QR code
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (blob) {
        const imageFile = new File([blob], `pdf_page_${pageNum}.png`, { type: 'image/png' });
        try {
          const decodedText = await html5Qrcode.scanFile(imageFile, false);
          if (decodedText) return decodedText;
        } catch {
          // Continue checking subsequent pages
        }
      }
    }

    throw new Error('No valid QR pass found in PDF file.');
  };

  // Handle Image or PDF File Scanning (Drag & Drop or File Selection)
  const processUploadedFile = async (file) => {
    if (!file) return;
    setScannerError('');
    setFileScanning(true);

    try {
      const html5Qrcode = new Html5Qrcode('qr-reader-file-dummy');
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

      let decodedText = null;

      if (isPdf) {
        decodedText = await processPdfFile(file, html5Qrcode);
      } else {
        decodedText = await html5Qrcode.scanFile(file, /* showImage= */ true);
      }

      setFileScanning(false);
      processCheckInPayload(decodedText);
    } catch (err) {
      console.error('File QR scan error:', err);
      setScannerError(
        'Could not detect a valid QR Code or pass payload in the uploaded PDF / Image file. Please check file content.'
      );
      setFileScanning(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processUploadedFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const parseQrPayload = (payload) => {
    // Pattern: EVENTHUB-{IdEvent}-{IdPerson}-{Guid}
    const regex = /^EVENTHUB-(\d+)-(\d+)-([a-f0-9-]+)$/i;
    const match = payload.trim().match(regex);
    if (!match) return null;
    return {
      idEvent: parseInt(match[1], 10),
      idPerson: parseInt(match[2], 10),
      guid: match[3],
    };
  };

  const processCheckInPayload = async (rawPayload) => {
    setLoading(true);
    const parsed = parseQrPayload(rawPayload);
    const targetEventId = selectedEventId ? parseInt(selectedEventId, 10) : parsed?.idEvent || 0;

    if (!parsed) {
      if (!audioMuted) playAudioFeedback('error');

      const errorResult = {
        success: false,
        status: 'Invalid Pass (Red)',
        type: 'invalid',
        message: `Payload "${rawPayload}" does not match pattern EVENTHUB-{IdEvent}-{IdPerson}-{Guid}`,
        timestamp: new Date().toLocaleTimeString(),
        raw: rawPayload,
      };
      setLastScannedResult(errorResult);
      setCheckInLogs((prev) => [errorResult, ...prev]);
      addNotification({
        type: 'checkin_error',
        title: 'Pass Verification Failed 🔴',
        message: `Invalid QR payload: "${rawPayload}"`,
        link: '/admin/check-in',
      });
      setLoading(false);
      return;
    }

    try {
      const response = await axiosClient.post(ENDPOINTS.PARTICIPATION.CHECK_IN, {
        qrPayload: rawPayload,
        eventId: targetEventId,
      });

      const resData = response.data || {};
      if (!audioMuted) playAudioFeedback('success');

      // Persist scan entry to localStorage for instant Arrival Velocity chart update
      try {
        const existing = JSON.parse(localStorage.getItem('eventhub_live_door_scans') || '[]');
        const scanTimeISO = resData.checkInTime || new Date().toISOString();
        const newEntry = {
          eventId: targetEventId,
          personId: parsed.idPerson,
          guid: parsed.guid,
          raw: rawPayload,
          timestamp: scanTimeISO,
        };
        localStorage.setItem('eventhub_live_door_scans', JSON.stringify([newEntry, ...existing]));
      } catch {
        // Ignore localStorage error
      }

      queryClient.invalidateQueries({ queryKey: ['allParticipationsAnalytics'] });

      const successResult = {
        success: true,
        status: 'Success (Green)',
        type: 'success',
        message: resData.message || `Entry clearance granted for Participant #${parsed.idPerson} (Event #${targetEventId})`,
        timestamp: resData.checkInTime ? new Date(resData.checkInTime).toLocaleTimeString() : new Date().toLocaleTimeString(),
        parsed,
        raw: rawPayload,
      };
      setLastScannedResult(successResult);
      setCheckInLogs((prev) => [successResult, ...prev]);
      addNotification({
        type: 'checkin_success',
        title: 'Door Clearance Granted 🟢',
        message: successResult.message,
        link: '/admin/check-in',
      });
    } catch (err) {
      console.error('Check-in API error:', err);
      const isAlreadyCheckedIn =
        err.response?.status === 409 ||
        err.response?.data?.message?.toLowerCase().includes('already');

      if (isAlreadyCheckedIn) {
        if (!audioMuted) playAudioFeedback('warning');
      } else {
        if (!audioMuted) playAudioFeedback('error');
      }

      const failResult = {
        success: false,
        status: isAlreadyCheckedIn ? 'Already Checked-In (Yellow)' : 'Invalid Pass (Red)',
        type: isAlreadyCheckedIn ? 'already' : 'invalid',
        message: err.response?.data?.message || (isAlreadyCheckedIn ? 'Attendee has already checked in.' : 'Access denied or pass invalid.'),
        timestamp: new Date().toLocaleTimeString(),
        parsed,
        raw: rawPayload,
        warning: isAlreadyCheckedIn,
      };
      setLastScannedResult(failResult);
      setCheckInLogs((prev) => [failResult, ...prev]);

      addNotification({
        type: isAlreadyCheckedIn ? 'checkin_warning' : 'checkin_error',
        title: isAlreadyCheckedIn ? 'Already Checked-In 🟡' : 'Pass Verification Failed 🔴',
        message: failResult.message,
        link: '/admin/check-in',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    processCheckInPayload(manualCode);
    setManualCode('');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      {/* Hidden dummy element for file scanner processing */}
      <div id="qr-reader-file-dummy" className="hidden" />

      <div className="max-w-6xl mx-auto space-y-8">
        {/* Top Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-[var(--cst-blue-400)] text-xs font-bold uppercase tracking-widest mb-1">
              <Sparkles className="w-4 h-4 text-[var(--cst-blue-400)]" />
              <span>Door Clearance System</span>
            </div>
            <h1 className="text-3xl font-black tracking-tight text-[var(--text-primary)]">
              Live QR Door Check-In Scanner
            </h1>
            <p className="text-[var(--text-secondary)] text-xs mt-1">
              Live optical camera scan, image &amp; PDF ticket file upload, and real-time audio feedback.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Audio Feedback Mute Toggle */}
            <button
              onClick={() => setAudioMuted((m) => !m)}
              className={`cst-btn-motion inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl text-xs font-bold border transition-colors cursor-pointer ${
                audioMuted
                  ? 'bg-[var(--surface-850)] border-[var(--border-default)] text-[var(--text-muted)]'
                  : 'cst-badge-blue'
              }`}
            >
              {audioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              <span>{audioMuted ? 'Mute' : 'Audio Tone Active'}</span>
            </button>

            <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold bg-[var(--surface-850)] border border-[var(--border-default)] text-[var(--text-primary)] font-mono">
              <ShieldCheck className="w-4 h-4 text-[var(--cst-blue-400)]" />
              <span>EVENTHUB-{'{Event}'}-{'{Person}'}-{'{Guid}'}</span>
            </span>
          </div>
        </div>

        {/* Target Event Selector Dropdown */}
        <Card className="cst-hero-gradient border-[var(--border-default)] shadow-2xl rounded-3xl">
          <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-[var(--cst-blue-800)]/20 border border-[var(--cst-blue-600)]/40 rounded-2xl text-[var(--cst-blue-400)] shrink-0">
                <Calendar className="w-5 h-5 text-[var(--cst-blue-400)]" />
              </div>
              <div>
                <label htmlFor="target-event-select" className="text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] block">
                  Select Target Event for Door Scanner
                </label>
                <p className="text-[11px] text-[var(--text-secondary)]">
                  Select an event to enforce door clearance scope.
                </p>
              </div>
            </div>

            <select
              id="target-event-select"
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="bg-[var(--bg-input)] border border-[var(--border-default)] text-[var(--text-primary)] text-xs font-semibold rounded-2xl p-3 focus:ring-1 focus:ring-[var(--cst-blue-600)] outline-none max-w-xs w-full cursor-pointer shadow-sm"
            >
              <option value="">-- All Events (Auto Detect from Pass) --</option>
              {events.map((ev) => (
                <option key={ev.idEvent || ev.id} value={ev.idEvent || ev.id}>
                  {ev.title} (ID #{ev.idEvent || ev.id})
                </option>
              ))}
            </select>
          </CardContent>
        </Card>

        {/* Main Grid: Scanner & Verification Feedback Output */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Scanning Engine */}
          <Card className="bg-slate-900/80 border-slate-800 shadow-2xl">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-slate-100 flex items-center gap-2">
                    {scanMode === 'camera' ? <Camera className="w-5 h-5 text-indigo-400" /> : <UploadCloud className="w-5 h-5 text-indigo-400" />}
                    <span>{scanMode === 'camera' ? 'Live Optical Camera Scanner' : 'Image & PDF Pass Scanner'}</span>
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    {scanMode === 'camera' ? 'Scan live pass QR using device camera' : 'Upload or drop a PDF ticket pass or QR image'}
                  </CardDescription>
                </div>

                {/* Mode Switcher Tabs */}
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={() => {
                      stopCameraScanner();
                      setScanMode('camera');
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                      scanMode === 'camera'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Camera className="w-3.5 h-3.5" /> Camera
                  </button>
                  <button
                    onClick={() => {
                      stopCameraScanner();
                      setScanMode('file');
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                      scanMode === 'file'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <UploadCloud className="w-3.5 h-3.5" /> File Drop
                  </button>
                </div>
              </div>

              {/* Device Camera Selector if multiple cameras exist */}
              {scanMode === 'camera' && availableCameras.length > 1 && (
                <div className="mt-3 pt-3 border-t border-slate-800/60 flex items-center justify-between gap-2 text-xs">
                  <span className="text-slate-400">Select Camera Device:</span>
                  <select
                    value={selectedCameraId}
                    onChange={(e) => {
                      setSelectedCameraId(e.target.value);
                      if (scanning) {
                        startCameraScanner();
                      }
                    }}
                    className="bg-slate-950 border border-slate-800 text-slate-200 rounded-lg p-1.5 text-xs outline-none"
                  >
                    {availableCameras.map((cam) => (
                      <option key={cam.id} value={cam.id}>
                        {cam.label || `Camera ${cam.id.substring(0, 8)}...`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </CardHeader>

            <CardContent className="space-y-6 pt-2">
              {scannerError && <Alert variant="destructive">{scannerError}</Alert>}

              {/* CAMERA SCANNER VIEWPORT */}
              {scanMode === 'camera' ? (
                <div className="relative bg-slate-950 rounded-2xl border-2 border-dashed border-slate-800 p-4 flex flex-col items-center justify-center min-h-[280px]">
                  <div id="qr-reader" className={`w-full max-w-sm rounded-xl overflow-hidden border border-indigo-500/40 shadow-xl ${scanning ? 'block' : 'hidden'}`} />

                  {scanning ? (
                    <Button variant="outline" onClick={stopCameraScanner} className="mt-4 border-slate-800 text-xs">
                      Stop Camera Scanner
                    </Button>
                  ) : (
                    <div className="text-center py-6 space-y-3">
                      <div className="h-16 w-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400">
                        <QrCode className="w-8 h-8" />
                      </div>
                      <p className="text-sm text-slate-400 max-w-xs mx-auto">
                        Click below to launch device camera stream for live QR code reading.
                      </p>
                      <Button onClick={startCameraScanner} className="shadow-lg shadow-indigo-600/20 bg-indigo-600 hover:bg-indigo-500 text-white">
                        <Camera className="w-4 h-4 mr-2" /> Start Camera Stream
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                /* FILE DROP ZONE SCANNER (IMAGES + PDF) */
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-8 flex flex-col items-center justify-center min-h-[280px] transition-all duration-200 text-center ${
                    isDragOver
                      ? 'border-indigo-500 bg-indigo-950/30 scale-[1.01]'
                      : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*,.pdf,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        processUploadedFile(e.target.files[0]);
                      }
                    }}
                  />

                  {fileScanning ? (
                    <div className="py-6 flex flex-col items-center gap-3">
                      <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
                      <p className="text-sm font-semibold text-slate-200">Parsing PDF &amp; Decoding Pass Payload...</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex justify-center gap-2 text-indigo-400">
                        <div className="h-14 w-14 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center">
                          <UploadCloud className="w-7 h-7" />
                        </div>
                        <div className="h-14 w-14 rounded-2xl bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-400">
                          <FileText className="w-7 h-7" />
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-200">
                          Drop PDF Pass or Image File here or <span className="text-indigo-400 underline">Browse</span>
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          Supports Official PDF Ticket Passes, PNG, JPG, &amp; WEBP scans.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Manual Code Entry Fallback */}
              <form onSubmit={handleManualSubmit} className="space-y-3 pt-4 border-t border-slate-800/80">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <Keyboard className="w-4 h-4 text-indigo-400" />
                  <span>Manual Pass Code Input</span>
                </div>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="EVENTHUB-1-5-A1B2C3D4..."
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    className="font-mono text-xs border-slate-800 bg-slate-950/80"
                  />
                  <Button type="submit" disabled={loading || !manualCode.trim()} className="bg-indigo-600 hover:bg-indigo-500">
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Validate'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Right Column: Visual/Audio Alert Feedback Output */}
          <div className="space-y-6">
            <Card className="bg-slate-900/80 border-slate-800 shadow-2xl">
              <CardHeader>
                <CardTitle className="text-slate-100 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-indigo-400" />
                  <span>Visual &amp; Audio Verification Feedback</span>
                </CardTitle>
                <CardDescription>Live door clearance indicator</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-3">
                    <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-slate-400 text-sm font-medium">Verifying pass with backend...</p>
                  </div>
                ) : !lastScannedResult ? (
                  <div className="py-12 text-center text-slate-500 bg-slate-950/40 rounded-2xl border border-slate-800/60 space-y-2">
                    <QrCode className="w-10 h-10 mx-auto opacity-40" />
                    <p className="text-sm font-medium">Awaiting pass scan...</p>
                    <p className="text-xs text-slate-600">Scan camera, drop PDF ticket, or drop image pass to activate clearance alert</p>
                  </div>
                ) : (
                  /* Visual Feedback Banners: Success (Green), Already (Yellow), Invalid (Red) */
                  <div
                    className={`p-6 rounded-3xl border backdrop-blur-md space-y-4 transition-all duration-300 animate-in zoom-in-95 ${
                      lastScannedResult.type === 'success'
                        ? 'bg-emerald-950/70 border-emerald-500/80 text-emerald-100 shadow-2xl shadow-emerald-900/40 ring-2 ring-emerald-500/30'
                        : lastScannedResult.type === 'already'
                        ? 'bg-amber-950/70 border-amber-500/80 text-amber-100 shadow-2xl shadow-amber-900/40 ring-2 ring-amber-500/30'
                        : 'bg-red-950/70 border-red-500/80 text-red-100 shadow-2xl shadow-red-900/40 ring-2 ring-red-500/30'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {lastScannedResult.type === 'success' ? (
                        <div className="p-3 bg-emerald-500/20 rounded-2xl text-emerald-400 shrink-0">
                          <CheckCircle2 className="w-10 h-10" />
                        </div>
                      ) : lastScannedResult.type === 'already' ? (
                        <div className="p-3 bg-amber-500/20 rounded-2xl text-amber-400 shrink-0">
                          <AlertCircle className="w-10 h-10" />
                        </div>
                      ) : (
                        <div className="p-3 bg-red-500/20 rounded-2xl text-red-400 shrink-0">
                          <XCircle className="w-10 h-10" />
                        </div>
                      )}

                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-widest block opacity-80">
                          Clearance Alert Status
                        </span>
                        <h3 className="text-2xl font-black tracking-tight">
                          {lastScannedResult.status}
                        </h3>
                        <p className="text-xs font-mono opacity-70 mt-0.5">{lastScannedResult.timestamp}</p>
                      </div>
                    </div>

                    <p className="text-xs font-medium leading-relaxed bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
                      {lastScannedResult.message}
                    </p>

                    {lastScannedResult.parsed && (
                      <div className="grid grid-cols-3 gap-2 text-xs bg-slate-950/80 p-3 rounded-2xl border border-slate-800 font-mono">
                        <div>
                          <span className="text-slate-400 block text-[10px]">EVENT ID</span>
                          <span className="font-bold text-slate-100">#{lastScannedResult.parsed.idEvent}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">PERSON ID</span>
                          <span className="font-bold text-slate-100">#{lastScannedResult.parsed.idPerson}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">PASS GUID</span>
                          <span className="font-bold text-slate-100 truncate block">{lastScannedResult.parsed.guid.substring(0, 8)}...</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Check-in Session Log Table */}
            <Card className="bg-slate-900/80 border-slate-800 shadow-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-slate-100 flex items-center gap-2 text-base">
                  <History className="w-4 h-4 text-indigo-400" />
                  <span>Session Check-In Log ({checkInLogs.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {checkInLogs.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4 text-center">No scans recorded in current session.</p>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {checkInLogs.map((log, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80 text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${
                              log.type === 'success'
                                ? 'bg-emerald-400 shadow-sm shadow-emerald-400'
                                : log.type === 'already'
                                ? 'bg-amber-400 shadow-sm shadow-amber-400'
                                : 'bg-red-400 shadow-sm shadow-red-400'
                            }`}
                          />
                          <span className="font-mono text-slate-300 max-w-[180px] truncate">{log.raw}</span>
                        </div>
                        <span className="text-slate-500 font-mono text-[11px]">{log.timestamp}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckInPage;
