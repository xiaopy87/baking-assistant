import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { BackBtn, SectionTitle, PrimaryBtn, Modal, Field, TextInput } from '../components/UI';
import styles from './RecipeDetail.module.css';

const CUTOFF = 22 * 60 + 30;

function fmtCost(n) { return '¥' + n.toFixed(1); }

function timeStrToMin(s) {
  const [h, m] = s.split(':').map(Number);
  return h * 60 + m;
}
function minToTimeStr(m) {
  const total = ((m % 1440) + 1440) % 1440;
  const h = Math.floor(total / 60);
  const mm = total % 60;
  return `${h.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
}

function daySerialMin(day) {
  const processed = new Set();
  let total = 0;
  day.tasks.forEach(t => {
    if (processed.has(t.id)) return;
    if (t.parGroup) {
      const pair = day.tasks.find(x => x.id === t.parWith);
      total += Math.max(t.totalSec, pair ? pair.totalSec : 0) / 60;
      if (pair) processed.add(pair.id);
    } else {
      total += t.totalSec / 60;
    }
    processed.add(t.id);
  });
  return total;
}

function StartModal({ show, onClose, recipe, onConfirm }) {
  const now = new Date();
  const defaultTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  const [startTime, setStartTime] = useState(defaultTime);

  if (!recipe) return null;

  // compute plan
  let cursor = timeStrToMin(startTime || defaultTime);
  const plan = recipe.days.map((day, di) => {
    const mins = daySerialMin(day);
    const endMin = cursor + mins;
    const endStr = minToTimeStr(endMin);
    const late = (endMin % 1440) > CUTOFF && mins > 0;
    const result = { label: day.label, startStr: minToTimeStr(cursor), endStr, late, overnight: di < recipe.days.length - 1 };
    cursor = di < recipe.days.length - 1 ? 8 * 60 : endMin;
    return result;
  });

  const anyLate = plan.some(p => p.late);
  const lastLate = plan[plan.length - 1]?.late;
  const status = lastLate ? 'danger' : anyLate ? 'warn' : 'ok';

  const statusText = {
    ok: '✅ 今天能顺利完成',
    warn: '⚠️ 结束时间较晚，注意安排',
    danger: '🚫 预计超过22:30，建议提早开始',
  }[status];

  return (
    <Modal show={show} onClose={onClose} title="▶ 开始制作" subtitle={recipe.name + (recipe.days.length > 1 ? ` · ${recipe.days.length}天计划` : '')}>
      <Field label="第一步开始时间">
        <input
          className={styles.timeInput}
          type="time"
          value={startTime}
          onChange={e => setStartTime(e.target.value)}
        />
      </Field>

      <div className={`${styles.planResult} ${styles[status]}`}>
        <div className={styles.planTitle}>{statusText}</div>
        {plan.map((p, i) => (
          <div key={i}>
            <div className={styles.planRow}>
              <span>{i === 0 ? `开始 ${p.startStr}` : `${p.label} 开始 ${p.startStr}`}</span>
              <span className={p.late ? styles.late : styles.time}>
                {p.label} 结束 {p.endStr}{p.late ? ' ⚠️' : ''}
              </span>
            </div>
            {p.overnight && (
              <div className={styles.overnightRow}>🌙 隔夜 · 明天继续</div>
            )}
          </div>
        ))}
      </div>

      <PrimaryBtn onClick={() => onConfirm(timeStrToMin(startTime))}>确认，开始计时</PrimaryBtn>
    </Modal>
  );
}

export default function RecipeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { recipes, ingLib, recipeCost, getPortion, setPortion } = useApp();

  const recipe = recipes.find(r => r.id === id);
  if (!recipe) return <div style={{ padding: 20 }}>食谱不存在</div>;

  const portion = getPortion(id, recipe.portion);
  const ratio = portion / recipe.portion;
  const totalCost = recipeCost(recipe, portion);
  const [showStart, setShowStart] = useState(false);

  function handleConfirmStart(startMin) {
    setShowStart(false);
    navigate('/timer', { state: { recipeId: id, startMin } });
  }

  return (
    <div className={styles.page}>
      <div className={styles.nav}>
        <BackBtn onClick={() => navigate('/')} />
      </div>

      <div className={styles.content}>
        <div className={styles.name}>{recipe.name}</div>
        <div className={styles.badges}>
          <span className={styles.badge}>{recipe.tag}</span>
          <span className={styles.badge}>📅 {recipe.days.length > 1 ? `${recipe.days.length}天` : '当天'}</span>
          <span className={styles.badgeGreen}>⏱ {Math.round(recipe.days.flatMap(d => d.tasks.filter(t => t.serial)).reduce((a, t) => a + t.totalSec / 60, 0))}分钟</span>
        </div>

        {/* 份量调节 */}
        <div className={styles.portionBox}>
          <div className={styles.portionLabel}>📐 制作份量</div>
          <div className={styles.portionCtrl}>
            <button className={styles.pBtn} onClick={() => setPortion(id, portion - 1)}>−</button>
            <span className={styles.pVal}>{portion}<span className={styles.pUnit}>{recipe.portionUnit}</span></span>
            <button className={styles.pBtn} onClick={() => setPortion(id, portion + 1)}>＋</button>
          </div>
        </div>

        {/* 成本 */}
        <div className={styles.costBox}>
          <div>
            <div className={styles.costLabel}>💰 本次制作成本</div>
            <div className={styles.costPer}>每{recipe.portionUnit} {fmtCost(totalCost / portion)}</div>
          </div>
          <div className={styles.costVal}>{fmtCost(totalCost)}</div>
        </div>

        {/* 食材分组 */}
        <SectionTitle>🧂 食材</SectionTitle>
        {recipe.ingGroups.map((g, gi) => {
          let groupCost = 0;
          return (
            <div key={gi} className={styles.ingGroup}>
              <div className={styles.groupTitle}>{g.groupName}</div>
              {g.ings.map((ing, ii) => {
                const amt = ing.unit === 'pcs' ? ing.amount : Math.round(ing.amount * ratio * 10) / 10;
                const libIng = ingLib[ing.ingId];
                const up = libIng ? libIng.price / libIng.qty : 0;
                const cost = ing.unit === 'pcs' ? up * ing.amount : up * ing.amount * ratio;
                groupCost += cost;
                return (
                  <div key={ii} className={styles.ingRow}>
                    <span className={styles.ingName}>{ing.name}</span>
                    <div className={styles.ingRight}>
                      <span className={styles.ingAmt}>{amt} {ing.unit}</span>
                      <span className={styles.ingCost}>{fmtCost(cost)}</span>
                    </div>
                  </div>
                );
              })}
              <div className={styles.groupSubtotal}>小计 {fmtCost(groupCost)}</div>
            </div>
          );
        })}

        {/* 多天步骤 */}
        <SectionTitle>📋 制作计划</SectionTitle>
        {recipe.days.map((day, di) => {
          const mins = daySerialMin(day);
          const hrs = Math.floor(mins / 60);
          const m = Math.round(mins % 60);
          return (
            <div key={di} className={styles.dayBlock}>
              <div className={styles.dayHeader}>
                <span className={styles.dayLabel}>{day.label}</span>
                <span className={styles.dayDur}>约{hrs > 0 ? `${hrs}小时` : ''}{m > 0 ? `${m}分钟` : ''}</span>
              </div>
              {day.tasks.map((t, ti) => (
                <div key={ti} className={styles.stepItem}>
                  <div className={styles.stepNum}>{ti + 1}</div>
                  <div>
                    <div className={styles.stepText}>{t.name}</div>
                    <div className={styles.stepMeta}>{t.meta}</div>
                    <div className={styles.stepBadges}>
                      <span className={styles.badgeTime}>⏱ {Math.round(t.totalSec / 60)}分钟</span>
                      {t.parGroup && <span className={styles.badgePar}>↔ 并行{t.parGroup}组</span>}
                      {t.overnight && <span className={styles.badgeNight}>🌙 可隔夜</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          );
        })}

        {/* 注意事项 */}
        <SectionTitle>📌 注意事项</SectionTitle>
        <div className={styles.noteBox}>
          {recipe.notes.split('\n').map((l, i) => <div key={i}>{l}</div>)}
        </div>

        <PrimaryBtn onClick={() => setShowStart(true)}>▶ 开始制作</PrimaryBtn>
      </div>

      <StartModal
        show={showStart}
        onClose={() => setShowStart(false)}
        recipe={recipe}
        onConfirm={handleConfirmStart}
      />
    </div>
  );
}
