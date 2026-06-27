import { useState, useRef, useCallback } from 'react';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Modal, PrimaryBtn } from './UI';
import styles from './CoverCropper.module.css';

const RATIOS = [
  { label: '竖版', value: 3 / 4 },
  { label: '横版', value: 4 / 3 },
];

function centerAspectCrop(aspect, width, height) {
  return centerCrop(
    makeAspectCrop({ unit: '%', width: 90 }, aspect, width, height),
    width, height,
  );
}

export function CoverCropper({ show, imageSrc, onCancel, onConfirm }) {
  const [aspectIdx, setAspectIdx] = useState(0);
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState();
  const imgRef = useRef(null);

  const aspect = RATIOS[aspectIdx].value;

  function onImageLoad(e) {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(aspect, width, height));
  }

  function handleRatioChange(idx) {
    setAspectIdx(idx);
    const img = imgRef.current;
    if (img) setCrop(centerAspectCrop(RATIOS[idx].value, img.width, img.height));
  }

  const handleConfirm = useCallback(() => {
    const img = imgRef.current;
    if (!img || !completedCrop) return;

    const scaleX = img.naturalWidth / img.width;
    const scaleY = img.naturalHeight / img.height;
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(completedCrop.width * scaleX);
    canvas.height = Math.round(completedCrop.height * scaleY);

    canvas.getContext('2d').drawImage(
      img,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0, 0, canvas.width, canvas.height,
    );

    onConfirm(canvas.toDataURL('image/jpeg', 0.9).split(',')[1], aspect);
  }, [completedCrop, onConfirm]);

  return (
    <Modal show={show} onClose={onCancel} title="裁剪封面" subtitle="选择比例，拖拽调整裁剪区域">
      <div className={styles.ratioTabs}>
        {RATIOS.map((r, i) => (
          <button
            key={r.label}
            className={`${styles.ratioTab} ${i === aspectIdx ? styles.ratioActive : ''}`}
            onClick={() => handleRatioChange(i)}
          >
            <span className={`${styles.ratioIcon} ${r.value < 1 ? styles.portrait : styles.landscape}`} />
            {r.label}
          </button>
        ))}
      </div>
      {imageSrc && (
        <div className={styles.cropWrap}>
          <ReactCrop
            crop={crop}
            onChange={c => setCrop(c)}
            onComplete={c => setCompletedCrop(c)}
            aspect={aspect}
            minWidth={50}
          >
            <img ref={imgRef} src={imageSrc} onLoad={onImageLoad} className={styles.cropImg} alt="裁剪预览" />
          </ReactCrop>
        </div>
      )}
      <PrimaryBtn onClick={handleConfirm}>确认裁剪</PrimaryBtn>
    </Modal>
  );
}
