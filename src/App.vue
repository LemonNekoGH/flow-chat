<script setup lang="ts">
import { onMounted } from 'vue'
import { toast } from 'vue-sonner'
import Dialog from '~/components/ui/dialog/Dialog.vue'
import DialogContent from '~/components/ui/dialog/DialogContent.vue'
import DialogHeader from '~/components/ui/dialog/DialogHeader.vue'
import DialogTitle from '~/components/ui/dialog/DialogTitle.vue'
import { useDatabaseStore } from '~/stores/database'
import DialogDescription from './components/ui/dialog/DialogDescription.vue'

const dbStore = useDatabaseStore()

onMounted(async () => {
  await new Promise((resolve) => {
    setTimeout(resolve, 2000)
  })

  try {
    await dbStore.initialize()
    await dbStore.migrate()
  }
  catch (error) {
    console.error(error)
    toast.error('Failed to initialize database')
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
</template>
