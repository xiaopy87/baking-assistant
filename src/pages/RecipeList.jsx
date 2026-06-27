import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { SectionLabel, Card, Modal, PrimaryBtn } from '../components/UI';
import { CATEGORIES } from '../data/categories';
import styles from './RecipeList.module.css';

const WORKER_URL = import.meta.env.VITE_API_URL || 'https://baking-assistant-api.xiaopy87.workers.dev';

function fmtCost(n) { return '¥' + n.toFixed(1); }

function ImportModal({ show, onClose }) {
  const { saveRecipe } = useApp();
  const [step, setStep] = useState('upload');
  const [preview, setPreview] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
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

  async function handleRecognize() {
    if (!imageBase64) return;
    setStep('processing');
    console.log('[识别] 开始，图片大小:', Math.round(imageBase64.length / 1024), 'KB');
    try {
      const res = await fetch(`${WORKER_URL}/api/recognize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64 }),
      });
      console.log('[识别] Worker 响应状态:', res.status);
      const data = await res.json();
      console.log('[识别] 返回数据:', data);
      if (!res.ok || data.error) throw new Error(data.error || '识别失败');
      const recipe = {
        ...data,
        id: 'imported_' + Date.now(),
        ingGroups: (data.ingGroups || []).map(g => ({
          ...g,
          ings: (g.ings || []).map(ing => ({ ...ing, ingId: ing.name })),
        })),
      };
      setResult(recipe);
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
    setStep('upload');
    setPreview(null);
    setImageBase64(null);
    setResult(null);
    setErrorMsg('');
    onClose();
  }

  return (
    <Modal show={show} onClose={handleClose} title="📷 拍照导入食谱" subtitle="上传食谱照片，AI 自动识别食材、步骤、烤箱参数">
      {step === 'upload' && (
        <>
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
          <PrimaryBtn onClick={handleRecognize} disabled={!imageBase64}>识别食谱</PrimaryBtn>
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
          <PrimaryBtn onClick={() => setStep('upload')}>重新上传</PrimaryBtn>
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
                <div className={styles.gridThumb}>
                  <span className={styles.gridEmoji}>{r.tag?.match(/\p{Emoji}/u)?.[0] || '🍞'}</span>
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
