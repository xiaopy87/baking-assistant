import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { SectionLabel, Card, Modal, PrimaryBtn } from '../components/UI';
import { CATEGORIES } from '../data/categories';
import styles from './RecipeList.module.css';

const WORKER_URL = import.meta.env.VITE_API_URL || 'https://baking-assistant-api.xiaopy87.workers.dev';

function fmtCost(n) { return '¥' + n.toFixed(1); }

function parseRecipe(data) {
  return {
    ...data,
    id: 'imported_' + Date.now(),
    ingGroups: (data.ingGroups || []).map(g => ({
      ...g,
      ings: (g.ings || []).map(ing => ({ ...ing, ingId: ing.name })),
    })),
  };
}

function ImportModal({ show, onClose }) {
  const { saveRecipe } = useApp();
  const [mode, setMode] = useState('image'); // image | text
  const [step, setStep] = useState('input'); // input | processing | done | error
  const [preview, setPreview] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  function handleFile(file) {
    if (!file) return;
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 1024;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      URL.revokeObjectURL(url);
      setPreview(dataUrl);
      setImageBase64(dataUrl.split(',')[1]);
    };
    img.src = url;
  }

  async function handleSubmit() {
    setStep('processing');
    try {
      const endpoint = mode === 'image' ? '/api/recognize' : '/api/recognize-text';
      const body = mode === 'image' ? { imageBase64 } : { text };
      const res = await fetch(`${WORKER_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || '识别失败');
      setResult(parseRecipe(data));
      setStep('done');
    } catch (e) {
      setErrorMsg(e.message || '网络错误，请重试');
      setStep('error');
    }
  }

  function handleImport() {
    if (result) saveRecipe(result);
    handleClose();
  }

  function handleClose() {
    setStep('input');
    setPreview(null);
    setImageBase64(null);
    setText('');
    setResult(null);
    setErrorMsg('');
    onClose();
  }

  const canSubmit = mode === 'image' ? !!imageBase64 : text.trim().length > 10;

  return (
    <Modal show={show} onClose={handleClose} title="导入食谱" subtitle="AI 自动识别食材、步骤、烤箱参数">
      {step === 'input' && (
        <>
          <div className={styles.modeTabs}>
            <button className={`${styles.modeTab} ${mode === 'image' ? styles.modeActive : ''}`} onClick={() => setMode('image')}>📷 拍照上传</button>
            <button className={`${styles.modeTab} ${mode === 'text' ? styles.modeActive : ''}`} onClick={() => setMode('text')}>📝 文字输入</button>
          </div>

          {mode === 'image' && (
            <label className={styles.uploadZone}>
              {preview
                ? <img src={preview} className={styles.previewImg} alt="预览" />
                : <>
                    <div className={styles.uploadIcon}>🖼️</div>
                    <div className={styles.uploadText}>点击上传食谱照片</div>
                    <div className={styles.uploadSub}>支持截图、拍照、网页保存图片</div>
                  </>
              }
              <input type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => handleFile(e.target.files[0])} />
            </label>
          )}

          {mode === 'text' && (
            <textarea
              className={styles.textInput}
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={'把食谱文字粘贴到这里，比如：\n\n戚风蛋糕\n低筋面粉85g、鸡蛋4个、牛奶50ml...\n步骤1: 分离蛋黄蛋白...'}
              rows={8}
            />
          )}

          <PrimaryBtn onClick={handleSubmit} disabled={!canSubmit}>AI 识别食谱</PrimaryBtn>
        </>
      )}
      {step === 'processing' && (
        <div className={styles.aiBox}>
          <div className={styles.aiDot} />
          <div className={styles.aiLog}>正在识别食谱，请稍候…</div>
        </div>
      )}
      {step === 'done' && result && (
        <>
          <div className={styles.doneBox}>
            <div className={styles.doneTitle}>✅ 识别完成</div>
            <div className={styles.doneSub}>
              {result.name} · {result.ingGroups?.length}组食材 · {result.days?.length}天计划
            </div>
          </div>
          <PrimaryBtn onClick={handleImport}>导入食谱 →</PrimaryBtn>
        </>
      )}
      {step === 'error' && (
        <>
          <div className={styles.errorBox}>
            <div className={styles.errorTitle}>❌ 识别失败</div>
            <div className={styles.doneSub}>{errorMsg}</div>
          </div>
          <PrimaryBtn onClick={() => setStep('input')}>重试</PrimaryBtn>
        </>
      )}
    </Modal>
  );
}

export default function RecipeList() {
  const navigate = useNavigate();
  const { recipes, recipeCost, getPortion } = useApp();
  const [showImport, setShowImport] = useState(false);
  const [activeCat, setActiveCat] = useState(null); // null = 全部
  const [activeSub, setActiveSub] = useState(null);

  function handleCatClick(catId) {
    if (activeCat === catId) {
      setActiveCat(null);
      setActiveSub(null);
    } else {
      setActiveCat(catId);
      setActiveSub(null);
    }
  }

  const currentCat = CATEGORIES.find(c => c.id === activeCat);

  const filtered = recipes.filter(r => {
    if (!activeCat) return true;
    if (r.category !== activeCat) return false;
    if (!activeSub) return true;
    return r.subCategory === activeSub;
  });

  return (
    <div className={styles.page}>
      <div className={styles.nav}>
        <div>
          <div className={styles.navTitle}>🧁 烘焙助手</div>
          <div className={styles.navSub}>我的厨房笔记</div>
        </div>
        <button className={styles.addBtn} onClick={() => setShowImport(true)}>＋</button>
      </div>

      {/* 一级分类 Tab */}
      <div className={styles.catBar}>
        <button
          className={`${styles.catTab} ${!activeCat ? styles.catActive : ''}`}
          onClick={() => { setActiveCat(null); setActiveSub(null); }}
        >全部</button>
        {CATEGORIES.map(c => (
          <button
            key={c.id}
            className={`${styles.catTab} ${activeCat === c.id ? styles.catActive : ''}`}
            onClick={() => handleCatClick(c.id)}
          >{c.name}</button>
        ))}
      </div>

      {/* 二级分类 Tab */}
      {currentCat && (
        <div className={styles.subBar}>
          <button
            className={`${styles.subTab} ${!activeSub ? styles.subActive : ''}`}
            onClick={() => setActiveSub(null)}
          >全部</button>
          {currentCat.sub.map(s => (
            <button
              key={s}
              className={`${styles.subTab} ${activeSub === s ? styles.subActive : ''}`}
              onClick={() => setActiveSub(s)}
            >{s}</button>
          ))}
        </div>
      )}

      <div className={styles.content}>
        <div className={styles.importBanner} onClick={() => setShowImport(true)}>
          <span className={styles.importIcon}>📷</span>
          <div className={styles.importTitle}>拍照导入食谱</div>
          <div className={styles.importSub}>上传照片，AI 自动识别并整理</div>
        </div>

        <SectionLabel>
          {currentCat ? `${currentCat.name}${activeSub ? ' · ' + activeSub : ''}` : '全部食谱'}
          <span className={styles.recipeCount}>{filtered.length} 个</span>
        </SectionLabel>

        <div className={styles.grid}>
          {filtered.map(r => {
            const totalDays = r.days.length;
            const serialMin = r.days.flatMap(d => d.tasks.filter(t => t.serial))
              .reduce((a, t) => a + t.totalSec / 60, 0);
            const hrs = Math.floor(serialMin / 60);
            const mins = Math.round(serialMin % 60);
            const timeStr = hrs > 0 ? `${hrs}h${mins > 0 ? mins + 'm' : ''}` : `${mins}m`;
            return (
              <div key={r.id} className={styles.gridCard} onClick={() => navigate(`/recipe/${r.id}`)}>
                <div className={r.coverImage ? styles.gridThumb : styles.gridThumbSmall}>
                  {r.coverImage
                    ? <img src={`${import.meta.env.VITE_API_URL || ''}${r.coverImage}`} className={styles.gridCover} alt={r.name} />
                    : <span className={styles.gridEmoji}>{r.tag?.match(/\p{Emoji}/u)?.[0] || '🍞'}</span>
                  }
                </div>
                <div className={styles.gridName}>{r.name}</div>
                <div className={styles.gridTags}>
                  <span className={styles.gridTag}>{totalDays > 1 ? `${totalDays}天` : '当天'}</span>
                  <span className={styles.gridTag}>⏱{timeStr}</span>
                </div>
              </div>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className={styles.empty}>
            {activeCat ? '这个分类还没有食谱，导入一个吧 🥐' : '还没有食谱，点击上方导入或添加吧 🥐'}
          </div>
        )}
      </div>

      <ImportModal show={showImport} onClose={() => setShowImport(false)} />
    </div>
  );
}
