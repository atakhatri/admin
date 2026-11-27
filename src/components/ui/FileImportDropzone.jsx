import React, { useRef, useState } from 'react';
import { CheckCircle2, FileCode2, Upload, X } from 'lucide-react';
import { MAX_IMPORT_FILE_BYTES } from '../../utils/fileImportParser';

export default function FileImportDropzone({
  kind = 'project',
  accept,
  formatsLabel,
  parseFile,
  onApplyItem,
  disabled = false,
}) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [items, setItems] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [error, setError] = useState('');

  const processFile = async (file) => {
    if (!file) return;
    setError('');

    if (file.size > MAX_IMPORT_FILE_BYTES) {
      setError('File is too large (max 512 KB).');
      return;
    }

    try {
      const text = await file.text();
      const result = parseFile(text, file.name);
      if (!result.ok || !result.items || result.items.length === 0) {
        setError(result.error || 'Unable to extract fields from this file.');
        return;
      }

      setFileName(file.name);
      setItems(result.items);
      setSelectedIndex(0);
      onApplyItem(result.items[0]);
    } catch {
      setError('Unable to read the selected file.');
    }
  };

  const handleInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    e.target.value = '';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleSelectEntry = (index) => {
    if (index < 0 || index >= items.length) return;
    setSelectedIndex(index);
    onApplyItem(items[index]);
  };

  const handleClear = () => {
    setFileName('');
    setItems([]);
    setSelectedIndex(0);
    setError('');
  };

  const entityLabel = kind === 'blog' ? 'blog post' : 'project';

  return (
    <div
      className={`file-import-box ${isDragging ? 'is-dragging' : ''} ${
        fileName ? 'is-loaded' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        aria-label={`Import ${entityLabel} from ${formatsLabel} file`}
        disabled={disabled}
        onChange={handleInputChange}
      />

      <div className="file-import-row">
        <div className="file-import-info">
          <div className="file-import-icon" aria-hidden="true">
            {fileName ? <CheckCircle2 size={16} /> : <FileCode2 size={16} />}
          </div>
          <div className="file-import-copy">
            <span className="file-import-title">
              {fileName ? `Imported ${fileName}` : `Quick Fill from File (${formatsLabel})`}
            </span>
            <span className="file-import-sub">
              {fileName
                ? items.length > 1
                  ? `Found ${items.length} entries — choose one below to populate the form.`
                  : 'Fields auto-filled below. Review or tweak anything before saving.'
                : `Drop a ${formatsLabel} file here or browse to auto-fill ${entityLabel} fields.`}
            </span>
          </div>
        </div>

        <div className="file-import-actions">
          <button
            type="button"
            className="btn-ghost-sm"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
          >
            <Upload size={13} aria-hidden="true" />
            <span>{fileName ? 'Replace File' : 'Upload File'}</span>
          </button>
          {fileName && (
            <button
              type="button"
              className="icon-btn"
              aria-label="Dismiss imported file banner"
              onClick={handleClear}
            >
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {items.length > 1 && (
        <div className="file-import-picker" role="group" aria-label="Entries detected in file">
          {items.map((item, idx) => (
            <button
              key={`${item.slug || item.title || 'entry'}-${idx}`}
              type="button"
              className={`file-import-entry-btn ${idx === selectedIndex ? 'is-active' : ''}`}
              onClick={() => handleSelectEntry(idx)}
            >
              {idx + 1}. {item.title || `Entry ${idx + 1}`}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="file-import-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
