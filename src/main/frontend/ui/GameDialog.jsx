import React, { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Dialog } from "radix-ui";

export function GameDialog({
  trigger,
  title,
  description,
  children,
  open,
  defaultOpen = false,
  onOpenChange
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const reducedMotion = useReducedMotion();
  const controlled = open !== undefined;
  const resolvedOpen = controlled ? open : internalOpen;

  const handleOpenChange = (nextOpen) => {
    if (!controlled) {
      setInternalOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  };

  const transition = reducedMotion ? { duration: 0 } : { duration: 0.16, ease: "easeOut" };

  return (
    <Dialog.Root open={resolvedOpen} onOpenChange={handleOpenChange}>
      {trigger ? <Dialog.Trigger asChild>{trigger}</Dialog.Trigger> : null}
      <Dialog.Portal forceMount>
        <AnimatePresence>
          {resolvedOpen ? (
            <>
              <Dialog.Overlay asChild forceMount>
                <motion.div
                  className="ui-dialog-overlay"
                  initial={reducedMotion ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={transition}
                />
              </Dialog.Overlay>
              <Dialog.Content asChild forceMount aria-describedby={description ? undefined : null}>
                <motion.section
                  className="ui-dialog-content"
                  initial={reducedMotion ? false : { opacity: 0, y: 18, scale: 0.985 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 12, scale: 0.99 }}
                  transition={transition}
                >
                  <Dialog.Title className="ui-sr-only">{title}</Dialog.Title>
                  {description ? (
                    <Dialog.Description className="ui-sr-only">{description}</Dialog.Description>
                  ) : null}
                  {children}
                </motion.section>
              </Dialog.Content>
            </>
          ) : null}
        </AnimatePresence>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function GameDialogClose({ children }) {
  return <Dialog.Close asChild>{children}</Dialog.Close>;
}
