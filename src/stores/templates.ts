import type { Template } from '~/types/templates'
import { useLocalStorage } from '@vueuse/core'
import { defineStore } from 'pinia'
import { computed } from 'vue'
import prompt from '~/utils/prompt.md?raw'

// Type definition for our template map
type TemplateMap = Map<string, Template>

export const useTemplatesStore = defineStore('templates', () => {
  // Persistence layer
  const templatesStorage = useLocalStorage<[string, Template][]>('flow-chat-templates', [])

  // Pure computed values
  const templatesMap = computed<TemplateMap>(() => new Map(templatesStorage.value))
  const templates = computed<Template[]>(() => Array.from(templatesMap.value.values()))
  const defaultTemplate = computed(() =>
    templates.value.find(t => t.isDefault) ?? null,
  )

  // Pure functions for state transformations
  function createTemplateState(
    name: string,
    systemPrompt: string,
    isDefault: boolean,
  ): Template {
    return {
      id: crypto.randomUUID(),
      name,
      systemPrompt,
      isDefault,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
  }

  function updateTemplateState(
    template: Template,
    data: Partial<Omit<Template, 'id' | 'createdAt'>>,
  ): Template {
    return {
      ...template,
      ...data,
      updatedAt: Date.now(),
    }
  }

  // Storage operations
  function persistTemplates(newMap: TemplateMap) {
    templatesStorage.value = Array.from(newMap.entries())
  }

  // Business logic
  function getTemplateById(id: string): Template | null {
    return templatesMap.value.get(id) ?? null
  }

  function createTemplate(
    name: string,
    systemPrompt: string,
    isDefault: boolean = false,
  ): Template {
    const newMap = new Map(templatesMap.value)

    // If this is set as default, unset other defaults
    if (isDefault) {
      for (const [id, template] of newMap.entries()) {
        if (template.isDefault) {
          newMap.set(id, { ...template, isDefault: false })
        }
      }
    }

    const template = createTemplateState(name, systemPrompt, isDefault)
    newMap.set(template.id, template)

    persistTemplates(newMap)
    return template
  }

  function updateTemplate(
    id: string,
    data: Partial<Omit<Template, 'id' | 'createdAt'>>,
  ): boolean {
    const template = templatesMap.value.get(id)
    if (!template)
      return false

    const newMap = new Map(templatesMap.value)

    // If setting this as default, unset other defaults
    if (data.isDefault) {
      for (const [tid, t] of newMap.entries()) {
        if (t.isDefault && tid !== id) {
          newMap.set(tid, { ...t, isDefault: false })
        }
      }
    }

    const updatedTemplate = updateTemplateState(template, data)
    newMap.set(id, updatedTemplate)

    persistTemplates(newMap)
    return true
  }

  function deleteTemplate(id: string): boolean {
    const template = templatesMap.value.get(id)
    if (!template)
      return false

    // Don't delete if it's the last template
    if (templatesMap.value.size <= 1)
      return false

    const newMap = new Map(templatesMap.value)

    // If deleting the default template, set another as default
    // TODO: default template cannot be deleted
    if (template.isDefault && newMap.size > 1) {
      const [firstId, firstTemplate] = Array.from(newMap.entries())
        .find(([tid]) => tid !== id) ?? []

      if (firstId && firstTemplate) {
        newMap.set(firstId, { ...firstTemplate, isDefault: true })
      }
    }

    newMap.delete(id)
    persistTemplates(newMap)
    return true
  }

  function initialize(): Template {
    // If no templates exist, create a default one
    if (templatesMap.value.size === 0) {
      return createTemplate('Default Template', prompt, true)
    }

    // Ensure there's always a default template
    if (!templates.value.some(t => t.isDefault)) {
      const [firstId, firstTemplate] = Array.from(templatesMap.value.entries())[0]
      updateTemplate(firstId, { isDefault: true })
      return firstTemplate
    }

    return Array.from(templatesMap.value.values())[0]
  }

  return {
    // State
    templates,
    defaultTemplate,

    // Actions
    getTemplateById,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    initialize,
  }
})
