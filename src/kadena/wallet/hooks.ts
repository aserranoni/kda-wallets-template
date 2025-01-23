import { HeadModal, setOpenModal } from '@/main/mainSlice';
import { useCallback } from 'react';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../app/store';

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

export function useModalOpen(modal: HeadModal): boolean {
  const openModal = useAppSelector((state: RootState) => state.main.openModal);
  return openModal === modal;
}

export function useLoginModalToggle(): () => void {
  return useToggleModal(HeadModal.LOGIN);
}

export function useToggleModal(modal: HeadModal): () => void {
  const open = useModalOpen(modal);
  const dispatch = useAppDispatch();
  //   return useCallback(() => dispatch(setOpenModal(open ? null : modal)), [dispatch, modal, open]);
  // }

  // export function useWalletModalToggle(): () => void {
  //   const open = useModalOpen(HeadModal.WALLET);
  //   const dispatch = useAppDispatch();

  return useCallback(() => {
    dispatch(setOpenModal(open ? null : HeadModal.WALLET));
  }, [dispatch, modal, open]);
}

export function useWalletModalToggle(): () => void {
  return useToggleModal(HeadModal.WALLET);
}
