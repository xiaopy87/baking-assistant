import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import styles from './Timer.module.css';

function fmtT(sec) {
  const s = Math.abs(Math.round(sec));
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
}

function minToTimeStr(m) {
  const total = ((m % 1440) + 1440) % 1440;
  return `${Math.floor(total / 60).toString().padStart(2, '0')}:${(total % 60).toString().padStart(2, '0')}`;
}

export default function Timer() {
  const location = useLocation();
  const navigate = useNavigate();
  const { recipes } = useApp();

  const recipeId = location.state?.recipeId;
  const startMin = location.state?.startMin ?? null;
  const recipe = recipes.find(r => r.id === recipeId);

  const allTasks = recipe ? recipe.days.flatMap(d => d.tasks) : [];
  const serialIds = allTasks.filter(t => t.serial).map(t => t.id);

  const initState = useCallback(() => {
    const s = {};
    allTasks.forEach(t => { s[t.id] = { status: 'waiting', remaining: t.totalSec, total: t.totalSec, overtime: 0 }; });
    return s;
  }, [recipeId]);

  const [taskState, setTaskState] = useState(initState);
  const [started, setStarted] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    setTaskState(initState());
    setStarted(false);
    setPendingConfirm(null);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, [recipeId]);

  function getTask(id) { return allTasks.find(t => t.id === id); }

  function activateTask(id, stateSnapshot, setter) {
    setter(prev => {
      if (prev[id]?.status !== 'waiting') return prev;
      const next = { ...prev, [id]: { ...prev[id], status: 'running' } };
      const t = getTask(id);
      if (t?.parWith && next[t.parWith]?.status === 'waiting') {
        if (t.delayAfterPar) {
          setTimeout(() => {
            setter(p => {
              if (p[t.parWith]?.status !== 'waiting') return p;
              return { ...p, [t.parWith]: { ...p[t.parWith], status: 'running' } };
            });
          }, t.delayAfterPar * 1000);
        } else {
          next[t.parWith] = { ...next[t.parWith], status: 'running' };
        }
      }
      return next;
    });
  }

  function advanceSerial(id, setter) {
    const idx = serialIds.indexOf(id);
    if (idx >= 0 && idx < serialIds.length - 1) {
      const nextId = serialIds[idx + 1];
      setter(prev => {
        if (prev[nextId]?.status !== 'waiting') return prev;
        const next = { ...prev, [nextId]: { ...prev[nextId], status: 'running' } };
        const nt = getTask(nextId);
        if (nt?.parWith && next[nt.parWith]?.status === 'waiting') {
          if (nt.delayAfterPar) {
            setTimeout(() => {
              setter(p => {
                if (p[nt.parWith]?.status !== 'waiting') return p;
                return { ...p, [nt.parWith]: { ...p[nt.parWith], status: 'running' } };
              });
            }, nt.delayAfterPar * 1000);
          } else {
            next[nt.parWith] = { ...next[nt.parWith], status: 'running' };
          }
        }
        return next;
      });
    }
  }

  function markDone(id) {
    setPendingConfirm(null);
    setTaskState(prev => {
      const next = { ...prev, [id]: { ...prev[id], status: 'done' } };
      const t = getTask(id);
      if (t?.parWith) {
        const pw = next[t.parWith]?.status;
        if (pw === 'done' || pw === 'skipped') {
          const primaryId = t.serial ? id : t.parWith;
          const idx = serialIds.indexOf(primaryId);
          if (idx >= 0 && idx < serialIds.length - 1) {
            const nextId = serialIds[idx + 1];
            if (next[nextId]?.status === 'waiting') {
              next[nextId] = { ...next[nextId], status: 'running' };
              const nt = getTask(nextId);
              if (nt?.parWith && next[nt.parWith]?.status === 'waiting' && !nt.delayAfterPar) {
                next[nt.parWith] = { ...next[nt.parWith], status: 'running' };
              }
            }
          }
        }
      } else {
        const idx = serialIds.indexOf(id);
        if (idx >= 0 && idx < serialIds.length - 1) {
          const nextId = serialIds[idx + 1];
          if (next[nextId]?.status === 'waiting') {
            next[nextId] = { ...next[nextId], status: 'running' };
            const nt = getTask(nextId);
            if (nt?.parWith && next[nt.parWith]?.status === 'waiting' && !nt.delayAfterPar) {
              next[nt.parWith] = { ...next[nt.parWith], status: 'running' };
            }
          }
        }
      }
      return next;
    });
  }

  function manualExtend(id) {
    setPendingConfirm(null);
    setTaskState(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        remaining: prev[id].remaining + 10 * 60,
        total: prev[id].total + 10 * 60,
        status: prev[id].status === 'overtime' ? 'running' : prev[id].status,
        overtime: 0,
      }
    }));
  }

  function manualSkip(id) {
    setPendingConfirm(null);
    setTaskState(prev => {
      const next = { ...prev, [id]: { ...prev[id], status: 'skipped' } };
      const t = getTask(id);
      if (t?.parWith) {
        const pw = next[t.parWith]?.status;
        if (pw === 'done' || pw === 'skipped') {
          const primaryId = t.serial ? id : t.parWith;
          const idx = serialIds.indexOf(primaryId);
          if (idx >= 0 && idx < serialIds.length - 1) {
            const nextId = serialIds[idx + 1];
            if (next[nextId]?.status === 'waiting') next[nextId] = { ...next[nextId], status: 'running' };
          }
        }
      } else {
        const idx = serialIds.indexOf(id);
        if (idx >= 0 && idx < serialIds.length - 1) {
          const nextId = serialIds[idx + 1];
          if (next[nextId]?.status === 'waiting') next[nextId] = { ...next[nextId], status: 'running' };
        }
      }
      return next;
    });
  }

  function startPlanner() {
    if (started) return;
    setStarted(true);
    activateTask(serialIds[0], taskState, setTaskState);
    intervalRef.current = setInterval(() => {
      setTaskState(prev => {
        let changed = false;
        const next = { ...prev };
        allTasks.forEach(t => {
          const s = next[t.id];
          if (s.status === 'running') {
            changed = true;
            const rem = s.remaining - 1;
            if (rem <= 0) {
              next[t.id] = { ...s, status: 'overtime', remaining: 0, overtime: 0 };
              setPendingConfirm(t.id);
            } else {
              next[t.id] = { ...s, remaining: rem };
            }
          } else if (s.status === 'overtime') {
            changed = true;
            next[t.id] = { ...s, overtime: s.overtime + 1 };
          }
        });
        return changed ? next : prev;
      });
    }, 1000);
  }

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  if (!recipe) {
    return (
      <div className={styles.empty}>
        <div>请先从食谱页面点击「开始制作」</div>
        <button className={styles.goBtn} onClick={() => navigate('/')}>去选食谱</button>
      </div>
    );
  }

  const doneCount = allTasks.filter(t => ['done', 'skipped'].includes(taskState[t.id]?.status)).length;
  const runningCount = allTasks.filter(t => ['running', 'overtime'].includes(taskState[t.id]?.status)).length;
  const allDone = doneCount === allTasks.length;

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerTop}>
          <button className={styles.backBtn} onClick={() => navigate(`/recipe/${recipeId}`)}>← 食谱</button>
          <div className={styles.headerTitle}>{recipe.name}</div>
        </div>
        <div className={styles.headerSub}>
          {allDone ? '🎉 全部完成！出炉了！' : started ? `进行中 ${runningCount} 项 · 已完成 ${doneCount}/${allTasks.length} 步` : '准备好了就开始吧'}
        </div>
        {startMin !== null && <div className={styles.headerTime}>预计从 {minToTimeStr(startMin)} 开始</div>}
        {!started && (
          <button className={styles.startBtn} onClick={startPlanner}>▶ 开始计时</button>
        )}
      </div>

      <div className={styles.content}>
        {/* 提示 */}
        {!started && (
          <div className={styles.hint}>💡 计时器到0后不会自动跳转，需手动确认完成。可随时延时或提前完成。</div>
        )}

        {/* 确认横幅 */}
        {pendingConfirm && (
          <div className={styles.confirmBanner}>
            <div className={styles.confirmTitle}>⚠️ 「{getTask(pendingConfirm)?.name}」时间到了，完成了吗？</div>
            <div className={styles.confirmBtns}>
              <button className={styles.cBtnYes} onClick={() => markDone(pendingConfirm)}>✅ 已完成</button>
              <button className={styles.cBtnExt} onClick={() => manualExtend(pendingConfirm)}>＋10分钟</button>
            </div>
          </div>
        )}

        {/* 多天时间线 */}
        {recipe.days.map((day, di) => (
          <div key={di}>
            <div className={styles.dayHeader}>
              <span className={styles.dayLabel}>{day.label}</span>
            </div>
            <div className={styles.timeline}>
              {day.tasks.map(t => {
                const s = taskState[t.id];
                const isPar = !!t.parGroup;
                const isActive = s.status === 'running' || s.status === 'overtime';
                const pct = s.status === 'waiting' ? 0
                  : s.status === 'running' ? Math.max(0, (s.total - s.remaining) / s.total * 100)
                  : 100;

                let cardCls = styles.tc;
                if (s.status === 'waiting') cardCls += ' ' + styles.waiting;
                else if (s.status === 'running') cardCls += ' ' + (isPar ? styles.par : styles.running);
                else if (s.status === 'overtime') cardCls += ' ' + styles.overtime;
                else if (s.status === 'done') cardCls += ' ' + styles.done;
                else cardCls += ' ' + styles.skipped;

                let cdText, cdStyle = '';
                if (s.status === 'waiting') { cdText = fmtT(s.total); cdStyle = styles.cdWait; }
                else if (s.status === 'running') { cdText = fmtT(s.remaining); }
                else if (s.status === 'overtime') { cdText = '+' + fmtT(s.overtime); cdStyle = styles.cdOt; }
                else if (s.status === 'done') { cdText = '✅ 完成'; cdStyle = styles.cdDone; }
                else { cdText = '跳过'; cdStyle = styles.cdWait; }

                return (
                  <div key={t.id} className={cardCls}>
                    <div className={styles.tcDot} />
                    <div className={styles.tcTop}>
                      <div className={styles.tcLeft}>
                        <div className={styles.tcName}>{t.name}</div>
                        <div className={styles.tcMeta}>{t.meta} · {Math.round(t.totalSec / 60)}分钟</div>
                        {isPar && <div className={styles.parTag}>↔ 并行{t.parGroup}组</div>}
                        {s.status === 'overtime' && <div className={styles.otLabel}>⚠️ 超时 {fmtT(s.overtime)}，请确认</div>}
                      </div>
                      <div className={`${styles.tcCd} ${cdStyle}`}>{cdText}</div>
                    </div>
                    <div className={styles.tcProg}>
                      <div className={styles.tcFill} style={{ width: `${pct}%` }} />
                    </div>
                    {isActive && (
                      <div className={styles.tcActions}>
                        <button className={styles.taDone} onClick={() => markDone(t.id)}>✅ 已完成</button>
                        <button className={styles.taExt} onClick={() => manualExtend(t.id)}>＋10分钟</button>
                        <button className={styles.taSkip} onClick={() => manualSkip(t.id)}>跳过</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {di < recipe.days.length - 1 && (
              <div className={styles.overnightDivider}>🌙 今晚到此 · 明天继续</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
