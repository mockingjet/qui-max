<template>
  <div class="q-context-wrapper">
    <div
      ref="reference"
      class="q-context-trigger"
      @click="handleTriggerClick"
    >
      <slot v-if="$slots.default" />
      <button
        v-else
        type="button"
        class="q-context-trigger__button q-icon-dots-3-horizontal"
      />
    </div>

    <teleport
      :to="teleportTo || 'body'"
      :disabled="!teleportTo"
    >
      <transition
        name="q-fade"
        @after-leave="afterLeave"
      >
        <div
          v-show="isContextMenuShown"
          ref="contextMenu"
          class="q-context-menu"
          :style="{ zIndex }"
        >
          <button
            v-for="(item, index) in menuItems"
            :key="index"
            :ref="setItemRef"
            type="button"
            tabindex="-1"
            class="q-context-menu__item"
            :class="{ 'q-context-menu__item_with-icon': item.icon }"
            @click="handleItemClick(item.action)"
          >
            <span
              v-if="item.icon"
              class="q-context-menu__icon"
              :class="item.icon"
            />
            {{ item.name }}
          </button>
        </div>
      </transition>
    </teleport>
  </div>
</template>

<script lang="ts">
import {
  defineComponent,
  computed,
  ref,
  watch,
  PropType,
  onUnmounted,
  onBeforeUpdate
} from 'vue';
import {
  createPopper as createPopperJs,
  Instance,
  Options,
  Placement
} from '@popperjs/core';

import { isServer } from '@/qComponents/constants/isServer';
import { validateArray } from '@/qComponents/helpers';
import { getConfig } from '@/qComponents/config';
import type { Nullable } from '#/helpers';

import type {
  QContextMenuProps,
  QContextMenuPropPosition,
  QContextMenuPropMenuItems,
  QContextMenuPropTeleportTo,
  QContextMenuInstance
} from './types';

const DEFAULT_Z_INDEX = 2000;

export default defineComponent({
  name: 'QContextMenu',
  componentName: 'QContextMenu',

  props: {
    menuItems: {
      type: Array as PropType<QContextMenuPropMenuItems>,
      required: true
    },
    position: {
      type: String as PropType<QContextMenuPropPosition>,
      default: 'left',
      validator: validateArray<QContextMenuPropPosition>(['left', 'right'])
    },
    /**
     * Specifies a target element where QContextMenu will be moved.
     * (has to be a valid query selector, or an HTMLElement)
     */
    teleportTo: {
      type: [
        String,
        isServer ? Object : HTMLElement
      ] as PropType<QContextMenuPropTeleportTo>,
      default: null
    }
  },

  emits: [
    /**
     * click on menu item
     */
    'action'
  ],

  setup(props: QContextMenuProps, ctx): QContextMenuInstance {
    const reference = ref<Nullable<HTMLElement>>(null);
    const contextMenu = ref<Nullable<HTMLElement>>(null);
    const isContextMenuShown = ref<boolean>(false);
    const zIndex = ref<number>(DEFAULT_Z_INDEX);
    const popperJS = ref<Nullable<Instance>>(null);

    const placement = computed<Placement>(() =>
      props.position === 'right' ? 'bottom-start' : 'bottom-end'
    );

    let menuItemElements: HTMLElement[] = [];

    const setItemRef = (el: HTMLElement): void => {
      if (el) menuItemElements.push(el);
    };

    const createPopper = (): void => {
      if (!reference.value || !contextMenu.value) return;

      isContextMenuShown.value = true;

      const options: Partial<Options> = {
        placement: placement.value,
        modifiers: [
          {
            name: 'offset',
            options: {
              offset: [0, -40]
            }
          }
        ]
      };

      popperJS.value = createPopperJs(
        reference.value,
        contextMenu.value,
        options
      );

      zIndex.value = getConfig('nextZIndex') ?? DEFAULT_Z_INDEX;
    };

    const closePopper = (): void => {
      isContextMenuShown.value = false;
      menuItemElements = [];
    };

    const afterLeave = (): void => {
      popperJS.value?.destroy();
      popperJS.value = null;
    };

    const handleTriggerClick = (e: MouseEvent): void => {
      if (reference.value === e.target) return;
      if (isContextMenuShown.value) {
        closePopper();
        return;
      }

      createPopper();
    };

    const handleKeyUp = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') closePopper();

      if (
        !['ArrowUp', 'ArrowDown'].includes(e.key) ||
        !isContextMenuShown.value
      ) {
        return;
      }

      if (!document.activeElement?.classList.contains('q-context-menu__item')) {
        menuItemElements[0]?.focus();
        return;
      }

      let currentNodeIndex = 0;
      let nextNodeIndex = 1;
      Array.from(menuItemElements).some((element, index) => {
        const isItActiveElement = document.activeElement === element;

        if (isItActiveElement) currentNodeIndex = index;

        return isItActiveElement;
      });

      switch (e.key) {
        case 'ArrowUp': {
          nextNodeIndex = currentNodeIndex - 1;
          break;
        }

        case 'ArrowDown': {
          nextNodeIndex = currentNodeIndex + 1;
          break;
        }

        default:
          break;
      }
      menuItemElements[nextNodeIndex]?.focus();
    };

    const handleItemClick = (actionName: string): void => {
      ctx.emit('action', actionName);
      closePopper();
    };

    const handleDocumentClick = (e: MouseEvent): void => {
      const target = e.target as HTMLElement;

      if (
        reference.value?.contains(target) ||
        contextMenu.value?.contains(target)
      ) {
        return;
      }

      closePopper();
    };

    watch(isContextMenuShown, value => {
      if (value) {
        document.addEventListener('click', handleDocumentClick, true);
        document.addEventListener('keyup', handleKeyUp, true);
        return;
      }

      document.removeEventListener('click', handleDocumentClick, true);
      document.removeEventListener('keyup', handleKeyUp, true);
    });

    onUnmounted(() => {
      document.removeEventListener('click', handleDocumentClick, true);
    });

    onBeforeUpdate(() => {
      menuItemElements = [];
    });

    return {
      reference,
      contextMenu,
      zIndex,
      isContextMenuShown,
      handleTriggerClick,
      handleItemClick,
      setItemRef,
      afterLeave
    };
  }
});
</script>
