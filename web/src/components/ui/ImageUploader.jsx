import { useState, useRef, useCallback } from 'react'
import { Upload, X, Image as ImageIcon } from 'lucide-react'
import api from '../../api/axios'

export default function ImageUploader({
  uploadUrl,
  currentUrl = null,
  onSuccess,
  accept = 'image/*',
  maxSizeMB = 5,
  label = 'Subir imagen',
  className = '',
}) {
  const [preview, setPreview] = useState(currentUrl)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  const validate = (file) => {
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      return 'Solo se permiten imágenes o videos'
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `El archivo no puede superar ${maxSizeMB}MB`
    }
    return null
  }

  const upload = useCallback(async (file) => {
    const err = validate(file)
    if (err) { setError(err); return }

    setError('')
    setPreview(URL.createObjectURL(file))
    setUploading(true)
    setProgress(0)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const { data } = await api.post(uploadUrl, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) setProgress(Math.round((e.loaded * 100) / e.total))
        },
      })
      const url = data.url || data.logoUrl || data.photoUrl
      setPreview(url)
      onSuccess?.(url, data)
    } catch (e) {
      setError(e.response?.data?.message || 'Error al subir el archivo')
      setPreview(currentUrl)
    } finally {
      setUploading(false)
      setProgress(0)
    }
  }, [uploadUrl, currentUrl, onSuccess])

  const handleFile = (file) => {
    if (file) upload(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const clearImage = (e) => {
    e.stopPropagation()
    setPreview(null)
    onSuccess?.(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {label && <p className="text-sm font-medium text-secondary">{label}</p>}
      <div
        className={`relative border-2 border-dashed rounded-xl transition-colors cursor-pointer
          ${dragging ? 'border-accent bg-accent/5' : 'border-gray-soft bg-cream hover:border-accent hover:bg-accent/5'}
          ${uploading ? 'pointer-events-none opacity-80' : ''}
        `}
        style={{ minHeight: 120 }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
        />

        {preview ? (
          <div className="relative">
            <img
              src={preview}
              alt="preview"
              className="w-full h-40 object-cover rounded-xl"
            />
            {!uploading && (
              <button
                type="button"
                onClick={clearImage}
                className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80 transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 gap-2 text-secondary">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm">
              <ImageIcon size={20} className="text-accent" />
            </div>
            <p className="text-sm font-medium">Arrastra una imagen o haz clic</p>
            <p className="text-xs text-muted">PNG, JPG hasta {maxSizeMB}MB</p>
          </div>
        )}

        {/* Upload progress overlay */}
        {uploading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 rounded-xl">
            <Upload size={20} className="text-accent animate-bounce mb-2" />
            <div className="w-32 bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-accent h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-secondary mt-1">{progress}%</p>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}
