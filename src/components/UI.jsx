import styles from './UI.module.css';

export function Badge({ children, variant = 'brown' }) {
  return <span className={`${styles.badge} ${styles[variant]}`}>{children}</span>;
}

export function Card({ children, onClick, featured, className = '' }) {
  return (
    <div
      className={`${styles.card} ${featured ? styles.featured : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

export function PrimaryBtn({ children, onClick, disabled, style }) {
  return (
    <button className={styles.primaryBtn} onClick={onClick} disabled={disabled} style={style}>
      {children}
    </button>
  );
}

export function SectionLabel({ children }) {
  return <div className={styles.sectionLabel}>{children}</div>;
}

export function SectionTitle({ children }) {
  return <div className={styles.sectionTitle}>{children}</div>;
}

export function BackBtn({ onClick }) {
  return (
    <button className={styles.backBtn} onClick={onClick}>← 返回</button>
  );
}

export function Modal({ show, onClose, title, subtitle, children }) {
  if (!show) return null;
  return (
    <div className={styles.modalOverlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <button className={styles.modalClose} onClick={onClose}>✕</button>
        <div className={styles.modalTitle}>{title}</div>
        {subtitle && <div className={styles.modalSub}>{subtitle}</div>}
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <div className={styles.field}>
      {label && <label>{label}</label>}
      {children}
    </div>
  );
}

export function TextInput({ value, onChange, placeholder, type = 'text', className }) {
  return (
    <input
      className={`${styles.input} ${className || ''}`}
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}
