import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../store/AppContext';
import { SectionLabel, Card, Modal, PrimaryBtn } from '../components/UI';
import styles from './RecipeList.module.css';

function fmtCost(n) { return '¥' + n.toFixed(1); }

function ImportModal({ show, onClose }) {
  const [step, setStep] = useState('upload'); // upload | processing | done
  const [logLines, setLogLines] = useState([]);

  function simulate() {
    setStep('processing');
    const msgs = [
      '正在识别食谱名称…',
      '✅ 识别到食谱名称\n正在提取食材分组…',
      '✅ 提取食材（含分组）\n正在解析步骤与时间…',
      '✅ 解析多天步骤完成\n检测并行任务与隔夜节点…',
      '✅ 检测到并行任务 2 组 · 隔夜节点 1 处',
    ];
    let i = 0;
    const t = setInterval(() => {
      if (i < msgs.length) setLogLines(msgs[i++].split('\n'));
      else { clearInterval(t); setStep('done'); }
    }, 600);
  }

  function handleClose() {
    setStep('upload');
    setLogLines([]);
    onClose();
  }

  return (
    <Modal show={show} onClose={handleClose} title="📷 拍照导入食谱" subtitle="上传食谱照片，AI 自动识别食材、步骤、烤箱参数">
      {step === 'upload' && (
        <>
          <div className={styles.uploadZone} onClick={simulate}>
            <div className={styles.uploadIcon}>🖼️</div>
            <div className={styles.uploadText}>点击上传食谱照片</div>
            <div className={styles.uploadSub}>支持截图、拍照、网页保存图片</div>
          </div>
          <PrimaryBtn disabled>识别食谱</PrimaryBtn>
        </>
      )}
      {step === 'processing' && (
        <div className={styles.aiBox}>
          <div className={styles.aiDot} />
          <div className={styles.aiLog}>
            {logLines.map((l, i) => <div key={i}>{l}</div>)}
          </div>
        </div>
      )}
      {step === 'done' && (
        <>
          <div className={styles.doneBox}>
            <div className={styles.doneTitle}>✅ 识别完成</div>
            <div className={styles.doneSub}>已识别出食谱 · 2天计划 · 多组食材 · 并行任务已标注</div>
          </div>
          <PrimaryBtn onClick={handleClose}>导入食谱 →</PrimaryBtn>
        </>
      )}
    </Modal>
  );
}

export default function RecipeList() {
  const navigate = useNavigate();
  const { recipes, recipeCost, getPortion } = useApp();
  const [showImport, setShowImport] = useState(false);

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.nav}>
        <div>
          <div className={styles.navTitle}>🧁 烘焙助手</div>
          <div className={styles.navSub}>我的厨房笔记</div>
        </div>
        <button className={styles.addBtn} onClick={() => setShowImport(true)}>＋</button>
      </div>

      <div className={styles.content}>
        {/* Import banner */}
        <div className={styles.importBanner} onClick={() => setShowImport(true)}>
          <span className={styles.importIcon}>📷</span>
          <div className={styles.importTitle}>拍照导入食谱</div>
          <div className={styles.importSub}>上传照片，AI 自动识别并整理</div>
        </div>

        <SectionLabel>全部食谱</SectionLabel>

        {recipes.map((r, idx) => {
          const p = getPortion(r.id, r.portion);
          const cost = recipeCost(r, p);
          const totalDays = r.days.length;
          const serialMin = r.days.flatMap(d => d.tasks.filter(t => t.serial))
            .reduce((a, t) => a + t.totalSec / 60, 0);
          const hrs = Math.floor(serialMin / 60);
          const mins = Math.round(serialMin % 60);
          return (
            <Card key={r.id} featured={idx === 0} onClick={() => navigate(`/recipe/${r.id}`)}>
              <div className={styles.recipeTag}>{r.tag}</div>
              <div className={styles.recipeName}>{r.name}</div>
              <div className={styles.recipeMeta}>
                <span>📅 {totalDays > 1 ? `${totalDays}天` : '当天'}</span>
                <span>⏱ {hrs > 0 ? `${hrs}小时` : ''}{mins > 0 ? `${mins}分` : ''}</span>
                <span>🍽 {p}{r.portionUnit}</span>
                <span>💰 {fmtCost(cost)}</span>
              </div>
            </Card>
          );
        })}

        {recipes.length === 0 && (
          <div className={styles.empty}>还没有食谱，点击上方导入或添加吧 🥐</div>
        )}
      </div>

      <ImportModal show={showImport} onClose={() => setShowImport(false)} />
    </div>
  );
}
