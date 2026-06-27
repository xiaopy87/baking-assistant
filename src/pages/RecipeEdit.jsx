import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { BackBtn, SectionTitle, PrimaryBtn, Field, TextInput } from '../components/UI';
import { CATEGORIES } from '../data/categories';
import styles from './RecipeEdit.module.css';

function newId() {
  return 't_' + Math.random().toString(36).slice(2, 8);
}

export default function RecipeEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { recipes, saveRecipe } = useApp();

  const original = recipes.find(r => r.id === id);
  if (!original) return <div style={{ padding: 20 }}>食谱不存在</div>;

  const [coverImage, setCoverImage] = useState(original.coverImage || null);
  const [name, setName] = useState(original.name);
  const [tag, setTag] = useState(original.tag);
  const [category, setCategory] = useState(original.category || '');
  const [subCategory, setSubCategory] = useState(original.subCategory || '');
  const [portion, setPortion] = useState(original.portion);
  const [portionUnit, setPortionUnit] = useState(original.portionUnit);
  const [notes, setNotes] = useState(original.notes);

  const currentCat = CATEGORIES.find(c => c.id === category);
  const [ingGroups, setIngGroups] = useState(
    original.ingGroups.map(g => ({ ...g, ings: g.ings.map(i => ({ ...i })) }))
  );
  const [days, setDays] = useState(
    original.days.map(d => ({ ...d, tasks: d.tasks.map(t => ({ ...t })) }))
  );

  // ── 食材操作 ──
  function updateGroupName(gi, val) {
    setIngGroups(gs => gs.map((g, i) => i === gi ? { ...g, groupName: val } : g));
  }
  function addGroup() {
    setIngGroups(gs => [...gs, { groupName: '新分组', ings: [] }]);
  }
  function removeGroup(gi) {
    setIngGroups(gs => gs.filter((_, i) => i !== gi));
  }
  function updateIng(gi, ii, field, val) {
    setIngGroups(gs => gs.map((g, i) => i !== gi ? g : {
      ...g,
      ings: g.ings.map((ing, j) => j !== ii ? ing : { ...ing, [field]: field === 'amount' ? Number(val) : val }),
    }));
  }
  function addIng(gi) {
    setIngGroups(gs => gs.map((g, i) => i !== gi ? g : {
      ...g,
      ings: [...g.ings, { name: '', ingId: '', amount: 0, unit: 'g' }],
    }));
  }
  function removeIng(gi, ii) {
    setIngGroups(gs => gs.map((g, i) => i !== gi ? g : {
      ...g,
      ings: g.ings.filter((_, j) => j !== ii),
    }));
  }

  // ── 步骤操作 ──
  function updateDayLabel(di, val) {
    setDays(ds => ds.map((d, i) => i === di ? { ...d, label: val } : d));
  }
  function addDay() {
    setDays(ds => [...ds, { label: `第${ds.length + 1}天`, tasks: [] }]);
  }
  function removeDay(di) {
    setDays(ds => ds.filter((_, i) => i !== di));
  }
  function updateTask(di, ti, field, val) {
    setDays(ds => ds.map((d, i) => i !== di ? d : {
      ...d,
      tasks: d.tasks.map((t, j) => j !== ti ? t : {
        ...t,
        [field]: field === 'totalSec' ? Number(val) * 60 : val,
      }),
    }));
  }
  function addTask(di) {
    setDays(ds => ds.map((d, i) => i !== di ? d : {
      ...d,
      tasks: [...d.tasks, { id: newId(), name: '', meta: '', totalSec: 600, serial: true }],
    }));
  }
  function removeTask(di, ti) {
    setDays(ds => ds.map((d, i) => i !== di ? d : {
      ...d,
      tasks: d.tasks.filter((_, j) => j !== ti),
    }));
  }

  async function handleCoverUpload(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async e => {
      const dataUrl = e.target.result;
      const base64 = dataUrl.split(',')[1];
      const ext = file.name.split('.').pop().toLowerCase();
      const API = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${API}/api/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, ext }),
      });
      const { url } = await res.json();
      setCoverImage(url);
    };
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    // 根据 parGroup 自动配对 parWith 和 serial
    const processedDays = days.map(day => {
      const tasks = day.tasks;
      const groupMap = {};
      tasks.forEach(t => {
        if (t.parGroup) {
          if (!groupMap[t.parGroup]) groupMap[t.parGroup] = [];
          groupMap[t.parGroup].push(t);
        }
      });
      const processed = tasks.map(t => {
        if (!t.parGroup) return { ...t, parWith: null, serial: true };
        const group = groupMap[t.parGroup];
        const other = group.find(x => x.id !== t.id);
        const isLonger = !other || t.totalSec >= other.totalSec;
        return { ...t, parWith: other?.id ?? null, serial: isLonger };
      });
      return { ...day, tasks: processed };
    });
    await saveRecipe({ ...original, name, tag, category, subCategory, portion: Number(portion), portionUnit, notes, ingGroups, days: processedDays, coverImage });
    navigate(`/recipe/${id}`);
  }

  return (
    <div className={styles.page}>
      <div className={styles.nav}>
        <BackBtn onClick={() => navigate(`/recipe/${id}`)} />
        <button className={styles.saveBtn} onClick={handleSave}>保存</button>
      </div>

      <div className={styles.content}>
        <SectionTitle>封面图片</SectionTitle>
        <label className={styles.coverUpload}>
          {coverImage
            ? <img src={`${import.meta.env.VITE_API_URL || ''}${coverImage}`} className={styles.coverPreview} alt="封面" />
            : <div className={styles.coverPlaceholder}><span>📷</span><span>点击上传封面</span></div>
          }
          <input type="file" accept="image/*" style={{ display: 'none' }}
            onChange={e => handleCoverUpload(e.target.files[0])} />
        </label>

        <SectionTitle>基本信息</SectionTitle>
        <Field label="食谱名称"><TextInput value={name} onChange={setName} /></Field>
        <Field label="标签"><TextInput value={tag} onChange={setTag} /></Field>
        <Field label="一级分类">
          <select className={styles.select} value={category} onChange={e => { setCategory(e.target.value); setSubCategory(''); }}>
            <option value="">请选择</option>
            {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        {currentCat && (
          <Field label="二级分类">
            <select className={styles.select} value={subCategory} onChange={e => setSubCategory(e.target.value)}>
              <option value="">请选择</option>
              {currentCat.sub.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
        )}
        <div className={styles.row}>
          <Field label="份量">
            <TextInput type="number" value={portion} onChange={setPortion} />
          </Field>
          <Field label="单位">
            <TextInput value={portionUnit} onChange={setPortionUnit} />
          </Field>
        </div>

        {/* 食材 */}
        <SectionTitle>🧂 食材</SectionTitle>
        {ingGroups.map((g, gi) => (
          <div key={gi} className={styles.group}>
            <div className={styles.groupHeader}>
              <TextInput
                className={styles.groupName}
                value={g.groupName}
                onChange={val => updateGroupName(gi, val)}
                placeholder="分组名称"
              />
              <button className={styles.removeBtn} onClick={() => removeGroup(gi)}>删除组</button>
            </div>
            {g.ings.map((ing, ii) => (
              <div key={ii} className={styles.ingRow}>
                <TextInput
                  className={styles.ingName}
                  value={ing.name}
                  onChange={val => updateIng(gi, ii, 'name', val)}
                  placeholder="食材名"
                />
                <TextInput
                  className={styles.ingAmt}
                  type="number"
                  value={ing.amount}
                  onChange={val => updateIng(gi, ii, 'amount', val)}
                />
                <TextInput
                  className={styles.ingUnit}
                  value={ing.unit}
                  onChange={val => updateIng(gi, ii, 'unit', val)}
                  placeholder="单位"
                />
                <button className={styles.iconBtn} onClick={() => removeIng(gi, ii)}>✕</button>
              </div>
            ))}
            <button className={styles.addBtn} onClick={() => addIng(gi)}>＋ 添加食材</button>
          </div>
        ))}
        <button className={styles.addGroupBtn} onClick={addGroup}>＋ 添加分组</button>

        {/* 步骤 */}
        <SectionTitle>📋 制作步骤</SectionTitle>
        {days.map((day, di) => (
          <div key={di} className={styles.group}>
            <div className={styles.groupHeader}>
              <TextInput
                className={styles.groupName}
                value={day.label}
                onChange={val => updateDayLabel(di, val)}
                placeholder="天数标签"
              />
              <button className={styles.removeBtn} onClick={() => removeDay(di)}>删除天</button>
            </div>
            {day.tasks.map((t, ti) => (
              <div key={ti} className={styles.taskRow}>
                <div className={styles.taskTop}>
                  <TextInput
                    className={styles.taskName}
                    value={t.name}
                    onChange={val => updateTask(di, ti, 'name', val)}
                    placeholder="步骤名称"
                  />
                  <div className={styles.taskMin}>
                    <TextInput
                      type="number"
                      value={Math.round(t.totalSec / 60)}
                      onChange={val => updateTask(di, ti, 'totalSec', val)}
                    />
                    <span className={styles.minLabel}>分钟</span>
                  </div>
                  <button className={styles.iconBtn} onClick={() => removeTask(di, ti)}>✕</button>
                </div>
                <TextInput
                  value={t.meta}
                  onChange={val => updateTask(di, ti, 'meta', val)}
                  placeholder="步骤说明"
                />
                <div className={styles.parRow}>
                  <span className={styles.parLabel}>↔ 并行组</span>
                  <TextInput
                    className={styles.parInput}
                    value={t.parGroup || ''}
                    onChange={val => updateTask(di, ti, 'parGroup', val.toUpperCase() || null)}
                    placeholder="如 A（留空表示串行）"
                  />
                </div>
              </div>
            ))}
            <button className={styles.addBtn} onClick={() => addTask(di)}>＋ 添加步骤</button>
          </div>
        ))}
        <button className={styles.addGroupBtn} onClick={addDay}>＋ 添加天数</button>

        {/* 注意事项 */}
        <SectionTitle>📌 注意事项</SectionTitle>
        <textarea
          className={styles.notes}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={5}
          placeholder="每行一条注意事项"
        />

        <PrimaryBtn onClick={handleSave}>保存食谱</PrimaryBtn>
      </div>
    </div>
  );
}
