'use client'

import { MapPin, X } from 'lucide-react'

export type JobAlertPayload = {
  jobId: string
  jobTitle: string
  serviceCategory: string
  shortDescription?: string
  approximateArea: string
  approximateDistanceKm: number
  customerBudget?: number | null
  preferredTime?: string
  urgency?: string
}

export function JobAlertModal({
  alert,
  onClose,
  onView,
  onOffer,
  onDecline,
}: {
  alert: JobAlertPayload
  onClose: () => void
  onView: () => void
  onOffer: () => void
  onDecline: () => void
}) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="New job alert">
      <div className="modal-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <span className="badge badge-warning">New job nearby</span>
          <button type="button" className="back-btn" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <h3 className="section-title" style={{ marginTop: 12, fontSize: 22 }}>
          {alert.jobTitle || alert.serviceCategory}
        </h3>
        <p className="muted" style={{ marginTop: 0 }}>
          {alert.shortDescription}
        </p>
        <div className="stack" style={{ gap: 8, fontSize: 14 }}>
          <div>
            <MapPin size={14} style={{ display: 'inline', marginRight: 6 }} />
            {alert.approximateArea} · ~{alert.approximateDistanceKm} km
          </div>
          <div>
            Customer budget:{' '}
            <strong>
              {alert.customerBudget != null ? `Rs. ${alert.customerBudget}` : 'Not set'}
            </strong>
          </div>
          {alert.preferredTime && (
            <div>
              Preferred: <strong>{alert.preferredTime}</strong>
              {alert.urgency ? ` · ${alert.urgency}` : ''}
            </div>
          )}
        </div>
        <div className="sticky-actions" style={{ marginTop: 16 }}>
          <button type="button" className="btn btn-primary" onClick={onOffer}>
            Send offer
          </button>
          <button type="button" className="btn btn-secondary" onClick={onView}>
            View details
          </button>
          <button type="button" className="btn btn-outline" onClick={onDecline}>
            Decline
          </button>
        </div>
      </div>
    </div>
  )
}
