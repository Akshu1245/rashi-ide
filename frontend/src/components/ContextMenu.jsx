import React, { useEffect, useRef } from 'react';
import { Copy, Trash2, Edit3, FilePlus, FolderPlus, Files } from 'lucide-react';
import './ContextMenu.css';

export default function ContextMenu({ x, y, items, onClose }) {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewW = window.innerWidth;
      const viewH = window.innerHeight;
      if (rect.right > viewW) {
        menuRef.current.style.left = `${x - rect.width}px`;
      }
      if (rect.bottom > viewH) {
        menuRef.current.style.top = `${y - rect.height}px`;
      }
    }
  }, [x, y]);

  const iconMap = {
    rename: <Edit3 size={14} />,
    duplicate: <Files size={14} />,
    delete: <Trash2 size={14} />,
    copyPath: <Copy size={14} />,
    newFile: <FilePlus size={14} />,
    newFolder: <FolderPlus size={14} />,
  };

  return (
    <div
      ref={menuRef}
      className="context-menu"
      style={{ left: x, top: y }}
    >
      {items.map((item, i) => {
        if (item.separator) {
          return <div key={i} className="context-menu-separator" />;
        }
        return (
          <button
            key={i}
            className={`context-menu-item ${item.danger ? 'danger' : ''}`}
            onClick={() => {
              item.onClick();
              onClose();
            }}
          >
            <span className="context-menu-icon">{iconMap[item.icon] || null}</span>
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
