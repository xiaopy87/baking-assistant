import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { SectionLabel, Modal, PrimaryBtn, Field, TextInput } from '../components/UI';
import styles from './Cost.module.css';

function fmtCost(n) { return '¥' + n.toFixed(1); }

function IngModal({ show, onClose, editId, ingLib, onSave }) {
  const existing = editId ? ingLib[editId] : null;
  const [name, setName] = useState(existing?.name ?? '');
  const [price, setPrice] = useState(existing?.price?.toString() ?? '');
  const [qty, setQty] = useState(existing?.qty?.toString() ?? '');
  const [unit, setUnit] = useState(existing?.unit ?? 'g');

  // reset on open
  useState(() => {
    if (show) {
      setName(existing?.name ?? '');
      setPrice(existing?.price?.toString() ?? '');
      setQty(existing?.qty?.toString() ?? '');
      setUnit(existing?.unit ?? 'g');
    }
  });

  const up = price && qty ? parseFloat(price) / parseFloat(qty) : null;
  const upStr = up ? (unit === 'pcs' ? `¥${up.toFixed(2)}/个` : `¥${up.toFixed(4)}/${unit}`) : null;

  function handleSave() {
    if (!name.trim() || !price || !qty) return alert('请填写完整信息');
    const id = editId || 'ing_' + Date.now();
    onSave(id, { name: name.trim(), price: parseFloat(price), qty: parseFloat(qty), unit });
    onClose();
  }

  return (
    <Modal show={show} onClose={onClose} title={editId ? '编辑原料' : '添加原料'} subtitle="填写购买信息，自动换算单价">
      <Field label="原料名称">
        <TextInput value={name} onChange={setName} placeholder="如：高筋面粉" />
      </Field>
      <div className={styles.fieldRow}>
        <Field label="购买总价（元）">
          <TextInput type="number" value={price} onChange={setPrice} placeholder="45" />
        </Field>
        <Field label="总量">
          <TextInput type="number" value={qty} onChange={setQty} placeholder="5000" />
        </Field>
      </div>
      <Field label="单位">
        <div className={styles.unitBtns}>
          {['g', 'ml', 'pcs'].map(u => (
            <button key={u} className={`${styles.unitBtn} ${unit === u ? styles.unitActive : ''}`} onClick={() => setUnit(u)}>
              {u === 'pcs' ? '个 pcs' : u === 'ml' ? '毫升 ml' : '克 g'}
            </button>
          ))}
        </div>
      </Field>
      {upStr && <div className={styles.preview}>单价：{upStr}（¥{price} ÷ {qty}{unit}）</div>}
      <PrimaryBtn onClick={handleSave}>保存原料</PrimaryBtn>
    </Modal>
  );
}

export default function Cost() {
  const navigate = useNavigate();
  const { ingLib, recipes, recipeCost, getPortion, saveIng } = useApp();
  const [showIngModal, setShowIngModal] = useState(false);
  const [editIngId, setEditIngId] = useState(null);

  const ingIds = Object.keys(ingLib);
  const recipeCount = recipes.length;
  const allPerUnit = recipes.map(r => recipeCost(r, getPortion(r.id, r.portion)) / getPortion(r.id, r.portion));
  const avgCost = allPerUnit.length ? allPerUnit.reduce((a, b) => a + b, 0) / allPerUnit.length : 0;

  function openAdd() { setEditIngId(null); setShowIngModal(true); }
  function openEdit(id) { setEditIngId(id); setShowIngModal(true); }

  return (
    <div className={styles.page}>
      <div className={styles.nav}>
        <div className={styles.navTitle}>💰 成本管理</div>
        <div className={styles.navSub}>原料价格库 & 食谱成本</div>
      </div>

      <div className={styles.content}>
        {/* Stats */}
        <SectionLabel>总览</SectionLabel>
        <div className={styles.statRow}>
          <div className={styles.statCard}><div className={styles.statVal}>{ingIds.length}</div><div className={styles.statLabel}>原料种类</div></div>
          <div className={styles.statCard}><div className={styles.statVal}>{recipeCount}</div><div className={styles.statLabel}>食谱数量</div></div>
          <div className={styles.statCard}><div className={styles.statVal}>{fmtCost(avgCost)}</div><div className={styles.statLabel}>平均单份成本</div></div>
        </div>

        {/* 原料库 */}
        <div className={styles.sectionRow}>
          <SectionLabel>原料价格库</SectionLabel>
          <button className={styles.addBtn} onClick={openAdd}>＋ 添加原料</button>
        </div>
        {ingIds.map(id => {
          const ing = ingLib[id];
          const up = ing.price / ing.qty;
          const upStr = ing.unit === 'pcs' ? `¥${up.toFixed(2)}/个` : `¥${up.toFixed(4)}/${ing.unit}`;
          return (
            <div key={id} className={styles.ingCard}>
              <div>
                <div className={styles.ingName}>{ing.name}</div>
                <div className={styles.ingMeta}>购入 {ing.qty}{ing.unit} / ¥{ing.price}</div>
              </div>
              <div className={styles.ingRight}>
                <div className={styles.ingPrice}>{upStr}</div>
                <button className={styles.editBtn} onClick={() => openEdit(id)}>编辑</button>
              </div>
            </div>
          );
        })}

        {/* 食谱成本 */}
        <SectionLabel>各食谱成本</SectionLabel>
        {recipes.map(r => {
          const p = getPortion(r.id, r.portion);
          const cost = recipeCost(r, p);
          return (
            <div key={r.id} className={styles.recipeCard} onClick={() => navigate(`/recipe/${r.id}`)}>
              <div>
                <div className={styles.rcName}>{r.tag} {r.name}</div>
                <div className={styles.rcPortion}>{p} {r.portionUnit}</div>
              </div>
              <div>
                <div className={styles.rcCost}>{fmtCost(cost)}</div>
                <div className={styles.rcPer}>每{r.portionUnit} {fmtCost(cost / p)}</div>
              </div>
            </div>
          );
        })}
      </div>

      <IngModal
        show={showIngModal}
        onClose={() => setShowIngModal(false)}
        editId={editIngId}
        ingLib={ingLib}
        onSave={saveIng}
      />
    </div>
  );
}
