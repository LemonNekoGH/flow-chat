import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface AlertOptions {
  title: string
  description?: string
  onConfirm?: () => void | Promise<void>
  onCancel?: () => void | Promise<void>
  confirmText?: string
  cancelText?: string
}

export const useDialogStore = defineStore('dialog', () => {
  const open = ref(false)
  const title = ref('')
  const description = ref('')
  const onConfirmCallback = ref<(() => void | Promise<void>) | undefined>(undefined)
  const onCancelCallback = ref<(() => void | Promise<void>) | undefined>(undefined)
  const confirmText = ref('Confirm')
  const cancelText = ref('Cancel')

  function alert(options: AlertOptions) {
    title.value = options.title
    description.value = options.description ?? ''
    onConfirmCallback.value = options.onConfirm
    onCancelCallback.value = options.onCancel || close
    confirmText.value = options.confirmText ?? 'Confirm'
    cancelText.value = options.cancelText ?? 'Cancel'
    open.value = true
  }

  async function handleConfirm() {
    if (onConfirmCallback.value) {
      await onConfirmCallback.value()
    }
    close()
  }

  async function handleCancel() {
    if (onCancelCallback.value) {
      await onCancelCallback.value()
    }
    close()
  }

  function close() {
    open.value = false
    onConfirmCallback.value = undefined
    onCancelCallback.value = undefined
  }

  return {
    open,
    title,
    description,
    confirmText,
    cancelText,
    alert,
    handleConfirm,
    handleCancel,
    close,
  }
})
