import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store/store';

/**
 * Typed version of useDispatch hook
 * Use this instead of plain `useDispatch` for proper typing
 */
export const useAppDispatch = (): AppDispatch => useDispatch<AppDispatch>();

/**
 * Typed version of useSelector hook
 * Use this instead of plain `useSelector` for proper typing
 */
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
