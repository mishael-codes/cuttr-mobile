import React from "react";
import * as Icon from "react-feather";

const Offline: React.FC = () => {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="w-full min-h-[60vh] flex items-center justify-center px-5 py-12">
      <div className="glass-card border border-white/10 rounded-2xl p-8 max-w-md w-full flex flex-col items-center text-center shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-6">
          <Icon.WifiOff size={32} />
        </div>
        <h1 className="text-2xl font-display font-bold text-white mb-2">
          You are <span className="text-accent font-semibold">offline</span>
        </h1>
        <p className="text-text-muted text-sm mb-6">
          Please <span className="text-accent font-semibold">connect</span> to the internet to create new links and sync analytics.
        </p>
        <button
          onClick={handleRetry}
          className="w-full py-3 px-6 rounded-xl bg-accent text-black font-semibold hover:bg-accent2 transition-all flex items-center justify-center gap-2 shadow-lg shadow-accent/20 active:scale-95"
        >
          <Icon.RefreshCw size={16} />
          <span>Retry Connection</span>
        </button>
      </div>
    </div>
  );
};

export default Offline;
