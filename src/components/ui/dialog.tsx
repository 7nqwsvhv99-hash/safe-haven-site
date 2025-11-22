"use client"

import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative z-50 w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-2xl shadow-xl mx-4">
        {children}
      </div>
    </div>
  )
}

export function DialogContent({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <div className={cn("p-6 md:p-8", className)}>
      {children}
    </div>
  )
}

export function DialogHeader({ children, onClose }: { children: React.ReactNode, onClose?: () => void }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div className="flex-1">{children}</div>
      {onClose && (
        <button
          onClick={onClose}
          className="ml-4 rounded-full p-2 hover:bg-slate-100 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  )
}

export function DialogTitle({ children, className }: { children: React.ReactNode, className?: string }) {
  return (
    <h2 className={cn("text-2xl font-bold", className)}>
      {children}
    </h2>
  )
}
