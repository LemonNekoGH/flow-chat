<script setup lang="ts">
import type { SelectItemProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'
import { Check } from 'lucide-vue-next'
import {
  SelectItem,
  SelectItemIndicator,

  SelectItemText,
  useForwardProps,
} from 'reka-ui'
import { computed } from 'vue'
import { cn } from '~/utils'

const props = defineProps<SelectItemProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props

  return delegated
})

const forwardedProps = useForwardProps(delegatedProps)
</script>

<template>
  <SelectItem
    v-bind="forwardedProps"
    :class="
      cn(
        'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        props.class,
      )
    "
  >
    <span class="absolute left-2 h-3.5 w-3.5 flex items-center justify-center">
      <SelectItemIndicator>
        <Check class="h-4 w-4" />
      </SelectItemIndicator>
    </span>

    <SelectItemText>
      <slot />
    </SelectItemText>
  </SelectItem>
</template>
