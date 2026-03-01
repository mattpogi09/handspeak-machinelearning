import React, { useRef, useCallback, useState, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Camera as CameraIcon, Loader2 } from 'lucide-react';

const videoConstraints = {
  width: 480,
  height: 360,
  facingMode: 'user',
};

export default function Camera() {
  const webcamRef = useRef(null);
  const [hasPermission, setHasPermission] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then(() => { setHasPermission(true); setIsLoading(false); })
      .catch(() => { setHasPermission(false); setIsLoading(false); });
  }, []);

  const handleUserMedia = useCallback(() => setIsLoading(false), []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center w-full h-full min-h-[260px] bg-slate-900 text-white flex-col gap-3">
        <Loader2 size={32} className="animate-spin text-[#42a5f5]" />
        <p className="text-sm text-white/60">Accessing camera...</p>
      </div>
    );
  }

  if (hasPermission === false) {
    return (
      <div className="flex items-center justify-center w-full h-full min-h-[260px] bg-slate-900 text-white flex-col gap-3">
        <CameraIcon size={44} className="text-white/30" />
        <p className="text-sm font-bold text-white/60">Camera access denied</p>
        <p className="text-xs text-white/40 text-center px-8">Please enable camera permissions to practice signs.</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full min-h-[260px] bg-slate-900 overflow-hidden">
      <Webcam
        ref={webcamRef}
        audio={false}
        width={480}
        height={360}
        screenshotFormat="image/jpeg"
        videoConstraints={videoConstraints}
        onUserMedia={handleUserMedia}
        mirrored={true}
        className="w-full h-full object-cover"
      />
      {/* Hand guide overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-40 h-40 rounded-full border-2 border-dashed border-white/40" />
      </div>
    </div>
  );
}

