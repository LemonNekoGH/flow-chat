<script setup lang="ts">
import { ref, watch } from 'vue'
import Button from '~/components/ui/button/Button.vue'
import Dialog from '~/components/ui/dialog/Dialog.vue'
import DialogContent from '~/components/ui/dialog/DialogContent.vue'
import DialogHeader from '~/components/ui/dialog/DialogHeader.vue'
import DialogTitle from '~/components/ui/dialog/DialogTitle.vue'
import Input from '~/components/ui/input/Input.vue'
import Label from '~/components/ui/label/Label.vue'
import Textarea from '~/components/ui/textarea/Textarea.vue'
import { useTemplatesStore } from '~/stores/templates'

const templatesStore = useTemplatesStore()

// Initialize templates if empty
templatesStore.initialize()

// Dialog states
const showAddDialog = ref(false)
const showEditDialog = ref(false)

// Template form data - separate form states for add and edit operations
const addTemplateForm = ref({
  name: '',
  prompt: '',
  isDefault: false,
})

const editTemplateForm = ref({
  id: '',
  name: '',
  prompt: '',
  isDefault: false,
})

// Confirmation dialogs
const showDeleteConfirm = ref(false)
const templateToDelete = ref('')

function openAddDialog() {
  addTemplateForm.value = {
    name: '',
    prompt: '',
    isDefault: false,
  }
  showAddDialog.value = true
}

function createTemplate() {
  if (!addTemplateForm.value.name.trim() || !addTemplateForm.value.prompt.trim())
    return

  templatesStore.createTemplate(
    addTemplateForm.value.name.trim(),
    addTemplateForm.value.prompt.trim(),
    addTemplateForm.value.isDefault,
  )

  showAddDialog.value = false
}

function openEditDialog(id: string) {
  const template = templatesStore.getTemplateById(id)
  if (!template)
    return

  editTemplateForm.value = {
    id,
    name: template.name,
    prompt: template.systemPrompt,
    isDefault: template.isDefault,
  }
  showEditDialog.value = true
}

function updateTemplate() {
  if (!editTemplateForm.value.id || !editTemplateForm.value.name.trim() || !editTemplateForm.value.prompt.trim())
    return

  templatesStore.updateTemplate(editTemplateForm.value.id, {
    name: editTemplateForm.value.name.trim(),
    systemPrompt: editTemplateForm.value.prompt.trim(),
    isDefault: editTemplateForm.value.isDefault,
  })

  showEditDialog.value = false
}

function confirmDeleteTemplate(id: string) {
  templateToDelete.value = id
  showDeleteConfirm.value = true
}

function deleteTemplate() {
  if (!templateToDelete.value)
    return

  templatesStore.deleteTemplate(templateToDelete.value)
  showDeleteConfirm.value = false
  templateToDelete.value = ''
}

function setAsDefault(id: string) {
  templatesStore.updateTemplate(id, { isDefault: true })
}

// Close modals on ESC key
watch([showAddDialog, showEditDialog, showDeleteConfirm], ([add, edit, del]) => {
  if (!add && !edit && !del) {
    addTemplateForm.value = { name: '', prompt: '', isDefault: false }
    editTemplateForm.value = { id: '', name: '', prompt: '', isDefault: false }
    templateToDelete.value = ''
  }
})
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-medium">
        Templates
      </h2>
      <Button variant="outline" class="gap-1" @click="openAddDialog">
        <div class="i-solar-add-circle-bold" />
      </Button>
    </div>

    <div v-if="templatesStore.templates.length === 0" class="py-8 text-center text-muted-foreground">
      No templates found. Create your first template to get started.
    </div>

    <div v-else class="flex flex-col gap-3">
      <div
        v-for="template in templatesStore.templates"
        :key="template.id"
        class="border border-gray-200 rounded-md p-4 transition-colors dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
      >
        <div class="mb-2 flex flex-col">
          <div class="flex justify-between gap-2">
            <h3 class="font-medium">
              {{ template.name }}
            </h3>

            <div class="flex gap-2">
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
                @click="confirmDeleteTemplate(template.id)"
              >
                <div class="i-solar-trash-bin-trash-bold text-sm text-destructive" />
              </Button>
            </div>
          </div>
        </div>

        <div class="line-clamp-3 text-sm text-gray-600 dark:text-gray-400">
          <div v-if="template.isDefault" class="inline-block rounded-full bg-primary/20 px-2 py-0.5 text-xs text-primary">
            Default
          </div>

          {{ template.systemPrompt }}
        </div>
      </div>
    </div>

    <!-- Add Template Dialog -->
    <Dialog v-model:open="showAddDialog">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Template</DialogTitle>
        </DialogHeader>
        <div class="mt-4 flex flex-col gap-4">
          <div flex flex-col gap-2>
            <Label for="template-name">Name</Label>
            <Input id="template-name" v-model="addTemplateForm.name" placeholder="Template name" />
          </div>
          <div max-h-80 flex flex-col gap-2>
            <Label for="template-prompt">System Prompt</Label>
            <Textarea
              id="template-prompt"
              v-model="addTemplateForm.prompt"
              placeholder="System prompt..."
              class="min-h-40 border border-gray-300 rounded-md p-2"
            />
          </div>
          <div class="flex items-center gap-2">
            <input
              id="is-default"
              v-model="addTemplateForm.isDefault"
              type="checkbox"
              class="h-4 w-4 border-gray-300 rounded text-primary focus:ring-primary"
            >
            <Label for="is-default">Set as default template</Label>
          </div>
        </div>
        <div class="mt-6 flex justify-end gap-2">
          <Button variant="outline" @click="showAddDialog = false">
            Cancel
          </Button>
          <Button :disabled="!addTemplateForm.name.trim() || !addTemplateForm.prompt.trim()" @click="createTemplate">
            Create
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    <!-- Edit Template Dialog -->
    <Dialog v-model:open="showEditDialog">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Template</DialogTitle>
        </DialogHeader>
        <div class="mt-4 flex flex-col gap-4">
          <div flex flex-col gap-2>
            <Label for="edit-template-name">Name</Label>
            <Input id="edit-template-name" v-model="editTemplateForm.name" placeholder="Template name" />
          </div>
          <div max-h-80 flex flex-col gap-2>
            <Label for="edit-template-prompt">System Prompt</Label>
            <Textarea
              id="edit-template-prompt"
              v-model="editTemplateForm.prompt"
              placeholder="System prompt..."
              class="min-h-40 border border-gray-300 rounded-md p-2"
            />
          </div>
          <div class="flex items-center gap-2">
            <input
              id="edit-is-default"
              v-model="editTemplateForm.isDefault"
              type="checkbox"
              class="h-4 w-4 border-gray-300 rounded text-primary focus:ring-primary"
            >
            <Label for="edit-is-default">Set as default template</Label>
          </div>
        </div>
        <div class="mt-6 flex justify-end gap-2">
          <Button variant="outline" @click="showEditDialog = false">
            Cancel
          </Button>
          <Button :disabled="!editTemplateForm.name.trim() || !editTemplateForm.prompt.trim()" @click="updateTemplate">
            Update
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    <!-- Delete Confirmation Dialog -->
    <Dialog v-model:open="showDeleteConfirm">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Template</DialogTitle>
        </DialogHeader>
        <div class="mt-2 py-3">
          <p class="text-sm text-gray-600 dark:text-gray-400">
            Are you sure you want to delete this template? This action cannot be undone.
          </p>
        </div>
        <div class="mt-6 flex justify-end gap-2">
          <Button variant="outline" @click="showDeleteConfirm = false">
            Cancel
          </Button>
          <Button variant="destructive" @click="deleteTemplate()">
            Delete
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  </div>
</template>
