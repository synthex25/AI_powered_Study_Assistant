import { createSlice } from "@reduxjs/toolkit";

interface MasterState {
  showMasterData: boolean;
}

const initialState: MasterState = {
  showMasterData: false,
};

const uiSlice = createSlice({
  name: "showMasterData",
  initialState,
  reducers: {
    toggleMasterData: (state) => {
      state.showMasterData = !state.showMasterData;
    },
  },
});

export const { toggleMasterData } = uiSlice.actions;
export default uiSlice.reducer;
