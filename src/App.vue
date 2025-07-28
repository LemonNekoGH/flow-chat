<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { DialogOverlay } from 'reka-ui'
import { onMounted } from 'vue'
import { toast } from 'vue-sonner'
import Dialog from '~/components/ui/dialog/Dialog.vue'
import DialogContent from '~/components/ui/dialog/DialogContent.vue'
import DialogHeader from '~/components/ui/dialog/DialogHeader.vue'
import DialogTitle from '~/components/ui/dialog/DialogTitle.vue'
import { useDatabaseStore } from '~/stores/database'
import { useTutorialStore } from '~/stores/tutorial'
import { Button } from './components/ui/button'
import DialogDescription from './components/ui/dialog/DialogDescription.vue'
import DialogFooter from './components/ui/dialog/DialogFooter.vue'

const dbStore = useDatabaseStore()
const tutorialStore = useTutorialStore()
const { showSkip, firstHere } = storeToRefs(tutorialStore)

function onCloseSkipDialog() {
  if (tutorialStore.activeTutorial) {
    tutorialStore.activeTutorial.showSkip.value = false
  }
}

function onConfirmSkipDialog() {
  if (!tutorialStore.activeTutorial) {
    toast.error('Error skipping tutorial, tutorial is not active')
    return
  }

  tutorialStore.activeTutorial.showSkip.value = false
  tutorialStore.activeTutorial.goToStep('Reset')
}

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
  <Dialog :open="showSkip">
    <DialogOverlay class="fixed inset-0 z-10002" />
    <DialogContent class="fixed z-10003">
      <DialogHeader>
        <DialogTitle>
          Close the tutorial
        </DialogTitle>
      </DialogHeader>
      <DialogDescription>
        Are you sure you want to close the tutorial?
      </DialogDescription>
      <DialogFooter>
        <Button variant="outline" class="pointer-events-auto" @click="onCloseSkipDialog">
          No, continue
        </Button>

        <Button variant="destructive" class="pointer-events-auto" @click="onConfirmSkipDialog">
          Yes, skip it
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
