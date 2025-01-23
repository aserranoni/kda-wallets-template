import walletReducer from '@/kadena/wallet/walletSlice';
import mainReducer from '@/main/mainSlice';
import userReducer from '@/user/userSlice';
import { Action, configureStore, ThunkAction } from '@reduxjs/toolkit';
export const store = configureStore({
  reducer: {
    main: mainReducer,
    wallet: walletReducer,
    user: userReducer,
  },
});

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;
