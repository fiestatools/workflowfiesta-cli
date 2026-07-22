import type { CreateProviderConfig, ProviderSummary, ProviderType } from '../settings'
import { useState } from 'react'
import { ProviderConfigForm } from './ProviderConfigForm'
import { ProviderTypeSelector } from './ProviderTypeSelector'

export interface AddProviderFormProps {
  onSubmit: (config: CreateProviderConfig) => Promise<ProviderSummary>
  onClose: () => void
}

export function AddProviderForm({ onSubmit, onClose }: AddProviderFormProps) {
  const [selectedType, setSelectedType] = useState<ProviderType | null>(null)

  const handleTypeSelect = (type: ProviderType): void => {
    setSelectedType(type)
  }

  const handleBack = (): void => {
    setSelectedType(null)
  }

  const handleSubmit = async (config: CreateProviderConfig): Promise<ProviderSummary> => {
    const result = await onSubmit(config)
    onClose()
    return result
  }

  if (!selectedType) {
    return (
      <ProviderTypeSelector
        onSelect={handleTypeSelect}
        onClose={onClose}
      />
    )
  }

  return (
    <ProviderConfigForm
      providerType={selectedType}
      onSubmit={handleSubmit}
      onBack={handleBack}
      onCancel={onClose}
    />
  )
}
