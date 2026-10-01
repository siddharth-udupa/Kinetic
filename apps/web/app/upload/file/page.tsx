"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { UploadCloud, FileUp, CheckCircle2, AlertCircle, Loader2, X } from "lucide-react"

export default function GPXUploadPage() {
  const router = useRouter()
  const [data, setData] = useState({
    title: "",
    description: "",
  })
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [feedback, setFeedback] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0])
      setFeedback(null)
    }
  }

  const removeFile = () => {
    setFile(null)
    setFeedback(null)
  }

  const updateField = (field: string, value: unknown) =>
    setData(prev => ({ ...prev, [field]: value }))

  const formatErrorMessage = (resData: any): string => {
    if (!resData) return "An unexpected error occurred during upload."

    if (resData.detailedError) {
      const errs = resData.detailedError
      if (typeof errs === "string") return errs

      if (Array.isArray(errs)) {
        const messages = errs.map((e: any) => {
          const fieldName =
            Array.isArray(e.path) && e.path.length > 0
              ? e.path
                  .map((p: any) => String(p).charAt(0).toUpperCase() + String(p).slice(1))
                  .join(" > ")
              : ""

          let msg = e.message || "Invalid value"
          if (e.code === "too_small") {
            msg = e.minimum ? `must be at least ${e.minimum} character(s)` : "is required"
          } else if (e.code === "too_big") {
            msg = `must be at most ${e.maximum} character(s)`
          } else if (e.code === "invalid_type") {
            msg = "is invalid"
          }

          return fieldName ? `${fieldName} ${msg}` : msg
        })
        return messages.join(". ")
      }
    }

    if (resData.error) {
      if (typeof resData.error === "string") return resData.error
      return "Validation failed on the server."
    }

    return "Failed to upload GPX activity."
  }

  const handleUpload = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!file) {
      setFeedback({
        type: "error",
        message: "Please select a .gpx file to upload."
      })
      return
    }

    setIsUploading(true)
    setFeedback(null)

    try {
      const xmlContent = await file.text()
      const response = await fetch("/api/activities", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: "gpx",
          data: {
            title: data.title || file.name.replace(/\.gpx$/i, ""),
            description: data.description || null,
            xmlContent,
          },
        }),
      })

      const resData = await response.json().catch(() => null)

      if (response.ok) {
        setFeedback({
          type: "success",
          message: "GPX Activity uploaded successfully! Redirecting to dashboard..."
        })
        setFile(null)
        setData({ title: "", description: "" })
        setTimeout(() => {
          router.push("/dashboard")
        }, 1200)
      } else {
        setFeedback({
          type: "error",
          message: formatErrorMessage(resData)
        })
      }
    } catch (error) {
      console.error("Upload error:", error)
      setFeedback({
        type: "error",
        message: "An error occurred during upload. Please check your backend connection."
      })
    } finally {
      setIsUploading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} bytes`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="w-full max-w-4xl">
      <h1 className="text-4xl font-bold text-gray-900 mb-6">GPX File Upload</h1>

      {feedback && (
        <div
          className={`mb-6 p-4 rounded-lg flex items-start gap-3 border text-sm font-medium ${
            feedback.type === "success"
              ? "bg-green-50 text-green-800 border-green-200"
              : "bg-red-50 text-red-800 border-red-200"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      <form onSubmit={handleUpload} className="space-y-0">
        
        {/* GPX File Drop / Input Box */}
        <div className="pb-6 border-b border-gray-200">
          <label className="text-xs font-medium text-gray-700 mb-2 block">
            GPX File <span className="text-red-500">*</span>
          </label>
          
          <div className="border-2 border-dashed border-gray-300 hover:border-brand rounded-xl p-8 bg-gray-50/50 hover:bg-orange-50/30 transition-colors flex flex-col items-center justify-center text-center">
            <UploadCloud className="w-10 h-10 text-brand mb-3" />
            
            {file ? (
              <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-xs">
                <FileUp className="w-5 h-5 text-brand" />
                <div className="text-left">
                  <p className="text-sm font-semibold text-gray-900">{file.name}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={removeFile}
                  className="p-1 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 ml-2"
                  title="Remove file"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <p className="text-sm font-semibold text-gray-800 mb-1">
                  Choose a .gpx file to upload
                </p>
                <p className="text-xs text-gray-500 mb-4">
                  GPS exchange format files exported from Garmin, Wahoo, Apple Watch, or Suunto
                </p>
                <label
                  htmlFor="gpx-upload"
                  className="px-4 py-2 bg-white border border-gray-300 hover:border-brand text-gray-700 text-xs font-semibold rounded-md shadow-xs cursor-pointer hover:text-brand transition-colors"
                >
                  Browse Files
                </label>
                <input
                  type="file"
                  id="gpx-upload"
                  accept=".gpx"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </>
            )}
          </div>
        </div>

        {/* Title */}
        <div className="flex flex-col gap-1.5 py-6">
          <label htmlFor="title" className="text-xs text-gray-600">
            Title <span className="text-gray-400 font-normal">(optional - defaults to file name)</span>
          </label>
          <input
            id="title"
            type="text"
            placeholder="Morning Ride"
            value={data.title}
            onChange={e => updateField("title", e.target.value)}
            className="w-full max-w-md h-9 px-3 text-sm border border-gray-300 rounded bg-white outline-none focus:border-brand text-gray-900 placeholder:text-gray-400"
          />
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1.5 pb-6 border-b border-gray-200">
          <label htmlFor="description" className="text-xs text-gray-600">Description</label>
          <textarea
            id="description"
            placeholder="How'd it go? Share details about your activity..."
            value={data.description}
            onChange={e => updateField("description", e.target.value)}
            rows={5}
            className="w-full max-w-md px-3 py-2 text-sm border border-gray-300 rounded bg-white outline-none focus:border-brand text-gray-900 placeholder:text-gray-400 resize-y"
          />
        </div>

        {/* Submit button */}
        <div className="pt-6 flex items-center gap-4">
          <button
            type="submit"
            disabled={!file || isUploading}
            className={`px-8 py-2.5 text-sm font-semibold rounded-md transition-all duration-150 flex items-center gap-2 ${
              file && !isUploading
                ? "bg-brand text-white hover:brightness-90 active:scale-[0.97] cursor-pointer shadow-xs"
                : "bg-gray-200 text-gray-400 border border-gray-300 cursor-not-allowed select-none opacity-80"
            }`}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Uploading GPX...</span>
              </>
            ) : (
              <span>Upload Activity</span>
            )}
          </button>

          {!file && (
            <span className="text-xs text-gray-500 italic">
              Please select a .gpx file to upload.
            </span>
          )}
        </div>

      </form>
    </div>
  )
}
