import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, MessageCircle, Map as MapIcon, RotateCcw } from 'lucide-react';
import { getStoredStudyProgress, getIslandProgress, loadStudyProgress } from '../study/studyVoyage';
import { fetchJson } from '../../lib/api';
import { useIslands } from '../../contexts/IslandsContext';
import IslandNode from './IslandNode';
import Skeleton from '../../components/Skeleton';

export default function IslandsHub() {
  const navigate = useNavigate();
  const { islands: rawIslands, islandsLoading, error } = useIslands();
  const [masteryProgress, setMasteryProgress] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState(true);
  const [localProgress, setLocalProgress] = useState(() => getStoredStudyProgress());
  const mapContainerRef = useRef(null);

  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const handleScroll = () => {
    if (mapContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = mapContainerRef.current;
      setShowLeftArrow(scrollLeft > 0);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    const container = mapContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      handleScroll(); // Check initial state
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, []);

  const scrollLeft = () => {
    if (mapContainerRef.current) {
      mapContainerRef.current.scrollBy({ left: -300, behavior: 'smooth' });
    }
  };

  const scrollRight = () => {
    if (mapContainerRef.current) {
      mapContainerRef.current.scrollBy({ left: 300, behavior: 'smooth' });
    }
  };

  const user = JSON.parse(localStorage.getItem('handspeak_user') || '{}');

  useEffect(() => {
    let active = true;
    loadStudyProgress().then((p) => { if (active) setLocalProgress(p); });
    if (user?.id) {
      fetchJson(`/api/conversation/progress/${user.id}`)
        .then((data) => {
          if (active) {
            setMasteryProgress(data.islands);
            setLoadingProgress(false);
          }
        })
        .catch((e) => {
          console.error("Failed to load map progress", e);
          if (active) setLoadingProgress(false);
        });
    } else {
      setLoadingProgress(false);
    }
    return () => { active = false; };
  }, [user?.id]);

  const islands = useMemo(() => {
    if (!masteryProgress || rawIslands.length === 0) return [];
    
    return rawIslands.map((island) => {
      const record = masteryProgress.find(m => m.island_id === island.id);
      const islandProgress = getIslandProgress(localProgress, island.id);
      
      const unlocked = record ? record.is_unlocked : false;
      const completed = record ? record.is_completed : false;
      
      return {
        ...island,
        unlocked,
        completed,
        masteryScores: record || null,
        active: unlocked && !completed, // Currently active node
        doneLevels: islandProgress.completedLevelIds.length,
        totalLevels: island.levels.length,
      };
    });
  }, [rawIslands, masteryProgress, localProgress]);

  // Auto-scroll to the currently active island
  useEffect(() => {
    if (!islandsLoading && !loadingProgress && islands.length > 0 && mapContainerRef.current) {
      const activeIndex = islands.findIndex(i => i.active);
      const targetIndex = activeIndex >= 0 ? activeIndex : 0;
      
      setTimeout(() => {
        if (mapContainerRef.current) {
          const container = mapContainerRef.current;
          const islandWidth = 220; // Approx width of island node + margin
          const offset = (targetIndex * islandWidth) - (container.clientWidth / 2) + (islandWidth / 2);
          
          container.scrollTo({
            left: Math.max(0, offset),
            behavior: 'smooth'
          });
        }
      }, 500); // Wait for render
    }
  }, [islands, islandsLoading]);

  return (
    <div style={{
      minHeight: '100vh',
      fontFamily: "'Nunito', sans-serif",
      background: 'radial-gradient(ellipse at 20% -10%, #38bdf8 0%, #0ea5e9 22%, #0369a1 52%, #082f49 80%, #041421 100%)',
      color: 'white',
      padding: '28px 24px 60px',
    }}>
      <header style={{
        maxWidth: 1100, margin: '0 auto', display: 'flex',
        alignItems: 'center', justifyContent: 'space-between', marginBottom: 28,
      }}>
        <button onClick={() => navigate('/dashboard')}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(255,255,255,0.22)',
            padding: '9px 16px', borderRadius: 50, cursor: 'pointer',
            color: 'white', fontWeight: 800, fontSize: 13,
          }}>
          <ArrowLeft size={15} /> Dashboard
        </button>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)' }}>Your Voyage</div>
          <div style={{ fontSize: 22, fontWeight: 900 }}>Islands of HandSpeak</div>
        </div>
      </header>

      <section style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{
          background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)',
          border: '1.5px solid rgba(255,255,255,0.18)', borderRadius: 22,
          padding: '20px 24px', marginBottom: 40,
          display: 'flex', gap: 14, alignItems: 'flex-start',
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14,
            background: 'rgba(56,189,248,0.18)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <MessageCircle size={22} color="#60a5fa" />
          </div>
          <div>
            <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 900 }}>One journey, three ways to practice</h2>
            <p style={{ margin: 0, fontSize: 14, color: 'rgba(255,255,255,0.75)', lineHeight: 1.55 }}>
              Welcome to the HandSpeak archipelago! Journey from island to island. 
              Each island unlocks new signs and real conversations. Scroll to explore your voyage map.
            </p>
          </div>
        </div>

        {error ? (
          <div style={{
            textAlign: 'center', padding: '60px 20px', background: 'rgba(255,0,0,0.05)',
            border: '1px solid rgba(239,68,68,0.2)', borderRadius: 24, margin: '40px 0'
          }}>
            <MapIcon size={48} color="#ef4444" style={{ margin: '0 auto 16px', opacity: 0.8 }} />
            <h3 style={{ fontSize: 20, margin: '0 0 8px', color: '#fca5a5' }}>Map Unavailable</h3>
            <p style={{ margin: '0 0 20px', color: 'rgba(255,255,255,0.7)', fontSize: 15 }}>{error}</p>
            <button onClick={() => window.location.reload()}
              style={{
                background: 'rgba(239,68,68,0.2)', border: 'none', color: '#fca5a5',
                padding: '10px 24px', borderRadius: 50, fontWeight: 700, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: 8
              }}>
              <RotateCcw size={16} /> Try Again
            </button>
          </div>
        ) : (
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            {showLeftArrow && (
              <button
                onClick={scrollLeft}
                style={{
                  position: 'absolute',
                  left: 20,
                  zIndex: 20,
                  background: 'rgba(56,189,248,0.3)',
                  border: '1.5px solid rgba(255,255,255,0.3)',
                  borderRadius: '50%',
                  width: 44,
                  height: 44,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'white',
                  backdropFilter: 'blur(8px)',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(56,189,248,0.5)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(56,189,248,0.3)'}
              >
                <ArrowLeft size={20} />
              </button>
            )}

            <div 
              ref={mapContainerRef}
              onScroll={handleScroll}
              style={{
                display: 'flex',
                alignItems: 'center',
                overflowX: 'auto',
                padding: 'clamp(200px, 40vw, 360px) clamp(40px, 8vw, 80px) 140px',
                margin: '-120px -24px 0 -24px',
                width: '100%',
                WebkitOverflowScrolling: 'touch',
                scrollbarWidth: 'none',
                msOverflowStyle: 'none',
                }}
                className="hide-scrollbar"
            >
              {(islandsLoading || loadingProgress) || islands.length === 0 ? (
                <div style={{ display: 'flex', gap: 0, alignItems: 'center', opacity: 0.5 }}>
                   {[1,2,3,4,5].map(i => (
                      <div key={i} style={{ width: 340, flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
                        <Skeleton width={180} height={180} borderRadius="50%" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }} />
                        <Skeleton width={120} height={24} borderRadius={12} />
                      </div>
                   ))}
                </div>
              ) : (
                islands.map((island, index) => (
                  <IslandNode 
                    key={island.id}
                    island={island}
                    index={index}
                    isFirst={index === 0}
                    isLast={index === islands.length - 1}
                    locked={!island.unlocked}
                    completed={island.completed}
                    active={island.unlocked && !island.completed}
                    onClick={() => navigate(`/islands/${island.id}`)}
                  />
                ))
              )}
            </div>

            {showRightArrow && (
              <button
                onClick={scrollRight}
                style={{
                  position: 'absolute',
                  right: 20,
                  zIndex: 20,
                  background: 'rgba(56,189,248,0.3)',
                  border: '1.5px solid rgba(255,255,255,0.3)',
                  borderRadius: '50%',
                  width: 44,
                  height: 44,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'white',
                  backdropFilter: 'blur(8px)',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(56,189,248,0.5)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(56,189,248,0.3)'}
              >
                <ArrowRight size={20} />
              </button>
            )}
          </div>
        )}
      </section>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}
