import React, { useState, useEffect } from 'react';
import CuttrMobileApp from './CuttrMobileApp';
import * as Feather from 'react-feather';

export const DeviceFrameContainer: React.FC = () => {
  const [deviceView, setDeviceView] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768;
    }
    return true;
  });

  const [currentTime, setCurrentTime] = useState('9:41');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, '0');
      setCurrentTime(`${hours % 12 || 12}:${minutes}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#030303] text-white flex flex-col items-center justify-center p-0 sm:p-6 select-none relative overflow-x-hidden">
      {/* Top Bar Controls for Desktop */}
      <div className="w-full max-w-5xl hidden md:flex items-center justify-between py-3 px-4 mb-2 z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface border border-white/10 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-accent font-bold">Expo SDK 51</span>
            <span className="text-text-muted">· React Native</span>
          </div>
          <span className="text-xs text-text-muted">
            Cuttr Mobile Application
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setDeviceView(!deviceView)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-surface border border-white/10 hover:border-accent text-xs font-semibold text-text-muted hover:text-white transition-all shadow-sm"
          >
            <Feather.Smartphone size={14} className={deviceView ? 'text-accent' : ''} />
            <span>{deviceView ? 'Switch to Full Screen' : 'Switch to Phone Mockup'}</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      {deviceView ? (
        /* Phone Mockup Frame (iPhone 16 Pro Style) */
        <div className="relative w-full max-w-[395px] h-[835px] max-h-[96vh] rounded-[52px] bg-[#1a1a1a] p-[11px] shadow-[0_25px_70px_rgba(0,0,0,0.9),0_0_0_2px_rgba(255,255,255,0.1),0_0_40px_rgba(221,182,64,0.15)] transition-all duration-300 flex flex-col my-auto border border-white/15">
          {/* External Hardware Buttons (Mocked) */}
          <div className="absolute -left-[14px] top-[115px] w-[3px] h-[28px] bg-neutral-700 rounded-l-sm" />
          <div className="absolute -left-[14px] top-[155px] w-[3px] h-[50px] bg-neutral-700 rounded-l-sm" />
          <div className="absolute -left-[14px] top-[215px] w-[3px] h-[50px] bg-neutral-700 rounded-l-sm" />
          <div className="absolute -right-[14px] top-[170px] w-[3px] h-[75px] bg-neutral-700 rounded-r-sm" />

          {/* Inner Display Bezel */}
          <div className="relative w-full h-full rounded-[42px] bg-[#050505] overflow-hidden flex flex-col">
            {/* Status Bar / Dynamic Island */}
            <div className="w-full h-11 bg-[#050505] flex items-center justify-between px-7 pt-1 z-30 flex-shrink-0 select-none">
              <span className="text-xs font-semibold tracking-tight text-white">
                {currentTime}
              </span>

              {/* Dynamic Island Pill */}
              <div className="w-[110px] h-[26px] bg-black rounded-full flex items-center justify-end px-2 border border-white/5 shadow-inner">
                <div className="w-2.5 h-2.5 rounded-full bg-[#0a0a0a] border border-neutral-800 mr-1" />
              </div>

              {/* Status Icons */}
              <div className="flex items-center gap-1.5 text-white">
                <Feather.Wifi size={12} />
                <div className="w-4 h-2.5 border border-white rounded-sm p-[1px] flex items-center">
                  <div className="w-full h-full bg-white rounded-[1px]" />
                </div>
              </div>
            </div>

            {/* React Native Application View */}
            <div className="flex-1 overflow-hidden relative">
              <CuttrMobileApp />
            </div>

            {/* Home Indicator Bar */}
            <div className="w-full h-5 bg-[#0a0a0a] flex items-center justify-center z-30 flex-shrink-0">
              <div className="w-32 h-1 bg-white/40 rounded-full" />
            </div>
          </div>
        </div>
      ) : (
        /* Full Screen Mobile View */
        <div className="w-full max-w-md h-screen max-h-[920px] bg-[#050505] flex flex-col relative overflow-hidden sm:rounded-3xl sm:border sm:border-white/10 shadow-2xl">
          <CuttrMobileApp />
        </div>
      )}
    </div>
  );
};

export default DeviceFrameContainer;
