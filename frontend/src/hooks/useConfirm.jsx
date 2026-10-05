import { useCallback, useState } from 'react';
import ConfirmModal from '../components/ConfirmModal';

const CLOSED = { isOpen: false, message: '', word: null, resolve: null };

/**
 * useConfirm — `await confirm(message)` resolves true or false.
 * `confirm(message, { word: 'DELETE' })` also makes the person type the word
 * first; use it for bulk deletes that cannot be undone.
 */
export function useConfirm() {
  const [confirmState, setConfirmState] = useState({ ...CLOSED, id: 0 });

  const confirm = useCallback((message, { word = null } = {}) => {
    return new Promise((resolve) => {
      setConfirmState((prev) => ({ isOpen: true, message, word, resolve, id: prev.id + 1 }));
    });
  }, []);

  // Memoised so the dialog keeps its identity while the caller re-renders;
  // a new component type each render would remount it and drop focus.
  const ConfirmDialog = useCallback(() => {
    const settle = (answer) => {
      confirmState.resolve?.(answer);
      setConfirmState((prev) => ({ ...CLOSED, id: prev.id }));
    };
    return (
      <ConfirmModal
        key={confirmState.id}
        isOpen={confirmState.isOpen}
        message={confirmState.message}
        word={confirmState.word}
        onConfirm={() => settle(true)}
        onCancel={() => settle(false)}
      />
    );
  }, [confirmState]);

  return { confirm, ConfirmDialog };
}
