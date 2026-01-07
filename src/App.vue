<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { onMounted } from 'vue'
import { toast } from 'vue-sonner'
import Dialog from '~/components/ui/dialog/Dialog.vue'
import DialogContent from '~/components/ui/dialog/DialogContent.vue'
import DialogHeader from '~/components/ui/dialog/DialogHeader.vue'
import DialogTitle from '~/components/ui/dialog/DialogTitle.vue'
import { useDatabaseStore } from '~/stores/database'
import { useDialogStore } from '~/stores/dialog'
import { useTutorialStore } from '~/stores/tutorial'
import { Button } from './components/ui/button'
import DialogDescription from './components/ui/dialog/DialogDescription.vue'
import DialogFooter from './components/ui/dialog/DialogFooter.vue'

const dbStore = useDatabaseStore()
const dialogStore = useDialogStore()
const tutorialStore = useTutorialStore()
const { firstHere } = storeToRefs(tutorialStore)
const { open, title, description, confirmText, cancelText } = storeToRefs(dialogStore)

onMounted(async () => {
  try {
    await dbStore.initialize()
    await dbStore.migrate()
  }
  catch (error) {
    console.error(error)
    toast.error('Failed to initialize database')
  }

  if (firstHere.value.isFirstHere.value) {
    tutorialStore.showTutorial(firstHere.value)
  }
})
</script>

<template>
  <RouterView />
  <Dialog :open="!dbStore.db" :modal="true">
    <DialogContent>
      <DialogHeader>
        <DialogTitle>
          Loading database...
        </DialogTitle>
      </DialogHeader>
      <DialogDescription>
        Please wait while we load the database...
      </DialogDescription>
    </DialogContent>
  </Dialog>
  <Dialog :open="open">
    <DialogContent class="z-[10003]" overlay-class="z-[10002]">
      <DialogHeader>
        <DialogTitle>
          {{ title }}
        </DialogTitle>
      </DialogHeader>
      <DialogDescription>
        {{ description }}
      </DialogDescription>
      <DialogFooter>
        <Button variant="outline" class="pointer-events-auto" @click="dialogStore.handleCancel">
          {{ cancelText }}
        </Button>
        <Button variant="destructive" class="pointer-events-auto" @click="dialogStore.handleConfirm">
          {{ confirmText }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
