import { useState, useRef, useCallback } from 'react';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Modal, PrimaryBtn } from './UI';
import styles from './CoverCropper.module.css';

const ASPECT = 3 / 2; // 封面比例

function centerAspectCrop(width, height) {
  return centerCrop(
    makeAspectCrop({ unit: '%', width: 90 }, ASPECT, width, height),
    width, height,
  );
}

export function CoverCropper({ show, imageSrc, onCancel, onConfirm }) {
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState();
  const imgRef = useRef(null);

  function onImageLoad(e) {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height));
  }

  const handleConfirm = useCallback(() => {
    const img = imgRef.current;
    if (!img || !completedCrop) return;

    const canvas = document.createElement('canvas');
    const scaleX = img.naturalWidth / img.width;
    const scaleY = img.naturalHeight / img.height;

    canvas.width = Math.round(completedCrop.width * scaleX);
    canvas.height = Math.round(completedCrop.height * scaleY);

    const ctx = canvas.getContext('2d');
    ctx.drawImage(
      img,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0, 0,
      canvas.width,
      canvas.height,
    );

    const base64 = canvas.toDataURL('image/jpeg', 0.9).split(',')[1];
    onConfirm(base64);
  }, [completedCrop, onConfirm]);

  return (
    <Modal show={show} onClose={onCancel} title="裁剪封面" subtitle="拖拽调整裁剪区域">
      {imageSrc && (
        <div className={styles.cropWrap}>
          <ReactCrop
            crop={crop}
            onChange={c => setCrop(c)}
            onComplete={c => setCompletedCrop(c)}
            aspect={ASPECT}
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
