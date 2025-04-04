<script setup lang="ts">
import { ref } from 'vue'
import Dialog from '~/components/ui/dialog/Dialog.vue'
import DialogContent from '~/components/ui/dialog/DialogContent.vue'
import DialogHeader from '~/components/ui/dialog/DialogHeader.vue'
import DialogTitle from '~/components/ui/dialog/DialogTitle.vue'
import DialogTrigger from '~/components/ui/dialog/DialogTrigger.vue'
import Textarea from './ui/textarea/Textarea.vue'

const open = ref(false)
const content = defineModel({ default: '' })
</script>

<template>
  <Dialog v-model:open="open">
    <DialogTrigger>
      <slot />
    </DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Edit System Prompt</DialogTitle>
      </DialogHeader>
      <Textarea
        v-model="content"
        min-h-40 border border-gray-300 rounded-md p-2
        dark="border-gray-700 bg-gray-800"
        placeholder="System prompt here..."
      />
    </DialogContent>
  </Dialog>
</template>
