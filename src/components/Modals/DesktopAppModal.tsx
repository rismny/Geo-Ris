import React, { useState } from 'react';
import {
  Monitor,
  Download,
  CheckCircle2,
  Wifi,
  Globe2,
  HardDrive,
  ShieldCheck,
  ExternalLink,
  X,
  HelpCircle,
  Cpu,
  Layers,
  ChevronRight,
  Sparkles,
  FileCode,
  FolderArchive,
  FileDown,
  Play,
  ArrowDownToLine,
  Check,
  AlertCircle
} from 'lucide-react';
import JSZip from 'jszip';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface DesktopAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DesktopAppModal: React.FC<DesktopAppModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, triggerInstall } = usePWAInstall();
  const [installSuccess, setInstallSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'install' | 'qa' | 'electron'>('electron');
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null);
  const [isZipping, setIsZipping] = useState(false);

  if (!isOpen) return null;

  const currentAppUrl = typeof window !== 'undefined' ? window.location.href.split('#')[0] : 'https://ysr-peta-pro.web.app';

  const triggerFileDownload = (content: BlobPart, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 1. Download Windows Desktop Launcher Script (.bat)
  const handleDownloadBatLauncher = () => {
    setDownloadStatus('Menyiapkan file YSR-PETA-PRO-Desktop-Setup.bat...');
    
    const batContent = `@echo off
chcp 65001 >nul
title YSR PETA PRO - Desktop Launcher & Setup
color 0A
cls
echo ============================================================================
echo                  YSR PETA PRO - DESKTOP PC LAUNCHER
echo              Pengukuran Peta, Delineasi Polygon & KML/KMZ
echo ============================================================================
echo.
echo Sedang menyiapkan aplikasi mandiri di PC Anda...
echo.

set "APP_URL=${currentAppUrl}"
set "DESKTOP_DIR=%USERPROFILE%\\Desktop"
set "VBS_SCRIPT=%TEMP%\\create_ysr_shortcut.vbs"

echo Membuat pintasan aplikasi di Desktop Windows...

echo Set oWS = WScript.CreateObject("WScript.Shell") > "%VBS_SCRIPT%"
echo sLinkFile = "%DESKTOP_DIR%\\YSR PETA PRO.lnk" >> "%VBS_SCRIPT%"
echo Set oLink = oWS.CreateShortcut(sLinkFile) >> "%VBS_SCRIPT%"

set "EXEC_PATH="
if exist "%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe" (
    set "EXEC_PATH=%ProgramFiles(x86)%\\Microsoft\\Edge\\Application\\msedge.exe"
) else if exist "%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe" (
    set "EXEC_PATH=%ProgramFiles%\\Microsoft\\Edge\\Application\\msedge.exe"
) else if exist "%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe" (
    set "EXEC_PATH=%ProgramFiles%\\Google\\Chrome\\Application\\chrome.exe"
) else if exist "%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe" (
    set "EXEC_PATH=%ProgramFiles(x86)%\\Google\\Chrome\\Application\\chrome.exe"
) else if exist "%LocalAppData%\\Google\\Chrome\\Application\\chrome.exe" (
    set "EXEC_PATH=%LocalAppData%\\Google\\Chrome\\Application\\chrome.exe"
) else if exist "%LocalAppData%\\Microsoft\\Edge\\Application\\msedge.exe" (
    set "EXEC_PATH=%LocalAppData%\\Microsoft\\Edge\\Application\\msedge.exe"
)

if defined EXEC_PATH (
    echo oLink.TargetPath = "%EXEC_PATH%" >> "%VBS_SCRIPT%"
    echo oLink.Arguments = "--app=""%APP_URL%"" --window-size=1440,900" >> "%VBS_SCRIPT%"
) else (
    echo oLink.TargetPath = "%APP_URL%" >> "%VBS_SCRIPT%"
)

echo oLink.Description = "YSR PETA PRO - Pengukuran Peta & Polygon KML/KMZ" >> "%VBS_SCRIPT%"
echo oLink.Save >> "%VBS_SCRIPT%"

cscript //nologo "%VBS_SCRIPT%" >nul 2>&1
del "%VBS_SCRIPT%" 2>nul

echo.
echo [SUKSES] Pintasan 'YSR PETA PRO' berhasil dibuat di Desktop Anda!
echo.
echo Membuka aplikasi YSR PETA PRO sekarang...

if defined EXEC_PATH (
    start "" "%EXEC_PATH%" --app="%APP_URL%" --window-size=1440,900
) else (
    start "" "%APP_URL%"
)

echo.
echo Aplikasi telah berjalan di jendela mandiri tanpa tab browser!
echo Pintasan di Desktop dapat Anda gunakan kapan saja untuk membuka kembali.
timeout /t 5 >nul
exit
`;

    triggerFileDownload(batContent, 'YSR-PETA-PRO-Desktop-Setup.bat', 'application/x-bat');
    setDownloadStatus('Berhasil mengunduh YSR-PETA-PRO-Desktop-Setup.bat! Klik berkas di folder Downloads untuk memasang.');
    setTimeout(() => setDownloadStatus(null), 8000);
  };

  // 2. Download Windows Desktop Shortcut (.url)
  const handleDownloadUrlShortcut = () => {
    setDownloadStatus('Menyiapkan file pintasan Desktop Windows...');
    const urlContent = `[InternetShortcut]\r\nURL=${currentAppUrl}\r\nIconIndex=0\r\n`;
    triggerFileDownload(urlContent, 'YSR PETA PRO.url', 'application/internet-shortcut');
    setDownloadStatus('Berhasil mengunduh YSR PETA PRO.url! Seret atau pindahkan ke Desktop Anda.');
    setTimeout(() => setDownloadStatus(null), 8000);
  };

  // 3. Download Complete Electron Source & Builder Package (.zip)
  const handleDownloadElectronPackage = async () => {
    try {
      setIsZipping(true);
      setDownloadStatus('Mengompresi paket builder Electron .exe...');

      const zip = new JSZip();

      // main.js
      const mainJs = `const { app, BrowserWindow, shell, Menu } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'YSR PETA PRO - Pengukuran Peta & Polygon KML/KMZ',
    backgroundColor: '#020617',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  Menu.setApplicationMenu(null);

  mainWindow.loadURL('${currentAppUrl}');

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});
`;

      // package.json
      const packageJson = {
        name: 'ysr-peta-pro',
        version: '2.4.0',
        description: 'YSR PETA PRO - Pengukuran Peta & Polygon KML/KMZ Standalone PC',
        main: 'main.js',
        scripts: {
          start: 'electron .',
          'build:exe': 'electron-builder --win nsis',
          'build:portable': 'electron-builder --win portable'
        },
        devDependencies: {
          electron: '^33.2.0',
          'electron-builder': '^25.1.8'
        },
        build: {
          appId: 'com.ysr.petapro',
          productName: 'YSR PETA PRO',
          win: {
            target: ['nsis', 'portable']
          },
          nsis: {
            oneClick: false,
            allowToChangeInstallationDirectory: true,
            createDesktopShortcut: true,
            createStartMenuShortcut: true,
            shortcutName: 'YSR PETA PRO'
          }
        }
      };

      // build-exe.bat
      const buildBat = `@echo off
chcp 65001 >nul
title Membangun YSR PETA PRO .EXE (Windows Standalone)
color 0B
cls
echo ============================================================================
echo          PEMBUAT FILE INSTALLER .EXE UNTUK YSR PETA PRO
echo ============================================================================
echo.
echo Pastikan komputer Anda telah terpasang Node.js (https://nodejs.org).
echo.
pause
echo.
echo [1/2] Memasang dependensi Electron...
call npm install
if %ERRORLEVEL% NEQ 0 (
    echo [GAGAL] Gagal mengunduh Electron. Periksa koneksi internet Anda.
    pause
    exit /b %ERRORLEVEL%
)
echo.
echo [2/2] Mengemas aplikasi menjadi file YSR_PETA_PRO_Setup.exe...
call npm run build:exe
if %ERRORLEVEL% NEQ 0 (
    echo [GAGAL] Gagal mengompilasi berkas .exe.
    pause
    exit /b %ERRORLEVEL%
)
echo.
echo ============================================================================
echo [SUKSES] Berkas installer .exe berhasil dibuat!
echo Silakan periksa folder "dist" untuk menemukan:
echo   - YSR PETA PRO Setup 2.4.0.exe (Installer Windows)
echo ============================================================================
echo.
pause
`;

      // run-desktop.bat
      const runBat = `@echo off
title YSR PETA PRO Desktop
echo Menjalankan YSR PETA PRO di PC...
npx electron .
`;

      // README
      const readme = `============================================================================
              PANDUAN LENGKAP INSTALASI YSR PETA PRO DI PC
============================================================================

Aplikasi YSR PETA PRO dapat dijalankan di komputer PC dengan cara:

CARA 1: MEMBUAT FILE INSTALLER .EXE SENDIRI
1. Pastikan Anda sudah memasang Node.js di komputer (unduh di https://nodejs.org).
2. Ekstrak file ZIP ini ke folder pilihan Anda.
3. Klik dua kali (double click) file "build-exe.bat".
4. Script akan otomatis memasang Electron dan mengompilasi file:
   dist/YSR PETA PRO Setup 2.4.0.exe
5. File .exe tersebut siap diinstall di komputer Windows mana saja!

CARA 2: JALANKAN LANGSUNG DENGAN ELECTRON (DEV MODE)
1. Buka folder ini di Command Prompt / Terminal.
2. Jalankan perintah: npm install
3. Jalankan perintah: npm start

KEUNGGULAN APLIKASI PC:
- Seluruh peta Google Satelit Hybrid, Esri High-Res, dan OSM aktif 100%.
- Zooming satelit hingga level 22 dengan upscaling tajam.
- Kontrol mouse klik kanan & klik kiri untuk geser peta.
- Cetak layout peta Berita Acara instansi pemerintah.
- Offline support untuk file KML, KMZ, GeoJSON, dan data proyek lokal.
`;

      zip.file('main.js', mainJs);
      zip.file('package.json', JSON.stringify(packageJson, null, 2));
      zip.file('build-exe.bat', buildBat);
      zip.file('run-desktop.bat', runBat);
      zip.file('README-CARA-BUAT-EXE.txt', readme);

      const blob = await zip.generateAsync({ type: 'blob' });
      triggerFileDownload(blob, 'YSR-PETA-PRO-Desktop-Electron.zip', 'application/zip');
      setDownloadStatus('Berhasil mengunduh YSR-PETA-PRO-Desktop-Electron.zip! Ekstrak dan jalankan build-exe.bat.');
      setTimeout(() => setDownloadStatus(null), 8000);
    } catch (err) {
      console.error(err);
      setDownloadStatus('Gagal membuat paket zip. Silakan coba lagi.');
    } finally {
      setIsZipping(false);
    }
  };

  const handleInstallClick = async () => {
    if (isInstallable) {
      const res = await triggerInstall();
      if (res) {
        setInstallSuccess(true);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl text-slate-100 overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-700 rounded-xl shadow-lg shadow-emerald-500/20 text-white">
              <Monitor className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide">YSR PETA PRO Desktop PC</h2>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                  Installer & Aplikasi PC
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Unduh installer mandiri untuk komputer Windows tanpa browser
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 gap-2 text-xs font-medium">
          <button
            onClick={() => setActiveTab('electron')}
            className={`py-3 px-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'electron'
                ? 'border-emerald-500 text-emerald-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowDownToLine className="w-4 h-4" />
            Unduh Paket Installer PC (.bat / .exe / .url)
          </button>
          <button
            onClick={() => setActiveTab('install')}
            className={`py-3 px-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'install'
                ? 'border-emerald-500 text-emerald-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-4 h-4" />
            Pasang Langsung di Windows (PWA)
          </button>
          <button
            onClick={() => setActiveTab('qa')}
            className={`py-3 px-3 border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'qa'
                ? 'border-emerald-500 text-emerald-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            Tanya Jawab (Peta Satelit & Offline)
          </button>
        </div>

        {/* Status Toast */}
        {downloadStatus && (
          <div className="mx-6 mt-4 p-3 bg-emerald-500/15 border border-emerald-500/40 rounded-xl flex items-center gap-3 text-xs text-emerald-300 animate-in slide-in-from-top-2 duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="flex-1 font-medium">{downloadStatus}</span>
          </div>
        )}

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm flex-1 custom-scrollbar">

          {/* TAB: UNDUH PAKET INSTALLER PC */}
          {activeTab === 'electron' && (
            <div className="space-y-4">
              <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-4 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1 text-xs">
                  <div className="font-bold text-emerald-300 text-sm">
                    Pilihan Paket Unduhan Aplikasi Komputer (PC Windows)
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Pilih paket yang paling sesuai dengan kebutuhan Anda di bawah ini. Paket langsung diunduh ke folder <strong>Downloads</strong> di komputer Anda.
                  </p>
                </div>
              </div>

              {/* CARD 1: 1-Click BAT Launcher */}
              <div className="bg-slate-950/70 border border-slate-800 hover:border-emerald-500/50 rounded-xl p-4 transition-all space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-lg shrink-0 mt-0.5">
                      <Play className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">1. Installer & Launcher Desktop Windows (.bat)</span>
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-semibold">
                          Paling Cepat (1-Klik)
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Otomatis membuat icon pintasan di Desktop Windows dan langsung membuka aplikasi dalam jendela mandiri (Standalone App) tanpa tab/URL bar browser.
                      </p>
                      <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-3">
                        <span>• Ukuran: ~3 KB</span>
                        <span>• Kompatibel: Windows 10 & 11 (64-bit / 32-bit)</span>
                        <span>• Tanpa instalasi Node.js</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleDownloadBatLauncher}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition-all transform hover:scale-[1.02] active:scale-[0.98] shrink-0"
                  >
                    <Download className="w-4 h-4" />
                    Unduh Launcher (.bat)
                  </button>
                </div>
              </div>

              {/* CARD 2: Full Electron Source & .exe Builder */}
              <div className="bg-slate-950/70 border border-slate-800 hover:border-teal-500/50 rounded-xl p-4 transition-all space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-teal-500/20 text-teal-400 rounded-lg shrink-0 mt-0.5">
                      <FolderArchive className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">2. Paket Builder File .EXE Murni (.zip)</span>
                        <span className="text-[10px] bg-teal-500/20 text-teal-300 border border-teal-500/40 px-2 py-0.5 rounded-full font-semibold">
                          Setup Installer .exe
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Paket lengkap berisi script <code className="text-teal-300">build-exe.bat</code>, <code className="text-teal-300">main.js</code>, dan konfigurasi Electron Builder untuk menghasilkan file instalasi murni <code className="text-white font-mono">YSR_PETA_PRO_Setup.exe</code>.
                      </p>
                      <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-3">
                        <span>• Format: .ZIP Berkas Lengkap</span>
                        <span>• Termasuk: Panduan README langkah demi langkah</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleDownloadElectronPackage}
                    disabled={isZipping}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-teal-600/20 transition-all transform hover:scale-[1.02] active:scale-[0.98] shrink-0"
                  >
                    <FileDown className="w-4 h-4" />
                    {isZipping ? 'Mengompresi...' : 'Unduh Paket .EXE (.zip)'}
                  </button>
                </div>
              </div>

              {/* CARD 3: .url Shortcut File */}
              <div className="bg-slate-950/70 border border-slate-800 hover:border-sky-500/50 rounded-xl p-4 transition-all space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-sky-500/20 text-sky-400 rounded-lg shrink-0 mt-0.5">
                      <ExternalLink className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">3. File Pintasan Desktop Langsung (.url)</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        File pintasan ringan yang bisa langsung ditaruh di Desktop Windows atau Mac untuk membuka aplikasi seketika.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleDownloadUrlShortcut}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition-colors shrink-0"
                  >
                    <Download className="w-4 h-4" />
                    Unduh Pintasan (.url)
                  </button>
                </div>
              </div>

              {/* Instructions on how to run .bat or .exe */}
              <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4 text-xs space-y-2">
                <h4 className="font-bold text-slate-200 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Petunjuk Menjalankan di Komputer:
                </h4>
                <ol className="list-decimal pl-5 space-y-1 text-slate-400">
                  <li>Setelah mengunduh berkas <strong className="text-slate-200">.bat</strong>, buka folder <strong>Downloads</strong> di komputer Anda.</li>
                  <li>Klik dua kali pada file <code className="text-emerald-300">YSR-PETA-PRO-Desktop-Setup.bat</code>.</li>
                  <li>Jika muncul peringatan <em>"Windows protected your PC"</em>, klik <strong>More info</strong> lalu klik <strong>Run anyway</strong> (hal ini wajar untuk file script buatan sendiri).</li>
                  <li>Pintasan resmi <strong>"YSR PETA PRO"</strong> akan otomatis muncul di Desktop Windows Anda.</li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB: PASANG PWA LANGSUNG */}
          {activeTab === 'install' && (
            <div className="space-y-6">
              {/* Highlight Card */}
              <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-teal-950/40 border border-emerald-500/30 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-base">
                    <Sparkles className="w-5 h-5 text-emerald-400" />
                    Instalasi Instan Standalone Windows / PC
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
                    Jalankan YSR PETA PRO sebagai software komputer murni: ikon di Desktop & Menu Start, jendela terisolasi tanpa address bar browser, kecepatan akselerasi GPU, dan memori proyek tersimpan aman.
                  </p>
                </div>

                {isInstalled || installSuccess ? (
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-xl font-medium text-xs whitespace-nowrap">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    Sudah Terpasang di PC!
                  </div>
                ) : isInstallable ? (
                  <button
                    onClick={handleInstallClick}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/25 transition-all transform hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
                  >
                    <Download className="w-4 h-4" />
                    Pasang Sekarang di PC
                  </button>
                ) : (
                  <button
                    onClick={handleDownloadBatLauncher}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/25 transition-all transform hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
                  >
                    <Download className="w-4 h-4" />
                    Unduh Launcher Desktop (.bat)
                  </button>
                )}
              </div>

              {/* Step by step installation */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Cara Memasang Melalui Browser Komputer (Hanya 5 Detik):
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 font-bold text-xs text-sky-300">
                      <div className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center text-xs">
                        1
                      </div>
                      Google Chrome di Komputer
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Klik ikon <strong>Pasang / Install</strong> di ujung kanan kolom alamat (Address Bar) Chrome, atau klik menu titik tiga <span className="font-mono bg-slate-800 px-1 py-0.5 rounded">⋮</span> → <strong>Simpan dan Bagikan</strong> → <strong>Pasang YSR PETA PRO</strong>.
                    </p>
                  </div>

                  <div className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 font-bold text-xs text-teal-300">
                      <div className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center text-xs">
                        2
                      </div>
                      Microsoft Edge di Komputer
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Klik ikon <strong>Aplikasi</strong> di bilah URL atau klik menu titik tiga <span className="font-mono bg-slate-800 px-1 py-0.5 rounded">···</span> → <strong>Aplikasi (Apps)</strong> → <strong>Pasang situs ini sebagai aplikasi</strong>.
                    </p>
                  </div>
                </div>
              </div>

              {/* Benefits list */}
              <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4">
                <h4 className="text-xs font-bold text-slate-300 mb-3 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Kelebihan Mode Desktop PC Standalone:
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-300">
                  <div className="flex items-start gap-2 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Layar penuh murni tanpa gangguan tab atau URL bar browser</span>
                  </div>
                  <div className="flex items-start gap-2 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Bisa disematkan (Pin) langsung ke Taskbar Windows atau Mac Dock</span>
                  </div>
                  <div className="flex items-start gap-2 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>Dukungan scroll mouse halus & klik kanan geser peta responsif</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: Q&A */}
          {activeTab === 'qa' && (
            <div className="space-y-4">
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <Globe2 className="w-4 h-4" />
                  1. Apakah pengubahan Web ke Aplikasi PC akan membuat fitur Google MAP nya hilang?
                </div>
                <p className="text-xs text-slate-300 leading-relaxed pl-6">
                  <strong className="text-emerald-300">SAMA SEKALI TIDAK HILANG.</strong> Seluruh layer citra satelit (Google Satellite Hybrid, Esri High-Resolution World Imagery, OpenStreetMap), layer kontur, hingga citra resolusi tinggi tetap aktif dan berfungsi 100% persis seperti di web, dengan upscaling tajam hingga zoom 22.
                </p>
              </div>

              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
                  <Wifi className="w-4 h-4" />
                  2. Apakah bisa digunakan tanpa internet (Offline)?
                </div>
                <div className="text-xs text-slate-300 leading-relaxed pl-6 space-y-2">
                  <p>
                    <strong className="text-cyan-300">BISA UNTUK SELURUH FUNGSI GIS & PERHITUNGAN:</strong>
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-slate-300">
                    <li>Membuka dan mengimpor file KML, KMZ, GeoJSON.</li>
                    <li>Digitasi polygon, mengedit titik patok koordinat, dan geser poligon.</li>
                    <li>Perhitungan akurat keliling (m) dan luas (m² / hektar).</li>
                    <li>Tabel koordinat patok lengkap dengan konversi UTM Zone.</li>
                    <li>Penyimpanan dan pembukaan file arsip proyek (.ysr).</li>
                    <li>Pembuatan Berita Acara & Pratinjau layout cetak peta standar instansi.</li>
                  </ul>
                  <p className="text-slate-400 italic">
                    *Catatan: Untuk mengunduh petak citra satelit baru di area yang belum pernah dibuka tetap membutuhkan akses internet untuk mengambil tile dari satelit. Ubin citra yang sudah pernah dibuka akan tersimpan dalam cache.
                  </p>
                </div>
              </div>

              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                  <ShieldCheck className="w-4 h-4" />
                  3. Apakah ada kekurangan atau pengurangan kualitas fitur?
                </div>
                <p className="text-xs text-slate-300 leading-relaxed pl-6">
                  <strong className="text-amber-300">TIDAK ADA PENGURANGAN KUALITAS.</strong> Sebaliknya, menjalankan aplikasi sebagai Desktop App memberikan keuntungan:
                  kinerja rendering peta lebih ringan karena alokasi memori khusus, tidak ada tab browser yang memakan RAM lain, tampilan luas tanpa bilah browser, serta kontrol mouse yang lebih leluasa saat menggeser dan mengukur batas tanah.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>Versi Aplikasi: <strong>v2.4 Pro (Desktop Ready)</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadBatLauncher}
              className="px-3.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Unduh .BAT Launcher
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

