import { useCallback, useState } from 'react';
import ConfirmModal from '../components/ConfirmModal';

const CLOSED = { isOpen: false, message: '', resolve: null };

export function useConfirm() {
  const [confirmState, setConfirmState] = useState(CLOSED);

  const confirm = useCallback((message) => {
    return new Promise((resolve) => {
      setConfirmState({ isOpen: true, message, resolve });
    });
  }, []);

  // Memoised so the dialog keeps its identity while the caller re-renders;
  // a new component type each render would remount it and drop focus.
  const ConfirmDialog = useCallback(() => {
    const settle = (answer) => {
      confirmState.resolve?.(answer);
      setConfirmState(CLOSED);
    };
    return (
      <ConfirmModal
        isOpen={confirmState.isOpen}
        message={confirmState.message}
        onConfirm={() => settle(true)}
        onCancel={() => settle(false)}
      />
    );
  }, [confirmState]);

  return { confirm, ConfirmDialog };
}
