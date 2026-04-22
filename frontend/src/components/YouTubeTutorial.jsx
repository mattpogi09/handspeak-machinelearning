import React, { useEffect, useState } from 'react';
import { fetchJson } from '../lib/api';

export default function YouTubeTutorial({ word, isLetter = false }) {
  const [videoId, setVideoId] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!word) return;
    let active = true;
    setVideoId(null);
    setLoading(true);

    fetchJson(`/api/youtube/video?word=${encodeURIComponent(word)}&is_letter=${isLetter}`)
      .then((data) => {
        if (active) setVideoId(data.video_id || null);
      })
      .catch(() => {
        if (active) setVideoId(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [word, isLetter]);

  return (
    <div>
      <p style={{ margin: '0 0 7px', fontSize: 10, fontWeight: 900, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
        Tutorial Video
      </p>
      <div style={{
        borderRadius: 14, overflow: 'hidden',
        background: 'rgba(0,0,0,0.4)',
        border: '2px solid rgba(255,255,255,0.1)',
        height: 180, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {loading && (
          <div style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, fontWeight: 700 }}>
            Loading tutorial...
          </div>
        )}
        {!loading && videoId && (
          <iframe
            key={videoId}
            src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={`ASL tutorial for ${word}`}
            style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
          />
        )}
        {!loading && !videoId && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36, fontWeight: 900, color: '#0ea5e9', lineHeight: 1 }}>{word}</div>
            <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, marginTop: 5 }}>ASL Sign</div>
          </div>
        )}
      </div>
    </div>
  );
}
