"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react"
import { ActivityTypes } from "@repo/types"

const SPORTS: ActivityTypes[] = [
  "run", "ride", "swim", "walk", "hike"
]

export default function Manual() {
  const router = useRouter()

  const nowLocal = new Date()
  nowLocal.setMinutes(nowLocal.getMinutes() - nowLocal.getTimezoneOffset())
  const defaultDateTime = nowLocal.toISOString().slice(0, 16)

  const [data, setData] = useState({
    distance: 0,
    duration: { hr: 0, min: 30, sec: 0 },
    elevationGain: 0,
    elevationLoss: 0,
    type: "run" as ActivityTypes,
    startTime: defaultDateTime,
    endTime: "",
    title: "",
    description: "",
  })

  const [metaData, setMetaData] = useState<{
    distanceUnit: "metric" | "imperial"
    elevUnitGain: "meters" | "feet"
    elevUnitLoss: "meters" | "feet"
  }>({
    distanceUnit: "metric",
    elevUnitGain: "meters",
    elevUnitLoss: "meters",
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{
    type: "success" | "error"
    message: string
  } | null>(null)

  // Validation: Title must not be empty, Distance must be > 0, and Duration must be > 0
  const isTitleValid = data.title.trim().length > 0
  const isDistanceValid = typeof data.distance === "number" && data.distance > 0
  const isDurationValid =
    (data.duration.hr || 0) * 3600 + (data.duration.min || 0) * 60 + (data.duration.sec || 0) > 0

  const isFormValid = isTitleValid && isDistanceValid && isDurationValid

  const updateField = (field: string, value: unknown) =>
    setData(prev => ({ ...prev, [field]: value }))

  const updateMetaData = (field: keyof typeof metaData, value: string) =>
    setMetaData(prev => ({ ...prev, [field]: value }))

  const updateDuration = (key: "hr" | "min" | "sec", value: number) =>
    setData(prev => ({ ...prev, duration: { ...prev.duration, [key]: value } }))

  // Format Zod & backend errors into clean human-readable text
  const formatErrorMessage = (resData: any): string => {
    if (!resData) return "An unexpected error occurred while saving."

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

    return "Failed to save activity."
  }

  const submitHandler = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!isFormValid) {
      setFeedback({
        type: "error",
        message: "Please fill in all required fields (Title, Distance, and Duration)."
      })
      return
    }

    setIsSubmitting(true)
    setFeedback(null)

    try {
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          source: "manual",
          data: {
            ...data,
            metaData,
          },
        })
      })

      const resData = await res.json().catch(() => null)

      if (res.ok) {
        setFeedback({
          type: "success",
          message: "Activity saved successfully! Redirecting to dashboard..."
        })
        setTimeout(() => {
          router.push("/dashboard")
        }, 1200)
      } else {
        setFeedback({
          type: "error",
          message: formatErrorMessage(resData)
        })
      }
    } catch (err: any) {
      console.error(err)
      setFeedback({
        type: "error",
        message: "Network error occurred. Please check your connection to the server."
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-4xl">
      <h1 className="text-4xl font-bold text-ink mb-6">Manual Entry</h1>

      {feedback && (
        <div
          className={`mb-6 p-4 rounded-lg flex items-start gap-3 border text-sm font-medium ${
            feedback.type === "success"
              ? "bg-success-soft text-success-text border-success-text"
              : "bg-danger-soft text-danger-text border-danger-text"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-success shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      <form onSubmit={submitHandler} autoComplete="off" className="space-y-0">

        {/* Row 1: Distance, Duration, Elevation */}
        <div className="flex flex-wrap gap-8 pb-6 border-b border-line">

          {/* Distance */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="distance" className="text-xs font-medium text-ink">
              Distance <span className="text-danger-text">*</span>
            </label>
            {/* Both branches collapse to one token — the invalid-distance case never had its own colour. */}
            <div className={`flex items-center border rounded bg-surface overflow-hidden h-9 ${
              !isDistanceValid && data.distance === 0 ? "border-line-strong" : "border-line-strong"
            }`}>
              <input
                id="distance"
                type="number"
                min={0}
                step="any"
                placeholder="0"
                value={data.distance || ""}
                onChange={e => updateField("distance", parseFloat(e.target.value) || 0)}
                className="w-24 px-2 h-full text-sm outline-none text-right [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none text-ink"
              />
              <div className="h-full w-px bg-line" />
              <select
                aria-label="Distance unit"
                value={metaData.distanceUnit}
                onChange={e => updateMetaData("distanceUnit", e.target.value)}
                className="h-full px-2 pr-1 text-sm bg-surface outline-none cursor-pointer text-ink"
              >
                <option value="metric">kilometers</option>
                <option value="imperial">miles</option>
              </select>
            </div>
          </div>

          {/* Duration */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="duration-hr" className="text-xs font-medium text-ink">
              Duration <span className="text-danger-text">*</span>
            </label>
            <div className="flex items-center border border-line-strong rounded bg-surface overflow-hidden h-9">
              <input
                id="duration-hr"
                type="number"
                min={0}
                value={data.duration.hr}
                onChange={e => updateDuration("hr", parseInt(e.target.value) || 0)}
                className="w-10 px-1 h-full text-sm outline-none text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none text-ink"
              />
              <span className="text-xs text-ink-disabled pr-2">hr</span>
              <div className="h-full w-px bg-line" />
              <input
                id="duration-min"
                type="number"
                min={0}
                max={59}
                value={data.duration.min}
                onChange={e => updateDuration("min", parseInt(e.target.value) || 0)}
                className="w-10 px-1 h-full text-sm outline-none text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none text-ink"
              />
              <span className="text-xs text-ink-disabled pr-2">min</span>
              <div className="h-full w-px bg-line" />
              <input
                id="duration-sec"
                type="number"
                min={0}
                max={59}
                value={data.duration.sec}
                onChange={e => updateDuration("sec", parseInt(e.target.value) || 0)}
                className="w-10 px-1 h-full text-sm outline-none text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none text-ink"
              />
            </div>
          </div>

          {/* Elevation Gain */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="elevationGain" className="text-xs text-ink-secondary">Elev Gain</label>
            <div className="flex items-center border border-line-strong rounded bg-surface overflow-hidden h-9">
              <input
                id="elevationGain"
                type="number"
                min={0}
                step="any"
                value={data.elevationGain || ""}
                onChange={e => updateField("elevationGain", parseFloat(e.target.value) || 0)}
                className="w-20 px-2 h-full text-sm outline-none text-right [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none text-ink"
              />
              <div className="h-full w-px bg-line" />
              <select
                aria-label="Elevation gain unit"
                value={metaData.elevUnitGain}
                onChange={e => updateMetaData("elevUnitGain", e.target.value)}
                className="h-full px-2 pr-1 text-sm bg-surface outline-none cursor-pointer text-ink"
              >
                <option value="meters">meters</option>
                <option value="feet">feet</option>
              </select>
            </div>
          </div>

          {/* Elevation Loss */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="elevationLoss" className="text-xs text-ink-secondary">Elev Loss</label>
            <div className="flex items-center border border-line-strong rounded bg-surface overflow-hidden h-9">
              <input
                id="elevationLoss"
                type="number"
                min={0}
                step="any"
                value={data.elevationLoss || ""}
                onChange={e => updateField("elevationLoss", parseFloat(e.target.value) || 0)}
                className="w-20 px-2 h-full text-sm outline-none text-right [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none text-ink"
              />
              <div className="h-full w-px bg-line" />
              <select
                aria-label="Elevation loss unit"
                value={metaData.elevUnitLoss}
                onChange={e => updateMetaData("elevUnitLoss", e.target.value)}
                className="h-full px-2 pr-1 text-sm bg-surface outline-none cursor-pointer text-ink"
              >
                <option value="meters">meters</option>
                <option value="feet">feet</option>
              </select>
            </div>
          </div>
        </div>

        {/* Row 2: Sport, Start Time, End Time */}
        <div className="flex flex-wrap gap-8 py-6 border-b border-line">

          {/* Sport */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="sport" className="text-xs font-medium text-ink">Sport</label>
            <div className="flex items-center border border-line-strong rounded bg-surface overflow-hidden h-9">
              <select
                id="sport"
                value={data.type}
                onChange={e => updateField("type", e.target.value)}
                className="h-full px-3 pr-8 text-sm bg-surface outline-none cursor-pointer min-w-40 text-ink"
              >
                {SPORTS.map(sport => (
                  <option key={sport} value={sport}>
                    {sport.charAt(0).toUpperCase() + sport.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Start Time */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="startTime" className="text-xs font-medium text-ink">Start Time</label>
            <div className="flex items-center border border-line-strong rounded bg-surface overflow-hidden h-9">
              <input
                id="startTime"
                type="datetime-local"
                value={data.startTime}
                onChange={e => updateField("startTime", e.target.value)}
                className="h-full px-2 text-sm bg-surface outline-none cursor-pointer text-ink"
              />
            </div>
          </div>

          {/* End Time */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="endTime" className="text-xs text-ink-secondary">End Time</label>
            <div className="flex items-center border border-line-strong rounded bg-surface overflow-hidden h-9">
              <input
                id="endTime"
                type="datetime-local"
                value={data.endTime}
                onChange={e => updateField("endTime", e.target.value)}
                className="h-full px-2 text-sm bg-surface outline-none cursor-pointer text-ink"
              />
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="flex flex-col gap-1.5 py-6">
          <label htmlFor="title" className="text-xs font-medium text-ink">
            Title <span className="text-danger-text">*</span>
          </label>
          <input
            id="title"
            type="text"
            placeholder="e.g. Morning Run"
            value={data.title}
            onChange={e => updateField("title", e.target.value)}
            className="w-full max-w-md h-9 px-3 text-sm border border-line-strong rounded bg-surface outline-none focus:border-accent text-ink placeholder:text-ink-disabled"
          />
        </div>

        {/* Description */}
        <div className="flex flex-col gap-1.5 pb-6 border-b border-line">
          <label htmlFor="description" className="text-xs text-ink-secondary">Description</label>
          <textarea
            id="description"
            placeholder="How'd it go? Share more about your activity..."
            value={data.description}
            onChange={e => updateField("description", e.target.value)}
            rows={5}
            className="w-full max-w-md px-3 py-2 text-sm border border-line-strong rounded bg-surface outline-none focus:border-accent text-ink placeholder:text-ink-disabled resize-y"
          />
        </div>

        {/* Submit button */}
        <div className="pt-6 flex items-center gap-4">
          <button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            className={`px-8 py-2.5 text-sm font-semibold rounded-md transition-all duration-150 flex items-center gap-2 ${
              isFormValid && !isSubmitting
                ? "bg-accent text-on-accent hover:brightness-90 active:scale-[0.97] cursor-pointer shadow-xs"
                : "bg-disabled text-ink-disabled border-line-strong cursor-not-allowed select-none opacity-80"
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <span>Save Activity</span>
            )}
          </button>

          {!isFormValid && (
            <span className="text-xs text-ink-muted italic">
              Please enter a title, distance, and duration to save.
            </span>
          )}
        </div>
      </form>
    </div>
  )
}