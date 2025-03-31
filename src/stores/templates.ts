import type { Template } from '~/types/templates'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import prompt from '~/utils/prompt.md?raw'

export const useTemplatesStore = defineStore('templates', () => {
  const templates = ref<Template[]>([])

  const defaultTemplate = computed(() => {
    return templates.value.find(t => t.isDefault) || null
  })

  function getTemplateById(id: string) {
    return templates.value.find(t => t.id === id) || null
  }

  function createTemplate(name: string, systemPrompt: string, isDefault: boolean = false) {
    const id = crypto.randomUUID()

    // If this is set as default, unset other defaults
    if (isDefault) {
      templates.value.forEach((t) => {
        t.isDefault = false
      })
    }

    const template: Template = {
      id,
      name,
      systemPrompt,
      isDefault,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    templates.value.push(template)
    return template
  }

  function updateTemplate(id: string, data: Partial<Omit<Template, 'id' | 'createdAt'>>) {
    const template = templates.value.find(t => t.id === id)
    if (!template)
      return

    // If setting this as default, unset other defaults
    if (data.isDefault) {
      templates.value.forEach((t) => {
        if (t.id !== id)
          t.isDefault = false
      })
    }

    Object.assign(template, {
      ...data,
      updatedAt: Date.now(),
    })
  }

  function deleteTemplate(id: string) {
    const template = templates.value.find(t => t.id === id)
    if (!template)
      return

    // Don't delete if it's the last template
    if (templates.value.length <= 1)
      return

    // If deleting the default template, set another as default
    if (template.isDefault && templates.value.length > 1) {
      const newDefault = templates.value.find(t => t.id !== id)
      if (newDefault)
        newDefault.isDefault = true
    }

    templates.value = templates.value.filter(t => t.id !== id)
  }

  function initialize() {
    // If no templates exist, create a default one
    if (templates.value.length === 0) {
      createTemplate('Default Template', prompt, true)
    }

    // Ensure there's always a default template
    if (!templates.value.some(t => t.isDefault)) {
      templates.value[0].isDefault = true
    }
  }

  return {
    templates,
    defaultTemplate,
    getTemplateById,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    initialize,
  }
}, {
  persist: true,
})
