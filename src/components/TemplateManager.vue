<script setup lang="ts">
import { ref } from 'vue'
import Button from '~/components/ui/button/Button.vue'
import Dialog from '~/components/ui/dialog/Dialog.vue'
import DialogContent from '~/components/ui/dialog/DialogContent.vue'
import DialogHeader from '~/components/ui/dialog/DialogHeader.vue'
import DialogTitle from '~/components/ui/dialog/DialogTitle.vue'
import Input from '~/components/ui/input/Input.vue'
import BasicTextarea from '~/components/ui/input/Textarea.vue'
import Label from '~/components/ui/label/Label.vue'
import { useTemplatesStore } from '~/stores/templates'

const templatesStore = useTemplatesStore()

// Initialize templates if empty
templatesStore.initialize()

// Dialog states
const showAddDialog = ref(false)
const showEditDialog = ref(false)

// Template form data
const templateName = ref('')
const templatePrompt = ref('')
const templateIsDefault = ref(false)
const editingTemplateId = ref('')

function openAddDialog() {
  templateName.value = ''
  templatePrompt.value = ''
  templateIsDefault.value = false
  showAddDialog.value = true
}

function createTemplate() {
  if (!templateName.value.trim() || !templatePrompt.value.trim())
    return

  templatesStore.createTemplate(
    templateName.value.trim(),
    templatePrompt.value.trim(),
    templateIsDefault.value,
  )

  showAddDialog.value = false
}

function openEditDialog(id: string) {
  const template = templatesStore.getTemplateById(id)
  if (!template)
    return

  editingTemplateId.value = id
  templateName.value = template.name
  templatePrompt.value = template.systemPrompt
  templateIsDefault.value = template.isDefault
  showEditDialog.value = true
}

function updateTemplate() {
  if (!editingTemplateId.value || !templateName.value.trim() || !templatePrompt.value.trim())
    return

  templatesStore.updateTemplate(editingTemplateId.value, {
    name: templateName.value.trim(),
    systemPrompt: templatePrompt.value.trim(),
    isDefault: templateIsDefault.value,
  })

  showEditDialog.value = false
}

function setAsDefault(id: string) {
  templatesStore.updateTemplate(id, { isDefault: true })
}

function deleteTemplate(id: string) {
  templatesStore.deleteTemplate(id)
}
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-medium">
        Templates
      </h2>
      <Button variant="outline" class="gap-1" @click="openAddDialog">
        <div class="i-solar-add-circle-bold" />
        Add Template
      </Button>
    </div>

    <div class="flex flex-col gap-1">
      <div
        v-for="template in templatesStore.templates"
        :key="template.id"
        class="border border-gray-200 rounded-md p-3 dark:border-gray-700"
      >
        <div class="mb-2 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <h3 class="font-medium">
              {{ template.name }}
            </h3>
            <div v-if="template.isDefault" class="rounded-full bg-primary/20 px-2 py-0.5 text-xs text-primary">
              Default
            </div>
          </div>

          <div class="flex gap-1">
            <Button v-if="!template.isDefault" variant="ghost" size="icon" class="h-7 w-7" @click="setAsDefault(template.id)">
              <div class="i-solar-star-bold text-sm" title="Set as default" />
            </Button>
            <Button variant="ghost" size="icon" class="h-7 w-7" @click="openEditDialog(template.id)">
              <div class="i-solar-pen-2-bold text-sm" />
            </Button>
            <Button
              v-if="templatesStore.templates.length > 1"
              variant="ghost"
              size="icon"
              class="h-7 w-7"
              @click="deleteTemplate(template.id)"
            >
              <div class="i-solar-trash-bin-trash-bold text-sm text-destructive" />
            </Button>
          </div>
        </div>

        <div class="line-clamp-2 text-sm text-gray-600 dark:text-gray-400">
          {{ template.systemPrompt }}
        </div>
      </div>
    </div>

    <!-- Add Template Dialog -->
    <Dialog v-model:open="showAddDialog">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Template</DialogTitle>
        </DialogHeader>
        <div class="flex flex-col gap-4">
          <div>
            <Label for="template-name">Name</Label>
            <Input id="template-name" v-model="templateName" placeholder="Template name" />
          </div>
          <div>
            <Label for="template-prompt">System Prompt</Label>
            <BasicTextarea
              id="template-prompt"
              v-model="templatePrompt"
              placeholder="System prompt..."
              class="min-h-32"
            />
          </div>
          <div class="flex items-center gap-2">
            <input
              id="is-default"
              v-model="templateIsDefault"
              type="checkbox"
              class="h-4 w-4 border-gray-300 rounded text-primary focus:ring-primary"
            >
            <Label for="is-default">Set as default template</Label>
          </div>
        </div>
        <div class="flex justify-end gap-2">
          <Button variant="outline" @click="showAddDialog = false">
            Cancel
          </Button>
          <Button @click="createTemplate">
            Create
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    <!-- Edit Template Dialog -->
    <Dialog v-model:open="showEditDialog">
      <DialogContent class="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Template</DialogTitle>
        </DialogHeader>
        <div class="flex flex-col gap-4">
          <div>
            <Label for="edit-template-name">Name</Label>
            <Input id="edit-template-name" v-model="templateName" placeholder="Template name" />
          </div>
          <div>
            <Label for="edit-template-prompt">System Prompt</Label>
            <BasicTextarea
              id="edit-template-prompt"
              v-model="templatePrompt"
              placeholder="System prompt..."
              class="min-h-32"
            />
          </div>
          <div class="flex items-center gap-2">
            <input
              id="edit-is-default"
              v-model="templateIsDefault"
              type="checkbox"
              class="h-4 w-4 border-gray-300 rounded text-primary focus:ring-primary"
            >
            <Label for="edit-is-default">Set as default template</Label>
          </div>
        </div>
        <div class="flex justify-end gap-2">
          <Button variant="outline" @click="showEditDialog = false">
            Cancel
          </Button>
          <Button @click="updateTemplate">
            Update
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>
